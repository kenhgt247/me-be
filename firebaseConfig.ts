
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper to safely access env vars
const getEnv = () => {
  try {
    // @ts-ignore
    return import.meta.env || {};
  } catch {
    return {};
  }
};

const env = getEnv();

// Use environment variables if available, otherwise fall back to hardcoded values (as provided)
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyD4BcKMNU54sbRVIz9qlA5lccyHJg730NA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "askingkisd.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "askingkisd",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "askingkisd.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "707611534408",
  appId: env.VITE_FIREBASE_APP_ID || "1:707611534408:web:c0bcc4919a29dc7be7247d",
  measurementId: "G-QZTM2MTNS2"
};

// Initialize Firebase
let app;
let auth: any;
let db: any;
let googleProvider: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.warn("Firebase not fully initialized. Check your configuration keys.", error);
}

export { auth, db, googleProvider };
