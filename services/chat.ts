import { Message, ChatSession } from '../types';

const STORAGE_KEY = 'asking_vn_messages';

/**
 * Hàm lấy dữ liệu tươi mới nhất từ ổ cứng (localStorage)
 */
const getFreshMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Lỗi đọc tin nhắn:", error);
    return [];
  }
};

/**
 * Lấy danh sách tin nhắn giữa 2 người (Dùng cho cả Tab A và Tab B)
 */
export const getMessages = async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
  // Delay nhẹ để tạo cảm giác load mạng
  await new Promise(resolve => setTimeout(resolve, 200));

  // Luôn lấy dữ liệu mới nhất từ Storage (để thấy tin nhắn từ Tab kia gửi sang)
  const allMessages = getFreshMessages();

  // Logic lọc tin nhắn 2 chiều:
  // 1. Tin tôi gửi đi (sender = Me, receiver = You)
  // 2. Tin tôi nhận được (sender = You, receiver = Me)
  const conversation = allMessages.filter(msg => 
    (msg.senderId === currentUserId && msg.receiverId === otherUserId) || 
    (msg.senderId === otherUserId && msg.receiverId === currentUserId)
  );

  // Debug log để bạn kiểm tra nếu không thấy tin nhắn
  // console.log(`GetMessages [${currentUserId} <-> ${otherUserId}]: Found ${conversation.length}`);

  // Sắp xếp tin nhắn cũ -> mới
  return conversation.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

/**
 * Gửi tin nhắn
 */
export const sendMessage = async (
  senderId: string, 
  receiverId: string, 
  content: string, 
  type: 'text' | 'image' | 'story_reply' = 'text',
  storyData?: { storyId: string, snapshotUrl: string }
): Promise<Message> => {
  
  await new Promise(resolve => setTimeout(resolve, 300));

  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID độc nhất
    senderId,
    receiverId, 
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: type,
    storyId: storyData?.storyId,
    storySnapshotUrl: storyData?.snapshotUrl
  };

  // 1. Lấy toàn bộ tin nhắn hiện có trong kho
  const currentMessages = getFreshMessages();
  
  // 2. Thêm tin mới vào
  const updatedMessages = [...currentMessages, newMessage];
  
  // 3. Lưu lại kho ngay lập tức
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
  
  console.log("LOG: Đã gửi tin nhắn thành công:", newMessage);

  // --- MÌNH ĐÃ TẮT AUTO REPLY ĐỂ BẠN TEST NGƯỜI THẬT ---
  // Nếu muốn bật lại bot, hãy uncomment dòng dưới:
  // simulateAutoReply(receiverId, senderId);

  return newMessage;
};

/**
 * Hàm giả lập Bot trả lời (Dành cho debug)
 */
const simulateAutoReply = (botId: string, humanId: string) => {
  setTimeout(() => {
    const messages = getFreshMessages();
    const reply: Message = {
      id: `bot_${Date.now()}`,
      senderId: botId,
      receiverId: humanId,
      content: "Bot: Đã nhận tin nhắn (Auto) 🤖",
      createdAt: new Date().toISOString(),
      isRead: false,
      type: 'text'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...messages, reply]));
  }, 2000);
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {
    // Logic đánh dấu đã đọc (chưa cần thiết cho Mock)
};
