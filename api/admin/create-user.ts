import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers (Giữ nguyên)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    // 2. KHỞI TẠO FIREBASE ADMIN (Đưa vào trong try/catch để bắt lỗi Config)
    if (!admin.apps.length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined;

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('Thiếu biến môi trường: Kiểm tra PROJECT_ID, CLIENT_EMAIL hoặc PRIVATE_KEY trong Vercel.');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Xử lý Body an toàn
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ message: 'Invalid JSON body' }); }
    }
    if (!body) return res.status(400).json({ message: 'Request body is empty' });

    const { email, password, name } = body;
    if (!email || !password) return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });

    // 4. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    
    const token = authHeader.split('Bearer ')[1];
    // Verify token có thể fail nếu token hết hạn, catch sẽ bắt được
    const decoded = await auth.verifyIdToken(token); 
    
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
      return res.status(403).json({ message: 'Tài khoản không có quyền Admin' });
    }

    // 5. Tạo User (Secondary Auth)
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 6. Tạo Firestore Data
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
    console.error("API CREATE USER ERROR:", error);

    // Trả về lỗi chi tiết để hiển thị lên Frontend hoặc Network Tab
    // Kiểm tra các mã lỗi phổ biến của Firebase
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email này đã được sử dụng.' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }
    
    // Nếu lỗi liên quan đến Private Key (PEM routines)
    if (error.message && error.message.includes('PEM')) {
        return res.status(500).json({ message: 'Lỗi cấu hình Server: Private Key không hợp lệ.' });
    }

    return res.status(500).json({ 
      message: error.message || 'Internal Server Error',
      debug: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
}
