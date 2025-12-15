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
  try {
    const conversationId = getConversationId(currentUserId, otherUserId);
    const messagesRef = collection(db, 'messages');
    
    // QUAN TRỌNG: Query này YÊU CẦU INDEX trên Firestore
    // (Collection: messages, Fields: conversationId ASC, createdAt ASC)
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as Message;
      });
      callback(messages);
    }, (error) => {
      console.error("Lỗi Real-time:", error);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Lỗi setup listener:", error);
    return () => {};
  }
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
    conversationId, 
    senderId,
    receiverId,
    content,
    createdAt,
    isRead: false,
    type,
    storyId: storyData?.storyId || null,
    storySnapshotUrl: storyData?.snapshotUrl || null
  };

  // 1. Lưu tin nhắn vào collection 'messages'
  const docRef = await addDoc(collection(db, 'messages'), newMessageData);

  // 2. Cập nhật thông tin tóm tắt vào collection 'chats'
  try {
      const chatDocRef = doc(db, 'chats', conversationId);
      const chatSnap = await getDoc(chatDocRef);
      const lastMessagePreview = type === 'image' ? '[Hình ảnh]' : (type === 'story_reply' ? '[Phản hồi story]' : content);

      if (chatSnap.exists()) {
          // Nếu đã có chat -> update
          await updateDoc(chatDocRef, {
              lastMessage: lastMessagePreview,
              lastMessageTime: createdAt,
              [`unreadCount.${receiverId}`]: increment(1)
          });
      } else {
          // Nếu chưa có -> tạo mới (kèm thông tin user để hiển thị nhanh)
          const [senderSnap, receiverSnap] = await Promise.all([
              getDoc(doc(db, 'users', senderId)),
              getDoc(doc(db, 'users', receiverId))
          ]);

          const senderData = senderSnap.data() || { name: 'Người dùng', avatar: '', isExpert: false };
          const receiverData = receiverSnap.data() || { name: 'Người dùng', avatar: '', isExpert: false };

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
      // Log lỗi nhưng không chặn UI (tin nhắn vẫn gửi thành công)
      console.error("Lỗi cập nhật danh sách chat:", error);
  }

  return { id: docRef.id, ...newMessageData } as Message;
};

// --- 3. XÓA CUỘC TRÒ CHUYỆN (ĐÃ NÂNG CẤP CHIA BATCH) ---
export const deleteConversation = async (currentUserId: string, otherUserId: string): Promise<void> => {
    try {
        const conversationId = getConversationId(currentUserId, otherUserId);
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('conversationId', '==', conversationId));
        
        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        // Firebase giới hạn 500 lệnh/batch, nên phải chia nhỏ nếu nhiều tin nhắn
        const CHUNK_SIZE = 400; 
        for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
            const chunk = docs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        // Cuối cùng xóa document trong 'chats'
        const chatDocRef = doc(db, 'chats', conversationId);
        await import('firebase/firestore').then(mod => mod.deleteDoc(chatDocRef));
    } catch (error) {
        console.error("Lỗi khi xóa:", error);
        throw error;
    }
};
