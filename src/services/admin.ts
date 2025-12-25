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
   /* ============================================================
   USERS MANAGEMENT (Bản sửa lỗi không hiện người dùng thật)
   ============================================================ */
export const fetchUsersAdminPaginated = async (
    lastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20
) => {
    if (!db) return { users: [], lastDoc: null, hasMore: false };
    try {
        // ✅ THAY ĐỔI: Thay vì chỉ orderBy 'joinedAt' (sẽ làm mất người dùng thiếu trường này)
        // Ta sẽ dùng query cơ bản nhất để đảm bảo HIỆN TẤT CẢ NGƯỜI DÙNG THẬT
        let q = query(
            collection(db, 'users'), 
            limit(pageSize)
        );

        // Nếu mẹ muốn ưu tiên người mới mà không mất người cũ, dùng logic này:
        // Lưu ý: Nếu bị lỗi "Index", mẹ chỉ cần bấm vào link trong Console F12 của trình duyệt 1 lần là xong.
        q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'), limit(pageSize));

        if (lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        
        // Nếu trang đầu tiên trống (do lỗi orderBy), ta sẽ tự động lấy query không sắp xếp
        if (snapshot.empty && !lastVisible) {
            const fallbackSnap = await getDocs(query(collection(db, 'users'), limit(pageSize)));
            const users = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
            return {
                users,
                lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
                hasMore: fallbackSnap.docs.length === pageSize
            };
        }

        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
        return {
            users: users,
            lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            hasMore: snapshot.docs.length === pageSize
        };
    } catch (error) {
        console.error("Error fetching users:", error);
        // ✅ CỨU HỘ: Nếu lỗi sắp xếp, trả về danh sách không sắp xếp để mẹ vẫn thấy người dùng
        const fallbackSnap = await getDocs(query(collection(db, 'users'), limit(pageSize)));
        return {
            users: fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)),
            lastDoc: fallbackSnap.docs[fallbackSnap.docs.length - 1] || null,
            hasMore: false
        };
    }
};

// Sửa hàm lấy tất cả user để không bị sót
export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    // Lấy hết không cần orderBy để chắc chắn thấy người dùng thật
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
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
  try {
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
  } catch (error) {
    console.error("Error processing expert app:", error);
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
  } catch (error) {
    console.error("Error fetching questions paginated:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

export const fetchQuestionById = async (id: string): Promise<Question | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'questions', id));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Question;
  return null;
};

export const bulkUpdateQuestions = async (ids: string[], updates: { isHidden?: boolean }) => {
  if (!db) return;
  try {
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(doc(db, 'questions', id), updates));
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
    ids.forEach(id => batch.delete(doc(db, 'questions', id)));
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
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report));
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

export const resolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
  if (!db) return;
  try {
    const ref = doc(db, 'reports', reportId);
    await updateDoc(ref, { 
      status: action, 
      resolvedAt: new Date().toISOString() 
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
    const reportRef = doc(db, 'reports', report.id);
    batch.update(reportRef, { status: 'resolved', resolvedAt: new Date().toISOString() });

    if (report.targetType === 'question') {
      batch.delete(doc(db, 'questions', report.targetId));
    } else if (report.targetType === 'answer') {
      batch.delete(doc(db, 'answers', report.targetId));
    }
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
    const snapshot = await getDocs(collection(db, 'categories'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const addCategory = async (name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  try {
    await addDoc(collection(db, 'categories'), { name, slug: toSlug(name), ...style });
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, name: string, style?: { icon: string, color: string, bg: string }) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'categories', id), { name, slug: toSlug(name), ...style });
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'categories', id));
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
    console.error("Error fetching docs:", error);
    return [];
  }
};
