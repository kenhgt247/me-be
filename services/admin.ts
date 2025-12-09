
import { 
  collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, ExpertApplication, Report } from '../types';

// --- USERS ---
export const fetchAllUsers = async (): Promise<User[]> => {
  if (!db) return [];
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
};

export const updateUserRole = async (userId: string, updates: { isExpert?: boolean; isAdmin?: boolean; isBanned?: boolean }) => {
  if (!db) return;
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, updates);
};

// --- EXPERT APPLICATIONS ---
export const fetchExpertApplications = async (): Promise<ExpertApplication[]> => {
  if (!db) return [];
  const q = query(collection(db, 'expert_applications'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpertApplication));
};

export const processExpertApplication = async (appId: string, userId: string, status: 'approved' | 'rejected', reason?: string, specialty?: string) => {
  if (!db) return;
  const batch = writeBatch(db);
  
  // 1. Update Application Status
  const appRef = doc(db, 'expert_applications', appId);
  batch.update(appRef, { status, rejectionReason: reason || null });

  // 2. Update User Profile if Approved
  if (status === 'approved') {
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { 
      isExpert: true, 
      expertStatus: 'approved',
      specialty: specialty 
    });
  } else if (status === 'rejected') {
     const userRef = doc(db, 'users', userId);
     batch.update(userRef, { expertStatus: 'rejected' });
  }

  await batch.commit();
};

// --- QUESTIONS ---
export const fetchAllQuestionsAdmin = async (): Promise<Question[]> => {
  if (!db) return [];
  // Fetch all without limit for admin management (in real app, use pagination)
  const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
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

// --- REPORTS (MOCK - Since we don't have full report logic yet, this is a placeholder) ---
export const fetchReports = async (): Promise<Report[]> => {
    // In a real implementation, fetch from 'reports' collection
    return []; 
};
