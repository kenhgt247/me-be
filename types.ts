
export interface User {
  id: string;
  name: string;
  avatar: string;
  isExpert: boolean;
  expertStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  specialty?: string; // e.g., "Bác sĩ Nhi khoa", "Chuyên gia Dinh dưỡng"
  workplace?: string;
  isAdmin?: boolean;
  isBanned?: boolean; // New field for banning users
  bio?: string;
  points?: number;
  joinedAt?: string;
  isGuest?: boolean;
  followers?: string[];
  following?: string[];
  savedQuestions?: string[]; // List of saved question IDs
  isOnline?: boolean;
  lastActiveAt?: string;
  email?: string; // Add email for admin management
  isFake?: boolean; // For seed data management
}

export interface Answer {
  id: string;
  questionId: string;
  author: User;
  content: string;
  likes: number;
  usefulBy?: string[]; // List of user IDs who voted useful
  isBestAnswer: boolean;
  isExpertVerified?: boolean;
  createdAt: string;
  isAi: boolean;
  isHidden?: boolean;
  reportCount?: number;
  isFake?: boolean; // For seed data management
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
  isFake?: boolean; // For seed data management
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
  createdAt: string;
  isRead: boolean;
  type: 'text' | 'image';
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

// --- GAME TYPES ---

// Changed to string to support dynamic categories
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
  icon: string; // Emoji or URL
  color: string; // Tailwind class like 'bg-blue-400'
  gameType: GameType;
  category: GameCategory;
  orientation?: GameOrientation; // New field for screen orientation
  
  // Specific fields based on type
  gameUrl?: string; // For HTML5 games
  storyContent?: string; // For Stories
  
  minAge: number;
  maxAge: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  questionCount?: number; // Optional, for UI display
}

export interface GameQuestion {
  id: string;
  q: string; // Question text
  opts: string[]; // Options
  a: string; // Correct answer
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
  targetId: string; // Question ID or Answer ID
  targetType: 'question' | 'answer';
  reason: string;
  reportedBy: string; // User ID
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
  frequency: number; // e.g. every 5 posts
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
  content: string; // HTML or Markdown
  coverImageUrl?: string;
  iconEmoji?: string;
  
  // Media & Source
  youtubeUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  
  categoryId?: string; // ID of BlogCategory
  tags?: string[];
  
  // Author Denormalization
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
  
  // Author Denormalization
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isExpert: boolean;
  
  createdAt: string;
  updatedAt: string;
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
export const removeVietnameseTones = (str: string) => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

export const toSlug = (title: string, id: string) => {
    if (!title) return id;
    const slug = removeVietnameseTones(title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') 
        .trim()
        .replace(/\s+/g, '-'); 
    return `${slug}-${id}`;
};

export const getIdFromSlug = (slug: string | undefined): string => {
    if (!slug) return '';
    const parts = slug.split('-');
    return parts.pop() || ''; 
};
// ... existing types

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
  
  // File or Link
  isExternal?: boolean; 
  externalLink?: string; 
  fileUrl?: string;     
  
  fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'image' | 'video' | 'link' | 'other';
  fileName?: string;
  fileSize?: number;
  
  categoryId: string;
  tags: string[];
  
  // Author
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isExpert: boolean;
  
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
