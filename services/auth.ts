
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebaseConfig';
import { User } from '../types';

// Helper: Map Firebase User + Firestore Data to App User Type
const mapUser = (fbUser: FirebaseUser, dbUser?: any): User => {
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
    isGuest: false
  };
};

export const loginWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  
  const result = await signInWithPopup(auth, googleProvider);
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

  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;
  
  // Update Display Name in Auth
  await updateProfile(fbUser, { displayName: name });
  
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

  const result = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;
  
  const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
  if (userDoc.exists()) {
    return mapUser(fbUser, userDoc.data());
  }
  
  return mapUser(fbUser);
};

export const logoutUser = async () => {
  if (!auth) return;
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  
  return onAuthStateChanged(auth, async (fbUser) => {
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
