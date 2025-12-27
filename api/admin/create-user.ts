import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cấu hình CORS (Rất quan trọng vì Vite chạy port 5173, API chạy port khác)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*'); // Trong production nên đổi thành domain thật
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    // 2. KHỞI TẠO FIREBASE ADMIN
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Thiếu biến môi trường Server');
      }

      // Fix lỗi key format
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
      if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Xử lý Body
    let body = req.body;
    // Vercel đôi khi parse sẵn, đôi khi chưa, kiểm tra an toàn:
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ message: 'Invalid JSON body' }); }
    }
    
    const { email, password, name } = body || {};
    if (!email || !password) return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });

    // 4. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    const token = authHeader.split('Bearer ')[1];

    // Xác thực người gọi là Admin
    try {
        const decoded = await auth.verifyIdToken(token);
        const adminSnap = await db.collection('users').doc(decoded.uid).get();
        if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
          return res.status(403).json({ message: 'Forbidden: Admin only' });
        }
    } catch (e: any) {
        return res.status(401).json({ message: 'Invalid Token: ' + e.message });
    }

    // 5. Tạo User
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 6. Ghi Firestore
    const now = new Date().toISOString();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      id: user.uid,
      name: name || 'User',
      email: String(email).trim(),
      avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      isAdmin: false,
      isExpert: false,
      expertStatus: 'none',
      points: 10,
      createdAt: now,
      joinedAt: now,
      updatedAt: now,
      lastActiveAt: now,
      isAnonymous: false,
      savedQuestions: [],
      followers: [],
      following: [],
      bio: '',
      specialty: '',
      workplace: ''
    });

    return res.status(200).json({ ok: true, uid: user.uid });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ message: error.message || 'Internal Server Error', error: error.code });
  }
}
