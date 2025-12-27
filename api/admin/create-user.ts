import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  where, 
  deleteDoc, 
  getDoc, 
  limit, 
  startAfter, 
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer 
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";
import { User, ExpertApplication, Report, Category, toSlug, CATEGORIES } from "../types";

// ... (Giữ nguyên các hàm fetchUsers, updateUserInfo khác của bạn ở đây nếu có) ...

/* ============================================================
   USERS MANAGEMENT (Chỉ sửa phần gọi API Create User)
   ============================================================ */

export const fetchUsersAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
) => {
  if (!db) return { users: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, "users"), orderBy("joinedAt", "desc"), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));

    const snapshot = await getDocs(q);

    // Fallback nếu thiếu joinedAt
    if (snapshot.empty && !lastVisible) {
      const fallbackSnap = await getDocs(query(collection(db, "users"), limit(pageSize)));
      const users = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      return {
        users,
        lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
        hasMore: fallbackSnap.docs.length === pageSize,
      };
    }

    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
    return {
      users,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    // Fallback đơn giản khi lỗi sort
    const fallbackSnap = await getDocs(query(collection(db, "users"), limit(pageSize)));
    return {
      users: fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)),
      lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
      hasMore: false,
    };
  }
};

export const updateUserInfo = async (
  userId: string,
  data: { name?: string; bio?: string; specialty?: string }
) => {
  if (!db) return;
  await updateDoc(doc(db, "users", userId), data);
};

export const updateUserRole = async (
  userId: string,
  updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }
) => {
  if (!db) return;
  await updateDoc(doc(db, "users", userId), updates);
};

// ✅ HÀM QUAN TRỌNG: Gọi đúng API path của bạn
export const createUserByAdmin = async (payload: {
  email: string;
  password: string;
  name?: string;
}) => {
  const auth = getAuth();
  const me = auth.currentUser;
  if (!me) throw new Error("Bạn chưa đăng nhập.");

  const token = await me.getIdToken(true);

  // Đường dẫn khớp với file: src/pages/api/admin/create-user.ts
  const res = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Không tạo được người dùng.");
  }

  return data;
};
