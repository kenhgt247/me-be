import admin from "firebase-admin";

/**
 * Khởi tạo Firebase Admin một cách an toàn.
 * Đảm bảo biến môi trường FIREBASE_PRIVATE_KEY được xử lý đúng định dạng xuống dòng của Vercel.
 */
function initAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.");
  }

  // Xử lý ký tự xuống dòng cho Private Key trên Vercel
  privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/**
 * Helper gửi phản hồi JSON chuẩn
 */
function json(res: any, status: number, body: any) {
  res.status(status).json(body);
}

/**
 * Trích xuất Bearer Token từ header
 */
function getBearerToken(req: any) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string") return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export default async function handler(req: any, res: any) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return json(res, 405, { message: `Method ${req.method} not allowed` });
  }

  try {
    initAdmin();

    // 1. Phân giải body (Vercel hỗ trợ tự động nhưng bọc lại cho chắc chắn)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email, password, name } = body;

    // 2. Kiểm tra dữ liệu đầu vào cơ bản
    if (!email || !password) {
      return json(res, 400, { message: "Thiếu email hoặc mật khẩu." });
    }

    // 3. Xác thực quyền Admin của người gọi
    const token = getBearerToken(req);
    if (!token) {
      return json(res, 401, { message: "Yêu cầu cung cấp Authorization Bearer token." });
    }

    let callerUid: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      callerUid = decodedToken.uid;
    } catch (authError) {
      return json(res, 401, { message: "Phiên đăng nhập hết hạn hoặc không hợp lệ." });
    }

    // Kiểm tra quyền isAdmin trong Firestore
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
      return json(res, 403, { message: "Bạn không có quyền quản trị viên." });
    }

    // 4. Tạo User trong Firebase Authentication
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: name || undefined,
      });
    } catch (e: any) {
      if (e.code === "auth/email-already-exists") {
        return json(res, 409, { message: "Email này đã được sử dụng." });
      }
      throw e; // Chuyển tiếp lỗi xuống catch tổng
    }

    // 5. Tạo User Profile trong Firestore (Giai đoạn quan trọng)
    const now = new Date().toISOString();
    const userData = {
      uid: userRecord.uid, // Lưu UID vào doc để dễ truy vấn
      name: name || userRecord.displayName || "Thành viên",
      email: userRecord.email,
      avatar: userRecord.photoURL || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      isAdmin: false,
      isExpert: false,
      isBanned: false,
      expertStatus: null,
      points: 0,
      createdByAdmin: true,
    };

    try {
      // Sử dụng .set() với merge để đảm bảo không ghi đè nếu doc đã tồn tại ngẫu nhiên
      await admin.firestore().collection("users").doc(userRecord.uid).set(userData, { merge: true });
    } catch (firestoreError: any) {
      console.error("Firestore Error:", firestoreError);
      // Nếu bước này lỗi, ta vẫn trả về thông tin user đã tạo trong Auth nhưng báo lỗi Database
      return json(res, 201, {
        ok: true,
        partialError: "Auth created, but Firestore failed",
        uid: userRecord.uid,
        error: firestoreError.message,
      });
    }

    // Thành công hoàn toàn
    return json(res, 200, {
      ok: true,
      uid: userRecord.uid,
      email: userRecord.email,
      name: userData.name,
    });

  } catch (error: any) {
    console.error("Critical Server Error:", error);
    return json(res, 500, {
      message: "Lỗi hệ thống khi tạo người dùng.",
      error: error.message,
    });
  }
}
