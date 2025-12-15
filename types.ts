// =============================================================================
//  CORE SYSTEM INTERFACES (USER, CHAT, NOTIFICATIONS)
// =============================================================================

export interface User {
  id: string;
  name: string;
  avatar: string;
  isExpert: boolean;
  expertStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  specialty?: string; 
  workplace?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  bio?: string;
  
  username?: string; 
  coverUrl?: string; 
  
  points?: number;
  joinedAt?: string;
  isGuest?: boolean;
  followers?: string[];
  following?: string[];
  savedQuestions?: string[];
  isOnline?: boolean;
  lastActiveAt?: string;
  lastActive?: any;
  email?: string;
  

// Push notification
fcmTokens?: string[];
}

export interface Answer {
  id: string;
  questionId: string;
  author: User;
  content: string;
  likes: number;
  usefulBy?: string[];
  isBestAnswer: boolean;
  isExpertVerified?: boolean;
  createdAt: string;
  isAi: boolean;
  isHidden?: boolean;
  reportCount?: number;
  isFake?: boolean;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  author: User;
  answers: Answer[];
  likes: number;
  views: number;
  createdAt: string;
  images?: string[]; 
  isHidden?: boolean;
  reportCount?: number;
  isFake?: boolean;
}
// --- NEW: Interface cho Quản lý Danh mục câu hỏi (Admin) ---
export interface Category {
  id: string;
  name: string;
  slug: string;
  // Thêm 3 trường này:
  icon?: string;  // Tên icon (VD: 'Baby', 'Heart', 'Book')
  color?: string; // Class màu chữ (VD: 'text-pink-600')
  bg?: string;    // Class màu nền (VD: 'bg-pink-50')
}
export interface Notification {
  id: string;
  userId: string; 
  sender: { name: string; avatar: string };
  type: 'LIKE' | 'ANSWER' | 'VERIFY' | 'SYSTEM' | 'BEST_ANSWER' | 'FOLLOW' | 'MESSAGE';
  content: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: Timestamp; // Sử dụng Timestamp của Firestore
  type: 'text' | 'image';
  readBy: string[]; // Mảng chứa ID những người đã xem
}

export interface ChatSession {
  id: string;
  participants: string[];
  // Quan trọng: Lưu snapshot thông tin user để hiển thị nhanh ở danh sách
  participantData: {
    [uid: string]: {
      name: string;
      avatar: string;
      isExpert?: boolean;
    };
  };
  lastMessage: string;
  lastMessageAt: Timestamp;
  unread: { [uid: string]: number };
  deletedFor?: { [uid: string]: boolean };
}

export interface Story {
  id: string;
  userId: string;          
  userName: string;        
  userAvatar: string;      
  userIsExpert?: boolean;  
  mediaUrl: string;        
  mediaType: 'image' | 'video';
  caption?: string;        
  createdAt: string;       
  expiresAt: string;       
  viewers: string[];       
  likes: string[];         
}

// =============================================================================
//  GAME ENGINE V2 INTERFACES (NÂNG CẤP CHO GAME CHO BÉ)
// =============================================================================

export type GameCategory = string;

// Mở rộng các loại game để hỗ trợ nhiều tính năng hơn
export type GameType = 
  | 'quiz'          // Trắc nghiệm
  | 'flashcard'     // Thẻ học (Hình + Tiếng)
  | 'drag-drop'     // Kéo thả
  | 'html5'         // Game nhúng (Iframe)
  | 'story'         // Truyện đọc
  | 'ai-story';     // AI kể chuyện

export type GameOrientation = 'portrait' | 'landscape' | 'auto';

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

// Định nghĩa một "Tài sản" trong game (Dùng chung cho cả Đáp án, Câu hỏi, Vật thể)
export interface GameAsset {
  id: string;
  text?: string;        // Chữ hiển thị
  imageUrl?: string;    // URL Hình ảnh
  audioUrl?: string;    // URL Âm thanh (Giọng đọc)
  color?: string;       // Màu nền (nếu không có ảnh)
}

// Cấu hình âm thanh & hiệu ứng (Juice)
export interface GameConfig {
  bgMusicUrl?: string;       // Nhạc nền
  correctSoundUrl?: string;  // Tiếng khi chọn đúng
  wrongSoundUrl?: string;    // Tiếng khi chọn sai
  successConfetti?: boolean; // Bắn pháo hoa khi thắng
  mascotGuide?: boolean;     // Hiển thị nhân vật hướng dẫn
}

// Dữ liệu của MỘT màn chơi (Level) - Thay thế GameQuestion cũ
export interface GameLevel {
  id: string;
  instruction: GameAsset; // Đề bài (Có thể là Text hoặc Audio đọc đề)
  items: GameAsset[];     // Danh sách các lựa chọn/thẻ bài
  correctAnswerId?: string; // ID của đáp án đúng (cho Quiz)
  pairs?: { itemId: string; targetId: string }[]; // Cặp đúng (cho Kéo thả)
  dropZones?: GameAsset[]; // Vùng thả (cho Kéo thả)
  order: number;
}

// Interface Game Chính (Updated V2)
export interface Game {
  id: string;
  title: string;
  slug: string; 
  icon: string;
  color: string;
  
  gameType: GameType;
  category: GameCategory;
  orientation?: GameOrientation;
  
  minAge: number;
  maxAge: number;
  
  isActive: boolean;
  isPro?: boolean;
  order: number;
  
  // Dữ liệu nội dung (Legacy & V2)
  gameUrl?: string;       // Cho game HTML5
  storyContent?: string;  // Cho truyện đọc
  
  // Cấu hình V2
  config: GameConfig;     
  levels: GameLevel[];    // Mảng chứa toàn bộ màn chơi
  
  totalPlays: number;
  createdAt: string;
  updatedAt: string;
  
  // Trường cũ (có thể giữ lại để tránh lỗi type ở code cũ chưa clean)
  questionCount?: number; 
}

// =============================================================================
//  OTHER MODULES (EXPERT, BLOG, DOCS, ADS)
// =============================================================================

export interface ExpertApplication {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  workplace: string;
  specialty: string;
  proofImages: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  rejectionReason?: string;
  reviewedAt?: string;
}

export interface Report {
  id: string;
  targetId: string;
  targetType: 'question' | 'answer';
  reason: string;
  reportedBy: string;
  createdAt: string;
  status: 'open' | 'resolved' | 'dismissed';
}

export interface AdConfig {
  isEnabled: boolean;
  provider: 'adsense' | 'custom';
  adsenseClientId?: string;
  adsenseSlotId?: string;
  customBannerUrl?: string;
  customTargetUrl?: string;
  frequency: number;
  homeAd?: {
    enabled: boolean;
    frequency: number;
    title: string;
    content: string;
    imageUrl: string;
    ctaText: string;
    link: string;
    sponsorName: string;
  };
  sidebarAd?: {
    enabled: boolean;
    title: string;
    description: string;
    buttonText: string;
    link: string;
    gradient: string;
  };
  blogFeedAd?: {
    enabled: boolean;
    frequency: number;
    title: string;
    excerpt: string;
    imageUrl: string;
    ctaText: string;
    link: string;
    sponsorName: string;
  };
  documentAd?: {
    enabled: boolean;
    frequency: number;
    title: string;
    description: string;
    imageUrl: string;
    ctaText: string;
    link: string;
    sponsorName: string;
  };
  questionDetailAd?: {
    enabled: boolean;
    title: string;
    description: string;
    imageUrl: string;
    ctaText: string;
    link: string;
    sponsorName: string;
  };
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string;
  order: number;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  iconEmoji?: string;
  youtubeUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  categoryId?: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorIsExpert: boolean;
  status: 'draft' | 'published';
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isExpert: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string;
  order: number;
  isActive: boolean;
}

export interface Document {
  id: string;
  title: string;
  slug: string;
  description: string;
  isExternal?: boolean; 
  externalLink?: string; 
  fileUrl?: string;      
  fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'image' | 'video' | 'link' | 'other';
  fileName?: string;
  fileSize?: number;
  categoryId: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorIsExpert: boolean;
  views: number;
  downloads: number;
  rating: number; 
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentReview {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// =============================================================================
//  CONSTANTS & HELPERS
// =============================================================================

export const CATEGORIES = [
  "Mang thai",
  "Dinh dưỡng",
  "Sức khỏe",
  "0-1 tuổi",
  "1-3 tuổi",
  "Tâm lý",
  "Giáo dục sớm",
  "Gia đình"
];

export const DEFAULT_GAME_CATEGORIES: CategoryDef[] = [
  { id: 'general', label: 'Tổng hợp', icon: '🎮', color: 'bg-indigo-400', isDefault: true },
  { id: 'math', label: 'Toán học', icon: '🔢', color: 'bg-blue-500', isDefault: true },
  { id: 'vietnamese', label: 'Tiếng Việt', icon: 'abc', color: 'bg-red-400', isDefault: true },
  { id: 'english', label: 'Tiếng Anh', icon: '🔤', color: 'bg-purple-500', isDefault: true },
  { id: 'logic', label: 'Tư duy', icon: '🧠', color: 'bg-yellow-400', isDefault: true },
  { id: 'story', label: 'Truyện kể', icon: '📖', color: 'bg-pink-400', isDefault: true },
  { id: 'art', label: 'Mỹ thuật', icon: '🎨', color: 'bg-rose-400', isDefault: true },
  { id: 'music', label: 'Âm nhạc', icon: '🎵', color: 'bg-teal-400', isDefault: true },
];

export const GAME_CATEGORIES = DEFAULT_GAME_CATEGORIES;

export const toSlug = (title: string, id?: string) => {
  if (!title) return '';
  let slug = title.toLowerCase();
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  slug = slug.replace(/[đĐ]/g, "d");
  slug = slug.replace(/([^0-9a-z-\s])/g, "");
  slug = slug.replace(/(\s+)/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  if (id) {
    return `${slug}-${id}`;
  }
  return slug;
};

export const getIdFromSlug = (slug: string | undefined): string => {
  if (!slug) return '';
  const lastHyphenIndex = slug.lastIndexOf('-');
  if (lastHyphenIndex !== -1) {
      return slug.substring(lastHyphenIndex + 1);
  }
  return slug;
};
