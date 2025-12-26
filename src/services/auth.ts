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
   Ensure User Doc (QUAN TRỌNG: FIX LỖI PERMISSION)
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  let existing: any = undefined;

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) existing = snap.data();
  } catch (e) { /* Ignore */ }

  if (!existing) {
    // === CASE CREATE (Tạo mới) ===
    // Chỉ set các field được Rules cho phép
    // Lưu ý: KHÔNG set isAdmin: true ở đây bao giờ
    await setDoc(userDocRef, {
      name: partialData?.name || fbUser.displayName || 'Người dùng',
      email: partialData?.email || fbUser.email,
      avatar: partialData?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      
      createdAt: now,
      joinedAt: now,
      lastActiveAt: now,
      updatedAt: now,

      // Các field mặc định
      isAdmin: false, 
      isExpert: false,
      expertStatus: 'none',
      points: partialData?.points ?? 10,
      isAnonymous: partialData?.isAnonymous ?? fbUser.isAnonymous ?? false,
      
      savedQuestions: [],
      followers: [],
      following: [],
      bio: '',
      specialty: '',
      workplace: ''
    });
  } else {
    // === CASE UPDATE (Cập nhật) ===
    // Chỉ update thời gian và thông tin cơ bản, KHÔNG gửi lại quyền hạn
    await updateDoc(userDocRef, {
      lastActiveAt: now,
      // Nếu có thông tin mới thì update, không thì thôi
      ...(partialData.name ? { name: partialData.name } : {}),
      ...(partialData.avatar ? { avatar: partialData.avatar } : {}),
    });
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

// ✅ FIX: Register với Reload User
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // ⚡ Reload để lấy token mới nhất (tránh lỗi invalid-credential)
  await result.user.reload(); 

  // Tạo Doc Firestore
  await ensureUserDoc(result.user, { name, email, points: 10 });
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// ✅ FIX: Listener an toàn
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
           // Nếu chưa có doc, chỉ trả về info từ Auth (để UI không chờ mãi)
           callback(mapUser(fbUser));
        }
      },
      (error) => {
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
