// components/ChatDetail.tsx
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';

import { User, Message } from '../types';
import { subscribeMessages, sendMessage, markChatAsRead, getChatId } from '../services/chat';
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

  const chatId = userId ? getChatId(currentUser.id, userId) : '';

  // 1. Lấy thông tin người đang chat cùng
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToUser(userId, (u) => {
        if(u) setTargetUser(u);
    });
    return unsub;
  }, [userId]);

  // 2. Lắng nghe tin nhắn & Đánh dấu đã đọc
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMessages(currentUser.id, userId, setMessages);
    markChatAsRead(currentUser.id, userId);
    return unsub;
  }, [currentUser.id, userId]);

  // 3. Lắng nghe Typing
  useEffect(() => {
    if (!chatId) return;
    return subscribeTyping(chatId, (uids) => 
      setIsTyping(uids.includes(userId || ''))
    );
  }, [chatId, userId]);

  // 4. Auto scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Xử lý gửi tin nhắn
  const handleSend = async () => {
    if (!text.trim() || !userId) return;
    
    const content = text;
    setText(''); // Clear input ngay lập tức để cảm giác nhanh hơn
    
    try {
      // Truyền currentUser vào để service lấy avatar/name lưu vào DB
      await sendMessage(currentUser, userId, content);
      setTyping(chatId, currentUser.id, false);
    } catch (error) {
      console.error("Gửi tin nhắn lỗi:", error);
      setText(content); // Revert lại nếu lỗi
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Debounce typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setTyping(chatId, currentUser.id, true);
    
    // Tự động tắt typing sau 3s không gõ
    setTimeout(() => {
        setTyping(chatId, currentUser.id, false);
    }, 3000);
  };

  if (!targetUser) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100 z-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="relative">
            <img src={targetUser.avatar || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
            {targetUser.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
        </div>
        <div>
            <h3 className="font-bold text-gray-800">{targetUser.name}</h3>
            <span className="text-xs text-gray-500">{targetUser.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
        {messages.map((m, index) => {
          const isMe = m.senderId === currentUser.id;
          const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== m.senderId);

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMe && (
                 <div className="w-8 flex-shrink-0">
                    {showAvatar ? (
                        <img src={targetUser.avatar} className="w-8 h-8 rounded-full" />
                    ) : <div className="w-8" />}
                 </div>
              )}
              
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm break-words ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}>
                {m.type === 'image' ? (
                    <img src={m.content} className="rounded-lg max-w-full" alt="sent content" />
                ) : (
                    m.content
                )}
                <div className={`text-[10px] mt-1 text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex items-center gap-2 ml-10 text-gray-500 text-sm italic">
            <div className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
            </div>
            {targetUser.name} đang soạn tin...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t flex items-end gap-2">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ImageIcon className="w-6 h-6" />
        </button>
        <textarea
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={() => markChatAsRead(currentUser.id, userId!)}
          placeholder="Nhập tin nhắn..."
          rows={1}
          className="flex-1 bg-gray-100 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
        />
        <button 
            onClick={handleSend}
            disabled={!text.trim()} 
            className={`p-3 rounded-full transition-colors ${
                text.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'
            }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
