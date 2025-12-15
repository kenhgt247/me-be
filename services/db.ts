import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDoc,
  arrayUnion,
  arrayRemove,
  where, // ✅ Đã thêm import where
  addDoc,
  limit,
  writeBatch
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
      limit(50)
  );
  
  return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
  }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Notif sub error:", error.message);
      }
      callback([]);
  });
};

export const markNotificationAsRead = async (notifId: string) => {
  if (!db) return;
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), { isRead: true });
};

/* =======================
   QUESTIONS & ANSWERS (FIXED LIKE LOGIC)
======================= */

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

export const subscribeToQuestions = (callback: (qs: Question[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
    
    return onSnapshot(q, (snap) => {
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(questions);
    });
};

// ✅ FIX: Logic Like Câu hỏi chuẩn
export const toggleQuestionLikeDb = async (q: Question, user: User) => {
    if (!db || !q.id || !user.id) return;
    
    const qRef = doc(db, QUESTIONS_COLLECTION, q.id);
    
    try {
        const snap = await getDoc(qRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        // Đảm bảo likes luôn là mảng, tránh lỗi undefined
        const currentLikes: string[] = Array.isArray(data.likes) ? data.likes : [];
        const isLiked = currentLikes.includes(user.id);

        if (isLiked) {
            // Nếu đã thích -> XÓA
            await updateDoc(qRef, { likes: arrayRemove(user.id) });
        } else {
            // Nếu chưa thích -> THÊM
            await updateDoc(qRef, { likes: arrayUnion(user.id) });
            
            if (q.author.id !== user.id) {
                await sendNotification(
                    q.author.id, 
                    user, 
                    'LIKE', 
                    `thích câu hỏi: ${q.title}`, 
                    `/question/${toSlug(q.title, q.id)}`
                );
            }
        }
    } catch (error) {
        console.error("Lỗi toggle Like Question:", error);
    }
};

export const toggleSaveQuestion = async (userId: string, qId: string, save: boolean) => {
    if (!db) return;
    const ref = doc(db, USERS_COLLECTION, userId);
    await updateDoc(ref, { 
        savedQuestions: save ? arrayUnion(qId) : arrayRemove(qId) 
    });
};

export const addAnswerToDb = async (q: Question, a: Answer) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, q.id);
    await updateDoc(ref, { answers: arrayUnion(sanitizeData(a)) });
    await sendNotification(q.author.id, a.author, 'ANSWER', `trả lời: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
};

// ✅ FIX: Logic Like Câu trả lời chuẩn
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
                    
                    let newUsefulBy;
                    if (isUseful) {
                         newUsefulBy = usefulBy.filter(id => id !== userId);
                    } else {
                         newUsefulBy = [...usefulBy, userId];
                    }
                    
                    // Cập nhật cả mảng ID người like và số lượng
                    return { ...a, usefulBy: newUsefulBy, likes: newUsefulBy.length };
                }
                return a;
            });
            
            await updateDoc(ref, { answers: newAnswers });
        }
    } catch (error) {
        console.error("Lỗi toggle Useful Answer:", error);
    }
};

// --- CÁC HÀM KHÁC GIỮ NGUYÊN ---
export const sendReport = async (targetId: string, targetType: 'question' | 'answer', reason: string, reportedBy: string) => {
  if (!db) return;
  await addDoc(collection(db, 'reports'), {
    targetId, targetType, reason, reportedBy, status: 'open', createdAt: new Date().toISOString()
  });
};

export const submitExpertApplication = async (user: User, data: any) => {
    if (!db) return;
    const app = {
        userId: user.id, fullName: data.fullName, phone: data.phone,
        workplace: data.workplace, specialty: data.specialty,
        proofImages: [], status: 'pending', createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, EXPERT_APPS_COLLECTION), app);
    await updateDoc(doc(db, USERS_COLLECTION, user.id), { 
        expertStatus: 'pending', specialty: data.specialty, workplace: data.workplace
    });
};

// --- CÁC HÀM CHAT (NẾU CẦN DÙNG CHUNG) ---
// Nếu bạn tách file chat riêng thì có thể bỏ qua phần này, 
// nhưng nếu dùng chung thì đảm bảo import đủ
export const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');
