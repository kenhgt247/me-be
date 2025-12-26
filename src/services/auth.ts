import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

/* =========================
   Helper: Map User
========================= */
const mapUser = (fbUser: firebaseAuth.User, dbUser?: any): User => {
  return {
    id: fbUser.uid,
    name: dbUser?.name || fbUser.displayName || (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
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

/* =========================
   Ensure User Doc (Safe)
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  let existing: any = undefined;

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) existing = snap.data();
  } catch (e) {}

  const safeBaseData = {
    name: partialData?.name || existing?.name || fbUser.displayName || 'Người dùng',
    avatar: partialData?.avatar || existing?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    email: existing?.email ?? partialData?.email ?? fbUser.email ?? null,
    savedQuestions: existing?.savedQuestions || [],
    followers: existing?.followers || [],
    following: existing?.following || [],
    lastActiveAt: now,
    updatedAt: now,
  };

  if (!existing) {
    await setDoc(userDocRef, {
      ...safeBaseData,
      createdAt: now,
      joinedAt: now,
      isAdmin: false, 
      isExpert: false,
      expertStatus: 'none',
      points: partialData?.points ?? 10,
      username: null, bio: '', specialty: '', workplace: '',
    });
  } else {
    await setDoc(userDocRef, safeBaseData, { merge: true });
  }
};

/* =========================
   AUTH FUNCTIONS
========================= */
export const loginAnonymously = async (): Promise<User> => {
  const result = await firebaseAuth.signInAnonymously(auth);
  await ensureUserDoc(result.user, { isAnonymous: true, points: 0 });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const loginWithGoogle = async (): Promise<User> => {
  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  let avatarUrl = result.user.photoURL || '';
  if (avatarUrl.includes('=s96-c')) avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
  
  await ensureUserDoc(result.user, { avatar: avatarUrl, name: result.user.displayName, email: result.user.email });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  await ensureUserDoc(result.user, { email });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const logoutUser = async () => {
  await firebaseAuth.signOut(auth);
};

// ✅ FIX LỖI "invalid-credential" KHI ĐĂNG KÝ
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  
  // Update profile sẽ làm token cũ bị vô hiệu hóa
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // ⚡ QUAN TRỌNG: Làm mới user ngay lập tức để lấy token hợp lệ
  await result.user.reload(); 

  await ensureUserDoc(result.user, { name, email, points: 10 });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// ✅ FIX LỖI SPAM CONSOLE ĐỎ
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  let unsubUserDoc: (() => void) | null = null;
  let stopped = false;

  const unsubAuth = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
    stopped = false;

    if (!fbUser) {
      callback(null);
      return;
    }

    const userRef = doc(db, 'users', fbUser.uid);
    unsubUserDoc = onSnapshot(userRef, 
      (docSnap) => {
        if (stopped) return;
        if (docSnap.exists()) {
           callback(mapUser(fbUser, docSnap.data()));
        } else {
           // Fallback nếu doc chưa tạo kịp
           callback(mapUser(fbUser));
        }
      },
      (error) => {
        // ⚡ QUAN TRỌNG: Chặn lỗi permission/auth để không spam console
        if (error.code === 'permission-denied' || error.code === 'auth/invalid-credential') {
          stopped = true;
          if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
          // Vẫn giữ user state ở UI
          callback(mapUser(fbUser)); 
          return;
        }
        console.error("Auth Listener Error:", error);
      }
    );
  });

  return () => {
    if (unsubUserDoc) unsubUserDoc();
    unsubAuth();
  };
};
