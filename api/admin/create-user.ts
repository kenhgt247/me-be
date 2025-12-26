import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Init Singleton
if (!admin.apps.length) {
  const pk = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!pk || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error("❌ MISSING FIREBASE ENV VARS");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pk,
      }),
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const db = admin.firestore();
    const auth = admin.auth();

    // ✅ FIX QUAN TRỌNG: Xử lý Body
    let body = req.body;
    
    // Nếu body là string (do Vercel/Vite proxy chưa parse), ta tự parse
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid JSON body' });
      }
    }

    // Nếu body vẫn rỗng
    if (!body) {
      return res.status(400).json({ message: 'Request body is empty' });
    }

    const { email, password, name } = body;

    if (!email || !password) return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });

    // Verify Admin
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
      return res.status(403).json({ message: 'Không có quyền Admin' });
    }

    // Create Auth
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // Create Firestore Data (Admin SDK Bypass Rules)
    const now = new Date().toISOString();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: name || 'User',
      email: String(email).trim(),
      avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      isAdmin: false, isExpert: false, expertStatus: 'none', points: 10,
      createdAt: now, joinedAt: now, updatedAt: now, lastActiveAt: now,
      isAnonymous: false, savedQuestions: [], followers: [], following: [],
      bio: '', specialty: '', workplace: ''
    });

    return res.status(200).json({ ok: true, uid: user.uid });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
