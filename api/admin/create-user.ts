import type { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';

// 1. Khởi tạo Firebase Admin (Singleton để tránh lỗi init nhiều lần)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.error("❌ Thiếu biến môi trường FIREBASE_ADMIN SDK");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // --- BƯỚC 1: XÁC THỰC QUYỀN ADMIN ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    const requesterUid = decodedToken.uid;

    // Kiểm tra trong DB xem người gọi có phải là Admin thật không
    const adminDoc = await db.collection('users').doc(requesterUid).get();
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Bạn không có quyền Admin' });
    }

    // --- BƯỚC 2: VALIDATE DỮ LIỆU ---
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập Email và Mật khẩu' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name ? name.trim() : 'Thành viên mới';

    // --- BƯỚC 3: TẠO USER TRONG AUTHENTICATION ---
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: password,
      displayName: cleanName,
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
    });

    // --- BƯỚC 4: TẠO USER DOCUMENT TRONG FIRESTORE (Quan trọng) ---
    // Dùng Admin SDK để ghi đè mọi Rules
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

    return res.status(200).json({ ok: true, uid: userRecord.uid, message: 'Tạo thành công!' });

  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email này đã được sử dụng.' });
    }
    
    return res.status(500).json({ message: error.message || 'Lỗi Server Internal' });
  }
}
