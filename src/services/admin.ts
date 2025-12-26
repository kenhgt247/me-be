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
  if (!db)
    return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  try {
    const usersCol = collection(db, "users");
    const questionsCol = collection(db, "questions");
    const blogsCol = collection(db, "blogPosts");
    const docsCol = collection(db, "documents");

    const [usersSnap, questionsSnap, blogsSnap, docsSnap] = await Promise.all([
      getCountFromServer(usersCol),
      getCountFromServer(questionsCol),
      getCountFromServer(blogsCol),
      getCountFromServer(docsCol),
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
export const fetchUsersAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
) => {
  if (!db) return { users: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, "users"), orderBy("joinedAt", "desc"), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));

    const snapshot = await getDocs(q);

    // Fallback nếu thiếu joinedAt hoặc orderBy gây empty ở trang đầu
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

    // TRẢ VỀ DỮ LIỆU KHÔNG SẮP XẾP NẾU LỖI (để luôn hiện được)
    const fallbackSnap = await getDocs(query(collection(db, "users"), limit(pageSize)));
    return {
      users: fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)),
      lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
      hasMore: false,
    };
  }
};

// Update thông tin cơ bản user
export const updateUserInfo = async (
  userId: string,
  data: { name?: string; bio?: string; specialty?: string }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), data);
    return true;
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

// Update role user
export const updateUserRole = async (
  userId: string,
  updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), updates);
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
    console.error("Error fetching users:", error);
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
export const searchUsersForAdmin = async (keyword: string, maxResults: number = 12): Promise<User[]> => {
  if (!db) return [];
  const k = (keyword || '').trim().toLowerCase();
  if (!k) return [];

  try {
    // ✅ Cách đơn giản & chắc chạy: lấy 200 user gần nhất (có thể tăng nếu bạn muốn)
    const snap = await getDocs(query(collection(db, "users"), limit(200)));
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));

    const filtered = users.filter((u: any) => {
      const name = (u?.name || '').toLowerCase();
      const email = (u?.email || '').toLowerCase();
      const username = (u?.username || '').toLowerCase();
      return name.includes(k) || email.includes(k) || username.includes(k) || (u?.id || '').includes(k);
    });

    // ưu tiên user có email/name lên đầu
    filtered.sort((a: any, b: any) => {
      const sa = ((a?.email ? 1 : 0) + (a?.name ? 1 : 0));
      const sb = ((b?.email ? 1 : 0) + (b?.name ? 1 : 0));
      return sb - sa;
    });

    return filtered.slice(0, maxResults);
  } catch (error) {
    console.error("Error searchUsersForAdmin:", error);
    return [];
  }
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

/**
 * Duyệt / Từ chối hồ sơ ứng tuyển
 * - Update expert_applications
 * - Update users: isExpert/expertStatus/specialty + các trường audit
 */
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

    const appRef = doc(db, "expert_applications", appId);
    batch.update(appRef, {
      status,
      rejectionReason: status === "rejected" ? (reason || "Không có lý do") : null,
      reviewedAt: now,
      approvedSpecialty: status === "approved" ? (specialty || "") : null,
    });

    const userRef = doc(db, "users", userId);
    if (status === "approved") {
      batch.update(userRef, {
        isExpert: true,
        expertStatus: "approved",
        specialty: specialty || "",
        expertApprovedAt: now,
        expertRejectedAt: null,
        expertRejectionReason: null,
      });
    } else {
      batch.update(userRef, {
        isExpert: false,
        expertStatus: "rejected",
        specialty: "",
        expertApprovedAt: null,
        expertRejectedAt: now,
        expertRejectionReason: reason || "Không có lý do",
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Error processing expert app:", error);
    throw error;
  }
};

/* ============================================================
   EXPERT MANAGEMENT (Admin CRUD chuyên gia)
   - Xoá hồ sơ ứng tuyển
   - Danh sách chuyên gia
   - Sửa thông tin chuyên gia
   - Thêm chuyên gia thủ công
   - Gỡ quyền chuyên gia
   - Đồng bộ/chỉnh specialty từ hồ sơ
   ============================================================ */

// Xoá hồ sơ ứng tuyển (admin)
export const deleteExpertApplication = async (appId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "expert_applications", appId));
  } catch (error) {
    console.error("Error deleting expert application:", error);
    throw error;
  }
};

// Lấy danh sách chuyên gia: where(isExpert == true) + sort client để tránh yêu cầu index
export const fetchExperts = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("isExpert", "==", true), limit(200))
    );

    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));

    // sort mới nhất lên đầu nếu có joinedAt/expertApprovedAt
    users.sort((a: any, b: any) => {
      const ta =
        (a.expertApprovedAt && new Date(a.expertApprovedAt).getTime()) ||
        (a.joinedAt && new Date(a.joinedAt).getTime()) ||
        0;
      const tb =
        (b.expertApprovedAt && new Date(b.expertApprovedAt).getTime()) ||
        (b.joinedAt && new Date(b.joinedAt).getTime()) ||
        0;
      return tb - ta;
    });

    return users;
  } catch (error) {
    console.error("Error fetching experts:", error);
    return [];
  }
};

export type ExpertAdminUpdate = {
  // fields phổ biến
  name?: string;
  bio?: string;
  specialty?: string;
  avatar?: string;

  // optional fields (nếu User schema bạn có)
  phone?: string;
  workplace?: string;

  // quyền / trạng thái
  isExpert?: boolean;
  expertStatus?: "approved" | "pending" | "rejected";
};

// Admin sửa thông tin 1 chuyên gia (hoặc user bất kỳ)
export const updateExpertByAdmin = async (userId: string, updates: ExpertAdminUpdate) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as any);
  } catch (error) {
    console.error("Error updateExpertByAdmin:", error);
    throw error;
  }
};

// Admin thêm chuyên gia thủ công (không cần hồ sơ)
export const addExpertManually = async (payload: {
  userId: string;
  specialty: string;
  name?: string;
  phone?: string;
  workplace?: string;
  bio?: string;
  avatar?: string;
}) => {
  if (!db) return;
  const { userId, specialty, ...rest } = payload;

  try {
    const now = new Date().toISOString();
    const userRef = doc(db, "users", userId);

    // check tồn tại
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error("USER_NOT_FOUND");

    await updateDoc(userRef, {
      ...rest,
      isExpert: true,
      expertStatus: "approved",
      specialty: specialty || "",
      expertApprovedAt: now,
      expertRejectedAt: null,
      expertRejectionReason: null,
      updatedAt: now,
    } as any);
  } catch (error) {
    console.error("Error addExpertManually:", error);
    throw error;
  }
};

// Admin gỡ quyền chuyên gia (kể cả đã approved)
export const revokeExpertByAdmin = async (payload: {
  userId: string;
  appId?: string; // nếu muốn đồng bộ expert_applications
  reason?: string;
}) => {
  if (!db) return;
  const { userId, appId, reason } = payload;

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    batch.update(doc(db, "users", userId), {
      isExpert: false,
      expertStatus: "rejected",
      specialty: "",
      expertApprovedAt: null,
      expertRejectedAt: now,
      expertRejectionReason: reason || "Admin gỡ quyền chuyên gia",
      updatedAt: now,
    });

    if (appId) {
      batch.update(doc(db, "expert_applications", appId), {
        status: "rejected",
        rejectionReason: reason || "Admin gỡ quyền chuyên gia",
        reviewedAt: now,
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Error revokeExpertByAdmin:", error);
    throw error;
  }
};

// Admin chỉnh specialty từ hồ sơ (update cả application + user)
export const updateExpertSpecialtyFromApp = async (payload: {
  appId: string;
  userId: string;
  specialty: string;
}) => {
  if (!db) return;
  const { appId, userId, specialty } = payload;

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    batch.update(doc(db, "expert_applications", appId), {
      approvedSpecialty: specialty,
      updatedAt: now,
    });

    batch.update(doc(db, "users", userId), {
      specialty,
      updatedAt: now,
    });

    await batch.commit();
  } catch (error) {
    console.error("Error updateExpertSpecialtyFromApp:", error);
    throw error;
  }
};

/* ============================================================
   QUESTIONS MANAGEMENT (Phân trang & Bulk)
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
    console.error("Error fetching questions paginated:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

export const fetchQuestionById = async (id: string): Promise<Question | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, "questions", id));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Question;
  return null;
};

export const bulkUpdateQuestions = async (ids: string[], updates: { isHidden?: boolean }) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => batch.update(doc(db, "questions", id), updates));
    await batch.commit();
  } catch (error) {
    console.error("Error bulk updating questions:", error);
    throw error;
  }
};

export const bulkDeleteQuestions = async (ids: string[]) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, "questions", id)));
    await batch.commit();
  } catch (error) {
    console.error("Error bulk deleting questions:", error);
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

export const deleteReportedContent = async (report: Report) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "reports", report.id), {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    });

    if (report.targetType === "question") batch.delete(doc(db, "questions", report.targetId));
    else if (report.targetType === "answer") batch.delete(doc(db, "answers", report.targetId));

    await batch.commit();
  } catch (error) {
    console.error("Error deleting reported content:", error);
    throw error;
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

export const addCategory = async (
  name: string,
  style?: { icon: string; color: string; bg: string }
) => {
  if (!db) return;
  try {
    await addDoc(collection(db, "categories"), { name, slug: toSlug(name), ...style });
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const updateCategory = async (
  id: string,
  name: string,
  style?: { icon: string; color: string; bg: string }
) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, "categories", id), { name, slug: toSlug(name), ...style });
  } catch (error) {
    console.error("Error updating category:", error);
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

export const syncCategoriesFromCode = async () => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    const existing = await fetchCategories();
    const existingNames = existing.map((c) => c.name);
    let count = 0;

    CATEGORIES.forEach((catName) => {
      if (!existingNames.includes(catName)) {
        const docRef = doc(collection(db, "categories"));
        batch.set(docRef, {
          name: catName,
          slug: toSlug(catName),
          icon: "Tag",
          color: "text-gray-600",
          bg: "bg-gray-100",
        });
        count++;
      }
    });

    if (count > 0) await batch.commit();
    return count;
  } catch (error) {
    console.error("Error syncing categories:", error);
    return 0;
  }
};

/* ============================================================
   BLOGS & DOCUMENTS
   ============================================================ */
export const fetchAllBlogs = async () => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, "blogPosts"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return [];
  }
};

export const fetchAllDocuments = async () => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, "documents"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching docs:", error);
    return [];
  }
};
