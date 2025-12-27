import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDoc,
  getDocs,
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
  increment,
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

const sanitizeData = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

/* =======================
   USER UTILS
======================= */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds || userIds.length === 0) return [];
  try {
    const promises = userIds.map((id) => getDoc(doc(db, USERS_COLLECTION, id)));
    const snapshots = await Promise.all(promises);
    return snapshots
      .filter((snap) => snap.exists())
      .map((snap) => ({ id: snap.id, ...snap.data() } as User));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// ✅ FIX: Sửa lại hàm này để không tạo document nếu chưa tồn tại
export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Dùng updateDoc thay vì setDoc(merge) để đảm bảo chỉ update khi user đã tồn tại.
    // Nếu user chưa đăng ký xong (document chưa có), lệnh này sẽ lỗi và rơi vào catch,
    // nhờ đó tránh được việc tạo ra document thiếu field (gây lỗi permission).
    await updateDoc(userRef, { 
        isOnline: isOnline, 
        lastActiveAt: new Date().toISOString() 
    });
  } catch (e: any) {
    // Nếu lỗi là do document chưa tồn tại (code: 'not-found'), ta bỏ qua không làm gì cả.
    // Chờ đến khi process đăng ký hoàn tất thì lần update sau sẽ thành công.
    if (e.code !== 'not-found') {
        // console.warn('Update status error:', e);
    }
  }
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
    (docSnap) => {
      if (docSnap.exists()) callback({ id: docSnap.id, ...docSnap.data() } as User);
      else callback(null);
    },
    (error) => console.warn('User sub error:', (error as any)?.code)
  );
};

/* =======================
   SOCIAL (FOLLOW / UNFOLLOW)
======================= */
export const followUser = async (currentUserId: string, targetUser: User) => {
  if (!db || !currentUserId || !targetUser.id) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, USERS_COLLECTION, currentUserId), {
      following: arrayUnion(targetUser.id),
    });
    batch.update(doc(db, USERS_COLLECTION, targetUser.id), {
      followers: arrayUnion(currentUserId),
    });
    await batch.commit();

    sendNotification(
      targetUser.id,
      { id: currentUserId, name: 'Người dùng', avatar: '' } as User,
      'FOLLOW',
      'đã bắt đầu theo dõi bạn.',
      `/profile/${currentUserId}`
    );
  } catch (e) {
    throw e;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!db || !currentUserId || !targetUserId) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, USERS_COLLECTION, currentUserId), {
      following: arrayRemove(targetUserId),
    });
    batch.update(doc(db, USERS_COLLECTION, targetUserId), {
      followers: arrayRemove(currentUserId),
    });
    await batch.commit();
  } catch (e) {
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
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      userId: recipientId,
      sender: { name: sender.name, avatar: sender.avatar, id: sender.id },
      type,
      content,
      link,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Send notif error:', e);
  }
};

export const subscribeToNotifications = (
  userId: string,
  callback: (notifs: Notification[]) => void
) => {
  if (!db || !userId) return () => {};
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    },
    (error) => {
      console.warn('Notif sub error:', (error as any)?.message);
      callback([]);
    }
  );
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
  await addDoc(collection(db, EXPERT_APPS_COLLECTION), {
    userId: user.id,
    fullName: data.fullName,
    phone: data.phone,
    workplace: data.workplace,
    specialty: data.specialty,
    proofImages: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await updateDoc(doc(db, USERS_COLLECTION, user.id), {
    expertStatus: 'pending',
    specialty: data.specialty,
    workplace: data.workplace,
  });
};

/* =======================
   QUESTIONS & ANSWERS (CORE)
======================= */
export const fetchQuestionsPaginated = async (
  category: string = 'Tất cả',
  filterType: 'newest' | 'active' | 'unanswered' = 'newest',
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 10
) => {
  try {
    const questionsRef = collection(db, QUESTIONS_COLLECTION);
    let qy: any = query(questionsRef, orderBy('createdAt', 'desc'));
    if (category !== 'Tất cả') qy = query(qy, where('category', '==', category));
    if (lastDoc) qy = query(qy, startAfter(lastDoc));
    qy = query(qy, limit(pageSize));

    const snapshot = await getDocs(qy);
    const questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Question));

    const safeAnswersLen = (qq: any) => (Array.isArray(qq?.answers) ? qq.answers.length : 0);

    let finalQuestions =
      filterType === 'unanswered'
        ? questions.filter((qq: any) => safeAnswersLen(qq) === 0)
        : questions;

    if (filterType === 'active') {
      finalQuestions = [...finalQuestions].sort(
        (a: any, b: any) => safeAnswersLen(b) - safeAnswersLen(a)
      );
    }

    return {
      questions: finalQuestions,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

export const fetchQuestionById = async (id: string): Promise<Question | null> => {
  if (!db || !id) return null;
  const docRef = doc(db, QUESTIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    updateDoc(docRef, { views: increment(1) }).catch(() => {});
    return { id: docSnap.id, ...docSnap.data() } as Question;
  }
  return null;
};

export const subscribeToQuestions = (callback: (qs: Question[]) => void) => {
  if (!db) return () => {};
  const qy = query(collection(db, QUESTIONS_COLLECTION), limit(100));
  return onSnapshot(qy, (snap) => {
    const qs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Question))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(qs);
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
  const snap = await getDoc(qRef);
  if (!snap.exists()) return;

  const likes = Array.isArray(snap.data().likes) ? snap.data().likes : [];

  if (likes.includes(user.id)) {
    await updateDoc(qRef, { likes: arrayRemove(user.id) });
  } else {
    await updateDoc(qRef, { likes: arrayUnion(user.id) });
    if (q.author.id !== user.id) {
      sendNotification(
        q.author.id,
        user,
        'LIKE',
        `thích câu hỏi: ${q.title}`,
        `/question/${toSlug(q.title, q.id)}`
      );
    }
  }
};

/* =======================
   ✅ FIX NÚT LƯU (SAVE BOOKMARK)
   - updateDoc sẽ lỗi nếu users/{uid} chưa tồn tại
   - dùng setDoc + merge để tạo doc nếu thiếu
======================= */
export const toggleSaveQuestion = async (userId: string, qId: string, save: boolean) => {
  if (!db || !userId || !qId) return;

  try {
    const ref = doc(db, USERS_COLLECTION, userId);

    await setDoc(
      ref,
      {
        savedQuestions: save ? arrayUnion(qId) : arrayRemove(qId),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
};

/* =======================
   ANSWERS PAGINATION (SUBCOLLECTION)
======================= */
export const fetchAnswersPaginated = async (
  questionId: string,
  lastAnsDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  pageSize: number = 5
) => {
  try {
    const answersRef = collection(db, QUESTIONS_COLLECTION, questionId, 'answers');

    // NOTE: bạn đang sort UI theo best/newest, nhưng query ở đây đang 'asc'
    // giữ nguyên để không phá logic hiện tại của bạn
    let qy: any = query(answersRef, orderBy('createdAt', 'asc'), limit(pageSize));
    if (lastAnsDoc) qy = query(qy, startAfter(lastAnsDoc));

    const snapshot = await getDocs(qy);

    return {
      answers: snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Answer)),
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    return { answers: [], lastDoc: null, hasMore: false };
  }
};

export const addAnswerToDb = async (q: Question, a: Answer) => {
  if (!db) return;

  const batch = writeBatch(db);
  batch.set(doc(collection(db, QUESTIONS_COLLECTION, q.id, 'answers'), a.id), sanitizeData(a));

  batch.update(doc(db, QUESTIONS_COLLECTION, q.id), {
    answers: arrayUnion(sanitizeData(a)),
    answerCount: increment(1),
  });

  await batch.commit();

  sendNotification(
    q.author.id,
    a.author,
    'ANSWER',
    `trả lời: ${q.title}`,
    `/question/${toSlug(q.title, q.id)}`
  );
};

export const updateAnswerInDb = async (qId: string, aId: string, updates: Partial<Answer>) => {
  if (!db) return;

  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const q = snap.data() as any;
    const answersArr = Array.isArray(q.answers) ? q.answers : [];

    await updateDoc(ref, {
      answers: answersArr.map((a: any) => (a.id === aId ? { ...a, ...updates } : a)),
    });

    await updateDoc(doc(db, QUESTIONS_COLLECTION, qId, 'answers', aId), updates as any);
  }
};

export const deleteAnswerFromDb = async (qId: string, aId: string) => {
  if (!db) return;

  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const q = snap.data() as any;
    const answersArr = Array.isArray(q.answers) ? q.answers : [];

    await updateDoc(ref, {
      answers: answersArr.filter((a: any) => a.id !== aId),
      answerCount: increment(-1),
    });

    await deleteDoc(doc(db, QUESTIONS_COLLECTION, qId, 'answers', aId));
  }
};

export const toggleAnswerUseful = async (qId: string, aId: string, userId: string) => {
  if (!db) return;

  const ref = doc(db, QUESTIONS_COLLECTION, qId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const q = snap.data() as any;
    const answersArr = Array.isArray(q.answers) ? q.answers : [];

    const newAns = answersArr.map((a: any) => {
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
      const usefulBy = Array.isArray(ansSnap.data().usefulBy) ? ansSnap.data().usefulBy : [];
      const isUseful = usefulBy.includes(userId);

      await updateDoc(ansRef, {
        usefulBy: isUseful ? arrayRemove(userId) : arrayUnion(userId),
        likes: isUseful ? increment(-1) : increment(1),
      });
    }
  }
};

/* =======================
   REPORTS
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
    createdAt: new Date().toISOString(),
  });
};

/* =======================
   CHAT UTILS
======================= */
export const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

/* =======================
   SEARCH
======================= */
export const searchQuestionsGlobal = async (keyword: string, limitCount: number = 20) => {
  const snap = await getDocs(
    query(
      collection(db, QUESTIONS_COLLECTION),
      where('title', '>=', keyword),
      where('title', '<=', keyword + '\uf8ff'),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
};
