import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

// Helper: Map Firebase User + Firestore Data to App User Type
const mapUser = (fbUser: firebaseAuth.User, dbUser?: any): User => {
  return {
    id: fbUser.uid,
    // Ưu tiên lấy tên từ DB -> Auth -> Giá trị mặc định
    name: dbUser?.name || fbUser.displayName || (fbUser.isAnonymous ? 'Khách ẩn danh' : 'Người dùng'),
    // Ưu tiên lấy avatar từ DB -> Auth -> Ảnh mặc định
    avatar: dbUser?.avatar || fbUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    isExpert: dbUser?.isExpert || false,
    expertStatus: dbUser?.expertStatus || 'none',
    isAdmin: dbUser?.isAdmin || false,
    bio: dbUser?.bio || '',
    points: dbUser?.points || 0,
    joinedAt: dbUser?.joinedAt || new Date().toISOString(),
    specialty: dbUser?.specialty,
    workplace: dbUser?.workplace,
    username: dbUser?.username || null, // Thêm trường username
    coverUrl: dbUser?.coverUrl || null, // Thêm trường coverUrl
    followers: dbUser?.followers || [],
    following: dbUser?.following || [],
    isGuest: false // Once logged in (even anonymously), they are no longer a "UI Guest"
  };
};

export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  
  try {
    const result = await firebaseAuth.signInAnonymously(auth);
    const fbUser = result.user;
    
    // Create a minimal user record in Firestore for the anonymous user
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
       const newUser = {
          name: 'Khách ẩn danh',
          avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
          createdAt: new Date().toISOString(),
          isExpert: false,
          points: 0,
          isAnonymous: true
       };
       await setDoc(userDocRef, newUser);
       return mapUser(fbUser, newUser);
    }

    return mapUser(fbUser, userDoc.data());
  } catch (error: any) {
    console.warn("Anonymous login failed, likely disabled in console:", error.code);
    if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        throw new Error("ANONYMOUS_DISABLED");
    }
    throw error;
  }
};

export const loginWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  
  const result = await firebaseAuth.signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  
  // Check if user exists in Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    return mapUser(fbUser, userDoc.data());
  } else {
    // --- FIX: Lấy ảnh HD từ Google và xử lý tạo mới ---
    let avatarUrl = fbUser.photoURL;
    // Google photoURL thường có dạng s96-c (96px), thay bằng s400-c để nét hơn
    if (avatarUrl && avatarUrl.includes('=s96-c')) {
        avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
    }

    // Create new user in Firestore
    const newUser = {
      name: fbUser.displayName || 'Người dùng mới',
      email: fbUser.email,
      avatar: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: new Date().toISOString(),
      isExpert: false,
      expertStatus: 'none',
      points: 10 // Welcome points
    };
    await setDoc(userDocRef, newUser);
    return mapUser(fbUser, newUser);
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");

  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;
  
  // Update Display Name in Auth
  await firebaseAuth.updateProfile(fbUser, { displayName: name });
  
  // Create Firestore Document
  const newUser = {
    name: name,
    email: email,
    avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    createdAt: new Date().toISOString(),
    isExpert: false,
    expertStatus: 'none',
    points: 10
  };
  
  await setDoc(doc(db, 'users', fbUser.uid), newUser);
  return mapUser(fbUser, newUser);
};

export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");

  const result = await firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;
  
  const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
  if (userDoc.exists()) {
    return mapUser(fbUser, userDoc.data());
  }
  
  return mapUser(fbUser);
};

export const logoutUser = async () => {
  if (!auth) return;
  await firebaseAuth.signOut(auth);
};

// IMPROVED: Use onSnapshot for real-time user data updates from Firestore
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  
  return firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      // Set up a real-time listener for the user document
      const userDocRef = doc(db, 'users', fbUser.uid);
      const unsubFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(mapUser(fbUser, docSnap.data()));
        } else {
            // Fallback if doc doesn't exist yet (e.g. right after creation)
            // Fix: Vẫn map fbUser để có thông tin cơ bản
            callback(mapUser(fbUser));
        }
      }, (error) => {
          console.error("Firestore user sync error:", error);
          callback(mapUser(fbUser));
      });

      return () => unsubFirestore();
    } else {
      callback(null);
    }
  });
};
