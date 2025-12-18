// services/typing.ts
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Set trạng thái typing
 */
export const setTyping = async (
  chatId: string,
  uid: string,
  isTyping: boolean
) => {
  const ref = doc(db, 'typing', chatId, 'users', uid);

  if (isTyping) {
    await setDoc(ref, {
      isTyping: true,
      updatedAt: serverTimestamp()
    });
  } else {
    await deleteDoc(ref);
  }
};

/**
 * Lắng nghe typing realtime
 */
export const subscribeTyping = (
  chatId: string,
  cb: (uids: string[]) => void
) => {
  const colRef = collection(db, 'typing', chatId, 'users');

  return onSnapshot(colRef, snap => {
    cb(snap.docs.map(d => d.id));
  });
};
