import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// QUAN TRỌNG: Dùng getFirestore chuẩn thay vì initializeFirestore
import { getFirestore } from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage';

// Safe environment variable access
const getEnv = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] || fallback;
  }
  return fallback;
};

// Configuration
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', "AIzaSyD4BcKMNU54sbRVIz9qlA5lccyHJg730NA"),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', "askingkisd.firebaseapp.com"),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', "askingkisd"),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', "askingkisd.firebasestorage.app"),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', "707611534408"),
  appId: getEnv('VITE_FIREBASE_APP_ID', "1:707611534408:web:c0bcc4919a29dc7be7247d"),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID', "G-QZTM2MTNS2"),
};

// Initialize Firebase (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

// --- SỬA LỖI TẠI ĐÂY ---
// Sử dụng getFirestore mặc định. Cấu hình cũ (experimentalForceLongPolling) 
// làm mất token đăng nhập khiến bạn bị lỗi "Missing permissions".
const db = getFirestore(app);

const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
