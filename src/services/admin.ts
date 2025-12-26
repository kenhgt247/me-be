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

/**
 * Lấy danh sách người dùng phân trang
 * Đã bỏ orderBy trực tiếp để hiện cả user cũ thiếu trường joinedAt
 */
export const fetchUsersAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
) => {
  if (!db) return { users: [], lastDoc: null, hasMore: false };
  try {
    // Không dùng orderBy ở mức database để tránh lọc mất user cũ
    let q = query(collection(db, "users"), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));

    const snapshot = await getDocs(q);
    
    // Nếu trang đầu tiên trống, thử lấy fallback
    if (snapshot.empty && !lastVisible) {
       return { users: [], lastDoc: null, hasMore: false };
    }

    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));

    // Sắp xếp thủ công tại Client để đảm bảo tính đồng nhất ngày tháng
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
    // Fallback trả về danh sách cơ bản khi lỗi
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
  try {
    await updateDoc(doc(db, "users", userId), { ...data, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

export const updateUserRole = async (
  userId: string,
  updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), { ...updates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
};

export const deleteUser = async (userId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "users", userId));
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

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
   EXPERT APPLICATIONS
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
      expertRejectedAt: status === "rejected" ? now : null,
      expertRejectionReason: status === "rejected" ? (reason || "Không có lý do") : null,
      updatedAt: now
    });

    await batch.commit();
  } catch (error) {
    console.error("Error processing expert app:", error);
    throw error;
  }
};

/* ============================================================
   QUESTIONS MANAGEMENT
   ============================================================ */
export const fetchQuestionsAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 15,
  filters?: { category?: string; isHidden?: boolean; searchTerm?: string }
) => {
  if (!db) return { questions: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, "questions"), orderBy("createdAt", "desc"));

    if (filters?.category && filters.category !== "Tất cả") {
      q = query(q, where("category", "==", filters.category));
    }
    if (filters?.isHidden !== undefined) {
      q = query(q, where("isHidden", "==", filters.isHidden));
    }

    if (lastVisible) q = query(q, startAfter(lastVisible), limit(pageSize));
    else q = query(q, limit(pageSize));

    const snapshot = await getDocs(q);
    let questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question));

    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      questions = questions.filter((qq) => (qq.title || "").toLowerCase().includes(term));
    }

    return {
      questions,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching questions:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

/* ============================================================
   CATEGORIES MANAGEMENT
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
    await addDoc(collection(db, "categories"), { 
      name, 
      slug: toSlug(name), 
      createdAt: new Date().toISOString(),
      ...style 
    });
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "categories", id));
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

/* ============================================================
   REPORTS MANAGEMENT
   ============================================================ */
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
