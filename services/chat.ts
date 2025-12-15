import { Message } from '../types';
// ĐẢM BẢO ĐƯỜNG DẪN NÀY ĐÚNG VỚI DỰ ÁN CỦA BẠN
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, query, where, orderBy, getDocs, writeBatch, 
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp 
} from 'firebase/firestore';

const getConversationId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

// --- 1. LẤY TIN NHẮN (GIỮ NGUYÊN) ---
export const getMessages = async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
  try {
    const conversationId = getConversationId(currentUserId, otherUserId);
    const messagesRef = collection(db, 'messages');
    
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

// --- 2. GỬI TIN NHẮN (ĐÃ NÂNG CẤP ĐỂ HIỆN RA DANH SÁCH CHAT) ---
export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string, 
  type: 'text' | 'image' | 'story_reply' = 'text',
  storyData?: { storyId: string, snapshotUrl: string }
): Promise<Message> => {
  
  const conversationId = getConversationId(senderId, receiverId);
  const createdAt = new Date().toISOString();

  // A. Tạo object tin nhắn
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

  // B. Lưu tin nhắn vào collection 'messages'
  const docRef = await addDoc(collection(db, 'messages'), newMessageData);

  // C. [QUAN TRỌNG] Cập nhật thông tin tóm tắt vào collection 'chats' để hiện ra ngoài danh sách
  try {
      const chatDocRef = doc(db, 'chats', conversationId);
      const chatSnap = await getDoc(chatDocRef);

      // Nội dung hiển thị tóm tắt (nếu là ảnh thì hiện "[Hình ảnh]")
      const lastMessagePreview = type === 'image' ? '[Hình ảnh]' : (type === 'story_reply' ? '[Phản hồi story]' : content);

      if (chatSnap.exists()) {
          // Nếu cuộc trò chuyện đã tồn tại -> Cập nhật tin nhắn cuối cùng
          await updateDoc(chatDocRef, {
              lastMessage: lastMessagePreview,
              lastMessageTime: createdAt,
              [`unreadCount.${receiverId}`]: increment(1) // Tăng số tin chưa đọc cho người nhận
          });
      } else {
          // Nếu chưa tồn tại -> Phải tạo mới document trong 'chats'
          // Cần lấy thông tin user để lưu cache (giúp danh sách chat load nhanh hơn)
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
                  [senderId]: { 
                      name: senderData.name, 
                      avatar: senderData.avatar, 
                      isExpert: senderData.isExpert 
                  },
                  [receiverId]: { 
                      name: receiverData.name, 
                      avatar: receiverData.avatar, 
                      isExpert: receiverData.isExpert 
                  }
              },
              lastMessage: lastMessagePreview,
              lastMessageTime: createdAt,
              unreadCount: {
                  [senderId]: 0,
                  [receiverId]: 1
              }
          });
      }
  } catch (error) {
      console.error("Lỗi cập nhật danh sách chat:", error);
      // Không throw error ở đây để tránh chặn UI gửi tin nhắn nếu chỉ lỗi cập nhật danh sách
  }

  return { id: docRef.id, ...newMessageData } as Message;
};

// --- 3. XÓA CUỘC TRÒ CHUYỆN (ĐÃ SỬA LỖI Ở BƯỚC TRƯỚC) ---
export const deleteConversation = async (currentUserId: string, otherUserId: string): Promise<void> => {
    try {
        const conversationId = getConversationId(currentUserId, otherUserId);
        console.log("Đang xóa cuộc trò chuyện:", conversationId);

        // 1. Xóa tất cả tin nhắn chi tiết
        const messagesRef = collection(db, 'messages');
        const q = query(
            messagesRef,
            where('conversationId', '==', conversationId)
        );

        const snapshot = await getDocs(q);
        const batchSize = 500;
        const docs = snapshot.docs;

        // Chia nhỏ để xóa (Batch delete)
        for (let i = 0; i < docs.length; i += batchSize) {
            const chunk = docs.slice(i, i + batchSize);
            const batch = writeBatch(db);
            chunk.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });
            await batch.commit();
        }
        
        // 2. [QUAN TRỌNG] Xóa luôn document trong collection 'chats' để nó biến mất khỏi danh sách bên ngoài
        const chatDocRef = doc(db, 'chats', conversationId);
        await import('firebase/firestore').then(mod => mod.deleteDoc(chatDocRef));

        console.log("Đã xóa hoàn tất.");
    } catch (error) {
        console.error("Lỗi khi xóa cuộc trò chuyện:", error);
        throw error;
    }
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {};
