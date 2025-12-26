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
   Ensure User Doc (Chỉ dùng cho Login/Register)
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  
  let existing: any = undefined;
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) existing = snap.data();
  } catch (e) { console.warn("Check user doc error", e); }

  // Chuẩn bị dữ liệu an toàn
  const baseData = {
    name: partialData?.name || existing?.name || fbUser.displayName || 'Người dùng',
    email: partialData?.email || fbUser.email,
    avatar: partialData?.avatar || existing?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    lastActiveAt: now,
    updatedAt: now,
  };

  if (!existing) {
    // --- TRƯỜNG HỢP TẠO MỚI (CREATE) ---
    // Ghi đè setDoc để đảm bảo tạo được document
    await setDoc(userDocRef, {
      ...baseData,
      createdAt: now,
      joinedAt: now,
      // Các trường mặc định bắt buộc
      isAdmin: false, 
      isExpert: false,
      expertStatus: 'none',
      points: partialData?.points ?? 10,
      isAnonymous: partialData?.isAnonymous ?? fbUser.isAnonymous ?? false,
      savedQuestions: [], followers: [], following: [],
      bio: '', specialty: '', workplace: ''
    });
  } else {
    // --- TRƯỜNG HỢP CẬP NHẬT (UPDATE) ---
    // Chỉ update các trường an toàn, không đụng vào quyền hạn
    await updateDoc(userDocRef, baseData);
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
  // Khi login, chỉ update lastActiveAt, không cố tạo lại doc nếu không cần thiết
  await ensureUserDoc(result.user, { email });
  
  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

export const logoutUser = async () => {
  await firebaseAuth.signOut(auth);
};

// ✅ FIX QUAN TRỌNG: Register
export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  // 1. Tạo Auth
  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  
  // 2. Cập nhật tên hiển thị
  await firebaseAuth.updateProfile(result.user, { displayName: name });
  
  // 3. Reload user để lấy token mới nhất (Tránh lỗi permission)
  await result.user.reload(); 

  // 4. Ghi Data vào Firestore (Bắt lỗi cụ thể nếu thất bại)
  try {
    await ensureUserDoc(result.user, { name, email, points: 10 });
  } catch (error) {
    console.error("❌ Lỗi ghi Firestore:", error);
    // Vẫn trả về user auth để không crash app, nhưng log lỗi để debug
  }

  const snap = await getDoc(doc(db, 'users', result.user.uid));
  return mapUser(result.user, snap.data());
};

// ✅ FIX QUAN TRỌNG: Listener chỉ ĐỌC, KHÔNG GHI (Tránh xung đột)
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  let unsub: (() => void) | null = null;

  const unsubAuth = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (unsub) { unsub(); unsub = null; }

    if (!fbUser) {
      callback(null);
      return;
    }

    const userRef = doc(db, 'users', fbUser.uid);
    unsub = onSnapshot(userRef, 
      (docSnap) => {
        if (docSnap.exists()) {
           // Có data -> Trả về User đầy đủ
           callback(mapUser(fbUser, docSnap.data()));
        } else {
           // Chưa có data (đang tạo) -> Trả về thông tin từ Auth (UI không bị trắng)
           // ⚠️ KHÔNG gọi ensureUserDoc ở đây nữa!
           callback(mapUser(fbUser));
        }
      },
      (error) => {
        // Bỏ qua lỗi permission khi đang logout/login
        if (error.code !== 'permission-denied') console.warn("Auth Sub Warning:", error.message);
        callback(mapUser(fbUser));
      }
    );
  });

  return () => { if (unsub) unsub(); unsubAuth(); };
};
