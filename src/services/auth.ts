import * as firebaseAuth from 'firebase/auth';
// ✅ THÊM updateDoc VÀO IMPORT
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'; 
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
    username: dbUser?.username || null,
    coverUrl: dbUser?.coverUrl || null,
    followers: dbUser?.followers || [],
    following: dbUser?.following || [],
    isGuest: false 
  };
};

export const loginAnonymously = async (): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");
  
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
         isExpert: false,
         points: 0,
         isAnonymous: true
       };
       await setDoc(userDocRef, newUser);
       return mapUser(fbUser, newUser);
    }

    return mapUser(fbUser, userDoc.data());
  } catch (error: any) {
    console.warn("Anonymous login failed:", error.code);
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
  
  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDoc = await getDoc(userDocRef);

  // --- 1. XỬ LÝ ẢNH GOOGLE HD (Đưa lên trên để dùng chung) ---
  let avatarUrl = fbUser.photoURL;
  if (avatarUrl && avatarUrl.includes('=s96-c')) {
      avatarUrl = avatarUrl.replace('=s96-c', '=s400-c');
  }
  
  if (userDoc.exists()) {
    // --- 2. CỐT LÕI VẤN ĐỀ: Cập nhật nếu avatar cũ khác avatar mới ---
    const currentData = userDoc.data();
    
    // Nếu có ảnh Google MỚI và nó KHÁC ảnh trong DB (thỏ con)
    if (avatarUrl && currentData.avatar !== avatarUrl) {
        // Cập nhật vào Firestore ngay lập tức
        await updateDoc(userDocRef, { 
            avatar: avatarUrl,
            // Cập nhật luôn tên nếu người dùng đổi tên Google (tùy chọn)
            name: fbUser.displayName || currentData.name 
        });
        
        // Trả về dữ liệu mới nhất để UI hiển thị ngay
        return mapUser(fbUser, { 
            ...currentData, 
            avatar: avatarUrl,
            name: fbUser.displayName || currentData.name
        });
    }
    
    return mapUser(fbUser, currentData);
  } else {
    // --- 3. Tạo user mới tinh (Logic cũ của bạn) ---
    const newUser = {
      name: fbUser.displayName || 'Người dùng mới',
      email: fbUser.email,
      avatar: avatarUrl || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      createdAt: new Date().toISOString(),
      isExpert: false,
      expertStatus: 'none',
      points: 10
    };
    await setDoc(userDocRef, newUser);
    return mapUser(fbUser, newUser);
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string): Promise<User> => {
  if (!auth) throw new Error("Firebase chưa được cấu hình.");

  const result = await firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = result.user;
  
  await firebaseAuth.updateProfile(fbUser, { displayName: name });
  
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
  
  return firebaseAuth.onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const unsubFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(mapUser(fbUser, docSnap.data()));
        } else {
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
