// pages/api/admin/create-user.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';

// Hàm init an toàn
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("❌ Thiếu biến môi trường: Kiểm tra file .env.local");
  }

  // Sửa lỗi xuống dòng trong Private Key
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log("✅ Firebase Admin Initialized successfully");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 2. Init Admin SDK
    try {
      initAdmin();
    } catch (e: any) {
      console.error("🔥 Init Error:", e.message);
      return res.status(500).json({ message: "Server Config Error: " + e.message });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Log để debug dữ liệu nhận được
    console.log("📥 API Received Body:", req.body);
    console.log("🔑 Auth Header:", req.headers.authorization ? "Present" : "Missing");

    // Check Body
    if (!req.body) {
      return res.status(400).json({ message: "Lỗi: Không nhận được dữ liệu (Body is empty). Frontend chưa gửi Content-Type?" });
    }

    // Sử dụng fallback để tránh lỗi destructuring nếu body là null (dù đã check ở trên)
    const { email, password, name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu.' });
    }

    // 4. Verify Admin Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Chưa đăng nhập (Thiếu Token)' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }

    // 5. Check quyền Admin trong Firestore
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền Admin.' });
    }

    // 6. Xử lý dữ liệu đầu vào
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = name ? String(name).trim() : 'Thành viên mới';

    // 7. Tạo User bên Auth
    console.log("⚙️ Creating Auth User:", cleanEmail);
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: cleanName,
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    });

    // 8. Tạo User bên Firestore (Bypass Rules vì dùng Admin SDK)
    console.log("💾 Saving to Firestore:", userRecord.uid);
    const now = new Date().toISOString();
    
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: cleanName,
      email: cleanEmail,
      avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      
      isAdmin: false,       // Mặc định tạo ra là user thường
      isExpert: false,
      expertStatus: 'none',
      points: 10,           // Tặng 10 điểm khởi tạo
      
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

    console.log("✅ Success!");
    return res.status(200).json({ ok: true, uid: userRecord.uid, message: 'Tạo thành công!' });

  } catch (error: any) {
    console.error('❌ API CRITICAL ERROR:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email này đã tồn tại.' });
    }
    
    return res.status(500).json({ message: error.message || 'Lỗi Server nội bộ' });
  }
}
