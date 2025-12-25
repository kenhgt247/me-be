// Xóa nội dung cũ trong services/db.ts và dán đoạn này vào
import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, getDoc, getDocs,
  arrayUnion, arrayRemove, where, addDoc, limit, writeBatch, orderBy, startAfter,
  QueryDocumentSnapshot, DocumentData, increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Question, Answer, Notification, User, toSlug } from '../types';

/* =======================
   CONSTANTS & UTILS
======================= */
const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const EXPERT_APPS_COLLECTION = 'expert_applications';

const sanitizeData = <T>(data: T): T => JSON.parse(JSON.stringify(data));

/* =======================
   USER UTILS
======================= */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds || userIds.length === 0) return [];
  try {
    const promises = userIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)));
    const snapshots = await Promise.all(promises);
    return snapshots.filter(snap => snap.exists()).map(snap => ({ id: snap.id, ...snap.data() } as User));
  } catch (error) { console.error("Error:", error); return []; }
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, { isOnline: isOnline, lastActiveAt: new Date().toISOString() }, { merge: true });
  } catch (e) {}
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (!db || !userId) { callback(null); return () => {}; }
  return onSnapshot(doc(db, USERS_COLLECTION, userId), (docSnap) => {
    if (docSnap.exists()) callback({ id: docSnap.id, ...docSnap.data() } as User);
    else callback(null);
  }, (error) => console.warn("User sub error:", error.code));
};

/* =======================
   SOCIAL (FOLLOW / UNFOLLOW)
======================= */
export const followUser = async (currentUserId: string, targetUser: User) => {
  if (!db || !currentUserId || !targetUser.id) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, USERS_COLLECTION, currentUserId), { following: arrayUnion(targetUser.id) });
    batch.update(doc(db, USERS_COLLECTION, targetUser.id), { followers: arrayUnion(currentUserId) });
    await batch.commit();
    sendNotification(targetUser.id, { id: currentUserId, name: 'Người dùng', avatar: '' } as User, 'FOLLOW', 'đã bắt đầu theo dõi bạn.', `/profile/${currentUserId}`);
  } catch (e) { throw e; }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!db || !currentUserId || !targetUserId) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, USERS_COLLECTION, currentUserId), { following: arrayRemove(targetUserId) });
    batch.update(doc(db, USERS_COLLECTION, targetUserId), { followers: arrayRemove(currentUserId) });
    await batch.commit();
  } catch (e) { throw e; }
};

/* =======================
   NOTIFICATIONS
======================= */
export const sendNotification = async (recipientId: string, sender: User, type: Notification['type'], content: string, link: string) => {
  if (!db || !recipientId || recipientId === sender.id) return;
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), { userId: recipientId, sender: { name: sender.name, avatar: sender.avatar, id: sender.id }, type, content, link, isRead: false, createdAt: new Date().toISOString() });
  } catch (e) { console.warn("Send notif error:", e); }
};

export const subscribeToNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
  if (!db || !userId) return () => {};
  const q = query(collection(db, NOTIFICATIONS_COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
  }, (error) => { console.warn("Notif sub error:", error.message); callback([]); });
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
    await addDoc(collection(db, EXPERT_APPS_COLLECTION), { userId: user.id, fullName: data.fullName, phone: data.phone, workplace: data.workplace, specialty: data.specialty, proofImages: [], status: 'pending', createdAt: new Date().toISOString() });
    await updateDoc(doc(db, USERS_COLLECTION, user.id), { expertStatus: 'pending', specialty: data.specialty, workplace: data.workplace });
};

/* =======================
   QUESTIONS & ANSWERS (CORE)
======================= */
export const fetchQuestionsPaginated = async (category: string = 'Tất cả', filterType: 'newest' | 'active' | 'unanswered' = 'newest', lastDoc: QueryDocumentSnapshot<DocumentData> | null = null, pageSize: number = 10) => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    let q = query(questionsRef, orderBy('createdAt', 'desc'));
    if (category !== 'Tất cả') q = query(q, where('category', '==', category));
    if (lastDoc) q = query(q, startAfter(lastDoc));
    q = query(q, limit(pageSize));
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    let finalQuestions = filterType === 'unanswered' ? questions.filter(q => q.answers.length === 0) : questions;
    if (filterType === 'active') finalQuestions.sort((a, b) => b.answers.length - a.answers.length);
    return { questions: finalQuestions, lastDoc: snapshot.docs[snapshot.docs.length - 1] || null, hasMore: snapshot.docs.length === pageSize };
  } catch (error) { return { questions: [], lastDoc: null, hasMore: false }; }
};

export const fetchQuestionById = async (id: string): Promise<Question | null> => {
    if (!db || !id) return null;
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      updateDoc(docRef, { views: increment(1) }).catch(()=>{});
      return { id: docSnap.id, ...docSnap.data() } as Question;
    }
    return null;
};

export const subscribeToQuestions = (callback: (qs: Question[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
    return onSnapshot(q, (snap) => {
        const qs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(qs);
    });
};

export const addQuestionToDb = async (q: Question) => { if (!db) return; await setDoc(doc(db, QUESTIONS_COLLECTION, q.id), sanitizeData(q)); };
export const updateQuestionInDb = async (id: string, data: Partial<Question>) => { if (!db) return; await updateDoc(doc(db, QUESTIONS_COLLECTION, id), sanitizeData(data)); };
export const deleteQuestionFromDb = async (id: string) => { if (!db) return; await deleteDoc(doc(db, QUESTIONS_COLLECTION, id)); };

export const toggleQuestionLikeDb = async (q: Question, user: User) => {
    if (!db || !q.id || !user.id) return;
    const qRef = doc(db, QUESTIONS_COLLECTION, q.id);
    const snap = await getDoc(qRef);
    if (!snap.exists()) return;
    const likes = Array.isArray(snap.data().likes) ? snap.data().likes : [];
    if (likes.includes(user.id)) await updateDoc(qRef, { likes: arrayRemove(user.id) });
    else {
      await updateDoc(qRef, { likes: arrayUnion(user.id) });
      if (q.author.id !== user.id) sendNotification(q.author.id, user, 'LIKE', `thích câu hỏi: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
    }
};

// FIX NÚT LƯU: Trả về trạng thái lỗi để UI biết
export const toggleSaveQuestion = async (userId: string, qId: string, save: boolean) => {
    if (!db || !userId) return;
    try {
      const ref = doc(db, USERS_COLLECTION, userId);
      await updateDoc(ref, { savedQuestions: save ? arrayUnion(qId) : arrayRemove(qId) });
    } catch (error) { console.error("Save error:", error); throw error; }
};

export const fetchAnswersPaginated = async (questionId: string, lastAnsDoc: QueryDocumentSnapshot<DocumentData> | null = null, pageSize: number = 5) => {
  try {
    const answersRef = collection(db, QUESTIONS_COLLECTION, questionId, 'answers');
    let q = query(answersRef, orderBy('createdAt', 'asc'), limit(pageSize));
    if (lastAnsDoc) q = query(q, startAfter(lastAnsDoc));
    const snapshot = await getDocs(q);
    return { answers: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Answer)), lastDoc: snapshot.docs[snapshot.docs.length - 1] || null, hasMore: snapshot.docs.length === pageSize };
  } catch (error) { return { answers: [], lastDoc: null, hasMore: false }; }
};

export const addAnswerToDb = async (q: Question, a: Answer) => {
    if (!db) return;
    const batch = writeBatch(db);
    batch.set(doc(collection(db, QUESTIONS_COLLECTION, q.id, 'answers'), a.id), sanitizeData(a));
    batch.update(doc(db, QUESTIONS_COLLECTION, q.id), { answers: arrayUnion(sanitizeData(a)), answerCount: increment(1) });
    await batch.commit();
    sendNotification(q.author.id, a.author, 'ANSWER', `trả lời: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
};

export const updateAnswerInDb = async (qId: string, aId: string, updates: Partial<Answer>) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const q = snap.data() as Question;
        await updateDoc(ref, { answers: q.answers.map(a => a.id === aId ? { ...a, ...updates } : a) });
        await updateDoc(doc(db, QUESTIONS_COLLECTION, qId, 'answers', aId), updates);
    }
};

export const deleteAnswerFromDb = async (qId: string, aId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await updateDoc(ref, { answers: (snap.data() as Question).answers.filter(a => a.id !== aId), answerCount: increment(-1) });
        await deleteDoc(doc(db, QUESTIONS_COLLECTION, qId, 'answers', aId));
    }
};

export const toggleAnswerUseful = async (qId: string, aId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const newAns = (snap.data().answers || []).map((a: any) => {
            if (a.id === aId) {
                const usefulBy = Array.isArray(a.usefulBy) ? a.usefulBy : [];
                const isUseful = usefulBy.includes(userId);
                const list = isUseful ? usefulBy.filter((id: string) => id !== userId) : [...usefulBy, userId];
                return { ...a, usefulBy: list, likes: list.length };
            }
            return a;
        });
        await updateDoc(ref, { answers: newAns });
        const ansRef = doc(db, QUESTIONS_COLLECTION, qId, 'answers', aId);
        const ansSnap = await getDoc(ansRef);
        if (ansSnap.exists()) {
            const isUseful = (ansSnap.data().usefulBy || []).includes(userId);
            await updateDoc(ansRef, { usefulBy: isUseful ? arrayRemove(userId) : arrayUnion(userId), likes: isUseful ? increment(-1) : increment(1) });
        }
    }
};

export const sendReport = async (targetId: string, targetType: 'question' | 'answer', reason: string, reportedBy: string) => {
  if (!db) return;
  await addDoc(collection(db, 'reports'), { targetId, targetType, reason, reportedBy, status: 'open', createdAt: new Date().toISOString() });
};

export const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

export const searchQuestionsGlobal = async (keyword: string, limitCount: number = 20) => {
  const snap = await getDocs(query(collection(db, QUESTIONS_COLLECTION), where('title', '>=', keyword), where('title', '<=', keyword + '\uf8ff'), limit(limitCount)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
};