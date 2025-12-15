import { Message } from '../types';
// SỬA ĐÚNG TÊN FILE CẤU HÌNH CỦA BẠN NẾU CẦN
import { db } from '../firebaseConfig'; 
import { 
  collection, addDoc, query, where, orderBy, getDocs, writeBatch
} from 'firebase/firestore';

const getConversationId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

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

export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string, 
  type: 'text' | 'image' | 'story_reply' = 'text',
  storyData?: { storyId: string, snapshotUrl: string }
): Promise<Message> => {
  
  const conversationId = getConversationId(senderId, receiverId);

  const newMessageData = {
    conversationId, 
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
  return { id: docRef.id, ...newMessageData } as Message;
};

// --- TÍNH NĂNG MỚI: XÓA CUỘC TRÒ CHUYỆN (CÓ LOG DEBUG) ---
export const deleteConversation = async (currentUserId: string, otherUserId: string): Promise<void> => {
    try {
        const conversationId = getConversationId(currentUserId, otherUserId);
        console.log("1. Bắt đầu quy trình xóa. ID cuộc trò chuyện:", conversationId);

        const messagesRef = collection(db, 'messages');
        
        // 1. Tìm tất cả tin nhắn thuộc cuộc hội thoại này
        const q = query(
            messagesRef,
            where('conversationId', '==', conversationId)
        );

        const snapshot = await getDocs(q);
        console.log("2. Tìm thấy số lượng tin nhắn cần xóa:", snapshot.size);

        if (snapshot.empty) {
            console.warn("!!! Không tìm thấy tin nhắn nào khớp ID này để xóa.");
            return;
        }

        // 2. Firestore chỉ cho phép xóa tối đa 500 docs mỗi batch
        // Chia nhỏ mảng tin nhắn thành các batch 500
        const batchSize = 500;
        const chunks = [];
        const docs = snapshot.docs;

        for (let i = 0; i < docs.length; i += batchSize) {
            chunks.push(docs.slice(i, i + batchSize));
        }

        console.log(`3. Đang chia thành ${chunks.length} đợt xóa (batch)...`);

        // 3. Thực thi xóa từng batch
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });
            await batch.commit();
        }
        
        console.log("4. Đã xóa thành công toàn bộ tin nhắn trên Database.");
    } catch (error) {
        console.error("LỖI CRITICAL KHI XÓA:", error);
        throw error;
    }
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {};
