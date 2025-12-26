import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.");
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    initAdmin();
    const { email, password, name } = req.body;

    // 1. Authentication Check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = await admin.auth().verifyIdToken(authHeader.split(" ")[1]);
    const adminDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
    
    if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    // 2. Create User in Auth
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password,
      displayName: name || "Thành viên",
    });

    // 3. Force Save to Firestore
    const now = new Date().toISOString();
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name || "Thành viên",
      email: email.trim().toLowerCase(),
      avatar: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
      createdAt: now,
      updatedAt: now,
      isAdmin: false,
      isExpert: false,
      points: 0,
      status: "active"
    });

    return res.status(200).json({ ok: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error("API ERROR:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
