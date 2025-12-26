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
    joinedAt: dbUser?.joinedAt || new Date().toISOString(),
    specialty: dbUser?.specialty,
    workplace: dbUser?.workplace,
    username: dbUser?.username || null,
    coverUrl: dbUser?.coverUrl || null,
    followers: dbUser?.followers || [],
    following: dbUser?.following || [],
    // ⚠️ Giữ cơ chế của bạn: đăng nhập rồi => không phải guest
    isGuest: false,
  };
};

/* =========================
   Internal: Ensure user doc exists
   - Không phá dữ liệu cũ vì dùng merge:true
========================= */
const ensureUserDoc = async (fbUser: firebaseAuth.User, partialData: any = {}) => {
  const userDocRef = doc(db, 'users', fbUser.uid);
  await setDoc(
    userDocRef,
    {
      // các field cơ bản, dùng merge để không overwrite
      name:
        partialData?.name ||
        fbUser.displayName ||
        (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
      avatar:
        partialData?.avatar ||
        fbUser.photoURL ||
        'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      email: partialData?.email ?? fbUser.email ?? null,
      createdAt: partialData?.createdAt || new Date().toISOString(),
      joinedAt: partialData?.joinedAt || partialData?.createdAt || new Date().toISOString(),
      isExpert: partialData?.isExpert ?? false,
      expertStatus: partialData?.expertStatus ?? 'none',
      isAdmin: partialData?.isAdmin ?? false,
      points: partialData?.points ?? 0,
      isAnonymous: partialData?.isAnonymous ?? fbUser.isAnonymous ?? false,

      // ✅ cực kỳ quan trọng để nút Lưu không lỗi khi arrayUnion/arrayRemove
      savedQuestions: partialData?.savedQuestions ?? [],

      // giữ các mảng social nếu chưa có
      followers: partialData?.followers ?? [],
      following: partialData?.following ?? [],
    },
    { merge: true }
  );
};

/* =========================
   Anonymous Login
========================= */
export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  try {
    const result = await firebaseAuth.signInAnonymously(auth);
    const fbUser = result.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const newUser = {
        name: 'Khách ẩn danh',
        avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
        createdAt: new Date().toISOString(),
        joinedAt: new Date().toISOString(),
        isExpert: false,
        expertStatus: 'none',
        isAdmin: false,
        points: 0,
        isAnonymous: true,
        savedQuestions: [],
        followers: [],
        following: [],
      };

      await ensureUserDoc(fbUser, newUser);
      const freshSnap = await getDoc(userDocRef);
      return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : newUser);
    }

    // nếu doc đã có
    return mapUser(fbUser, userDoc.data());
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

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);

  // ✅ Ảnh Google HD
  let avatarUrl = fbUser.photoURL || '';
  if (avatarUrl && avatarUrl.includes('=s96-c')) {
    avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
  }

  if (userDoc.exists()) {
    const currentData: any = userDoc.data() || {};

    // nếu avatar mới khác avatar cũ thì update (doc chắc chắn tồn tại => updateDoc ok)
    if (avatarUrl && currentData.avatar !== avatarUrl) {
      await updateDoc(userDocRef, {
        avatar: avatarUrl,
        name: fbUser.displayName || currentData.name,
      });

      return mapUser(fbUser, {
        ...currentData,
        avatar: avatarUrl,
        name: fbUser.displayName || currentData.name,
      });
    }

    // đảm bảo có savedQuestions để nút Lưu không lỗi
    if (!Array.isArray(currentData.savedQuestions)) {
      await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
      return mapUser(fbUser, { ...currentData, savedQuestions: [] });
    }

    return mapUser(fbUser, currentData);
  } else {
    const newUser = {
      name: fbUser.displayName || 'Người dùng mới',
      email: fbUser.email,
      avatar: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      isExpert: false,
      expertStatus: 'none',
      isAdmin: false,
      points: 10,
      savedQuestions: [],
      followers: [],
      following: [],
    };

    await ensureUserDoc(fbUser, newUser);
    const freshSnap = await getDoc(userDocRef);
    return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : newUser);
  }
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

  const userDocRef = doc(db, 'users', fbUser.uid);

  const newUser = {
    name: name,
    email: email,
    avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
    isExpert: false,
    expertStatus: 'none',
    isAdmin: false,
    points: 10,
    savedQuestions: [],
    followers: [],
    following: [],
  };

  await ensureUserDoc(fbUser, newUser);
  const freshSnap = await getDoc(userDocRef);
  return mapUser(fbUser, freshSnap.exists() ? freshSnap.data() : newUser);
};

/* =========================
   Login Email
========================= */
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!auth) throw new Error('Firebase chưa được cấu hình.');

  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);

  // ✅ nếu thiếu doc (trường hợp dữ liệu cũ), tự tạo doc để không lỗi các chức năng sau
  if (!userDoc.exists()) {
    await ensureUserDoc(fbUser, {
      name: fbUser.displayName || 'Người dùng',
      email: fbUser.email || email,
      avatar: fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      points: 10,
      savedQuestions: [],
      followers: [],
      following: [],
    });
    const fresh = await getDoc(userDocRef);
    return mapUser(fbUser, fresh.exists() ? fresh.data() : undefined);
  }

  const data = userDoc.data();
  // đảm bảo savedQuestions là array
  if (data && !Array.isArray((data as any).savedQuestions)) {
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
   Subscribe Auth Changes
   - Giữ cơ chế UI hiện tại
   - Nếu doc chưa có: tự tạo doc (merge) để tránh lỗi về sau
========================= */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};

  return firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }

    const userDocRef = doc(db, 'users', fbUser.uid);

    const unsubFirestore = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // đảm bảo savedQuestions
          if (data && !Array.isArray((data as any).savedQuestions)) {
            await setDoc(userDocRef, { savedQuestions: [] }, { merge: true });
            callback(mapUser(fbUser, { ...data, savedQuestions: [] }));
            return;
          }

          callback(mapUser(fbUser, data));
        } else {
          // ✅ tự tạo doc khi chưa tồn tại (quan trọng)
          await ensureUserDoc(fbUser, {
            name: fbUser.displayName || (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
            avatar:
              fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
            createdAt: new Date().toISOString(),
            joinedAt: new Date().toISOString(),
            points: fbUser.isAnonymous ? 0 : 10,
            savedQuestions: [],
            followers: [],
            following: [],
          });

          const fresh = await getDoc(userDocRef);
          callback(mapUser(fbUser, fresh.exists() ? fresh.data() : undefined));
        }
      },
      (error) => {
        console.error('Firestore user sync error:', error);
        callback(mapUser(fbUser));
      }
    );

    return () => unsubFirestore();
  });
};
