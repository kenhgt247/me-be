// components/Messages.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, ChatSession } from '../types';

interface Props {
  currentUser: User;
}

export const Messages: React.FC<Props> = ({ currentUser }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ChatSession))
        .filter(c => !c.deletedFor?.[currentUser.id]); // Lọc chat đã xóa
      setChats(items);
    });

    return () => unsub();
  }, [currentUser.id]);

  // Helper format thời gian
  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    // Nếu trong ngày thì hiện giờ, khác ngày hiện ngày tháng
    return date.toDateString() === now.toDateString()
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString();
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="text-xl font-bold mb-4">Tin nhắn</h2>
      {chats.length === 0 && <p className="text-gray-500">Chưa có tin nhắn nào.</p>}
      
      {chats.map(c => {
        const otherId = c.participants.find(p => p !== currentUser.id) || currentUser.id;
        const otherUser = c.participantData?.[otherId];
        const isUnread = (c.unread?.[currentUser.id] || 0) > 0;

        // Nếu không có data người kia (lỗi cũ), hiển thị "Người dùng"
        const displayName = otherUser?.name || "Người dùng";
        const displayAvatar = otherUser?.avatar || "https://via.placeholder.com/40";

        return (
          <Link
            key={c.id}
            to={`/messages/${otherId}`}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isUnread ? 'bg-blue-50 border border-blue-100' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <img 
              src={displayAvatar} 
              alt={displayName} 
              className="w-12 h-12 rounded-full object-cover border"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className={`truncate ${isUnread ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>
                  {displayName}
                </h3>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {formatTime(c.lastMessageAt)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                   {c.lastMessage}
                </p>
                {isUnread && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {c.unread[currentUser.id]}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
