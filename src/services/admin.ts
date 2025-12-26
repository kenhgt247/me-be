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
   SYSTEM STATS
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
export const fetchUsersAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 20
) => {
  if (!db) return { users: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, "users"), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
    users.sort((a: any, b: any) => {
      const dateA = new Date(a.joinedAt || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.joinedAt || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    return { users, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null, hasMore: snapshot.docs.length === pageSize };
  } catch (error) {
    return { users: [], lastDoc: null, hasMore: false };
  }
};

export const updateUserInfo = async (userId: string, data: any) => {
  if (!db) return;
  await updateDoc(doc(db, "users", userId), { ...data, updatedAt: new Date().toISOString() });
  return true;
};

export const updateUserRole = async (userId: string, updates: any) => {
  if (!db) return;
  await updateDoc(doc(db, "users", userId), { ...updates, updatedAt: new Date().toISOString() });
};

export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
};

export const deleteUser = async (userId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "users", userId));
};

export const searchUsersForAdmin = async (keyword: string, maxResults: number = 12): Promise<User[]> => {
  if (!db) return [];
  const k = (keyword || '').trim().toLowerCase();
  const snap = await getDocs(query(collection(db, "users"), limit(200)));
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  return users.filter((u: any) => (u?.name || '').toLowerCase().includes(k) || (u?.email || '').toLowerCase().includes(k)).slice(0, maxResults);
};

export const createUserByAdmin = async (payload: any) => {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken(true);
  const res = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Không tạo được người dùng.");
  return res.json();
};

/* ============================================================
   EXPERT MANAGEMENT
   ============================================================ */
export const fetchExpertApplications = async (): Promise<ExpertApplication[]> => {
  if (!db) return [];
  const q = query(collection(db, "expert_applications"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ExpertApplication));
};

export const processExpertApplication = async (appId: string, userId: string, status: string, reason?: string, specialty?: string) => {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.update(doc(db, "expert_applications", appId), { status, rejectionReason: reason || null, reviewedAt: now, approvedSpecialty: specialty || null });
  batch.update(doc(db, "users", userId), { isExpert: status === "approved", expertStatus: status, specialty: specialty || "", updatedAt: now });
  await batch.commit();
};

export const deleteExpertApplication = async (appId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "expert_applications", appId));
};

export const addExpertManually = async (payload: { userId: string; specialty: string; name?: string; bio?: string }) => {
  if (!db) return;
  const now = new Date().toISOString();
  await updateDoc(doc(db, "users", payload.userId), { ...payload, isExpert: true, expertStatus: "approved", expertApprovedAt: now, updatedAt: now });
};

export const revokeExpertByAdmin = async (payload: { userId: string; appId?: string; reason?: string }) => {
  if (!db) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.update(doc(db, "users", payload.userId), { isExpert: false, expertStatus: "rejected", specialty: "", updatedAt: now });
  if (payload.appId) batch.update(doc(db, "expert_applications", payload.appId), { status: "rejected", reviewedAt: now });
  await batch.commit();
};

export const updateExpertSpecialtyFromApp = async (payload: { appId: string; userId: string; specialty: string }) => {
  if (!db) return;
  const batch = writeBatch(db);
  batch.update(doc(db, "expert_applications", payload.appId), { approvedSpecialty: payload.specialty });
  batch.update(doc(db, "users", payload.userId), { specialty: payload.specialty });
  await batch.commit();
};

/* ============================================================
   QUESTIONS & CATEGORIES (Sửa lỗi Import QuestionManagement)
   ============================================================ */
export const fetchQuestionsAdminPaginated = async (lastVisible: any, pageSize: number = 15) => {
  if (!db) return { questions: [], lastDoc: null, hasMore: false };
  let q = query(collection(db, "questions"), orderBy("createdAt", "desc"), limit(pageSize));
  if (lastVisible) q = query(q, startAfter(lastVisible));
  const snap = await getDocs(q);
  return { questions: snap.docs.map(d => ({ id: d.id, ...d.data() })), lastDoc: snap.docs[snap.docs.length - 1], hasMore: snap.docs.length === pageSize };
};

export const bulkUpdateQuestions = async (ids: string[], updates: any) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, "questions", id), updates));
  await batch.commit();
};

export const bulkDeleteQuestions = async (ids: string[]) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, "questions", id)));
  await batch.commit();
};

export const fetchCategories = async () => {
  if (!db) return [];
  const snap = await getDocs(collection(db, "categories"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
};

export const addCategory = async (name: string, style?: any) => {
  if (!db) return;
  await addDoc(collection(db, "categories"), { name, slug: toSlug(name), ...style });
};

export const updateCategory = async (id: string, name: string, style?: any) => {
  if (!db) return;
  await updateDoc(doc(db, "categories", id), { name, slug: toSlug(name), ...style });
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "categories", id));
};

export const syncCategoriesFromCode = async () => {
  if (!db) return;
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, "categories"));
  const existingNames = snap.docs.map(d => d.data().name);
  CATEGORIES.forEach(cat => {
    if (!existingNames.includes(cat)) {
      batch.set(doc(collection(db, "categories")), { name: cat, slug: toSlug(cat), icon: "Tag" });
    }
  });
  await batch.commit();
};

/* ============================================================
   REPORTS, BLOGS, DOCUMENTS
   ============================================================ */
export const fetchReports = async () => {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const resolveReport = async (reportId: string, action: string) => {
  if (!db) return;
  await updateDoc(doc(db, "reports", reportId), { status: action, resolvedAt: new Date().toISOString() });
};

export const fetchAllBlogs = async () => {
  if (!db) return [];
  const snap = await getDocs(collection(db, "blogPosts"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const fetchAllDocuments = async () => {
  if (!db) return [];
  const snap = await getDocs(collection(db, "documents"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
