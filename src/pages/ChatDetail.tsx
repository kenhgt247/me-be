import React, { useEffect, useRef, useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Smile,
  CheckCheck,
  X
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

/* ================= STICKERS DATA ================= */
const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
};

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
  const [showStickers, setShowStickers] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [messages, isTyping, showStickers]);

  /* ================= SEND TEXT ================= */
  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    const content = text;
    setText('');
    setShowStickers(false);

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

  const handleInsertSticker = (sticker: string) => {
    setText(prev => prev + sticker);
    textareaRef.current?.focus();
  };

  if (!targetUser) return <div className="p-4 flex items-center justify-center h-screen bg-[#F7F7F5] dark:bg-dark-bg text-gray-500 dark:text-gray-400">Đang tải...</div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#e5ddd5] dark:bg-dark-bg z-50 transition-colors duration-300">

      {/* ================= HEADER ================= */}
      <div className="bg-white dark:bg-dark-card px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-dark-border shadow-sm z-10 transition-colors">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="relative">
          <img
            src={targetUser.avatar || 'https://via.placeholder.com/40'}
            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-600"
            alt="Avatar"
          />
          {targetUser.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-dark-card shadow-sm" />
          )}
        </div>

        <div>
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-1 text-sm md:text-base">
            {targetUser.name}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 block -mt-0.5">
            {targetUser.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </span>
        </div>
      </div>

      {/* ================= MESSAGES LIST ================= */}
      {/* Thay đổi màu nền ở đây để khớp Dark Mode */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-[#0b141a]" onClick={() => setShowStickers(false)}>
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser.id;
          const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== m.senderId);

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 animate-fade-in`}>
              {!isMe && (
                <div className="w-8 flex-shrink-0 flex items-end">
                  {showAvatar ? (
                    <img src={targetUser.avatar} className="w-8 h-8 rounded-full border border-white/20 shadow-sm" alt="Partner" />
                  ) : <div className="w-8" />}
                </div>
              )}

              <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words relative group ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-dark-card text-gray-800 dark:text-gray-200 rounded-bl-none border border-transparent dark:border-slate-700'
              }`}>
                {m.type === 'image' ? (
                  <img src={m.content} className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity" alt="Sent image" />
                ) : (
                  <span className="whitespace-pre-wrap leading-relaxed">{m.content}</span>
                )}

                <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 opacity-70 select-none ${
                  isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {m.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                  {isMe && <CheckCheck size={14} strokeWidth={1.5} />}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 ml-10 text-gray-500 dark:text-gray-400 text-xs italic animate-pulse">
            <div className="flex gap-1 bg-white dark:bg-dark-card px-3 py-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-700">
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-200"></span>
            </div>
            {targetUser.name} đang soạn tin...
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* ================= INPUT AREA ================= */}
      <div className="bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border transition-all duration-300">
        
        {/* Sticker Picker Drawer */}
        {showStickers && (
          <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 border-b dark:border-dark-border custom-scrollbar p-2 animate-slide-up">
             <div className="flex justify-between items-center px-2 mb-2 sticky top-0 bg-gray-50 dark:bg-slate-900/95 z-10 backdrop-blur-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stickers</span>
                <button onClick={() => setShowStickers(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full"><X size={16} className="text-gray-500 dark:text-gray-400"/></button>
             </div>
             {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                <div key={category} className="mb-4 px-2">
                  <div className="grid grid-cols-8 gap-2">
                    {emojis.map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => handleInsertSticker(emoji)} 
                        className="text-2xl hover:scale-125 transition-transform p-1 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
             ))}
          </div>
        )}

        <div className="p-3 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => e.target.files && handleSendImage(e.target.files[0])}
          />

          <div className="flex gap-1">
             <IconButton onClick={() => fileInputRef.current?.click()} title="Gửi ảnh">
                <ImageIcon size={22} />
             </IconButton>
             <IconButton onClick={() => setShowStickers(!showStickers)} active={showStickers} title="Biểu cảm">
                <Smile size={22} />
             </IconButton>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowStickers(false)}
            placeholder="Nhập tin nhắn..."
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            // ✅ Fix màu chữ input cho Dark Mode
            className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all custom-scrollbar placeholder-gray-500 dark:placeholder-gray-400"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-3 rounded-full transition-all duration-200 shadow-sm flex-shrink-0 ${
              text.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send size={20} className={text.trim() ? 'ml-0.5' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= HELPER ================= */
const IconButton: React.FC<{ onClick?: () => void; active?: boolean; title?: string; children: React.ReactNode }> = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
        active 
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
          : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700'
    }`}
  >
    {children}
  </button>
);
