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

    // ✅ cực quan trọng để UI nút Lưu + đồng bộ F5
    savedQuestions: Array.isArray(dbUser?.savedQuestions) ? dbUser.savedQuestions : [],

    // ⚠️ Giữ cơ chế của bạn: đăng nhập rồi => không phải guest
    isGuest: false,
  } as User;
};

/* =========================
   Internal: Ensure user doc exists (SAFE & NO-PERMISSION BUG)
   ✅ FIX CHÍNH:
   - ÉP token mới sau đăng nhập/đăng ký ở các flow bên dưới
   - Payload "safe": KHÔNG set isAdmin/isExpert từ client (tránh rules chặn)
   - merge:true để không overwrite dữ liệu cũ
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);

  let existing: any = {};
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) existing = snap.data();
  } catch {
    // ignore
  }

  const now = new Date().toISOString();
  const createdAt = existing?.createdAt || partialData?.createdAt || now;
  const joinedAt = existing?.joinedAt || partialData?.joinedAt || createdAt;

  const savedQuestions = Array.isArray(existing?.savedQuestions)
    ? existing.savedQuestions
    : Array.isArray(partialData?.savedQuestions)
      ? partialData.savedQuestions
      : [];

  const followers = Array.isArray(existing?.followers)
    ? existing.followers
    : Array.isArray(partialData?.followers)
      ? partialData.followers
      : [];

  const following = Array.isArray(existing?.following)
    ? existing.following
    : Array.isArray(partialData?.following)
      ? partialData.following
      : [];

  // ✅ Payload an toàn: KHÔNG gửi isAdmin/isExpert từ client
  const safePayload: any = {
    name:
      existing?.name ||
      partialData?.name ||
      fbUser.displayName ||
      (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),

    avatar:
      existing?.avatar ||
      partialData?.avatar ||
      fbUser.photoURL ||
      'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',

    email: existing?.email ?? partialData?.email ?? fbUser.email ?? null,

    createdAt,
    joinedAt,

    // expertStatus phục vụ UI
    expertStatus: existing?.expertStatus ?? partialData?.expertStatus ?? 'none',

    points: existing?.points ?? partialData?.points ?? (fbUser.isAnonymous ? 0 : 10),
    isAnonymous: existing?.isAnonymous ?? partialData?.isAnonymous ?? fbUser.isAnonymous ?? false,

    savedQuestions,
    followers,
    following,

    updatedAt: now,
  };

  await setDoc(userDocRef, safePayload, { merge: true });
};

/* =========================
   Anonymous Login
   ✅ FIX: ép token trước khi ghi Firestore
========================= */
export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  try {
    const result = await firebaseAuth.signInAnonymously(auth);
    const fbUser = result.user;

    // ✅ FIX RACE TOKEN
    await fbUser.getIdToken(true);

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await ensureUserDoc(fbUser, {
        name: 'Khách ẩn danh',
        avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
        createdAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        points: 0,
        isAnonymous: true,
        expertStatus: 'none',
        savedQuestions: [],
        followers: [],
        following: [],
      });

      const freshSnap = await getDoc(userDocRef);
      return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);
    }

    const data: any = userDoc.data() || {};

    // đảm bảo savedQuestions tồn tại
    if (!Array.isArray(data.savedQuestions)) {
      await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
      return mapUser(fbUser, { ...data, savedQuestions: [] });
    }

    return mapUser(fbUser, data);
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
   ✅ FIX: ép token trước khi ghi Firestore
========================= */
export const loginWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  // ✅ FIX RACE TOKEN
  await fbUser.getIdToken(true);

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);

  // ✅ Ảnh Google HD
  let avatarUrl = fbUser.photoURL || '';
  if (avatarUrl && avatarUrl.includes('=s96-c')) {
    avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
  }

  if (userDoc.exists()) {
    const currentData: any = userDoc.data() || {};

    // ✅ đảm bảo savedQuestions tồn tại
    if (!Array.isArray(currentData.savedQuestions)) {
      await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
      currentData.savedQuestions = [];
    }

    // ✅ nếu avatar mới khác avatar cũ thì update
    if (avatarUrl && currentData.avatar !== avatarUrl) {
      await updateDoc(userDocRef, {
        avatar: avatarUrl,
        name: fbUser.displayName || currentData.name,
        updatedAt: new Date().toISOString(),
      });

      return mapUser(fbUser, {
        ...currentData,
        avatar: avatarUrl,
        name: fbUser.displayName || currentData.name,
      });
    }

    return mapUser(fbUser, currentData);
  }

  // doc chưa tồn tại -> tạo
  await ensureUserDoc(fbUser, {
    name: fbUser.displayName || 'Người dùng mới',
    email: fbUser.email,
    avatar: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    points: 10,
    isAnonymous: false,
    expertStatus: 'none',
    savedQuestions: [],
    followers: [],
    following: [],
  });

  const freshSnap = await getDoc(userDocRef);
  return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);
};

/* =========================
   Register Email
   ✅ FIX: ép token mới trước khi setDoc users/{uid}
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

  // ✅ FIX RACE TOKEN (quan trọng nhất)
  await fbUser.getIdToken(true);

  const userDocRef = doc(db, 'users', fbUser.uid);

  await ensureUserDoc(fbUser, {
    name,
    email,
    avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    points: 10,
    isAnonymous: false,
    expertStatus: 'none',
    savedQuestions: [],
    followers: [],
    following: [],
  });

  const freshSnap = await getDoc(userDocRef);
  return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : undefined);
};

/* =========================
   Login Email
   ✅ FIX: ép token trước khi đọc/ghi Firestore
========================= */
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  // ✅ FIX RACE TOKEN
  await fbUser.getIdToken(true);

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);

  // ✅ nếu thiếu doc -> tạo để các chức năng sau không lỗi
  if (!userDoc.exists()) {
    await ensureUserDoc(fbUser, {
      name: fbUser.displayName || 'Người dùng',
      email: fbUser.email || email,
      avatar: fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      points: 10,
      isAnonymous: fbUser.isAnonymous,
      expertStatus: 'none',
      savedQuestions: [],
      followers: [],
      following: [],
    });

    const fresh = await getDoc(userDocRef);
    return mapUser(fbUser, fresh.exists() ? fresh.data() : undefined);
  }

  const data: any = userDoc.data() || {};

  // ✅ đảm bảo savedQuestions là array
  if (!Array.isArray(data.savedQuestions)) {
    await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
    return mapUser(fbUser, { ...data, savedQuestions: [] });
  }

  return mapUser(fbUser, data);
};

/* =========================
   Logout
========================= */
export const logoutUser = async () => {
  if (!auth) return;
  await firebaseAuth.signOut(auth);
};

/* =========================
   Subscribe Auth Changes (FIX TRIỆT ĐỂ SPAM LỖI)
   - Cleanup đúng chuẩn
   - Nếu permission-denied => unsubscribe để dừng retry spam
========================= */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};

  let unsubUserDoc: (() => void) | null = null;
  let stoppedDueToPermission = false;

  const unsubAuth = firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    // ✅ huỷ listener cũ mỗi khi auth thay đổi
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

              // đảm bảo savedQuestions
              if (!Array.isArray(data.savedQuestions)) {
                await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
                callback(mapUser(fbUser, { ...data, savedQuestions: [] }));
                return;
              }

              callback(mapUser(fbUser, data));
              return;
            }

            // doc chưa có -> tạo
            // ✅ FIX RACE TOKEN trước khi ensure (tăng độ chắc)
            await fbUser.getIdToken(true);

            await ensureUserDoc(fbUser, {
              name: fbUser.displayName || (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
              avatar: fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
              createdAt: new Date().toISOString(),
              joinedAt: new Date().toISOString(),
              points: fbUser.isAnonymous ? 0 : 10,
              savedQuestions: [],
              followers: [],
              following: [],
              isAnonymous: fbUser.isAnonymous,
              expertStatus: 'none',
            });

            const fresh = await getDoc(userDocRef);
            callback(mapUser(fbUser, fresh.exists() ? fresh.data() : undefined));
          } catch (err: any) {
            if (err?.code === 'permission-denied') {
              stoppedDueToPermission = true;
              if (unsubUserDoc) {
                unsubUserDoc();
                unsubUserDoc = null;
              }
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
