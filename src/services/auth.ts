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
  } catch (e) { /* Ignore */ }

  const baseData = {
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
    // CREATE: Set các field mặc định
    await setDoc(userDocRef, {
      ...baseData,
      createdAt: now,
      joinedAt: now,
      isAdmin: false, 
      isExpert: false,
      expertStatus: 'none',
      points: 10,
      username: null, bio: '', specialty: '', workplace: '',
    });
  } else {
    // UPDATE: Không set isAdmin/isExpert
    await setDoc(userDocRef, baseData, { merge: true });
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

// ✅ FIX CHÍNH: Register
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  // 1. Tạo Auth
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  
  // 2. Update Profile
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // 3. Reload Token (Quan trọng để không bị lỗi permission)
  await result.user.reload(); 

  // 4. Tạo Doc (Firestore Rules phải cho phép create nếu là owner)
  await ensureUserDoc(result.user, { name, email, points: 10 });
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

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
        // Chặn lỗi đỏ console
        if (error.code === 'permission-denied' || error.code === 'auth/invalid-credential') {
          stopped = true;
          if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }
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
