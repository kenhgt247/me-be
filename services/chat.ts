import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Message } from '../types';

/* ======================
   HELPERS
====================== */
export const getChatId = (a: string, b: string) =>
  [a, b].sort().join('_');

/* ======================
   REALTIME MESSAGES
====================== */
export const subscribeMessages = (
  me: string,
  other: string,
  cb: (messages: Message[]) => void
) => {
  const chatId = getChatId(me, other);

  const q = query(
    collection(db, 'messages', chatId, 'items'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Message[];
    cb(data);
  });
};

/* ======================
   SEND MESSAGE (ATOMIC)
====================== */
export const sendMessage = async (
  me: string,
  other: string,
  content: string,
  type: 'text' | 'image' = 'text'
) => {
  const chatId = getChatId(me, other);
  const batch = writeBatch(db);

  const msgRef = doc(collection(db, 'messages', chatId, 'items'));
  const chatRef = doc(db, 'chats', chatId);

  batch.set(msgRef, {
    senderId: me,
    content,
    type,
    createdAt: serverTimestamp(),
    readBy: [me]
  });

  batch.set(
    chatRef,
    {
      participants: [me, other],
      lastMessage: type === 'image' ? '[Hình ảnh]' : content,
      lastMessageAt: serverTimestamp(),
      unread: {
        [me]: 0,
        [other]: increment(1)
      }
    },
    { merge: true }
  );

  await batch.commit();
};

/* ======================
   MARK AS READ
====================== */
export const markChatAsRead = async (me: string, other: string) => {
  const chatId = getChatId(me, other);
  await updateDoc(doc(db, 'chats', chatId), {
    [`unread.${me}`]: 0
  });
};

/* ======================
   SOFT DELETE CHAT
====================== */
export const deleteChatForMe = async (me: string, other: string) => {
  const chatId = getChatId(me, other);
  await updateDoc(doc(db, 'chats', chatId), {
    [`deletedFor.${me}`]: true
  });
};
