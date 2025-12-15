import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Image as ImageIcon, Loader2, ChevronDown
} from 'lucide-react';

import { User, Message } from '../types';
import {
  subscribeMessages,
  sendMessage,
  markAsRead
} from '../services/chat';
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
  const [loading, setLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ======================
     LOAD USER
  ====================== */
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUser(userId, setTargetUser);
    return () => unsub();
  }, [userId]);

  /* ======================
     REALTIME MESSAGES
  ====================== */
  useEffect(() => {
    if (!currentUser || !userId) return;

    const unsub = subscribeMessages(currentUser.id, userId, (data) => {
      setMessages(data);
      setLoading(false);
    });

    markAsRead(currentUser.id, userId);
    return unsub;
  }, [userId, currentUser.id]);

  /* ======================
     AUTO SCROLL
  ====================== */
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 200);
  };

  /* ======================
     SEND MESSAGE
  ====================== */
  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    const content = text;
    setText('');
    textareaRef.current!.style.height = 'auto';
    await sendMessage(currentUser.id, userId, content);
  };

  /* ======================
     AUTO RESIZE TEXTAREA
  ====================== */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 120) + 'px';
  }, [text]);

  if (!targetUser || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#E5DDD5] dark:bg-slate-900">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>
        <img src={targetUser.avatar} className="w-10 h-10 rounded-full" />
        <div>
          <h2 className="font-bold">{targetUser.name}</h2>
          <span className="text-xs text-gray-500">
            {targetUser.isOnline ? 'Đang hoạt động' : 'Offline'}
          </span>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {messages.map(m => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div
              key={m.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm'
                }`}
              >
                {m.content}
                <div className="text-[10px] text-right opacity-60 mt-1">
                  {m.createdAt?.toDate
                    ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* SCROLL BUTTON */}
      {showScroll && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-4 bg-white p-2 rounded-full shadow"
        >
          <ChevronDown />
        </button>
      )}

      {/* INPUT */}
      <div className="border-t bg-white p-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Nhắn tin..."
          className="flex-1 resize-none bg-gray-100 rounded-3xl px-4 py-2 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="text-primary p-2"
        >
          <Send />
        </button>
      </div>
    </div>
  );
};
