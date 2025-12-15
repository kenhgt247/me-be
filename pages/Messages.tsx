import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, ChatSession } from '../types';

interface Props {
  currentUser: User;
}

export const Messages: React.FC<Props> = ({ currentUser }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [userCache, setUserCache] = useState<Record<string, User>>({});

  /* ================= LOAD CHATS ================= */
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      async snap => {
        const items: ChatSession[] = [];

        for (const d of snap.docs) {
          const chat = { id: d.id, ...d.data() } as ChatSession;

          // Bỏ chat đã bị user xóa
          if (chat.deletedFor?.[currentUser.id]) continue;

          items.push(chat);

          // Prefetch user data nếu thiếu participantData
          const otherId =
            chat.participants.find(p => p !== currentUser.id) ||
            currentUser.id;

          if (
            otherId &&
            !chat.participantData?.[otherId] &&
            !userCache[otherId]
          ) {
            try {
              const uSnap = await getDoc(
                doc(db, 'users', otherId)
              );
              if (uSnap.exists()) {
                setUserCache(prev => ({
                  ...prev,
                  [otherId]: {
                    id: uSnap.id,
                    ...uSnap.data()
                  } as User
                }));
              }
            } catch {
              /* ignore */
            }
          }
        }

        setChats(items);
      },
      err => {
        if (err.code === 'permission-denied') {
          setChats([]);
        }
      }
    );

    return () => unsub();
  }, [currentUser.id]);

  /* ================= FORMAT TIME ================= */
  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    return date.toDateString() === now.toDateString()
      ? date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString();
  };

  return (
    <div className="p-3 space-y-2">
      <h2 className="text-xl font-bold mb-4">Tin nhắn</h2>

      {chats.length === 0 && (
        <p className="text-gray-500">Chưa có tin nhắn nào.</p>
      )}

      {chats.map(chat => {
        const otherId =
          chat.participants.find(p => p !== currentUser.id) ||
          currentUser.id;

        const otherUser =
          chat.participantData?.[otherId] ||
          userCache[otherId];

        const isUnread =
          (chat.unread?.[currentUser.id] || 0) > 0;

        const displayName =
          otherUser?.name || 'Người dùng';
        const displayAvatar =
          otherUser?.avatar ||
          'https://via.placeholder.com/40';

        return (
          <Link
            key={chat.id}
            to={`/messages/${otherId}`}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isUnread
                ? 'bg-blue-50 border border-blue-100'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border"
            />

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3
                  className={`truncate ${
                    isUnread
                      ? 'font-bold text-black'
                      : 'font-medium text-gray-700'
                  }`}
                >
                  {displayName}
                </h3>

                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {formatTime(chat.lastMessageAt)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <p
                  className={`truncate text-sm ${
                    isUnread
                      ? 'font-semibold text-gray-800'
                      : 'text-gray-500'
                  }`}
                >
                  {chat.lastMessage}
                </p>

                {isUnread && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {chat.unread[currentUser.id]}
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
