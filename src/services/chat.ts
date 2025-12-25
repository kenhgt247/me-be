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
  where,
  startAfter,
  QueryDocumentSnapshot, 
  DocumentData
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

/* ================= REALTIME MESSAGES (LATEST) ================= */
// Lấy 20 tin nhắn mới nhất realtime
export const subscribeMessages = (
  meId: string,
  otherId: string,
  callback: (messages: Message[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => void
) => {
  if (!meId || !otherId) return () => {};

  const chatId = getChatId(meId, otherId);
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'), // Lấy mới nhất trước
    limit(20)
  );

  return onSnapshot(
    q,
    snap => {
      const data = snap.docs.map(
        d => ({ id: d.id, ...d.data() } as Message)
      ).reverse(); // Đảo ngược lại để hiển thị đúng thứ tự thời gian (Cũ -> Mới)
      
      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      callback(data, lastVisible);
    },
    err => {
      if (err.code === 'permission-denied') {
        callback([], null);
      }
    }
  );
};

/* ================= FETCH MORE MESSAGES (HISTORY) ================= */
// Tải thêm tin nhắn cũ khi cuộn lên trên
export const fetchMoreMessages = async (
    meId: string,
    otherId: string,
    lastDoc: QueryDocumentSnapshot<DocumentData>
) => {
    const chatId = getChatId(meId, otherId);
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(20)
    );

    const snap = await getDoc(doc(db, 'chats', chatId)); // Dummy call if needed, but getDocs is correct
    // Import getDocs ở trên bị thiếu trong bản cũ, cần dùng getDocs
    const { getDocs } = await import('firebase/firestore'); 
    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse();
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { messages, lastDoc: newLastDoc };
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (
  sender: User,
  receiverId: string,
  content: string | File,
  type: 'text' | 'image' = 'text' // Thêm tham số type rõ ràng
) => {
  if (!sender?.id || !receiverId) return;

  const chatId = getChatId(sender.id, receiverId);
  const batch = writeBatch(db);

  let messageType = type;
  let messageContent = '';

  // 1️⃣ Upload image nếu là File
  if (content instanceof File) {
    messageType = 'image';
    messageContent = await uploadChatImage(content, chatId);
  } else {
    if (typeof content === 'string' && !content.trim()) return;
    messageContent = content as string;
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

/* ================= DELETE CHAT (SOFT DELETE) ================= */
export const deleteChatForUser = async (userId: string, otherUserId: string) => {
  const chatId = getChatId(userId, otherUserId);
  const chatRef = doc(db, 'chats', chatId);

  try {
    await updateDoc(chatRef, {
      [`deletedFor.${userId}`]: true
    });
  } catch (error) {
    console.error("Lỗi xóa đoạn chat:", error);
  }
};

/* ================= SEND STORY REPLY ================= */
export const sendStoryReply = async (
  sender: User,
  receiverId: string,
  text: string,
  story: { id: string; url: string }
) => {
  if (!sender?.id || !receiverId) return;

  const chatId = getChatId(sender.id, receiverId);
  const batch = writeBatch(db);

  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
  
  const messageData = {
    senderId: sender.id,
    content: text,          
    type: 'story_reply',    
    storyId: story.id,      
    storyUrl: story.url,    
    createdAt: serverTimestamp(),
    readBy: [sender.id]
  };

  batch.set(msgRef, messageData);

  const chatRef = doc(db, 'chats', chatId);

  const chatUpdate: Partial<ChatSession> = {
    participants: [sender.id, receiverId],
    lastMessage: `Đã phản hồi story: ${text}`, 
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