
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
  limit
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Question, Answer, Notification, User, ChatSession, Message } from '../types';

const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';

const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// --- NOTIFICATIONS SYSTEM ---
export const sendNotification = async (
  recipientId: string,
  sender: User,
  type: Notification['type'],
  content: string,
  link: string
) => {
  if (!db) return;
  if (recipientId === sender.id) return;

  try {
    const notifData: Omit<Notification, 'id'> = {
      userId: recipientId,
      sender: { name: sender.name, avatar: sender.avatar },
      type,
      content,
      link,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notifData);
  } catch (e) {
    // Silently fail for permission errors to avoid alerting user for background tasks
    console.warn("Could not send notification (Permission denied or Network error)", e);
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifs: Notification[]) => void) => {
  if (!db || !userId) return () => {};
  
  try {
    // FIX: Removed orderBy('createdAt', 'desc') to avoid "Missing Index" error
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Notification[];
        // Client-side sort
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(notifs);
    }, (error) => {
        console.warn("Notification listener ignored:", error.code);
    });
  } catch (e) {
    console.warn("Error setting up notification listener", e);
    return () => {};
  }
};

export const markNotificationAsRead = async (notifId: string) => {
  if (!db) return;
  try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notifId);
      await updateDoc(ref, { isRead: true });
  } catch (e) {
      console.error("Error marking notification read", e);
  }
};

// --- USER SOCIAL (FOLLOW) SYSTEM ---
export const followUser = async (currentUserId: string, targetUser: User) => {
  if (!db) return;
  try {
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const targetUserRef = doc(db, USERS_COLLECTION, targetUser.id);
    
    // Update Current User (Following)
    await updateDoc(currentUserRef, { following: arrayUnion(targetUser.id) });
    // Update Target User (Followers)
    await updateDoc(targetUserRef, { followers: arrayUnion(currentUserId) });
  } catch (e) {
    console.error("Follow error:", e);
    throw e;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!db) return;
  try {
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const targetUserRef = doc(db, USERS_COLLECTION, targetUserId);
    
    await updateDoc(currentUserRef, { following: arrayRemove(targetUserId) });
    await updateDoc(targetUserRef, { followers: arrayRemove(currentUserId) });
  } catch (e) {
    console.error("Unfollow error:", e);
    throw e;
  }
};

// --- CHAT SYSTEM ---

// Helper to get consistent Chat ID for 1-on-1 (sort UIDs)
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const sendMessage = async (sender: User, recipient: User, content: string) => {
  if (!db) return;
  
  // Guard clause against empty IDs
  if (!sender.id || !recipient.id) {
      console.error("Cannot send message: Missing User IDs");
      return;
  }

  const chatId = getChatId(sender.id, recipient.id);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  const messageData: Message = {
    id: Date.now().toString(),
    senderId: sender.id,
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: 'text'
  };

  // Create or Update Chat Session
  const chatData: Partial<ChatSession> = {
    id: chatId,
    participants: [sender.id, recipient.id],
    participantData: {
      [sender.id]: { name: sender.name, avatar: sender.avatar, isExpert: sender.isExpert || false },
      [recipient.id]: { name: recipient.name, avatar: recipient.avatar, isExpert: recipient.isExpert || false }
    },
    lastMessage: content,
    lastMessageTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
      await setDoc(chatRef, chatData, { merge: true });
      // Add Message to Subcollection
      const messagesRef = collection(db, CHATS_COLLECTION, chatId, 'messages');
      await addDoc(messagesRef, messageData);
  } catch (e: any) {
      console.error("Error sending message:", e.code || e);
      throw e; 
  }
};

export const subscribeToChats = (userId: string, callback: (chats: ChatSession[]) => void) => {
  if (!db || !userId) return () => {};
  try {
    // FIX: Removed orderBy('updatedAt', 'desc') to avoid "Missing Index" error
    const q = query(
        collection(db, CHATS_COLLECTION),
        where('participants', 'array-contains', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => doc.data() as ChatSession);
        // Client-side sort
        chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        callback(chats);
    }, (error) => {
        console.warn("Chat subscription ignored:", error.code);
    });
  } catch (e) {
    console.warn("Error subscribing to chats", e);
    return () => {};
  }
};

export const subscribeToMessages = (chatId: string, callback: (msgs: Message[]) => void) => {
  if (!db || !chatId) return () => {};
  try {
    // Messages usually don't need complex index if just sorting by default, 
    // but explicit orderBy usually works fine here. Keeping it safe.
    const q = query(
        collection(db, CHATS_COLLECTION, chatId, 'messages')
    );
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
        // Client-side sort
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(msgs);
    }, (error) => {
        console.warn("Message subscription ignored:", error.code);
    });
  } catch (e) {
    console.warn("Error subscribing to messages", e);
    return () => {};
  }
};


// --- QUESTIONS & ANSWERS (EXISTING) ---
export const subscribeToQuestions = (callback: (questions: Question[]) => void) => {
  if (!db) return () => {};
  try {
    const q = query(collection(db, QUESTIONS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const questions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Question[];
        // Client side sort for safety
        questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(questions);
    }, (error) => { 
        console.warn("Questions sync error:", error.code); 
    });
  } catch (e) {
      console.warn("Error subscribing questions", e);
      return () => {};
  }
};

export const addQuestionToDb = async (question: Question) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, question.id);
    await setDoc(docRef, sanitizeData(question));
  } catch (e) {
    console.error("Error adding question", e);
    throw e;
  }
};

export const updateQuestionInDb = async (id: string, data: Partial<Question>) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, id);
    await updateDoc(docRef, sanitizeData(data));
  } catch (e) {
    console.error("Error updating question", e);
  }
};

export const toggleQuestionLikeDb = async (question: Question, user: User) => {
  if (!db) return;
  try {
    const newLikes = question.likes + 1; 
    await updateQuestionInDb(question.id, { likes: newLikes });
    await sendNotification(question.author.id, user, 'LIKE', `đã thích câu hỏi: "${question.title}"`, `/question/${question.id}`);
  } catch (e) {
    console.error("Like error", e);
  }
};

export const deleteQuestionFromDb = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
  } catch (e) {
    console.error("Delete question error", e);
  }
};

export const addAnswerToDb = async (question: Question, answer: Answer) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, question.id);
    await updateDoc(docRef, { answers: arrayUnion(sanitizeData(answer)) });
    await sendNotification(question.author.id, answer.author, 'ANSWER', `đã trả lời câu hỏi: "${question.title}"`, `/question/${question.id}`);
  } catch (e) {
    console.error("Add answer error", e);
    throw e;
  }
};

export const updateAnswerInDb = async (questionId: string, answerId: string, updates: Partial<Answer>) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const question = docSnap.data() as Question;
        const updatedAnswers = question.answers.map(a => a.id === answerId ? { ...a, ...sanitizeData(updates) } : a);
        await updateDoc(docRef, { answers: updatedAnswers });
        
        // Notifications for Verify/Best Answer
        if (updates.isExpertVerified || updates.isBestAnswer) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                const type = updates.isExpertVerified ? 'VERIFY' : 'BEST_ANSWER';
                const content = updates.isExpertVerified ? 'đã xác thực câu trả lời.' : 'đã chọn câu trả lời hay nhất.';
                await sendNotification(answer.author.id, { name: 'Admin/Chuyên gia', avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png' } as User, type as any, content, `/question/${questionId}`);
            }
        }
    }
  } catch (e) {
    console.error("Update answer error", e);
  }
};

export const deleteAnswerFromDb = async (questionId: string, answerId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const question = docSnap.data() as Question;
        const updatedAnswers = question.answers.filter(a => a.id !== answerId);
        await updateDoc(docRef, { answers: updatedAnswers });
    }
  } catch (e) {
    console.error("Delete answer error", e);
  }
};
