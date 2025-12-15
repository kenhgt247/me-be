import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';

import { User, Message } from '../types';
import {
  subscribeMessages,
  sendMessage,
  markChatAsRead,
  getChatId
} from '../services/chat';
import { subscribeTyping, setTyping } from '../services/typing';
import { subscribeToUser } from '../services/db';

interface Props {
  currentUser: User;
}

export const ChatDetail: React.FC<Props> = ({ currentUser }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const chatId = getChatId(currentUser.id, userId!);

  /* LOAD USER */
  useEffect(() => {
    if (!userId) return;
    return subscribeToUser(userId, setTargetUser);
  }, [userId]);

  /* MESSAGES */
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMessages(currentUser.id, userId, setMessages);
    markChatAsRead(currentUser.id, userId);
    return unsub;
  }, [userId]);

  /* TYPING */
  useEffect(() => {
    return subscribeTyping(chatId, uids =>
      setIsTyping(uids.includes(userId!))
    );
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    const content = text;
    setText('');
    await sendMessage(currentUser.id, userId, content);
    setTyping(chatId, currentUser.id, false);
  };

  if (!targetUser) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      <div className="bg-white p-3 flex items-center gap-2 border-b">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <span className="font-bold">{targetUser.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.map(m => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div key={m.id} className={`mb-2 ${isMe ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-2 rounded-xl ${isMe ? 'bg-primary text-white' : 'bg-white'}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="text-sm italic text-gray-400">Đang nhập…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white p-2 flex gap-2 border-t">
        <textarea
          value={text}
          onChange={e => {
            setText(e.target.value);
            setTyping(chatId, currentUser.id, true);
          }}
          onBlur={() => setTyping(chatId, currentUser.id, false)}
          rows={1}
          className="flex-1 resize-none border rounded-lg px-3 py-2"
        />
        <button onClick={handleSend}><Send /></button>
      </div>
    </div>
  );
};
