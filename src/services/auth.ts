import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

/* --- Helper --- */
const mapUser = (fbUser: firebaseAuth.User, dbUser?: any): User => {
  return {
    id: fbUser.uid,
    name: dbUser?.name || fbUser.displayName || 'Người dùng',
    avatar: dbUser?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    isExpert: dbUser?.isExpert || false,
    expertStatus: dbUser?.expertStatus || 'none',
    isAdmin: dbUser?.isAdmin || false,
    bio: dbUser?.bio || '',
    points: dbUser?.points || 0,
    joinedAt: dbUser?.joinedAt || dbUser?.createdAt || new Date().toISOString(),
    specialty: dbUser?.specialty,
    workplace: dbUser?.workplace,
    username: dbUser?.username || null,
    coverUrl: dbUser?.coverUrl || null,
    followers: Array.isArray(dbUser?.followers) ? dbUser.followers : [],
    following: Array.isArray(dbUser?.following) ? dbUser.following : [],
    savedQuestions: Array.isArray(dbUser?.savedQuestions) ? dbUser.savedQuestions : [],
    isGuest: false,
  } as User;
};

/* --- Ensure Doc: Chia tách Create/Update --- */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  
  let existing = false;
  try {
    const snap = await getDoc(userDocRef);
    existing = snap.exists();
  } catch (e) {}

  if (!existing) {
    // === CREATE ===
    // Dữ liệu khởi tạo chuẩn
    await setDoc(userDocRef, {
      name: partialData?.name || fbUser.displayName || 'Người dùng',
      email: partialData?.email || fbUser.email,
      avatar: partialData?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: now, joinedAt: now, lastActiveAt: now, updatedAt: now,
      isAdmin: false, isExpert: false, expertStatus: 'none', points: 10,
      isAnonymous: partialData?.isAnonymous ?? false,
      savedQuestions: [], followers: [], following: [], bio: '', specialty: '', workplace: ''
    });
  } else {
    // === UPDATE ===
    // Chỉ update thông tin an toàn
    await updateDoc(userDocRef, { 
      lastActiveAt: now,
      ...(partialData.name && { name: partialData.name }),
      ...(partialData.avatar && { avatar: partialData.avatar }),
    });
  }
};

/* --- Auth Functions --- */
export const loginAnonymously = async () => {
  const result = await firebaseAuth.signInAnonymously(auth);
  await ensureUserDoc(result.user, { isAnonymous: true, points: 0 });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const loginWithGoogle = async () => {
  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  let avatar = result.user.photoURL || '';
  if (avatar.includes('=s96-c')) avatar = avatar.replace('=s96-c', '=s400-c');
  await ensureUserDoc(result.user, { avatar, name: result.user.displayName, email: result.user.email });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const loginWithEmail = async (email: string, pass: string) => {
  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  await ensureUserDoc(result.user, { email });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// ✅ FIX REGISTER
export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  await result.user.reload(); // Reset token
  
  // Gọi hàm tạo doc
  await ensureUserDoc(result.user, { name, email, points: 10 });
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const logoutUser = async () => await firebaseAuth.signOut(auth);

// ✅ FIX LISTENER: Chặn lỗi đỏ
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  let unsub: (() => void) | null = null;

  const authUnsub = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (unsub) { unsub(); unsub = null; }
    if (!fbUser) { callback(null); return; }

    const ref = doc(db, 'users', fbUser.uid);
    unsub = onSnapshot(ref, 
      (snap) => {
        if (snap.exists()) callback(mapUser(fbUser, snap.data()));
        else {
           // Nếu doc chưa kịp tạo, fallback UI bằng Auth và KHÔNG gọi ensureUserDoc ở đây
           callback(mapUser(fbUser)); 
        }
      },
      (err) => {
        // Chặn spam lỗi permission
        if (err.code !== 'permission-denied') console.error(err);
        callback(mapUser(fbUser));
      }
    );
  });
  return () => { if (unsub) unsub(); authUnsub(); };
};
