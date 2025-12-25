import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, 
  deleteDoc, getDoc, writeBatch, addDoc, limit, startAfter,
  QueryDocumentSnapshot, DocumentData, getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, ExpertApplication, Report, Category, toSlug, CATEGORIES, BlogPost, Document } from '../types';

/* =======================
   OPTIMIZED STATS (Dashboard)
   ======================= */
export const getSystemStats = async () => {
  if (!db) return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  
  const usersCol = collection(db, 'users');
  const questionsCol = collection(db, 'questions');
  const blogsCol = collection(db, 'blogPosts');
  const docsCol = collection(db, 'documents');

  try {
    const [usersSnap, questionsSnap, blogsSnap, docsSnap] = await Promise.all([
      getCountFromServer(usersCol),
      getCountFromServer(questionsCol),
      getCountFromServer(blogsCol),
      getCountFromServer(docsCol)
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

/* =======================
   QUESTIONS ADMIN (Pagination)
   ======================= */
export const fetchQuestionsAdminPaginated = async (
  lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 15,
  filters?: { category?: string; isHidden?: boolean; searchTerm?: string }
) => {
  let q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));

  if (filters?.category && filters.category !== 'Tất cả') {
    q = query(q, where('category', '==', filters.category));
  }
  
  if (filters?.isHidden !== undefined) {
    q = query(q, where('isHidden', '==', filters.isHidden));
  }

  if (lastVisible) {
    q = query(q, startAfter(lastVisible), limit(pageSize));
  } else {
    q = query(q, limit(pageSize));
  }

  const snapshot = await getDocs(q);
  let questions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));

  // Search local (Firebase không hỗ trợ search text partial hiệu quả mà không có service ngoài)
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    questions = questions.filter(q => q.title.toLowerCase().includes(term));
  }
  
  return {
    questions,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize
  };
};

/* =======================
   USERS & EXPERTS
   ======================= */
export const fetchUsersAdminPaginated = async (
    lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20
) => {
    let q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));

    const snapshot = await getDocs(q);
    return {
        users: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
    };
};

export const updateUserRole = async (userId: string, updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }) => {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, updates);
};

export const fetchExpertApplications = async (): Promise<ExpertApplication[]> => {
  const q = query(collection(db, 'expert_applications'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpertApplication));
};

export const processExpertApplication = async (appId: string, userId: string, status: 'approved' | 'rejected', reason?: string, specialty?: string) => {
  const batch = writeBatch(db);
  const appRef = doc(db, 'expert_applications', appId);
  batch.update(appRef, { status, rejectionReason: reason || null, reviewedAt: new Date().toISOString() });

  const userRef = doc(db, 'users', userId);
  if (status === 'approved') {
    batch.update(userRef, { isExpert: true, expertStatus: 'approved', specialty: specialty || '' });
  } else {
    batch.update(userRef, { expertStatus: 'rejected' });
  }
  await batch.commit();
};

/* =======================
   BULK ACTIONS
   ======================= */
export const bulkUpdateQuestions = async (ids: string[], updates: { isHidden?: boolean }) => {
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, 'questions', id), updates));
  await batch.commit();
};

export const bulkDeleteQuestions = async (ids: string[]) => {
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, 'questions', id)));
  await batch.commit();
};

/* =======================
   REPORTS & CATEGORIES
   ======================= */
export const fetchReports = async (): Promise<Report[]> => {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
};

export const fetchCategories = async (): Promise<Category[]> => {
  const snapshot = await getDocs(collection(db, 'categories'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const addCategory = async (name: string, style?: { icon: string, color: string, bg: string }) => {
  await addDoc(collection(db, 'categories'), { name, slug: toSlug(name), ...style });
};

export const updateCategory = async (id: string, name: string, style?: { icon: string, color: string, bg: string }) => {
  await updateDoc(doc(db, 'categories', id), { name, slug: toSlug(name), ...style });
};

export const deleteCategory = async (id: string) => {
  await deleteDoc(doc(db, 'categories', id));
};

export const syncCategoriesFromCode = async () => {
  const batch = writeBatch(db);
  const existing = await fetchCategories();
  const existingNames = existing.map(c => c.name);
  let count = 0;
  CATEGORIES.forEach(catName => {
    if (!existingNames.includes(catName)) {
      const docRef = doc(collection(db, 'categories'));
      batch.set(docRef, { name: catName, slug: toSlug(catName), icon: 'Tag', color: 'text-gray-600', bg: 'bg-gray-100' });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  return count;
};

// HELPER FETCH ALL (Dùng cho đếm cũ hoặc tập dữ liệu nhỏ)
export const fetchAllBlogs = async () => {
  const snapshot = await getDocs(collection(db, 'blogPosts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchAllDocuments = async () => {
  const snapshot = await getDocs(collection(db, 'documents'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// --- PHỤC HỒI HÀM CHO USER MANAGEMENT ---

export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const updateUserInfo = async (userId: string, data: { name?: string; bio?: string; specialty?: string }) => {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
    return true;
  } catch (error) {
    console.error("Lỗi khi update user info:", error);
    throw error;
  }
};
