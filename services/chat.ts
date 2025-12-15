import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  increment,
  getDoc,
  Timestamp,
  where // 👈 BẮT BUỘC PHẢI CÓ CÁI NÀY
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Message, ChatSession, User } from '../types';
/* ================= HELPER ================= */
export const getChatId = (uid1: string, uid2: string) => 
  [uid1, uid2].sort().join('_');

/* ================= REALTIME MESSAGES ================= */
export const subscribeMessages = (
  meId: string,
  otherId: string,
  callback: (messages: Message[]) => void
) => {
  const chatId = getChatId(meId, otherId);
  const q = query(
    collection(db, 'chats', chatId, 'messages'), // Chuẩn hóa path sub-collection
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Message[];
    callback(data);
  });
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (
  sender: User, // Truyền cả object User để lấy avatar/name
  receiverId: string,
  content: string,
  type: 'text' | 'image' = 'text'
) => {
  if (!content.trim() && type === 'text') return;

  const chatId = getChatId(sender.id, receiverId);
  const batch = writeBatch(db);

  // 1. Tạo message mới trong subcollection
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
  batch.set(msgRef, {
    senderId: sender.id,
    content,
    type,
    createdAt: serverTimestamp(),
    readBy: [sender.id] // Người gửi auto xem
  });

  // 2. Lấy thông tin người nhận để cập nhật snapshot (Optional nhưng tốt cho UX)
  // Trong thực tế, bạn có thể truyền receiverUser vào hàm này để đỡ tốn 1 lần đọc DB
  // Ở đây tôi giả định chỉ update info người gửi để tối ưu
  
  const chatRef = doc(db, 'chats', chatId);
  
  // Dữ liệu update cho chat session
  const updateData: any = {
    participants: [sender.id, receiverId],
    lastMessage: type === 'image' ? '[Hình ảnh]' : content,
    lastMessageAt: serverTimestamp(),
    [`unread.${receiverId}`]: increment(1), // Tăng biến đếm chưa đọc của người nhận
    [`deletedFor.${sender.id}`]: false,     // Khôi phục chat nếu đã xóa
    [`deletedFor.${receiverId}`]: false,
    
    // CẬP NHẬT THÔNG TIN NGƯỜI GỬI (để bên kia thấy avatar mới nhất)
    [`participantData.${sender.id}`]: {
        name: sender.name,
        avatar: sender.avatar || '',
        isExpert: !!sender.isExpert
    }
  };

  // Sử dụng set với merge: true để tạo chat doc nếu chưa có
  batch.set(chatRef, updateData, { merge: true });

  await batch.commit();
};

/* ================= MARK READ ================= */
export const markChatAsRead = async (meId: string, otherId: string) => {
  const chatId = getChatId(meId, otherId);
  const chatRef = doc(db, 'chats', chatId);
  
  // Reset biến đếm unread của mình về 0
  await updateDoc(chatRef, {
    [`unread.${meId}`]: 0
  }).catch(() => {
    // Bỏ qua lỗi nếu chat doc chưa tồn tại
  });
};
// Thêm vào cuối file services/chat.ts

/* ================= UNREAD COUNT (BADGE) ================= */
export const subscribeUnreadCount = (userId: string, callback: (count: number) => void) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, (snap) => {
    let totalUnread = 0;
    snap.docs.forEach(doc => {
      const data = doc.data();
      // Bỏ qua nếu chat này đã bị user xóa
      if (data.deletedFor?.[userId]) return;
      
      // Cộng dồn số tin chưa đọc
      totalUnread += (data.unread?.[userId] || 0);
    });
    callback(totalUnread);
  });
};
