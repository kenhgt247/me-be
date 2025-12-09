import * as firebaseAuth from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

// Helper: Map Firebase User + Firestore Data to App User Type
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
    joinedAt: dbUser?.joinedAt || new Date().toISOString(),
    specialty: dbUser?.specialty,
    workplace: dbUser?.workplace,
    isGuest: false // Once logged in (even anonymously), they are no longer a "UI Guest"
  };
};

export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  
  try {
    const result = await firebaseAuth.signInAnonymously(auth);
    const fbUser = result.user;
    
    // Create a minimal user record in Firestore for the anonymous user
    // This allows them to have notifications, likes, etc.
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
    // If anonymous auth is disabled or restricted, throw specific error to trigger Auth Modal
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
    // Create new user in Firestore
    const newUser = {
      name: fbUser.displayName || 'Người dùng mới',
      email: fbUser.email,
      avatar: fbUser.photoURL,
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

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  
  return firebaseAuth.onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : undefined;
        callback(mapUser(fbUser, userData));
      } catch (e) {
        // Fallback if firestore fails (e.g. permission rules)
        callback(mapUser(fbUser));
      }
    } else {
      callback(null);
    }
  });
};