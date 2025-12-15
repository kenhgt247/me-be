import {
  collection, doc, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, limit,
  writeBatch, increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Message } from '../types';

export const getConversationId = (a: string, b: string) =>
  [a, b].sort().join('_');

/* ======================
   REALTIME MESSAGES
====================== */
export const subscribeMessages = (
  me: string,
  other: string,
  cb: (m: Message[]) => void
) => {
  const cid = getConversationId(me, other);

  const q = query(
    collection(db, 'messages', cid, 'items'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
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
  const cid = getConversationId(me, other);
  const batch = writeBatch(db);

  const msgRef = doc(collection(db, 'messages', cid, 'items'));
  const chatRef = doc(db, 'chats', cid);

  batch.set(msgRef, {
    senderId: me,
    content,
    type,
    createdAt: serverTimestamp(),
    readBy: [me]
  });

  batch.set(chatRef, {
    participants: [me, other],
    lastMessage: type === 'image' ? '[Hình ảnh]' : content,
    lastMessageAt: serverTimestamp(),
    [`unread.${other}`]: increment(1),
    [`unread.${me}`]: 0
  }, { merge: true });

  await batch.commit();
};

/* ======================
   MARK AS READ
====================== */
export const markAsRead = async (me: string, other: string) => {
  const cid = getConversationId(me, other);
  await writeBatch(db)
    .update(doc(db, 'chats', cid), {
      [`unread.${me}`]: 0
    })
    .commit();
};
