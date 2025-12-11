import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, ExpertApplication, Report } from '../types';

// --- USERS ---
export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    // Sort client-side to avoid index issues
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

// --- USER INFO UPDATE ---

export const updateUserInfo = async (userId: string, data: { name?: string; bio?: string; specialty?: string }) => {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', userId);
    // Sử dụng updateDoc để chỉ cập nhật các trường được truyền vào
    await updateDoc(userRef, data);
    return true;
  } catch (error) {
    console.error("Lỗi khi update user info:", error);
    throw error;
  }
};

// --- EXPERT APPLICATIONS ---
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
  
  // 1. Update Application Status
  const appRef = doc(db, 'expert_applications', appId);
  batch.update(appRef, { 
    status, 
    rejectionReason: reason || null,
    reviewedAt: new Date().toISOString() 
  });

  // 2. Update User Profile if Approved
  if (status === 'approved') {
    const userRef = doc(db, 'users', userId);
    const updates: any = { 
      isExpert: true, 
      expertStatus: 'approved' 
    };
    if (specialty) updates.specialty = specialty;
    
    batch.update(userRef, updates);
  } else if (status === 'rejected') {
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, { expertStatus: 'rejected' });
  }

  await batch.commit();
};

// --- QUESTIONS ---
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

// --- REPORTS ---
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
        // 1. Mark report as resolved
        await resolveReport(report.id, 'resolved');

        // 2. Delete content
        if (report.targetType === 'question') {
            await deleteDoc(doc(db, 'questions', report.targetId));
        } else if (report.targetType === 'answer') {
            // Note: Deleting an answer individually is tricky without parentId in the report model.
            // For MVP, we'll log this limitation. In production, Report should store questionId for answers.
            console.warn("Deleting answer directly requires parent ID. Please delete manually via Question Manager.");
        }
    } catch (e) {
        console.error("Error deleting reported content", e);
    }
};
