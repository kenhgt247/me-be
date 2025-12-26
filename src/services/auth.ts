// src/services/auth.ts
import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

/* =========================
   Helper: Map Firebase User + Firestore Data to App User Type
========================= */
const mapUser = (fbUser: firebaseAuth.User, dbUser?: any): User => {
  return {
    id: fbUser.uid,
    name:
      dbUser?.name ||
      fbUser.displayName ||
      (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
    avatar:
      dbUser?.avatar ||
      fbUser.photoURL ||
      'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',

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

    // ✅ Cực quan trọng để UI nút Lưu + đồng bộ F5
    savedQuestions: Array.isArray(dbUser?.savedQuestions) ? dbUser.savedQuestions : [],

    // ⚠️ Giữ cơ chế của bạn: đăng nhập rồi => không phải guest
    isGuest: false,
  } as User;
};

/* =========================
   Internal: Ensure user doc exists (ĐÃ FIX LỖI PERMISSION)
   - Tách biệt logic Create và Update để tránh vi phạm Rules
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();

  // 1. Kiểm tra xem doc đã tồn tại chưa
  let existing: any = undefined;
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) existing = snap.data();
  } catch (e) {
    // Bỏ qua lỗi nếu chưa có quyền đọc hoặc mạng lỗi, giả định là chưa có để xử lý tiếp
  }

  // 2. Chuẩn bị dữ liệu an toàn (đây là các field Rules cho phép update)
  // Logic: Nếu partialData có thì dùng, nếu không thì dùng existing, nếu không nữa thì lấy từ fbUser
  const safeBaseData = {
    name:
      partialData?.name ||
      existing?.name ||
      fbUser.displayName ||
      (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
    avatar:
      partialData?.avatar ||
      existing?.avatar ||
      fbUser.photoURL ||
      'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    email: existing?.email ?? partialData?.email ?? fbUser.email ?? null,
    isAnonymous: existing?.isAnonymous ?? partialData?.isAnonymous ?? fbUser.isAnonymous ?? false,
    
    // Arrays: Merge an toàn, ưu tiên cái có dữ liệu
    savedQuestions: existing?.savedQuestions || partialData?.savedQuestions || [],
    followers: existing?.followers || partialData?.followers || [],
    following: existing?.following || partialData?.following || [],

    // Luôn update thời gian active
    lastActiveAt: now,
    updatedAt: now,
  };

  if (!existing) {
    // === TRƯỜNG HỢP 1: TẠO MỚI (CREATE) ===
    // Rules cho phép set isAdmin/isExpert = false khi tạo mới
    await setDoc(userDocRef, {
      ...safeBaseData,
      createdAt: now,
      joinedAt: now,
      
      // Các field nhạy cảm chỉ được set khi tạo mới
      isAdmin: false, 
      isExpert: false,
      expertStatus: 'none',
      points: partialData?.points ?? (fbUser.isAnonymous ? 0 : 10),
      
      username: null,
      bio: '',
      specialty: '',
      workplace: '',
    });
  } else {
    // === TRƯỜNG HỢP 2: CẬP NHẬT (UPDATE) ===
    // ⚠️ QUAN TRỌNG: KHÔNG gửi isAdmin, isExpert, points, createdAt
    // Firestore Rules update chặn các field này.
    
    // Chỉ ghi đè các field có trong safeBaseData
    await setDoc(userDocRef, safeBaseData, { merge: true });
  }
};

/* =========================
   Anonymous Login
========================= */
export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  try {
    const result = await firebaseAuth.signInAnonymously(auth);
    const fbUser = result.user;

    // ensureUserDoc đã được viết lại để xử lý logic check tồn tại bên trong
    await ensureUserDoc(fbUser, {
        isAnonymous: true,
        points: 0
    });

    const userDocRef = doc(db, 'users', fbUser.uid);
    const freshSnap = await getDoc(userDocRef);
    return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);

  } catch (error: any) {
    console.warn('Anonymous login failed:', error?.code);
    if (
      error?.code === 'auth/admin-restricted-operation' ||
      error?.code === 'auth/operation-not-allowed'
    ) {
      throw new Error('ANONYMOUS_DISABLED');
    }
    throw error;
  }
};

/* =========================
   Google Login
========================= */
export const loginWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  // Xử lý ảnh HD
  let avatarUrl = fbUser.photoURL || '';
  if (avatarUrl && avatarUrl.includes('=s96-c')) {
    avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
  }

  // Gọi ensureUserDoc để đồng bộ (nó tự xử lý create hoặc update avatar nếu cần)
  await ensureUserDoc(fbUser, {
    avatar: avatarUrl,
    name: fbUser.displayName,
    email: fbUser.email
  });

  const userDocRef = doc(db, 'users', fbUser.uid);
  const freshSnap = await getDoc(userDocRef);
  return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);
};

/* =========================
   Register Email
========================= */
export const registerWithEmail = async (
  email: string,
  pass: string,
  name: string
): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  await firebaseAuth.updateProfile(fbUser, { displayName: name });

  await ensureUserDoc(fbUser, {
    name,
    email,
    points: 10,
  });

  const userDocRef = doc(db, 'users', fbUser.uid);
  const freshSnap = await getDoc(userDocRef);
  return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);
};

/* =========================
   Login Email
========================= */
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  // Ensure doc tồn tại và cập nhật lastActiveAt
  await ensureUserDoc(fbUser, {
      email: fbUser.email || email
  });

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);
  return mapUser(fbUser, userDoc.exists() ? userDoc.data() : undefined);
};

/* =========================
   Logout
========================= */
export const logoutUser = async () => {
  if (!auth) return;
  await firebaseAuth.signOut(auth);
};

/* =========================
   Subscribe Auth Changes
========================= */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};

  let unsubUserDoc: (() => void) | null = null;
  let stoppedDueToPermission = false;

  const unsubAuth = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    // cleanup listener cũ
    if (unsubUserDoc) {
      unsubUserDoc();
      unsubUserDoc = null;
    }
    stoppedDueToPermission = false;

    if (!fbUser) {
      callback(null);
      return;
    }

    const userDocRef = doc(db, 'users', fbUser.uid);

    unsubUserDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (stoppedDueToPermission) return;

        void (async () => {
          try {
            if (docSnap.exists()) {
              const data: any = docSnap.data() || {};
              
              // Kiểm tra mảng savedQuestions để tránh lỗi UI
              if (!Array.isArray(data.savedQuestions)) {
                 // Update nhỏ, không đụng vào admin/isExpert nên an toàn
                 await updateDoc(userDocRef, { savedQuestions: [] });
                 data.savedQuestions = [];
              }
              
              callback(mapUser(fbUser, data));
            } else {
              // Nếu doc chưa tồn tại (lỗi mạng hoặc delay tạo), thử tạo lại
              await ensureUserDoc(fbUser);
              const fresh = await getDoc(userDocRef);
              callback(mapUser(fbUser, fresh.exists() ? fresh.data() : undefined));
            }
          } catch (err: any) {
            if (err?.code === 'permission-denied') {
              stoppedDueToPermission = true;
              if (unsubUserDoc) {
                unsubUserDoc();
                unsubUserDoc = null;
              }
              // Vẫn trả về user từ auth để UI không bị crash
              callback(mapUser(fbUser, docSnap.exists() ? docSnap.data() : undefined));
              return;
            }
            console.error('Auth snapshot handler error:', err);
            callback(mapUser(fbUser, docSnap.exists() ? docSnap.data() : undefined));
          }
        })();
      },
      (error: any) => {
        if (error?.code === 'permission-denied') {
          stoppedDueToPermission = true;
          if (unsubUserDoc) {
             unsubUserDoc();
             unsubUserDoc = null;
          }
          callback(mapUser(fbUser));
          return;
        }
        console.error('Firestore user sync error:', error);
        callback(mapUser(fbUser));
      }
    );
  });

  return () => {
    if (unsubUserDoc) unsubUserDoc();
    unsubAuth();
  };
};
