import { Message } from '../types';
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, query, where, orderBy, getDocs, writeBatch, 
  doc, getDoc, setDoc, updateDoc, increment, onSnapshot, limit 
} from 'firebase/firestore';

const getConversationId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

// --- 1. LẤY TIN NHẮN REAL-TIME ---
export const subscribeToMessages = (
  currentUserId: string, 
  otherUserId: string, 
  callback: (messages: Message[]) => void
) => {
  const conversationId = getConversationId(currentUserId, otherUserId);
  const messagesRef = collection(db, 'messages');
  
  // Query này KHỚP với Index bạn đã tạo trong ảnh (conversationId Asc, createdAt Asc)
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  }, (error) => {
    console.error("Lỗi Real-time:", error);
  });
};

// --- 2. GỬI TIN NHẮN ---
export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string, 
  type: 'text' | 'image' | 'story_reply' = 'text',
  storyData?: { storyId: string, snapshotUrl: string }
): Promise<Message> => {
  
  const conversationId = getConversationId(senderId, receiverId);
  const createdAt = new Date().toISOString();

  const newMessageData = {
    conversationId, senderId, receiverId, content, createdAt,
    isRead: false, type,
    storyId: storyData?.storyId || null,
    storySnapshotUrl: storyData?.snapshotUrl || null
  };

  const docRef = await addDoc(collection(db, 'messages'), newMessageData);

  // Cập nhật Chat List
  try {
      const chatDocRef = doc(db, 'chats', conversationId);
      const chatSnap = await getDoc(chatDocRef);
      const lastMessagePreview = type === 'image' ? '[Hình ảnh]' : (type === 'story_reply' ? '[Phản hồi story]' : content);

      if (chatSnap.exists()) {
          await updateDoc(chatDocRef, {
              lastMessage: lastMessagePreview,
              lastMessageTime: createdAt,
              [`unreadCount.${receiverId}`]: increment(1)
          });
      } else {
          // Tạo mới chat nếu chưa có
          const [senderSnap, receiverSnap] = await Promise.all([
              getDoc(doc(db, 'users', senderId)),
              getDoc(doc(db, 'users', receiverId))
          ]);
          const senderData = senderSnap.data() || { name: 'User', avatar: '', isExpert: false };
          const receiverData = receiverSnap.data() || { name: 'User', avatar: '', isExpert: false };

          await setDoc(chatDocRef, {
              id: conversationId,
              participants: [senderId, receiverId],
              participantData: {
                  [senderId]: { name: senderData.name, avatar: senderData.avatar, isExpert: senderData.isExpert },
                  [receiverId]: { name: receiverData.name, avatar: receiverData.avatar, isExpert: receiverData.isExpert }
              },
              lastMessage: lastMessagePreview,
              lastMessageTime: createdAt,
              unreadCount: { [senderId]: 0, [receiverId]: 1 }
          });
      }
  } catch (error) {
      console.error("Lỗi cập nhật danh sách chat:", error);
  }
  return { id: docRef.id, ...newMessageData } as Message;
};

// --- 3. XÓA CUỘC TRÒ CHUYỆN ---
export const deleteConversation = async (currentUserId: string, otherUserId: string): Promise<void> => {
    const conversationId = getConversationId(currentUserId, otherUserId);
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('conversationId', '==', conversationId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    
    const chatDocRef = doc(db, 'chats', conversationId);
    await import('firebase/firestore').then(mod => mod.deleteDoc(chatDocRef));
};
