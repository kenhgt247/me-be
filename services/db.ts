
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
  QuerySnapshot,
  DocumentData,
  documentId
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
    
    const users: User[] = [];
    snapshots.forEach(snap => {
      if (snap.exists()) {
        users.push({ id: snap.id, ...snap.data() } as User);
      }
    });
    return users;
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    return [];
  }
};

// --- USER PRESENCE & INFO ---
export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastActiveAt: new Date().toISOString()
    });
  } catch (e) {
    // Ignore presence errors
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (!db || !userId) return () => {};
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    return onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...(docSnap.data() as any) } as User);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn("User subscription ignored:", error.code);
    });
  } catch (e) {
    console.warn("Error subscribing to user", e);
    return () => {};
  }
};

// --- EXPERT REGISTRATION ---
export const submitExpertApplication = async (user: User, formData: any) => {
  if (!db) return;
  try {
    let proofImageUrls: string[] = [];
    if (formData.files && formData.files.length > 0) {
       proofImageUrls = await uploadMultipleFiles(formData.files, `expert_proofs/${user.id}`);
    }

    const appData = {
      userId: user.id,
      fullName: formData.fullName,
      phone: formData.phone,
      workplace: formData.workplace,
      specialty: formData.specialty,
      proofImages: proofImageUrls,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, EXPERT_APPS_COLLECTION), appData);

    const userRef = doc(db, USERS_COLLECTION, user.id);
    await updateDoc(userRef, { 
      expertStatus: 'pending',
      specialty: formData.specialty,
      workplace: formData.workplace 
    });

  } catch (e) {
    console.error("Error submitting expert application:", e);
    throw e;
  }
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
    console.warn("Could not send notification (Permission denied or Network error)", e);
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
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Notification[];
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

// --- USER SOCIAL (FOLLOW & SAVE) SYSTEM ---
export const followUser = async (currentUserId: string, targetUser: User) => {
  if (!db) return;
  try {
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const targetUserRef = doc(db, USERS_COLLECTION, targetUser.id);
    await updateDoc(currentUserRef, { following: arrayUnion(targetUser.id) });
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

export const toggleSaveQuestion = async (userId: string, questionId: string, shouldSave: boolean) => {
  if (!db) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { 
      savedQuestions: shouldSave ? arrayUnion(questionId) : arrayRemove(questionId) 
    });
  } catch (e) {
    console.error("Save question error:", e);
    throw e;
  }
};

// --- CHAT SYSTEM ---
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const sendMessage = async (
  sender: User, 
  recipient: User, 
  content: string, 
  type: 'text' | 'image' = 'text'
) => {
  if (!db) return;
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
    type: type
  };

  try {
      const chatDoc = await getDoc(chatRef);
      const participantData = chatDoc.exists() ? chatDoc.data().participantData : {};
      
      participantData[sender.id] = { name: sender.name, avatar: sender.avatar, isExpert: sender.isExpert || false };
      participantData[recipient.id] = { name: recipient.name, avatar: recipient.avatar, isExpert: recipient.isExpert || false };

      const chatData: any = {
        id: chatId,
        participants: [sender.id, recipient.id],
        participantData: participantData,
        lastMessage: type === 'image' ? '[Hình ảnh]' : content,
        lastMessageTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const currentUnread = chatDoc.exists() ? chatDoc.data().unreadCount || {} : {};
      const newUnread = { ...currentUnread };
      newUnread[recipient.id] = (newUnread[recipient.id] || 0) + 1;
      newUnread[sender.id] = 0;

      chatData.unreadCount = newUnread;

      await setDoc(chatRef, chatData, { merge: true });
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
    const q = query(
        collection(db, CHATS_COLLECTION),
        where('participants', 'array-contains', userId)
    );
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const chats = snapshot.docs.map(doc => doc.data() as ChatSession);
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
    const q = query(
        collection(db, CHATS_COLLECTION, chatId, 'messages')
    );
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const msgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
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

// --- QUESTIONS & ANSWERS ---
export const subscribeToQuestions = (callback: (questions: Question[]) => void) => {
  if (!db) return () => {};
  try {
    const q = query(collection(db, QUESTIONS_COLLECTION), limit(100));
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const questions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Question[];
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
    // Updated to use slug in link
    await sendNotification(question.author.id, user, 'LIKE', `đã thích câu hỏi: "${question.title}"`, `/question/${toSlug(question.title, question.id)}`);
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
    try {
        // Updated to use slug in link
        await sendNotification(question.author.id, answer.author, 'ANSWER', `đã trả lời câu hỏi: "${question.title}"`, `/question/${toSlug(question.title, question.id)}`);
    } catch(err) {
        console.warn("Failed to send answer notification", err);
    }
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
        
        if (updates.isExpertVerified || updates.isBestAnswer) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                const type = updates.isExpertVerified ? 'VERIFY' : 'BEST_ANSWER';
                const content = updates.isExpertVerified ? 'đã xác thực câu trả lời.' : 'đã chọn câu trả lời hay nhất.';
                // Updated to use slug in link
                await sendNotification(answer.author.id, { name: 'Admin/Chuyên gia', avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png' } as User, type as any, content, `/question/${toSlug(question.title, question.id)}`);
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

export const toggleAnswerUseful = async (questionId: string, answerId: string, userId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const question = docSnap.data() as Question;
        const updatedAnswers = question.answers.map(a => {
            if (a.id === answerId) {
                const usefulBy = a.usefulBy || [];
                const isUseful = usefulBy.includes(userId);
                let newUsefulBy;
                if (isUseful) {
                    newUsefulBy = usefulBy.filter(id => id !== userId);
                } else {
                    newUsefulBy = [...usefulBy, userId];
                }
                // Sync 'likes' count with 'usefulBy' length for display consistency
                return { 
                    ...a, 
                    usefulBy: newUsefulBy,
                    likes: newUsefulBy.length
                };
            }
            return a;
        });
        await updateDoc(docRef, { answers: updatedAnswers });
    }
  } catch (e) {
    console.error("Toggle useful error", e);
  }
};
