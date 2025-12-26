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

/* =========================
   HÀM GHI DỮ LIỆU CỐT LÕI (FORCE WRITE)
========================= */
const forceCreateUserDoc = async (user: firebaseAuth.User, extraName?: string) => {
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  // Kiểm tra xem đã có chưa để tránh ghi đè data cũ
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    await updateDoc(userRef, { lastActiveAt: now });
    return;
  }

  // Dữ liệu chuẩn (Đơn giản hóa để tránh Rules chặn)
  const userData = {
    uid: user.uid, // Lưu thêm uid vào trong doc để dễ query
    email: user.email,
    name: extraName || user.displayName || 'Người dùng',
    avatar: user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    createdAt: now,
    joinedAt: now,
    lastActiveAt: now,
    updatedAt: now,
    
    isAdmin: false,
    isExpert: false,
    expertStatus: 'none',
    points: 10,
    isAnonymous: user.isAnonymous,
    
    // Các mảng khởi tạo rỗng
    savedQuestions: [],
    followers: [],
    following: []
  };

  console.log("🔥 BẮT ĐẦU GHI FIRESTORE CHO:", user.email);
  try {
    await setDoc(userRef, userData);
    console.log("✅ GHI FIRESTORE THÀNH CÔNG!");
  } catch (error: any) {
    console.error("❌ LỖI GHI FIRESTORE:", error);
    alert("LỖI GHI DỮ LIỆU: " + error.message); // Hiện thông báo cho bạn thấy
    throw error;
  }
};

/* =========================
   AUTH FUNCTIONS
========================= */

// 1. Đăng ký (Sửa mạnh tay)
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  // Tạo Auth
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  
  // Cập nhật Profile Auth
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // Reload Token
  await result.user.reload();

  // Ghi Data (Gọi hàm force ở trên)
  await forceCreateUserDoc(result.user, name);

  // Trả về data mới nhất
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// 2. Login Google
export const loginWithGoogle = async (): Promise<User> => {
  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  await forceCreateUserDoc(result.user);
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// 3. Login Email
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  await forceCreateUserDoc(result.user); // Đảm bảo login cũng check/tạo doc nếu thiếu
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const logoutUser = async () => {
  await firebaseAuth.signOut(auth);
};

// 4. Listener (Chỉ đọc)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  let unsub: (() => void) | null = null;

  const authUnsub = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (unsub) { unsub(); unsub = null; }

    if (!fbUser) {
      callback(null);
      return;
    }

    const ref = doc(db, 'users', fbUser.uid);
    unsub = onSnapshot(ref, 
      (snap) => {
        if (snap.exists()) {
          callback(mapUser(fbUser, snap.data()));
        } else {
          // Nếu chưa có data, fallback về Auth info
          callback(mapUser(fbUser));
        }
      },
      (err) => {
        if (err.code !== 'permission-denied') console.error(err);
        // Không callback(null) để tránh UI bị flash logout
      }
    );
  });

  return () => { if (unsub) unsub(); authUnsub(); };
};
