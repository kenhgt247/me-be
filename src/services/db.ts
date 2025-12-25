import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDoc,
  getDocs, // <--- ĐÃ THÊM HÀM NÀY (QUAN TRỌNG)
  arrayUnion,
  arrayRemove,
  where,
  addDoc,
  limit,
  writeBatch,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  Question,
  Answer,
  Notification,
  User,
  toSlug
} from '../types';

/* =======================
   CONSTANTS
======================= */
const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const EXPERT_APPS_COLLECTION = 'expert_applications';

/* =======================
   UTILS
======================= */
const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

/* =======================
   USER UTILS
======================= */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds || userIds.length === 0) return [];
  try {
    const promises = userIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)));
    const snapshots = await Promise.all(promises);
    return snapshots
      .filter(snap => snap.exists())
      .map(snap => ({ id: snap.id, ...snap.data() } as User));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, {
      isOnline: isOnline,
      lastActiveAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    // Ignore presence errors
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (!db || !userId) {
    callback(null);
    return () => {};
  }
  return onSnapshot(doc(db, USERS_COLLECTION, userId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as User);
    } else {
      callback(null);
    }
  }, (error) => console.warn("User sub error:", error.code));
};

/* =======================
   SOCIAL (FOLLOW / UNFOLLOW)
======================= */
export const followUser = async (currentUserId: string, targetUser: User) => {
  if (!db || !currentUserId || !targetUser.id) return;
  try {
    const batch = writeBatch(db);
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    batch.update(currentUserRef, { following: arrayUnion(targetUser.id) });
    const targetUserRef = doc(db, USERS_COLLECTION, targetUser.id);
    batch.update(targetUserRef, { followers: arrayUnion(currentUserId) });
    await batch.commit();
    
    sendNotification(
      targetUser.id,
      { id: currentUserId, name: 'Người dùng', avatar: '' } as User, 
      'FOLLOW',
      'đã bắt đầu theo dõi bạn.',
      `/profile/${currentUserId}`
    );
  } catch (e) {
    console.error("Follow error:", e);
    throw e;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!db || !currentUserId || !targetUserId) return;
  try {
    const batch = writeBatch(db);
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    batch.update(currentUserRef, { following: arrayRemove(targetUserId) });
    const targetUserRef = doc(db, USERS_COLLECTION, targetUserId);
    batch.update(targetUserRef, { followers: arrayRemove(currentUserId) });
    await batch.commit();
  } catch (e) {
    console.error("Unfollow error:", e);
    throw e;
  }
};

/* =======================
   NOTIFICATIONS
======================= */
export const sendNotification = async (
  recipientId: string,
  sender: User,
  type: Notification['type'],
  content: string,
  link: string
) => {
  if (!db || !recipientId || recipientId === sender.id) return;
  try {
    const notif = {
      userId: recipientId,
      sender: { name: sender.name, avatar: sender.avatar, id: sender.id },
      type,
      content,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notif);
  } catch (e) {
    console.warn("Send notif error:", e);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
  if (!db || !userId) return () => {};
  const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
  );
  return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      callback(items);
  }, (error) => {
      console.warn("Notif sub error:", error.message);
      callback([]);
  });
};

export const markNotificationAsRead = async (notifId: string) => {
  if (!db) return;
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), { isRead: true });
};

/* =======================
   EXPERT REGISTRATION
======================= */
export const submitExpertApplication = async (user: User, data: any) => {
    if (!db) return;
    const app = {
        userId: user.id,
        fullName: data.fullName,
        phone: data.phone,
        workplace: data.workplace,
        specialty: data.specialty,
        proofImages: [], 
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, EXPERT_APPS_COLLECTION), app);
    await updateDoc(doc(db, USERS_COLLECTION, user.id), { 
        expertStatus: 'pending', 
        specialty: data.specialty,
        workplace: data.workplace
    });
};

/* =======================
   QUESTIONS & ANSWERS
======================= */

// --- 1. LẤY DANH SÁCH CÂU HỎI (PHÂN TRANG) ---
export const fetchQuestionsPaginated = async (
  category: string = 'Tất cả', 
  filterType: 'newest' | 'active' | 'unanswered' = 'newest',
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null, 
  pageSize: number = 10
) => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    let q = query(questionsRef);

    if (category !== 'Tất cả') {
      q = query(q, where('category', '==', category));
    }

    if (filterType === 'unanswered') {
       q = query(q, orderBy('createdAt', 'desc'));
    } else if (filterType === 'active') {
       q = query(q, orderBy('createdAt', 'desc')); 
    } else {
       q = query(q, orderBy('createdAt', 'desc'));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));

    const snapshot = await getDocs(q); // Lỗi ở đây đã được fix do thêm import getDocs
    
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Question[];

    const finalQuestions = filterType === 'unanswered' 
        ? questions.filter(q => q.answers.length === 0) 
        : questions;
    
    if (filterType === 'active') {
        finalQuestions.sort((a, b) => b.answers.length - a.answers.length);
    }

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    return { 
      questions: finalQuestions, 
      lastDoc: lastVisible, 
      hasMore: snapshot.docs.length === pageSize 
    };
  } catch (error) {
    console.error("Lỗi lấy câu hỏi phân trang:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

// --- 2. LẤY CHI TIẾT 1 CÂU HỎI ---
export const fetchQuestionById = async (id: string): Promise<Question | null> => {
    if (!db || !id) return null;
    try {
      const docRef = doc(db, QUESTIONS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        updateDoc(docRef, { views: increment(1) }).catch(()=>{});
        return { id: docSnap.id, ...docSnap.data() } as Question;
      }
      return null;
    } catch (e) {
      console.error("Error fetching question detail:", e);
      return null;
    }
};

// --- HÀM CŨ ĐỂ TRÁNH LỖI IMPORT Ở FILE KHÁC ---
export const subscribeToQuestions = (callback: (qs: Question[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
    return onSnapshot(q, (snap) => {
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(questions);
    });
};

export const addQuestionToDb = async (q: Question) => {
    if (!db) return;
    await setDoc(doc(db, QUESTIONS_COLLECTION, q.id), sanitizeData(q));
};

export const updateQuestionInDb = async (id: string, data: Partial<Question>) => {
    if (!db) return;
    await updateDoc(doc(db, QUESTIONS_COLLECTION, id), sanitizeData(data));
};

export const deleteQuestionFromDb = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
};

export const toggleQuestionLikeDb = async (q: Question, user: User) => {
    if (!db || !q.id || !user.id) return;
    const qRef = doc(db, QUESTIONS_COLLECTION, q.id);
    try {
        const snap = await getDoc(qRef);
        if (!snap.exists()) return;
        const data = snap.data();
        const currentLikes: string[] = Array.isArray(data.likes) ? data.likes : [];
        const isLiked = currentLikes.includes(user.id);

        if (isLiked) {
            await updateDoc(qRef, { likes: arrayRemove(user.id) });
        } else {
            await updateDoc(qRef, { likes: arrayUnion(user.id) });
            if (q.author.id !== user.id) {
                sendNotification(q.author.id, user, 'LIKE', `thích câu hỏi: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
            }
        }
    } catch (error) { console.error("Lỗi toggle Like Question:", error); }
};

export const toggleSaveQuestion = async (userId: string, qId: string, save: boolean) => {
    if (!db) return;
    const ref = doc(db, USERS_COLLECTION, userId);
    await updateDoc(ref, { savedQuestions: save ? arrayUnion(qId) : arrayRemove(qId) });
};

export const addAnswerToDb = async (q: Question, a: Answer) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, q.id);
    await updateDoc(ref, { answers: arrayUnion(sanitizeData(a)) });
    sendNotification(q.author.id, a.author, 'ANSWER', `trả lời: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
};

export const updateAnswerInDb = async (qId: string, aId: string, updates: Partial<Answer>) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const q = snap.data() as Question;
            const newAnswers = q.answers.map(a => a.id === aId ? { ...a, ...updates } : a);
            await updateDoc(ref, { answers: newAnswers });
            const targetAnswer = q.answers.find(a => a.id === aId);
            if (targetAnswer && (updates.isExpertVerified || updates.isBestAnswer)) {
                const type = updates.isExpertVerified ? 'VERIFY' : 'BEST_ANSWER';
                const content = updates.isExpertVerified ? 'đã xác thực câu trả lời.' : 'đã chọn câu trả lời hay nhất.';
                sendNotification(targetAnswer.author.id, { name: 'Hệ thống', avatar: '/icon-system.png', id: 'system' } as User, type, content, `/question/${toSlug(q.title, q.id)}`);
            }
        }
    } catch (e) { console.error("Update answer error:", e); }
};

export const deleteAnswerFromDb = async (qId: string, aId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const q = snap.data() as Question;
        const newAnswers = q.answers.filter(a => a.id !== aId);
        await updateDoc(ref, { answers: newAnswers });
    }
};

export const toggleAnswerUseful = async (qId: string, aId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const q = snap.data() as Question;
            const newAnswers = q.answers.map(a => {
                if (a.id === aId) {
                    const usefulBy = Array.isArray(a.usefulBy) ? a.usefulBy : [];
                    const isUseful = usefulBy.includes(userId);
                    const newUsefulBy = isUseful ? usefulBy.filter(id => id !== userId) : [...usefulBy, userId];
                    return { ...a, usefulBy: newUsefulBy, likes: newUsefulBy.length };
                }
                return a;
            });
            await updateDoc(ref, { answers: newAnswers });
        }
    } catch (error) { console.error("Lỗi toggle Useful Answer:", error); }
};

// --- REPORTING ---
export const sendReport = async (targetId: string, targetType: 'question' | 'answer', reason: string, reportedBy: string) => {
  if (!db) return;
  try {
    await addDoc(collection(db, 'reports'), {
      targetId, targetType, reason, reportedBy, status: 'open', createdAt: new Date().toISOString()
    });
  } catch (e) { console.error("Error sending report", e); throw e; }
};

// --- CHAT HELPERS ---
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};