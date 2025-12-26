import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";

/**
 * ENV cần có (Vercel Project Settings -> Environment Variables):
 * - FIREBASE_SERVICE_ACCOUNT_JSON  (toàn bộ service account json dạng 1 dòng)
 *
 * Ví dụ value: {"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
 */

function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  // Nếu bạn copy JSON lên env, nhớ giữ nguyên \n trong private_key
  const serviceAccount = JSON.parse(raw);

  // Một số nơi env bị mất \n thật, nên normalize:
  if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function requireAdmin(req: VercelRequest) {
  const authHeader = req.headers.authorization || "";
  const m = authHeader.match(/^Bearer (.+)$/i);
  if (!m) throw new Error("UNAUTHORIZED");

  const idToken = m[1];
  const decoded = await admin.auth().verifyIdToken(idToken);

  // Check quyền admin theo users/{uid}.isAdmin == true (đúng theo rules của bạn)
  const uid = decoded.uid;
  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  const isAdmin = userSnap.exists && userSnap.data()?.isAdmin === true;
  if (!isAdmin) throw new Error("FORBIDDEN");

  return { uid };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    initAdmin();

    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    await requireAdmin(req);

    const { email, password, name } = (req.body || {}) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password." });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password tối thiểu 6 ký tự." });
    }

    // 1) Tạo user auth
    const created = await admin.auth().createUser({
      email,
      password,
      displayName: name || undefined,
      emailVerified: false,
      disabled: false,
    });

    const now = new Date().toISOString();

    // 2) Tạo doc users/{uid} để app bạn dùng được ngay
    // (Bạn có thể chỉnh fields theo schema của bạn)
    await admin.firestore().collection("users").doc(created.uid).set(
      {
        name: name || "Thành viên",
        email,
        avatar: "",
        bio: "",
        username: "",
        points: 0,

        isAdmin: false,
        isExpert: false,
        isBanned: false,
        expertStatus: null,

        joinedAt: now,
        createdAt: now,
        updatedAt: now,
        isAnonymous: false,
      },
      { merge: true }
    );

    return res.status(200).json({
      ok: true,
      uid: created.uid,
      email: created.email,
      name: created.displayName,
    });
  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg === "UNAUTHORIZED") return res.status(401).json({ message: "Thiếu token." });
    if (msg === "FORBIDDEN") return res.status(403).json({ message: "Bạn không có quyền admin." });

    // Firebase Admin error mapping
    if (msg.includes("auth/email-already-exists")) {
      return res.status(409).json({ message: "Email đã tồn tại." });
    }
    if (msg.includes("auth/invalid-email")) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }
    if (msg.includes("Missing FIREBASE_SERVICE_ACCOUNT_JSON")) {
      return res.status(500).json({ message: "Thiếu env FIREBASE_SERVICE_ACCOUNT_JSON trên Vercel." });
    }

    console.error("create-user error:", err);
    return res.status(500).json({ message: "Lỗi server khi tạo user." });
  }
}
