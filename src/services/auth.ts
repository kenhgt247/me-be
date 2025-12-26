import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

/* =========================
   Helper: Map User
========================= */
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
    joinedAt: dbUser?.joinedAt || new Date().toISOString(),
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
   HÀM GHI DỮ LIỆU USER (QUAN TRỌNG)
========================= */
const createUserDocument = async (user: firebaseAuth.User, extraData: any = {}) => {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  
  try {
    // Kiểm tra xem đã có chưa
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      // Nếu có rồi thì thôi, chỉ update lastActive
      await setDoc(userRef, { lastActiveAt: new Date().toISOString() }, { merge: true });
      return;
    }

    // Chuẩn bị data (Loại bỏ undefined)
    const now = new Date().toISOString();
    const userData = {
      uid: user.uid,
      email: user.email || '',
      name: extraData.name || user.displayName || 'Người dùng',
      avatar: extraData.avatar || user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: now,
      joinedAt: now,
      lastActiveAt: now,
      updatedAt: now,
      isAdmin: false,
      isExpert: false,
      expertStatus: 'none',
      points: 10,
      isAnonymous: user.isAnonymous,
      savedQuestions: [],
      followers: [],
      following: []
    };

    console.log("🔥 Đang ghi Firestore cho:", user.email);
    await setDoc(userRef, userData);
    console.log("✅ Ghi Firestore THÀNH CÔNG!");

  } catch (error) {
    console.error("❌ LỖI GHI FIRESTORE:", error);
    // Không ném lỗi để app không crash, nhưng đã log ra console
  }
};

/* =========================
   CÁC HÀM AUTH
========================= */

// 1. Đăng ký Email
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  // Tạo Auth
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  
  // Cập nhật tên
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // Reload để lấy token mới nhất (tránh lỗi permission)
  await result.user.reload();

  // Ghi Data
  await createUserDocument(result.user, { name, email });

  // Trả về kết quả
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// 2. Đăng nhập Google
export const loginWithGoogle = async (): Promise<User> => {
  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  
  let avatarUrl = result.user.photoURL || '';
  if (avatarUrl.includes('=s96-c')) avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');

  await createUserDocument(result.user, { avatar: avatarUrl });
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// 3. Đăng nhập Email
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  // Login thì không cần tạo mới, hàm này tự check if exists
  await createUserDocument(result.user);
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// 4. Đăng nhập Ẩn danh
export const loginAnonymously = async (): Promise<User> => {
  const result = await firebaseAuth.signInAnonymously(auth);
  await createUserDocument(result.user, { isAnonymous: true, points: 0 });
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const logoutUser = async () => {
  await firebaseAuth.signOut(auth);
};

// 5. Listener (Chỉ đọc, không ghi để tránh loop)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  let unsub: (() => void) | null = null;

  const authUnsub = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (unsub) { unsub(); unsub = null; }

    if (!fbUser) {
      callback(null);
      return;
    }

    // Lắng nghe thay đổi data user
    const ref = doc(db, 'users', fbUser.uid);
    unsub = onSnapshot(ref, 
      (snap) => {
        if (snap.exists()) {
          callback(mapUser(fbUser, snap.data()));
        } else {
          // Fallback: Nếu data chưa kịp tạo, hiển thị thông tin từ Auth
          callback(mapUser(fbUser));
        }
      },
      (err) => {
        // Bỏ qua lỗi permission khi logout
        if (err.code !== 'permission-denied') console.error(err);
      }
    );
  });

  return () => { if (unsub) unsub(); authUnsub(); };
};
