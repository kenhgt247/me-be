import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*'); // Consider restricting this in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    // 2. Initialize Firebase Admin
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Server Environment Variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
      }

      // --- ROBUST KEY FORMATTING ---
      // Remove surrounding quotes if they exist
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      // Replace literal '\n' characters with actual newlines
      // This handles cases where the key was copied as a single line string
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log("✅ Firebase Admin Initialized Successfully");
      } catch (initError: any) {
        console.error("❌ Firebase Admin Initialization Failed:", initError);
        throw new Error(`Firebase Init Failed: ${initError.message}`);
      }
    }

    const db = admin.firestore();
    const auth = admin.auth();

    // 3. Parse Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ message: 'Invalid JSON body' }); }
    }
    const { email, password, name } = body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

    // 4. Verify Admin Token
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Authorization Header' });
    
    const token = authHeader.split('Bearer ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid Token Format' });

    try {
      const decoded = await auth.verifyIdToken(token);
      
      // Check if the requester is actually an admin
      const adminSnap = await db.collection('users').doc(decoded.uid).get();
      if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: You do not have admin privileges.' });
      }
    } catch (authError: any) {
      console.error("Auth Verification Error:", authError);
      return res.status(401).json({ 
        message: 'Token Verification Failed', 
        detail: authError.message,
        hint: 'Check if FIREBASE_PRIVATE_KEY is correct in Vercel settings.'
      });
    }

    // 5. Create New User
    const user = await auth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // 6. Create User Document in Firestore
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

    return res.status(200).json({ ok: true, uid: user.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error("API Error:", error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email is already in use.' });
    }
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
