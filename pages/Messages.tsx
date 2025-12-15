import React, { useEffect, useState } from 'react';
// @ts-ignore
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

    return onSnapshot(q, snap => {
      setChats(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as ChatSession))
          .filter(c => !c.deletedFor?.[currentUser.id])
      );
    });
  }, [currentUser.id]);

  return (
    <div className="p-3 space-y-2">
      {chats.map(c => {
        const otherId = c.participants.find(p => p !== currentUser.id)!;
        const other = c.participantData?.[otherId];
        if (!other) return null;

        return (
          <Link
            key={c.id}
            to={`/messages/${otherId}`}
            className="block bg-white p-3 rounded-xl"
          >
            <div className="font-bold">{other.name}</div>
            <div className="text-sm text-gray-500">{c.lastMessage}</div>
          </Link>
        );
      })}
    </div>
  );
};
