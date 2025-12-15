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

/* =====================================================
   CONSTANTS
===================================================== */
const QUESTIONS_COLLECTION = 'questions';
const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';
const CHATS_COLLECTION = 'chats';
const EXPERT_APPS_COLLECTION = 'expert_applications';

/* =====================================================
   HELPERS
===================================================== */
const sanitizeData = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data));

export const getChatId = (uid1: string, uid2: string) =>
  [uid1, uid2].sort().join('_');

/* =====================================================
   USER
===================================================== */
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  if (!db || !userIds.length) return [];
  const snaps = await Promise.all(
    userIds.map(id => getDoc(doc(db, USERS_COLLECTION, id)))
  );
  return snaps
    .filter(s => s.exists())
    .map(s => ({ id: s.id, ...s.data() } as User));
};

export const updateUserStatus = async (userId: string, isOnline: boolean) => {
  if (!db || !userId) return;
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    isOnline,
    lastActiveAt: new Date().toISOString()
  }).catch(() => {});
};

export const subscribeToUser = (
  userId: string,
  cb: (user: User | null) => void
) =>
  onSnapshot(doc(db, USERS_COLLECTION, userId), snap =>
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null)
  );

/* =====================================================
   NOTIFICATIONS
===================================================== */
export const sendNotification = async (
  recipientId: string,
  sender: User,
  type: Notification['type'],
  content: string,
  link: string
) => {
  if (!db || recipientId === sender.id) return;
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

export const subscribeToNotifications = (
  userId: string,
  cb: (items: Notification[]) => void
) =>
  onSnapshot(
    query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      limit(50)
    ),
    snap =>
      cb(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Notification))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          )
      )
  );

export const markNotificationAsRead = (id: string) =>
  updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), { isRead: true });

/* =====================================================
   CHAT – CHUẨN RULES
===================================================== */
export const sendMessage = async (
  sender: User,
  recipient: User,
  content: string,
  type: 'text' | 'image' = 'text'
) => {
  const chatId = getChatId(sender.id, recipient.id);
  const chatRef = doc(db, CHATS_COLLECTION, chatId);

  await setDoc(
    chatRef,
    {
      id: chatId,
      participants: [sender.id, recipient.id],
      participantData: {
        [sender.id]: {
          name: sender.name,
          avatar: sender.avatar,
          isExpert: !!sender.isExpert
        },
        [recipient.id]: {
          name: recipient.name,
          avatar: recipient.avatar,
          isExpert: !!recipient.isExpert
        }
      },
      lastMessage: type === 'image' ? '[Hình ảnh]' : content,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: {
        [sender.id]: 0,
        [recipient.id]: 1
      }
    },
    { merge: true }
  );

  const msg: Omit<Message, 'id'> = {
    senderId: sender.id,
    receiverId: recipient.id,
    content,
    type,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  await addDoc(collection(db, 'messages', chatId, 'items'), msg);
};

export const subscribeToChats = (
  userId: string,
  cb: (chats: ChatSession[]) => void
) =>
  onSnapshot(
    query(
      collection(db, CHATS_COLLECTION),
      where('participants', 'array-contains', userId)
    ),
    snap =>
      cb(
        snap.docs
          .map(d => d.data() as ChatSession)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
      )
  );

export const subscribeToMessages = (
  chatId: string,
  cb: (msgs: Message[]) => void
) =>
  onSnapshot(
    query(
      collection(db, 'messages', chatId, 'items'),
      orderBy('createdAt', 'asc')
    ),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)))
  );

/* =====================================================
   EXPERT APPLICATION
===================================================== */
export const submitExpertApplication = async (user: User, data: any) => {
  await addDoc(collection(db, EXPERT_APPS_COLLECTION), {
    userId: user.id,
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};

/* =====================================================
   Q&A (GIỮ NGUYÊN LOGIC)
===================================================== */
export const addQuestionToDb = (q: Question) =>
  setDoc(doc(db, QUESTIONS_COLLECTION, q.id), sanitizeData(q));

export const updateQuestionInDb = (id: string, data: Partial<Question>) =>
  updateDoc(doc(db, QUESTIONS_COLLECTION, id), sanitizeData(data));

export const deleteQuestionFromDb = (id: string) =>
  deleteDoc(doc(db, QUESTIONS_COLLECTION, id));

export const subscribeToQuestions = (cb: (qs: Question[]) => void) =>
  onSnapshot(
    query(collection(db, QUESTIONS_COLLECTION), limit(100)),
    snap =>
      cb(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Question))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          )
      )
  );
