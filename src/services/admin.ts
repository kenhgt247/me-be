import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc, 
  getDoc, writeBatch, addDoc, limit, startAfter, QueryDocumentSnapshot, 
  DocumentData, getCountFromServer 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, ExpertApplication, Report, Category, toSlug, CATEGORIES } from '../types';

/* ============================================================
   SYSTEM STATS (Tối ưu cho Dashboard)
   ============================================================ */
export const getSystemStats = async () => {
  if (!db) return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  try {
    const usersCol = collection(db, 'users');
    const questionsCol = collection(db, 'questions');
    const blogsCol = collection(db, 'blogPosts');
    const docsCol = collection(db, 'documents');

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

/* ============================================================
   USERS MANAGEMENT
   ============================================================ */
export const fetchUsersAdminPaginated = async (
    lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20
) => {
    if (!db) return { users: [], lastDoc: null, hasMore: false };
    // Sắp xếp theo joinedAt giảm dần để người mới lên đầu
    let q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'), limit(pageSize));
    if (lastVisible) q = query(q, startAfter(lastVisible));

    const snapshot = await getDocs(q);
    return {
        users: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
    };
};

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

export const updateUserRole = async (userId: string, updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }) => {
  if (!db) return;
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, updates);
};

export const updateUserInfo = async (userId: string, data: { name?: string; bio?: string; specialty?: string }) => {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
    return true;
  } catch (error) {
    console.error("Error updating user info:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'users', userId));
};

/* ============================================================
   EXPERT APPLICATIONS
   ============================================================ */
export const fetchExpertApplications = async (): Promise<ExpertApplication[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'expert_applications'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpertApplication));
  } catch (error) {
    console.error("Error fetching expert apps:", error);
    return [];
  }
};

export const processExpertApplication = async (appId: string, userId: string, status: 'approved' | 'rejected', reason?: string, specialty?: string) => {
  if (!db) return;
  const batch = writeBatch(db);
  const appRef = doc(db, 'expert_applications', appId);
  
  batch.update(appRef, { 
    status, 
    rejectionReason: reason || null, 
    reviewedAt: new Date().toISOString() 
  });

  const userRef = doc(db, 'users', userId);
  if (status === 'approved') {
    batch.update(userRef, { 
      isExpert: true, 
      expertStatus: 'approved',
      specialty: specialty || '' 
    });
  } else {
    batch.update(userRef, { expertStatus: 'rejected' });
  }
  await batch.commit();
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

export const fetchAllQuestionsAdmin = async (): Promise<Question[]> => {
  if (!db) return [];
  const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
};

export const fetchQuestionById = async (id: string): Promise<Question | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'questions', id));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Question;
  return null;
};

export const bulkUpdateQuestions = async (ids: string[], updates: { isHidden?: boolean }) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, 'questions', id), updates));
  await batch.commit();
};

export const bulkDeleteQuestions = async (ids: string[]) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, 'questions', id)));
  await batch.commit();
};

/* ============================================================
   REPORTS MANAGEMENT
   ============================================================ */
export const fetchReports = async (): Promise<Report[]> => {
  if (!db) return [];
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
};

export const resolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
  if (!db) return;
  const ref = doc(db, 'reports', reportId);
  await updateDoc(ref, { 
    status: action, 
    resolvedAt: new Date().toISOString() 
  });
};

export const deleteReportedContent = async (report: Report) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    
    // 1. Cập nhật trạng thái báo cáo
    const reportRef = doc(db, 'reports', report.id);
    batch.update(reportRef, { status: 'resolved', resolvedAt: new Date().toISOString() });

    // 2. Xóa nội dung mục tiêu
    if (report.targetType === 'question') {
      batch.delete(doc(db, 'questions', report.targetId));
    } else if (report.targetType === 'answer') {
      batch.delete(doc(db, 'answers', report.targetId));
    }

    await batch.commit();
  } catch (e) {
    console.error("Error deleting reported content:", e);
  }
};

/* ============================================================
   CATEGORIES MANAGEMENT
   ============================================================ */
export const fetchCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'categories'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const addCategory = async (name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  await addDoc(collection(db, 'categories'), { 
    name, 
    slug: toSlug(name), 
    ...style 
  });
};

export const updateCategory = async (id: string, name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  await updateDoc(doc(db, 'categories', id), { 
    name, 
    slug: toSlug(name), 
    ...style 
  });
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'categories', id));
};

export const syncCategoriesFromCode = async () => {
  if (!db) return;
  const batch = writeBatch(db);
  const existing = await fetchCategories();
  const existingNames = existing.map(c => c.name);
  let count = 0;
  CATEGORIES.forEach(catName => {
    if (!existingNames.includes(catName)) {
      const docRef = doc(collection(db, 'categories'));
      batch.set(docRef, { 
        name: catName, 
        slug: toSlug(catName), 
        icon: 'Tag', 
        color: 'text-gray-600', 
        bg: 'bg-gray-100' 
      });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  return count;
};

/* ============================================================
   BLOGS & DOCUMENTS
   ============================================================ */
export const fetchAllBlogs = async () => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'blogPosts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchAllDocuments = async () => {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'documents'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
