import { Message, ChatSession } from '../types';

// --- KEY CHANGE 1: KHỞI TẠO TỪ LOCAL STORAGE ---
// Kiểm tra xem trong bộ nhớ trình duyệt đã có tin nhắn chưa, nếu có thì lấy ra
const STORAGE_KEY = 'asking_vn_mock_messages';
const storedMessages = localStorage.getItem(STORAGE_KEY);
let MOCK_MESSAGES: Message[] = storedMessages ? JSON.parse(storedMessages) : [];

// Mock sessions (Có thể làm tương tự nếu cần lưu danh sách chat)
let MOCK_CHATS: ChatSession[] = [];

/**
 * Lấy danh sách tin nhắn giữa 2 người
 */
export const getMessages = async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
  // Giả lập delay mạng nhẹ để tạo cảm giác thật
  await new Promise(resolve => setTimeout(resolve, 200));

  // Lọc tin nhắn giữa 2 người
  return MOCK_MESSAGES.filter(msg => 
    (msg.senderId === currentUserId && msg.receiverId === otherUserId) || 
    (msg.senderId === otherUserId && msg.receiverId === currentUserId)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
    id: `msg_${Date.now()}`,
    senderId,
    receiverId, 
    content,
    createdAt: new Date().toISOString(),
    isRead: false,
    type: type,
    storyId: storyData?.storyId,
    storySnapshotUrl: storyData?.snapshotUrl
  };

  // 1. Thêm vào mảng trong RAM
  MOCK_MESSAGES.push(newMessage);
  
  // --- KEY CHANGE 2: LƯU NGAY VÀO LOCAL STORAGE ---
  // Để khi F5 không bị mất
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_MESSAGES));
  
  // Cập nhật session (giả lập)
  await updateChatSession(senderId, receiverId, newMessage);

  console.log("LOG: Đã gửi và lưu tin nhắn:", newMessage);
  return newMessage;
};

/**
 * Cập nhật phiên chat (Mock)
 */
const updateChatSession = async (senderId: string, receiverId: string, lastMessage: Message) => {
    // Trong thực tế, bạn cũng nên lưu session vào LocalStorage nếu muốn danh sách chat bên trái tồn tại lâu dài
    console.log("LOG: Đã cập nhật Chat Session");
};

/**
 * Đánh dấu đã đọc
 */
export const markMessagesAsRead = async (chatId: string, userId: string) => {
    // Logic đánh dấu đọc (có thể cập nhật vào MOCK_MESSAGES và lưu lại localStorage)
    console.log(`LOG: Đã đánh dấu đọc cho chat ${chatId}`);
};
