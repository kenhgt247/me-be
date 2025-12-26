import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Init Firebase Admin an toàn
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  // Xử lý Private Key: Nếu thiếu, ném lỗi rõ ràng để debug
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("MISSING_ENV: FIREBASE_PRIVATE_KEY is undefined");
  }
  
  // Fix lỗi xuống dòng của key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail) {
    throw new Error("MISSING_ENV: Project ID or Client Email");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Setup
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    // 1. Khởi tạo & Bắt lỗi Config
    try {
      initAdmin();
    } catch (e: any) {
      console.error("🔥 Init Error:", e.message);
      return res.status(500).json({ message: `Server Config Error: ${e.message}` });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 2. Parse Body An toàn
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { email, password, name } = body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu.' });
    }

    // 3. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Token' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    
    // Check quyền
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Not Admin' });
    }

    // 4. Tạo User
    const userRecord = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 5. Ghi Firestore (Bypass Rules)
    const now = new Date().toISOString();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name || 'User',
      email: email.trim(),
      avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      isAdmin: false, isExpert: false, expertStatus: 'none', points: 10,
      createdAt: now, joinedAt: now, updatedAt: now, lastActiveAt: now,
      isAnonymous: false, savedQuestions: [], followers: [], following: [],
      bio: '', specialty: '', workplace: ''
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error("API Error:", error);
    if (error.code === 'auth/email-already-exists') return res.status(400).json({ message: 'Email đã tồn tại.' });
    return res.status(500).json({ message: error.message || 'Internal Error' });
  }
}
