import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ChatSession, User } from '../types';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
  currentUser: User;
}

export const Messages: React.FC<Props> = ({ currentUser }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.isGuest) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession)));
      setLoading(false);
    });

    return unsub;
  }, [currentUser.id]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24">
      <div className="sticky top-0 bg-white px-4 py-3 border-b">
        <h1 className="text-2xl font-bold">Tin nhắn</h1>
      </div>

      <div className="p-2 space-y-2">
        {chats.map(chat => {
          const otherId = chat.participants.find(id => id !== currentUser.id);
          if (!otherId) return null;
          const other = chat.participantData?.[otherId];
          if (!other) return null;

          return (
            <Link
              key={chat.id}
              to={`/messages/${otherId}`}
              className="flex gap-3 items-center bg-white p-3 rounded-2xl"
            >
              <div className="relative">
                <img
                  src={other.avatar}
                  className="w-14 h-14 rounded-full object-cover"
                />
                {other.isExpert && (
                  <ShieldCheck
                    size={14}
                    className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h4 className="font-bold truncate">{other.name}</h4>
                  <span className="text-xs text-gray-400">
                    {chat.lastMessageAt?.toDate
                      ? chat.lastMessageAt.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''}
                  </span>
                </div>

                <p
                  className={`text-sm truncate ${
                    chat.unread?.[currentUser.id]
                      ? 'font-bold text-black'
                      : 'text-gray-500'
                  }`}
                >
                  {chat.lastMessage}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
