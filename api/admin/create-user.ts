import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Hàm init Firebase Admin
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("❌ Thiếu biến môi trường: Kiểm tra file .env");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// Handler chuẩn cho Vercel (Không dùng Next.js types)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Xử lý CORS (Quan trọng để Frontend gọi được Backend)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Xử lý preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    initAdmin();
    const db = admin.firestore();
    const auth = admin.auth();

    // 2. Lấy dữ liệu từ Body (Vercel tự parse JSON nếu có header Content-Type)
    const body = req.body || {};
    const { email, password, name } = body;

    console.log("📥 API Body:", body); // Debug log

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu.' });
    }

    // 3. Xác thực Token Admin
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Chưa đăng nhập (Thiếu Token)' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ message: 'Token không hợp lệ.' });
    }

    // Check quyền Admin trong Firestore
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền Admin.' });
    }

    // 4. Logic tạo User
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : 'Thành viên mới';

    // Tạo Auth
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: cleanName,
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    });

    // Lưu Firestore (Bypass Rules)
    const now = new Date().toISOString();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: cleanName,
      email: cleanEmail,
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

    return res.status(200).json({ ok: true, uid: userRecord.uid, message: 'Tạo thành công!' });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email này đã tồn tại.' });
    }
    return res.status(500).json({ message: error.message || 'Lỗi Server' });
  }
}
