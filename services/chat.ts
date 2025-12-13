import { Message } from '../types';
// SỬA DÒNG NÀY: Dùng ../ để tìm file firebase.ts ở thư mục cha
import { db } from '../firebase'; 
import { 
  collection, addDoc, query, where, orderBy, getDocs 
} from 'firebase/firestore';

/**
 * Tạo ID hội thoại duy nhất từ 2 User ID để gom tin nhắn
 * Ví dụ: UserA="abc", UserB="xyz" -> ChatID luôn là "abc_xyz"
 */
const getConversationId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Lấy danh sách tin nhắn từ Firestore
 */
export const getMessages = async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
  try {
    const conversationId = getConversationId(currentUserId, otherUserId);
    const messagesRef = collection(db, 'messages');
    
    // Chỉ lấy tin nhắn thuộc cuộc hội thoại này
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as Message;
    });
  } catch (error) {
    console.error("Lỗi lấy tin nhắn:", error);
    return [];
  }
};

/**
 * Gửi tin nhắn lên Firebase
 */
export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string, 
  type: 'text' | 'image' | 'story_reply' = 'text',
  storyData?: { storyId: string, snapshotUrl: string }
): Promise<Message> => {
  
  const conversationId = getConversationId(senderId, receiverId);

  const newMessageData = {
    conversationId, // Quan trọng: Để filter tin nhắn của cặp đôi này
    senderId,
    receiverId,
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
    type,
    storyId: storyData?.storyId || null,
    storySnapshotUrl: storyData?.snapshotUrl || null
  };

  const docRef = await addDoc(collection(db, 'messages'), newMessageData);

  console.log("LOG: Đã lưu tin nhắn lên Firestore:", docRef.id);
  return { id: docRef.id, ...newMessageData } as Message;
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {};
