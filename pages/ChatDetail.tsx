import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Smile,
  CheckCheck
} from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<any>(null);

  const chatId = userId ? getChatId(currentUser.id, userId) : '';

  /* ================= USER INFO ================= */
  useEffect(() => {
    if (!userId) return;
    return subscribeToUser(userId, u => u && setTargetUser(u));
  }, [userId]);

  /* ================= MESSAGES ================= */
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMessages(currentUser.id, userId, setMessages);
    markChatAsRead(currentUser.id, userId);
    return unsub;
  }, [currentUser.id, userId]);

  /* ================= TYPING ================= */
  useEffect(() => {
    if (!chatId || !userId) return;
    return subscribeTyping(chatId, uids =>
      setIsTyping(uids.includes(userId))
    );
  }, [chatId, userId]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ================= SEND TEXT ================= */
  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    const content = text;
    setText('');

    try {
      await sendMessage(currentUser, userId, content);
      setTyping(chatId, currentUser.id, false);
    } catch (e) {
      console.error('Send message error:', e);
      setText(content);
    }
  };

  /* ================= SEND IMAGE ================= */
  const handleSendImage = async (file: File) => {
    if (!file || !userId) return;
    try {
      await sendMessage(currentUser, userId, file as any, 'image');
      setTyping(chatId, currentUser.id, false);
    } catch (e) {
      console.error('Send image error:', e);
    }
  };

  /* ================= INPUT ================= */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setTyping(chatId, currentUser.id, true);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(chatId, currentUser.id, false);
    }, 2000);
  };

  if (!targetUser) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 z-50">

      {/* ================= HEADER ================= */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>

        <div className="relative">
          <img
            src={targetUser.avatar || 'https://via.placeholder.com/40'}
            className="w-10 h-10 rounded-full object-cover"
          />
          {targetUser.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-1">
            {targetUser.name}
            {targetUser.isOnline && <span className="text-green-500 text-xs">●</span>}
          </h3>
          <span className="text-xs text-gray-500">
            {targetUser.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </span>
        </div>
      </div>

      {/* ================= MESSAGES ================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser.id;
          const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== m.senderId);

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div className="w-8">
                  {showAvatar ? (
                    <img src={targetUser.avatar} className="w-8 h-8 rounded-full" />
                  ) : <div className="w-8" />}
                </div>
              )}

              <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
                {m.type === 'image' ? (
                  <img src={m.content} className="rounded-lg max-w-full" />
                ) : m.content}

                <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 opacity-70 ${
                  isMe ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {m.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <CheckCheck size={12} />}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 ml-10 text-gray-500 text-sm italic">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce delay-100">●</span>
            <span className="animate-bounce delay-200">●</span>
            {targetUser.name} đang soạn tin...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ================= INPUT ================= */}
      <div className="bg-white p-3 border-t flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => e.target.files && handleSendImage(e.target.files[0])}
        />

        <IconButton onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={22} />
        </IconButton>

        <IconButton>
          <Smile size={22} />
        </IconButton>

        <textarea
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          className="flex-1 bg-gray-100 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={`p-3 rounded-full transition-colors ${
            text.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

/* ================= HELPER ================= */
const IconButton: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
  >
    {children}
  </button>
);
