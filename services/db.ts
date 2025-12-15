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
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';
const EXPERT_APPS_COLLECTION = 'expert_applications';

/* =======================
   UTILS
======================= */
const sanitizeData = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data));

/**
 * Đảm bảo user document tồn tại
 */
const ensureUserDoc = async (user: Partial<User>) => {
  if (!db || !user?.id) return;

  const ref = doc(db, USERS_COLLECTION, user.id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        name: user.name || '',
        avatar: user.avatar || '',
        isAdmin: false,
        isExpert: false,
        createdAt: new Date().toISOString()
      },
      { merge: true }
    );
  }
};

/* =======================
   USER
======================= */
export const updateUserStatus = async (
  userId: string,
  isOnline: boolean
) => {
  if (!db || !userId) return;

  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    {
      isOnline,
      lastActiveAt: new Date().toISOString()
    },
    { merge: true }
  );
};

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
    snap => {
      callback(
        snap.exists()
          ? ({ id: snap.id, ...snap.data() } as User)
          : null
      );
    },
    () => callback(null)
  );
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
  if (!db || !recipientId || recipientId === sender?.id) return;

  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      userId: recipientId,
      sender: {
        id: sender.id,
        name: sender.name,
        avatar: sender.avatar
      },
      type,
      content,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch {
    /* ignore */
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (items: Notification[]) => void
) => {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    snap => {
      const items = snap.docs.map(
        d => ({ id: d.id, ...d.data() } as Notification)
      );

      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      callback(items);
    },
    () => callback([])
  );
};

export const markNotificationAsRead = async (notifId: string) => {
  if (!db || !notifId) return;
  await updateDoc(
    doc(db, NOTIFICATIONS_COLLECTION, notifId),
    { isRead: true }
  );
};

/* =======================
   QUESTIONS
======================= */
export const addQuestionToDb = async (q: Question) => {
  if (!db) return;
  await setDoc(
    doc(db, QUESTIONS_COLLECTION, q.id),
    sanitizeData(q)
  );
};

export const updateQuestionInDb = async (
  id: string,
  data: Partial<Question>
) => {
  if (!db) return;
  await updateDoc(
    doc(db, QUESTIONS_COLLECTION, id),
    sanitizeData(data)
  );
};

export const deleteQuestionFromDb = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
};

export const subscribeToQuestions = (
  callback: (qs: Question[]) => void
) => {
  if (!db) return () => {};

  const q = query(
    collection(db, QUESTIONS_COLLECTION),
    limit(100)
  );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(
      d => ({ id: d.id, ...d.data() } as Question)
    );

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    callback(items);
  });
};

/* =======================
   QUESTION LIKE / SAVE
======================= */
export const toggleQuestionLikeDb = async (
  q: Question,
  user: User
) => {
  if (!db || !user?.id) return;

  await updateDoc(
    doc(db, QUESTIONS_COLLECTION, q.id),
    {
      likes: arrayUnion(user.id)
    }
  );

  await sendNotification(
    q.author.id,
    user,
    'LIKE',
    `thích câu hỏi: ${q.title}`,
    `/question/${toSlug(q.title, q.id)}`
  );
};

export const toggleSaveQuestion = async (
  userId: string,
  qId: string,
  save: boolean
) => {
  if (!db || !userId || !qId) return;

  await setDoc(
    doc(db, USERS_COLLECTION, userId),
    {
      savedQuestions: save
        ? arrayUnion(qId)
        : arrayRemove(qId)
    },
    { merge: true }
  );
};

/* =======================
   ANSWERS
======================= */
export const addAnswerToDb = async (
  q: Question,
  a: Answer
) => {
  if (!db) return;

  await updateDoc(
    doc(db, QUESTIONS_COLLECTION, q.id),
    { answers: arrayUnion(sanitizeData(a)) }
  );

  await sendNotification(
    q.author.id,
    a.author,
    'ANSWER',
    `trả lời: ${q.title}`,
    `/question/${toSlug(q.title, q.id)}`
  );
};

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

    return {
      ...a,
      usefulBy: next,
      likes: next.length
    };
  });

  await updateDoc(ref, { answers });
};

/* =======================
   EXPERT APPLICATION
======================= */
export const submitExpertApplication = async (
  user: User,
  data: any
) => {
  if (!db || !user?.id) return;

  await ensureUserDoc(user);

  await addDoc(collection(db, EXPERT_APPS_COLLECTION), {
    userId: user.id,
    fullName: data.fullName,
    phone: data.phone,
    workplace: data.workplace,
    specialty: data.specialty,
    proofImages: [],
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  await setDoc(
    doc(db, USERS_COLLECTION, user.id),
    {
      expertStatus: 'pending',
      specialty: data.specialty,
      workplace: data.workplace
    },
    { merge: true }
  );
};

/* =======================
   REPORT
======================= */
export const sendReport = async (
  targetId: string,
  targetType: 'question' | 'answer',
  reason: string,
  reportedBy: string
) => {
  if (!db) return;

  await addDoc(collection(db, 'reports'), {
    targetId,
    targetType,
    reason,
    reportedBy,
    status: 'open',
    createdAt: new Date().toISOString()
  });
};
