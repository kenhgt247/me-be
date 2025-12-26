import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length) return;
  const pk = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;
    
  if (!pk) throw new Error("Missing Env");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: pk,
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    initAdmin();
    const db = admin.firestore();
    const auth = admin.auth();

    // Parse Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    const { email, password, name } = body || {};

    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    // Verify Admin
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Token' });
    
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    
    // Check Admin Role
    const adminSnap = await db.collection('users').doc(decoded.uid).get();
    if (!adminSnap.data()?.isAdmin) return res.status(403).json({ message: 'Not Admin' });

    // Create Auth
    const user = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name || 'User',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
    });

    // Create Data
    const now = new Date().toISOString();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: name || 'User',
      email: email.trim(),
      avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
      isAdmin: false, isExpert: false, expertStatus: 'none', points: 10,
      createdAt: now, joinedAt: now, updatedAt: now, lastActiveAt: now,
      isAnonymous: false, savedQuestions: [], followers: [], following: []
    });

    return res.status(200).json({ ok: true, uid: user.uid });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}
