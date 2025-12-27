import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin outside the handler to prevent cold-start re-initialization
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.error('Missing Firebase Admin environment variables');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or your specific domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    // Check if initialization failed
    if (!admin.apps.length) {
      return res.status(500).json({ message: 'Firebase Admin not initialized. Check server logs.' });
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 2. Parse Body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ message: 'Invalid JSON body' }); }
    }
    if (!body) return res.status(400).json({ message: 'Request body is empty' });

    const { email, password, name } = body;
    if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

    // 3. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    
    const token = authHeader.split('Bearer ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid Token Format' });

    const decoded = await auth.verifyIdToken(token);
    
    // Check if requester is really an admin
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
      return res.status(403).json({ message: 'You do not have Admin permissions.' });
    }

    // 4. Create User in Auth
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 5. Create User Data in Firestore
    const now = new Date().toISOString();
    
    // Use set() to ensure document creation
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      id: user.uid, // Add duplicate ID field for easier querying
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

    return res.status(200).json({ ok: true, uid: user.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error("API CREATE USER ERROR:", error);

    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email is already in use.' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    
    return res.status(500).json({ 
      message: error.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
}
