// api/admin/create-user.ts
import admin from "firebase-admin";

// ---- Safe init Firebase Admin (only once) ----
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars.");
  }

  // Vercel env often stores newlines as \\n
  privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    } as any),
  });
}

function json(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getBearerToken(req: any) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: any, res: any) {
  try {
    initAdmin();

    if (req.method !== "POST") {
      return json(res, 405, { message: "Method not allowed" });
    }

    // Parse body (Vercel may give object or string)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !password) {
      return json(res, 400, { message: "Thiếu email hoặc mật khẩu." });
    }
    if (!isValidEmail(email)) {
      return json(res, 400, { message: "Email không hợp lệ." });
    }
    if (password.length < 6) {
      return json(res, 400, { message: "Mật khẩu tối thiểu 6 ký tự." });
    }

    // ---- Verify caller (must be logged in) ----
    const token = getBearerToken(req);
    if (!token) return json(res, 401, { message: "Thiếu Authorization Bearer token." });

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (e) {
      return json(res, 401, { message: "Token không hợp lệ hoặc đã hết hạn." });
    }

    const callerUid = decoded.uid;

    // ---- Check admin by Firestore users/{uid}.isAdmin ----
    const callerSnap = await admin.firestore().doc(`users/${callerUid}`).get();
    const callerData = callerSnap.exists ? (callerSnap.data() as any) : null;

    if (!callerData?.isAdmin) {
      return json(res, 403, { message: "Bạn không có quyền admin." });
    }

    // ---- Create user in Firebase Auth ----
    let userRecord: admin.auth.UserRecord | null = null;

    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name || undefined,
        disabled: false,
      });
    } catch (e: any) {
      // Handle common errors
      const code = String(e?.code || "");
      if (code.includes("email-already-exists")) {
        return json(res, 409, { message: "Email đã tồn tại trong hệ thống." });
      }
      return json(res, 500, { message: "Không tạo được user Auth.", error: e?.message || String(e) });
    }

    const newUid = userRecord.uid;
    const now = new Date().toISOString();

    // ---- Create Firestore user profile doc (optional but recommended) ----
    // Use set with merge to be safe if doc already exists for some reason
    await admin
      .firestore()
      .doc(`users/${newUid}`)
      .set(
        {
          name: name || userRecord.displayName || "Thành viên",
          email: userRecord.email,
          avatar: userRecord.photoURL || "",
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
          isAdmin: false,
          isExpert: false,
          isBanned: false,
          expertStatus: null,
          points: 0,
          createdByAdmin: true,
        },
        { merge: true }
      );

    return json(res, 200, {
      ok: true,
      uid: newUid,
      email: userRecord.email,
      name: userRecord.displayName || name || "",
    });
  } catch (e: any) {
    return json(res, 500, {
      message: "Server error create-user",
      error: e?.message || String(e),
    });
  }
}
