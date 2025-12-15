import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  increment,
  getDoc,
  where
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { Message, ChatSession, User } from '../types';

/* ================= HELPER ================= */
export const getChatId = (uid1: string, uid2: string) =>
  [uid1, uid2].sort().join('_');

/* ================= UPLOAD IMAGE ================= */
const uploadChatImage = async (file: File, chatId: string) => {
  const fileRef = ref(
    storage,
    `chat_images/${chatId}/${Date.now()}_${file.name}`
  );
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};

/* ================= REALTIME MESSAGES ================= */
export const subscribeMessages = (
  meId: string,
  otherId: string,
  callback: (messages: Message[]) => void
) => {
  if (!meId || !otherId) return () => {};

  const chatId = getChatId(meId, otherId);
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    snap => {
      const data = snap.docs.map(
        d => ({ id: d.id, ...d.data() } as Message)
      );
      callback(data);
    },
    err => {
      if (err.code === 'permission-denied') {
        callback([]);
      }
    }
  );
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (
  sender: User,
  receiverId: string,
  content: string | File
) => {
  if (!sender?.id || !receiverId) return;

  const chatId = getChatId(sender.id, receiverId);
  const batch = writeBatch(db);

  let messageType: 'text' | 'image' = 'text';
  let messageContent = '';

  // 1️⃣ Upload image nếu là File
  if (content instanceof File) {
    messageType = 'image';
    messageContent = await uploadChatImage(content, chatId);
  } else {
    if (!content.trim()) return;
    messageContent = content;
  }

  // 2️⃣ Tạo message
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
  batch.set(msgRef, {
    senderId: sender.id,
    content: messageContent,
    type: messageType,
    createdAt: serverTimestamp(),
    readBy: [sender.id]
  });

  // 3️⃣ Update chat session
  const chatRef = doc(db, 'chats', chatId);

  const chatUpdate: Partial<ChatSession> = {
    participants: [sender.id, receiverId],
    lastMessage:
      messageType === 'image' ? '[Hình ảnh]' : messageContent,
    lastMessageAt: serverTimestamp(),
    deletedFor: {
      [sender.id]: false,
      [receiverId]: false
    },
    unread: {
      [receiverId]: increment(1)
    },
    participantData: {
      [sender.id]: {
        name: sender.name,
        avatar: sender.avatar || '',
        isExpert: !!sender.isExpert
      }
    }
  };

  batch.set(chatRef, chatUpdate, { merge: true });

  await batch.commit();
};

/* ================= MARK READ ================= */
export const markChatAsRead = async (
  meId: string,
  otherId: string
) => {
  if (!meId || !otherId) return;

  const chatRef = doc(db, 'chats', getChatId(meId, otherId));

  await setDoc(
    chatRef,
    {
      unread: {
        [meId]: 0
      }
    },
    { merge: true }
  ).catch(() => {});
};

/* ================= UNREAD BADGE ================= */
export const subscribeUnreadCount = (
  userId: string,
  callback: (count: number) => void
) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, snap => {
    let total = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      if (data.deletedFor?.[userId]) return;
      total += data.unread?.[userId] || 0;
    });

    callback(total);
  });
};
// ... (các import cũ giữ nguyên)

/* ================= DELETE CHAT (SOFT DELETE) ================= */
export const deleteChatForUser = async (userId: string, otherUserId: string) => {
  const chatId = getChatId(userId, otherUserId);
  const chatRef = doc(db, 'chats', chatId);

  try {
    // Cập nhật trường deletedFor.{userId} = true
    await updateDoc(chatRef, {
      [`deletedFor.${userId}`]: true
    });
  } catch (error) {
    console.error("Lỗi xóa đoạn chat:", error);
  }
};
