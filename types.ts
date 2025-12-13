export interface User {
  id: string;
  name: string;
  avatar: string;
  isExpert: boolean;
  expertStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  specialty?: string; // e.g., "Bác sĩ Nhi khoa", "Chuyên gia Dinh dưỡng"
  workplace?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  bio?: string;
  
  // --- CÁC TRƯỜNG MỚI CHO PROFILE CHUYÊN NGHIỆP ---
  username?: string; // Tên định danh (VD: "bacsihung")
  coverUrl?: string; // Ảnh bìa (Cover Image)
  
  points?: number;
  joinedAt?: string;
  isGuest?: boolean;
  followers?: string[];
  following?: string[];
  savedQuestions?: string[];
  isOnline?: boolean;
  lastActiveAt?: string;
  email?: string;
  isFake?: boolean;
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

// --- CẬP NHẬT: THÊM LOGIC TIN NHẮN TỪ STORY ---
export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  // Thêm 'story_reply' để biết đây là tin nhắn trả lời từ Story
  type: 'text' | 'image' | 'story_reply'; 
  // Các trường bổ sung nếu type là 'story_reply'
  storyId?: string;       // ID của story gốc
  storySnapshotUrl?: string; // Ảnh nhỏ của story để hiển thị trong đoạn chat
}

export interface ChatSession {
  id: string;
  participants: string[]; 
  participantData: { [uid: string]: { name: string; avatar: string; isExpert?: boolean } };
  lastMessage: string;
  lastMessageTime: string;
  updatedAt: string;
  unreadCount: { [uid: string]: number };
}

// --- THÊM MỚI: STORY / MOMENTS MODULE ---
export interface Story {
  id: string;
  userId: string;          // Người đăng
  userName: string;        // Tên hiển thị (để load nhanh không cần join bảng User)
  userAvatar: string;      // Avatar người đăng
  userIsExpert?: boolean;  // Để hiện tích xanh nếu là chuyên gia
  
  mediaUrl: string;        // Đường dẫn ảnh/video
  mediaType: 'image' | 'video';
  caption?: string;        // Chú thích (nếu có)
  
  createdAt: string;       // Thời gian tạo (ISO string)
  expiresAt: string;       // Thời gian hết hạn (thường là createdAt + 24h)
  
  viewers: string[];       // Danh sách ID người đã xem
  likes: string[];         // Danh sách ID người đã thả tim
}

// --- GAME TYPES ---
export type GameCategory = string; 
export type GameType = 'quiz' | 'html5' | 'story' | 'ai-story';
export type GameOrientation = 'portrait' | 'landscape' | 'auto';

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Game {
  id: string;
  title: string;
  icon: string;
  color: string;
  gameType: GameType;
  category: GameCategory;
  orientation?: GameOrientation;
  
  gameUrl?: string;
  storyContent?: string;
  
  minAge: number;
  maxAge: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  questionCount?: number;
}

export interface GameQuestion {
  id: string;
  q: string;
  opts: string[];
  a: string;
  displayType: 'text' | 'emoji' | 'color';
  order: number;
  isActive: boolean;
  createdAt: string;
}

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

// --- ADVERTISING ---
export interface AdConfig {
  isEnabled: boolean;
  provider: 'adsense' | 'custom';
  adsenseClientId?: string;
  adsenseSlotId?: string;
  customBannerUrl?: string;
  customTargetUrl?: string;
  frequency: number;

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

// --- BLOG MODULE TYPES ---
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

// --- DOCUMENT MODULE TYPES ---
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

// --- UTILS FOR SLUG ---

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
