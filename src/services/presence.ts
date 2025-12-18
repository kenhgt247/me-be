import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const setUserOnline = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    isOnline: true,
    lastActive: serverTimestamp()
  });
};

export const setUserOffline = async (uid: string) => {
  await updateDoc(doc(db, 'users', uid), {
    isOnline: false,
    lastActive: serverTimestamp()
  });
};
