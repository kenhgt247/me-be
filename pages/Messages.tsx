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
    <div className="p-3 space-y-2 pb-20">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white px-1">Tin nhắn</h2>

      {chats.length === 0 && (
        <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">Chưa có tin nhắn nào.</p>
        </div>
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
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${
              isUnread
                ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30' // Unread Styles (Light/Dark)
                : 'bg-white border-transparent hover:bg-gray-50 dark:bg-dark-card dark:border-slate-800/50 dark:hover:bg-slate-800' // Read Styles (Light/Dark)
            }`}
          >
            <div className="relative">
                <img
                src={displayAvatar}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-slate-700 bg-gray-200 dark:bg-slate-700"
                />
                {/* Online Indicator (Optional - nếu có data presence) */}
                {/* {otherUser?.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-dark-card"></div>} */}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3
                  className={`truncate text-sm ${
                    isUnread
                      ? 'font-bold text-gray-900 dark:text-white'
                      : 'font-medium text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {displayName}
                </h3>

                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2 font-medium">
                  {formatTime(chat.lastMessageAt)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <p
                  className={`truncate text-sm pr-2 ${
                    isUnread
                      ? 'font-semibold text-gray-800 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {chat.lastMessage}
                </p>

                {isUnread && (
                  <span className="shrink-0 ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-red-500/30">
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
