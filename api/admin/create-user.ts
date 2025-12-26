import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// 1. Init Admin SDK (Singleton)
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Xử lý xuống dòng cho Private Key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Thiếu biến môi trường FIREBASE (kiểm tra .env trên Vercel)");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

// 2. Handler chuẩn cho Vercel (Không dùng Next.js)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CẤU HÌNH CORS (Bắt buộc cho Vite) ---
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Trả về ngay nếu là preflight request
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

    // 3. Parse Body (An toàn)
    const body = req.body || {};
    const { email, password, name } = body;

    // Debug log (xem trong Vercel Logs)
    console.log("📥 API Request Body:", body);

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu.' });
    }

    // 4. Verify Token Admin
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Chưa đăng nhập (Thiếu Token).' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check quyền Admin trong Firestore
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
      return res.status(403).json({ message: 'Không có quyền Admin.' });
    }

    // 5. Logic Tạo User
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : 'Thành viên mới';

    // A. Tạo Auth
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: cleanName,
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    });

    // B. Tạo Firestore Data (Admin SDK bypass Rules)
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

    return res.status(200).json({ ok: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email này đã tồn tại.' });
    }
    return res.status(500).json({ message: error.message || 'Lỗi Server' });
  }
}
