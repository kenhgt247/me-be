import { 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, 
  arrayUnion, arrayRemove, where, addDoc, limit, QuerySnapshot, DocumentData, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Question, Answer, Notification, User, ChatSession, Message, toSlug } from '../types';
import { uploadMultipleFiles } from './storage';

const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';
const EXPERT_APPS_COLLECTION = 'expert_applications';

const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// --- USER UTILS ---
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds || userIds.length === 0) return [];
  try {
    const promises = userIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)));
    const snapshots = await Promise.all(promises);
    return snapshots
      .filter(snap => snap.exists())
      .map(snap => ({ id: snap.id, ...snap.data() } as User));
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    return [];
  }
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastActiveAt: new Date().toISOString()
    }).catch(async (e) => {
        if (e.code === 'not-found') {
            // Optional: Auto-create user doc if missing
        }
    });
  } catch (e) {
    // Ignore presence errors
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (!db || !userId) return () => {};
  return onSnapshot(doc(db, USERS_COLLECTION, userId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as User);
    } else {
      callback(null);
    }
  }, (error) => console.warn("User sub error:", error));
};

// --- SOCIAL FEATURES (FOLLOW) ---
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

// --- NOTIFICATIONS ---
export const sendNotification = async (
  recipientId: string,
  sender: User,
  type: Notification['type'],
  content: string,
  link: string
) => {
  if (!db || recipientId === sender.id) return;
  try {
    const notif: any = {
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
  try {
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
        console.warn("Notification subscription permission error:", error.code);
        callback([]);
    });
  } catch (e) {
      console.error("Subscribe notif error:", e);
      return () => {};
  }
};

export const markNotificationAsRead = async (notifId: string) => {
  if (!db) return;
  await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), { isRead: true });
};

// --- CHAT SYSTEM ---
export const getChatId = (uid1: string, uid2: string) => {
  if (!uid1 || !uid2) return 'invalid_chat';
  return [uid1, uid2].sort().join('_');
};

export const sendMessage = async (sender: User, recipient: User, content: string, type: 'text' | 'image' = 'text') => {
  if (!db || !sender.id || !recipient.id) return;
  
  const chatId = getChatId(sender.id, recipient.id);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  try {
    const chatDoc = await getDoc(chatRef);
    const currentData = chatDoc.exists() ? chatDoc.data() : {};
    
    const pData = currentData.participantData || {};
    pData[sender.id] = { name: sender.name, avatar: sender.avatar, isExpert: !!sender.isExpert };
    pData[recipient.id] = { name: recipient.name, avatar: recipient.avatar, isExpert: !!recipient.isExpert };

    const unread = currentData.unreadCount || {};
    unread[recipient.id] = (unread[recipient.id] || 0) + 1;
    unread[sender.id] = 0; 

    await setDoc(chatRef, {
      id: chatId,
      participants: [sender.id, recipient.id],
      participantData: pData,
      lastMessage: type === 'image' ? '[Hình ảnh]' : content,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: unread
    }, { merge: true });

    const msgData: Message = {
      id: Date.now().toString(),
      senderId: sender.id,
      content,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, CHATS_COLLECTION, chatId, 'messages'), msgData);
    
  } catch (e) {
    console.error("Send message error:", e);
    throw e;
  }
};

export const subscribeToChats = (userId: string, callback: (chats: ChatSession[]) => void) => {
  if (!db || !userId) return () => {};
  try {
    const q = query(collection(db, CHATS_COLLECTION), where('participants', 'array-contains', userId));
    return onSnapshot(q, (snap) => {
        const chats = snap.docs.map(d => d.data() as ChatSession);
        chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        callback(chats);
    }, (error) => {
        console.warn("Chat subscription permission error:", error.code);
        callback([]); 
    });
  } catch (e) {
      console.error("Subscribe chat error:", e);
      return () => {};
  }
};

export const subscribeToMessages = (chatId: string, callback: (msgs: Message[]) => void) => {
  if (!db || !chatId || chatId === 'invalid_chat') return () => {};
  const q = query(collection(db, CHATS_COLLECTION, chatId, 'messages'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(msgs);
  });
};

// --- EXPERT REGISTRATION ---
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

// --- Q&A FUNCTIONS ---
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

export const toggleQuestionLikeDb = async (q: Question, user: User) => {
    if (!db) return;
    await updateQuestionInDb(q.id, { likes: q.likes + 1 });
    await sendNotification(q.author.id, user, 'LIKE', `thích câu hỏi: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
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
    await sendNotification(q.author.id, a.author, 'ANSWER', `trả lời: ${q.title}`, `/question/${toSlug(q.title, q.id)}`);
};

export const updateAnswerInDb = async (qId: string, aId: string, updates: Partial<Answer>) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const q = snap.data() as Question;
        const newAnswers = q.answers.map(a => a.id === aId ? { ...a, ...updates } : a);
        await updateDoc(ref, { answers: newAnswers });
        
        if (updates.isExpertVerified || updates.isBestAnswer) {
            const answer = q.answers.find(a => a.id === aId);
            if (answer) {
                const type = updates.isExpertVerified ? 'VERIFY' : 'BEST_ANSWER';
                const content = updates.isExpertVerified ? 'đã xác thực câu trả lời.' : 'đã chọn câu trả lời hay nhất.';
                await sendNotification(answer.author.id, { name: 'System', avatar: '', id: 'system' } as any, type as any, content, `/question/${toSlug(q.title, q.id)}`);
            }
        }
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

export const toggleAnswerUseful = async (qId: string, aId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, QUESTIONS_COLLECTION, qId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const q = snap.data() as Question;
        const newAnswers = q.answers.map(a => {
            if (a.id === aId) {
                const usefulBy = a.usefulBy || [];
                const newUseful = usefulBy.includes(userId) ? usefulBy.filter(id => id !== userId) : [...usefulBy, userId];
                return { ...a, usefulBy: newUseful, likes: newUseful.length };
            }
            return a;
        });
        await updateDoc(ref, { answers: newAnswers });
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
