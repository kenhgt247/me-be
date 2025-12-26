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
  writeBatch,
  addDoc,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";
import {
  User,
  Question,
  ExpertApplication,
  Report,
  Category,
  toSlug,
  CATEGORIES,
} from "../types";

/* ============================================================
   SYSTEM STATS (Tối ưu cho Dashboard)
   ============================================================ */
export const getSystemStats = async () => {
  if (!db) return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  try {
    const [usersSnap, questionsSnap, blogsSnap, docsSnap] = await Promise.all([
      getCountFromServer(collection(db, "users")),
      getCountFromServer(collection(db, "questions")),
      getCountFromServer(collection(db, "blogPosts")),
      getCountFromServer(collection(db, "documents")),
    ]);

    return {
      totalUsers: usersSnap.data().count,
      totalQuestions: questionsSnap.data().count,
      totalBlogs: blogsSnap.data().count,
      totalDocuments: docsSnap.data().count,
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  }
};

/* ============================================================
   USERS MANAGEMENT
   ============================================================ */

// 1. Hàm lấy danh sách người dùng (Đã sửa để hiện cả người cũ và người mới)
export const fetchUsersAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
) => {
  if (!db) return { users: [], lastDoc: null, hasMore: false };
  
  try {
    // Không dùng orderBy ở đây để tránh lọc mất user cũ thiếu trường joinedAt
    let q = query(collection(db, "users"), limit(pageSize));
    
    if (lastVisible) {
      q = query(q, startAfter(lastVisible));
    }

    const snapshot = await getDocs(q);
    
    // Map dữ liệu từ Firestore sang User Type
    const users = snapshot.docs.map((d) => ({ 
      id: d.id, 
      ...d.data() 
    } as User));

    // Sắp xếp thủ công ở Client để đảm bảo tính đồng nhất giữa user cũ (created_at) và mới (createdAt/joinedAt)
    users.sort((a: any, b: any) => {
      const dateA = new Date(a.joinedAt || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.joinedAt || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return {
      users,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    // Nếu lỗi sắp xếp hoặc query, fallback lấy danh sách cơ bản để không bị trắng trang
    const fallbackSnap = await getDocs(query(collection(db, "users"), limit(pageSize)));
    return {
      users: fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)),
      lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
      hasMore: false,
    };
  }
};

// 2. Hàm cập nhật thông tin cơ bản user
export const updateUserInfo = async (
  userId: string,
  data: { name?: string; bio?: string; specialty?: string }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), { 
      ...data, 
      updatedAt: new Date().toISOString() 
    });
    return true;
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

// 3. Cập nhật vai trò (Admin, Expert, Ban)
export const updateUserRole = async (
  userId: string,
  updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), { 
      ...updates, 
      updatedAt: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// 4. Tìm kiếm User cho Admin
export const searchUsersForAdmin = async (keyword: string, maxResults: number = 12): Promise<User[]> => {
  if (!db) return [];
  const k = (keyword || '').trim().toLowerCase();
  if (!k) return [];
  try {
    const snap = await getDocs(query(collection(db, "users"), limit(200)));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
    const filtered = users.filter((u: any) => {
      const name = (u?.name || '').toLowerCase();
      const email = (u?.email || '').toLowerCase();
      return name.includes(k) || email.includes(k) || (u?.id || '').includes(k);
    });
    return filtered.slice(0, maxResults);
  } catch (error) {
    console.error("Error searchUsersForAdmin:", error);
    return [];
  }
};

// 5. Tạo User qua API Admin (Vercel API)
export const createUserByAdmin = async (payload: {
  email: string;
  password: string;
  name?: string;
}) => {
  const auth = getAuth();
  const me = auth.currentUser;
  if (!me) throw new Error("Bạn chưa đăng nhập.");
  const token = await me.getIdToken(true);
  const res = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Không tạo được người dùng.");
  return data;
};

/* ============================================================
   EXPERT MANAGEMENT (Duyệt & Quản lý chuyên gia)
   ============================================================ */

export const fetchExpertApplications = async (): Promise<ExpertApplication[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "expert_applications"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExpertApplication));
  } catch (error) {
    console.error("Error fetching expert apps:", error);
    return [];
  }
};

export const processExpertApplication = async (
  appId: string,
  userId: string,
  status: "approved" | "rejected",
  reason?: string,
  specialty?: string
) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    batch.update(doc(db, "expert_applications", appId), {
      status,
      rejectionReason: status === "rejected" ? (reason || "Không có lý do") : null,
      reviewedAt: now,
      approvedSpecialty: status === "approved" ? (specialty || "") : null,
    });
    batch.update(doc(db, "users", userId), {
      isExpert: status === "approved",
      expertStatus: status,
      specialty: status === "approved" ? (specialty || "") : "",
      expertApprovedAt: status === "approved" ? now : null,
      updatedAt: now,
    });
    await batch.commit();
  } catch (error) {
    console.error("Error processing expert app:", error);
    throw error;
  }
};

export const deleteExpertApplication = async (appId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "expert_applications", appId));
  } catch (error) {
    console.error("Error deleting expert app:", error);
    throw error;
  }
};

export const revokeExpertByAdmin = async (payload: { userId: string; appId?: string; reason?: string }) => {
  if (!db) return;
  const { userId, appId, reason } = payload;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    batch.update(doc(db, "users", userId), {
      isExpert: false,
      expertStatus: "rejected",
      specialty: "",
      updatedAt: now,
    });
    if (appId) batch.update(doc(db, "expert_applications", appId), { status: "rejected", reviewedAt: now });
    await batch.commit();
  } catch (error) {
    console.error("Error revokeExpertByAdmin:", error);
    throw error;
  }
};

export const updateExpertSpecialtyFromApp = async (payload: { appId: string; userId: string; specialty: string }) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "expert_applications", payload.appId), { approvedSpecialty: payload.specialty });
    batch.update(doc(db, "users", payload.userId), { specialty: payload.specialty });
    await batch.commit();
  } catch (error) {
    console.error("Error updateExpertSpecialtyFromApp:", error);
    throw error;
  }
};

/* ============================================================
   QUESTIONS & REPORTS
   ============================================================ */

export const fetchQuestionsAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 15
) => {
  if (!db) return { questions: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, "questions"), orderBy("createdAt", "desc"), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));
    const snapshot = await getDocs(q);
    return {
      questions: snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question)),
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching questions:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

export const fetchReports = async (): Promise<Report[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

export const resolveReport = async (reportId: string, action: "resolved" | "dismissed") => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "reports", reportId), {
      status: action,
      resolvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resolving report:", error);
    throw error;
  }
};

/* ============================================================
   CATEGORIES, BLOGS, DOCUMENTS
   ============================================================ */

export const fetchCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const addCategory = async (name: string, style?: any) => {
  if (!db) return;
  try {
    await addDoc(collection(db, "categories"), { name, slug: toSlug(name), ...style });
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "categories", id));
  } catch (error) {
    throw error;
  }
};

export const fetchAllBlogs = async () => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "blogPosts"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchAllDocuments = async () => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "documents"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteUser = async (userId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    throw error;
  }
};

export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  } catch (error) {
    return [];
  }
};
