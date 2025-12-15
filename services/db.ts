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
  writeBatch,
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

/* ======================= CONSTANTS ======================= */
const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const EXPERT_APPS_COLLECTION = 'expert_applications';

/* ======================= UTILS ======================= */
const sanitizeData = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data));

const ensureUserDoc = async (user: Partial<User>) => {
  if (!db || !user?.id) return;
  const ref = doc(db, USERS_COLLECTION, user.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.name || '',
      avatar: user.avatar || '',
      isAdmin: false,
      isExpert: false,
      createdAt: new Date().toISOString()
    }, { merge: true });
  }
};

/* ======================= USERS ======================= */
export const subscribeToUser = (
  userId: string,
  callback: (user: User | null) => void
) => {
  if (!db || !userId) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, USERS_COLLECTION, userId),
    snap => callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null),
    () => callback(null)
  );
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    { isOnline, lastActiveAt: new Date().toISOString() },
    { merge: true }
  );
};

/* ======================= NOTIFICATIONS ======================= */
export const sendNotification = async (
  recipientId: string,
  sender: User,
  type: Notification['type'],
  content: string,
  link: string
) => {
  if (!db || !recipientId || recipientId === sender?.id) return;
  await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    userId: recipientId,
    sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    type,
    content,
    link,
    isRead: false,
    createdAt: new Date().toISOString()
  });
};

/* ======================= QUESTIONS ======================= */
export const addQuestionToDb = async (q: Question) => {
  if (!db) return;
  await setDoc(doc(db, QUESTIONS_COLLECTION, q.id), sanitizeData(q));
};

export const updateQuestionInDb = async (
  id: string,
  data: Partial<Question>
) => {
  if (!db) return;
  await updateDoc(doc(db, QUESTIONS_COLLECTION, id), sanitizeData(data));
};

export const deleteQuestionFromDb = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
};

export const subscribeToQuestions = (
  callback: (qs: Question[]) => void
) => {
  if (!db) return () => {};
  const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
    callback(items);
  });
};

/* ======================= ✅ FIX LIKE QUESTION ======================= */
export const toggleQuestionLikeDb = async (
  questionId: string,
  user: User
) => {
  if (!db || !questionId || !user?.id) return;

  const ref = doc(db, QUESTIONS_COLLECTION, questionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const q = snap.data() as Question;
  const likedBy = q.likedBy || [];
  const isLiked = likedBy.includes(user.id);

  await updateDoc(ref, {
    likedBy: isLiked
      ? arrayRemove(user.id)
      : arrayUnion(user.id),
    likes: increment(isLiked ? -1 : 1)
  });

  if (!isLiked && q.author?.id && q.author.id !== user.id) {
    await sendNotification(
      q.author.id,
      user,
      'LIKE',
      'đã thích câu hỏi của bạn',
      `/question/${toSlug(q.title, questionId)}`
    );
  }
};

/* ======================= ANSWERS ======================= */
export const addAnswerToDb = async (q: Question, a: Answer) => {
  if (!db) return;
  await updateDoc(doc(db, QUESTIONS_COLLECTION, q.id), {
    answers: arrayUnion(sanitizeData(a))
  });
};

export const toggleAnswerUseful = async (
  qId: string,
  aId: string,
  userId: string
) => {
  if (!db || !userId) return;

  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const q = snap.data() as Question;
  const answers = q.answers.map(a => {
    if (a.id !== aId) return a;
    const usefulBy = a.usefulBy || [];
    const next = usefulBy.includes(userId)
      ? usefulBy.filter(id => id !== userId)
      : [...usefulBy, userId];
    return { ...a, usefulBy: next, likes: next.length };
  });

  await updateDoc(ref, { answers });
};

/* ======================= ANSWER CRUD ======================= */
export const updateAnswerInDb = async (
  qId: string,
  aId: string,
  updates: Partial<Answer>
) => {
  if (!db) return;
  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const q = snap.data() as Question;
  const answers = q.answers.map(a =>
    a.id === aId ? { ...a, ...updates } : a
  );
  await updateDoc(ref, { answers });
};

export const deleteAnswerFromDb = async (
  qId: string,
  aId: string
) => {
  if (!db) return;
  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const q = snap.data() as Question;
  const answers = q.answers.filter(a => a.id !== aId);
  await updateDoc(ref, { answers });
};
