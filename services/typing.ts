import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  collection
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const setTyping = async (
  chatId: string,
  uid: string,
  isTyping: boolean
) => {
  const ref = doc(db, 'typing', chatId, uid);

  if (isTyping) {
    await setDoc(ref, {
      isTyping: true,
      updatedAt: serverTimestamp()
    });
  } else {
    await deleteDoc(ref);
  }
};

export const subscribeTyping = (
  chatId: string,
  cb: (uids: string[]) => void
) => {
  return onSnapshot(
    collection(db, 'typing', chatId),
    snap => cb(snap.docs.map(d => d.id))
  );
};
