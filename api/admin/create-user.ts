import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cấu hình CORS (Bắt buộc để Client gọi được)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    // 2. KHỞI TẠO FIREBASE ADMIN (Logic xử lý Key mạnh mẽ)
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Thiếu biến môi trường: FIREBASE_PROJECT_ID, CLIENT_EMAIL hoặc PRIVATE_KEY');
      }

      // --- XỬ LÝ ĐỊNH DẠNG KEY (QUAN TRỌNG) ---
      // 1. Xóa dấu ngoặc kép bao quanh nếu có
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      // 2. Thay thế ký tự \n dạng chuỗi thành xuống dòng thật
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      // ----------------------------------------

      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } catch (initError: any) {
        console.error("Firebase Init Failed:", initError);
        throw new Error(`Lỗi khởi tạo Firebase: ${initError.message}`);
      }
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Xử lý Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ message: 'Invalid JSON body' }); }
    }
    
    const { email, password, name } = body || {};
    if (!email || !password) return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });

    // 4. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    const token = authHeader.split('Bearer ')[1];

    try {
      const decoded = await auth.verifyIdToken(token);
      // Kiểm tra quyền Admin
      const adminSnap = await db.collection('users').doc(decoded.uid).get();
      if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
        return res.status(403).json({ message: 'Bạn không có quyền Admin.' });
      }
    } catch (e: any) {
      return res.status(401).json({ message: 'Lỗi xác thực: ' + e.message });
    }

    // 5. Tạo User (Auth)
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 6. Ghi vào Firestore
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
    console.error("CREATE USER ERROR:", error);
    // Trả về lỗi chi tiết để hiển thị lên màn hình Admin
    return res.status(500).json({ 
      message: error.message || 'Lỗi Server',
      error: error.code 
    });
  }
}
