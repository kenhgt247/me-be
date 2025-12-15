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
  where,
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
// Loại bỏ các giá trị undefined để tránh lỗi Firestore
const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

/* =======================
   USER UTILS
======================= */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds || userIds.length === 0) return [];
  try {
    // Chỉ lấy tối đa 10 user một lần để tối ưu (hoặc chia nhỏ mảng nếu cần)
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
    // Dùng set với merge để không bị lỗi nếu doc chưa tồn tại
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
   SOCIAL (FOLLOW)
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
  } catch (e) {
    console.error("Follow error:", e);
    throw e;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!db) return;
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
  // Không gửi thông báo cho chính mình
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
      // Sắp xếp client-side để giảm tải index
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
  }, (error) => {
      // Bỏ qua lỗi permission nếu user vừa logout
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
    
    // Cập nhật trạng thái user để hiển thị UI "Đang chờ duyệt"
    await updateDoc(doc(db, USERS_COLLECTION, user.id), { 
        expertStatus: 'pending', 
        specialty: data.specialty,
        workplace: data.workplace
    });
};

/* =======================
   QUESTIONS & ANSWERS (CORE)
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
    // Lấy 100 câu hỏi mới nhất
    const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
    
    return onSnapshot(q, (snap) => {
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        // Sắp xếp giảm dần theo thời gian tạo
        questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(questions);
    });
};

// --- FIX LỖI LIKE CÂU HỎI ---
export const toggleQuestionLikeDb = async (q: Question, user: User) => {
    if (!db || !q.id || !user.id) return;
    
    const qRef = doc(db, QUESTIONS_COLLECTION, q.id);
    
    try {
        // 1. Đọc dữ liệu mới nhất từ DB để biết đã like chưa
        const snap = await getDoc(qRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        // Đảm bảo likes là một mảng
        const currentLikes: string[] = Array.isArray(data.likes) ? data.likes : [];
        const isLiked = currentLikes.includes(user.id);

        if (isLiked) {
            // 2a. Nếu đã thích -> XÓA (Un-like)
            await updateDoc(qRef, { likes: arrayRemove(user.id) });
        } else {
            // 2b. Nếu chưa thích -> THÊM (Like)
            await updateDoc(qRef, { likes: arrayUnion(user.id) });
            
            // Chỉ gửi thông báo khi Like
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
    
    // Thêm câu trả lời vào mảng answers
    await updateDoc(ref, { answers: arrayUnion(sanitizeData(a)) });
    
    await sendNotification(q.author.id, a.author, 'ANSWER', `trả lời: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
};

export const updateAnswerInDb = async (qId: string, aId: string, updates: Partial<Answer>) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const q = snap.data() as Question;
            // Tìm và cập nhật câu trả lời trong mảng
            const newAnswers = q.answers.map(a => a.id === aId ? { ...a, ...updates } : a);
            
            await updateDoc(ref, { answers: newAnswers });
            
            // Gửi thông báo nếu được verify hoặc chọn là hay nhất
            if (updates.isExpertVerified || updates.isBestAnswer) {
                const answer = q.answers.find(a => a.id === aId);
                if (answer) {
                    const type = updates.isExpertVerified ? 'VERIFY' : 'BEST_ANSWER';
                    const content = updates.isExpertVerified ? 'đã xác thực câu trả lời.' : 'đã chọn câu trả lời hay nhất.';
                    // Sử dụng ID hệ thống giả lập để gửi thông báo
                    await sendNotification(
                        answer.author.id, 
                        { name: 'Hệ thống', avatar: '/icon-system.png', id: 'system' } as User, 
                        type, 
                        content, 
                        `/question/${toSlug(q.title, q.id)}`
                    );
                }
            }
        }
    } catch (e) {
        console.error("Update answer error:", e);
    }
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

// --- FIX LỖI LIKE CÂU TRẢ LỜI ---
export const toggleAnswerUseful = async (qId: string, aId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const q = snap.data() as Question;
            
            // Tạo mảng answers mới với logic toggle like
            const newAnswers = q.answers.map(a => {
                if (a.id === aId) {
                    const usefulBy = Array.isArray(a.usefulBy) ? a.usefulBy : [];
                    const isUseful = usefulBy.includes(userId);
                    
                    let newUsefulBy;
                    if (isUseful) {
                         // Bỏ like
                         newUsefulBy = usefulBy.filter(id => id !== userId);
                    } else {
                         // Thêm like
                         newUsefulBy = [...usefulBy, userId];
                    }
                    
                    // Cập nhật cả mảng ID người like VÀ số lượng like (likes)
                    return { ...a, usefulBy: newUsefulBy, likes: newUsefulBy.length };
                }
                return a;
            });
            
            // Ghi đè lại mảng answers
            await updateDoc(ref, { answers: newAnswers });
        }
    } catch (error) {
        console.error("Lỗi toggle Useful Answer:", error);
    }
};

// --- REPORTING ---
export const sendReport = async (
  targetId: string,
  targetType: 'question' | 'answer',
  reason: string,
  reportedBy: string
) => {
  if (!db) return;
  try {
    await addDoc(collection(db, 'reports'), {
      targetId,
      targetType,
      reason,
      reportedBy,
      status: 'open',
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error sending report", e);
    throw e;
  }
};
