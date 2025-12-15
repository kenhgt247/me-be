import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
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
  ChatSession,
  Message,
  toSlug
} from '../types';

/* =======================
   CONSTANTS
======================= */
const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';
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
   USER UTILS
======================= */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds?.length) return [];
  try {
    const snaps = await Promise.all(
      userIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)))
    );
    return snaps
      .filter(s => s.exists())
      .map(s => ({ id: s.id, ...s.data() } as User));
  } catch (e) {
    console.error('getUsersByIds error:', e);
    return [];
  }
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, userId),
      {
        isOnline,
        lastActiveAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch {}
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
   FOLLOW / UNFOLLOW
======================= */
export const followUser = async (
  currentUserId: string,
  targetUser: User
) => {
  if (!db || !currentUserId || !targetUser?.id) return;

  await ensureUserDoc({ id: currentUserId });
  await ensureUserDoc(targetUser);

  const batch = writeBatch(db);

  batch.set(
    doc(db, USERS_COLLECTION, currentUserId),
    { following: arrayUnion(targetUser.id) },
    { merge: true }
  );

  batch.set(
    doc(db, USERS_COLLECTION, targetUser.id),
    { followers: arrayUnion(currentUserId) },
    { merge: true }
  );

  await batch.commit();
};

export const unfollowUser = async (
  currentUserId: string,
  targetUserId: string
) => {
  if (!db || !currentUserId || !targetUserId) return;

  const batch = writeBatch(db);

  batch.set(
    doc(db, USERS_COLLECTION, currentUserId),
    { following: arrayRemove(targetUserId) },
    { merge: true }
  );

  batch.set(
    doc(db, USERS_COLLECTION, targetUserId),
    { followers: arrayRemove(currentUserId) },
    { merge: true }
  );

  await batch.commit();
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
  } catch {}
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifs: Notification[]) => void
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

export const toggleQuestionLikeDb = async (
  q: Question,
  user: User
) => {
  if (!db || !user?.id) return;

  const ref = doc(db, QUESTIONS_COLLECTION, q.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as Question;
  const likes = Array.isArray(data.likes) ? data.likes : [];
  const next = likes.includes(user.id)
    ? arrayRemove(user.id)
    : arrayUnion(user.id);

  await updateDoc(ref, { likes: next });

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
export const addAnswerToDb = async (q: Question, a: Answer) => {
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

/* =======================
   ANSWER CRUD
======================= */
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
/* =======================
   EXPERT APPLICATION
======================= */
export const submitExpertApplication = async (
  user: User,
  data: {
    fullName: string;
    phone: string;
    workplace?: string;
    specialty?: string;
  }
) => {
  if (!db || !user?.id) return;

  // đảm bảo user tồn tại
  const userRef = doc(db, USERS_COLLECTION, user.id);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(
      userRef,
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

  // tạo đơn đăng ký chuyên gia
  await addDoc(collection(db, EXPERT_APPS_COLLECTION), {
    userId: user.id,
    fullName: data.fullName,
    phone: data.phone,
    workplace: data.workplace || '',
    specialty: data.specialty || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  // cập nhật trạng thái user
  await setDoc(
    userRef,
    {
      expertStatus: 'pending'
    },
    { merge: true }
  );
};
