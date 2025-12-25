import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc, getDoc, writeBatch, addDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, ExpertApplication, Report, Category, toSlug, CATEGORIES } from '../types';

/* ============================================================
   USERS MANAGEMENT
   ============================================================ */
export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    return users.sort((a, b) => new Date(b.joinedAt || '').getTime() - new Date(a.joinedAt || '').getTime());
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
    console.error("Lỗi khi update user info:", error);
    throw error;
  }
};

// Hàm bổ sung: Xóa người dùng (Dành cho Admin tối cao)
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
    const q = query(collection(db, 'expert_applications'));
    const snapshot = await getDocs(q);
    const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpertApplication));
    return apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  if (status === 'approved') {
    const userRef = doc(db, 'users', userId);
    const updates: any = { isExpert: true, expertStatus: 'approved' };
    if (specialty) updates.specialty = specialty;
    batch.update(userRef, updates);
  } else if (status === 'rejected') {
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { expertStatus: 'rejected' });
  }
  await batch.commit();
};

/* ============================================================
   QUESTIONS MANAGEMENT
   ============================================================ */
export const fetchAllQuestionsAdmin = async (): Promise<Question[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'questions'));
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
    return questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

// Hàm bổ sung: Lấy chi tiết 1 câu hỏi để Admin kiểm duyệt nội dung bị Report
export const fetchQuestionById = async (id: string): Promise<Question | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'questions', id));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Question;
  return null;
};

export const bulkUpdateQuestions = async (ids: string[], updates: { isHidden?: boolean }) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const ref = doc(db, 'questions', id);
    batch.update(ref, updates);
  });
  await batch.commit();
};

export const bulkDeleteQuestions = async (ids: string[]) => {
  if (!db) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const ref = doc(db, 'questions', id);
    batch.delete(ref);
  });
  await batch.commit();
};

/* ============================================================
   REPORTS MANAGEMENT
   ============================================================ */
export const fetchReports = async (): Promise<Report[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'reports'));
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Error fetching reports", e);
    return [];
  }
};

export const resolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
  if (!db) return;
  const ref = doc(db, 'reports', reportId);
  await updateDoc(ref, { status: action });
};

export const deleteReportedContent = async (report: Report) => {
  if (!db) return;
  try {
    await resolveReport(report.id, 'resolved');
    if (report.targetType === 'question') {
      await deleteDoc(doc(db, 'questions', report.targetId));
    } else if (report.targetType === 'answer') {
      console.warn("Vui lòng xóa câu trả lời thủ công qua trang Question Manager.");
    }
  } catch (e) {
    console.error("Error deleting reported content", e);
  }
};

/* ============================================================
   CATEGORIES MANAGEMENT
   ============================================================ */
export const fetchCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (e) {
    console.error("Error fetching categories", e);
    return [];
  }
};

export const addCategory = async (name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  await addDoc(collection(db, 'categories'), { name, slug: toSlug(name), ...style });
};

export const updateCategory = async (id: string, name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  await updateDoc(doc(db, 'categories', id), { name, slug: toSlug(name), ...style });
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
        name: catName, slug: toSlug(catName),
        icon: 'Tag', color: 'text-gray-600', bg: 'bg-gray-100' 
      });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  return count;
};

/* ============================================================
   BLOGS & DOCUMENTS MANAGEMENT
   ============================================================ */
export const fetchAllBlogs = async () => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'blogPosts'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return [];
  }
};

export const fetchAllDocuments = async () => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'documents'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
};
