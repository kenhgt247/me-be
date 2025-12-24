// =============================================================================
//  TYPES (CORE SYSTEM + GAME ENGINE V2 + OTHER MODULES)
//  Safe upgrade: Backward-compatible (only adds OPTIONAL fields)
// =============================================================================

import type { Timestamp } from 'firebase/firestore';

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

// --- Admin: Quản lý danh mục câu hỏi ---
export interface Category {
  id: string;
  name: string;
  slug: string;

  icon?: string;  // VD: 'Baby', 'Heart', 'Book' (hoặc emoji)
  color?: string; // VD: 'text-pink-600'
  bg?: string;    // VD: 'bg-pink-50'
}

export interface Notification {
  id: string;
  userId: string;
  sender: { name: string; avatar: string };

  type:
    | 'LIKE'
    | 'ANSWER'
    | 'VERIFY'
    | 'SYSTEM'
    | 'BEST_ANSWER'
    | 'FOLLOW'
    | 'MESSAGE';

  content: string;
  link: string;

  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;

  createdAt: Timestamp;

  // Thêm 'story_reply'
  type: 'text' | 'image' | 'story_reply';

  readBy: string[];

  // Story Reply (optional)
  storyId?: string;
  storyUrl?: string;
}

export interface ChatSession {
  id: string;
  participants: string[];

  // Snapshot data để hiển thị nhanh
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

// Giữ nguyên các loại game đang dùng
export type GameType =
  | 'quiz'       // Trắc nghiệm
  | 'flashcard'  // Thẻ học (Hình + Tiếng)
  | 'drag-drop'  // Kéo thả
  | 'html5'      // Game nhúng (Iframe)
  | 'story'      // Truyện đọc
  | 'ai-story';  // AI kể chuyện

export type GameOrientation = 'portrait' | 'landscape' | 'auto';

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

// Tài sản trong game (đề bài / đáp án / vật thể)
export interface GameAsset {
  id: string;

  text?: string;
  imageUrl?: string;
  audioUrl?: string;

  // optional UI
  color?: string;
}

// Cấu hình âm thanh & hiệu ứng
export interface GameConfig {
  bgMusicUrl?: string;
  correctSoundUrl?: string;
  wrongSoundUrl?: string;

  successConfetti?: boolean;
  mascotGuide?: boolean;
}

// ===============================
// GAMEPLAY UPGRADE (BACKWARD-SAFE)
// ===============================

// Mechanic = "cơ chế chơi" theo từng level.
// -> OPTIONAL để không phá level cũ.
export type GameMechanic =
  | 'quiz'          // bấm chọn đáp án đúng
  | 'flashcard'     // học thẻ
  | 'memory_match'  // lật hình ghép đôi
  | 'odd_one_out'   // tìm cái sai
  | 'tap_sequence'  // bấm theo thứ tự
  | 'drag_drop';    // kéo thả (level-based)

// Dữ liệu một màn chơi (Level)
// NOTE: giữ nguyên fields hiện có để code cũ không gãy.
// NOTE: chỉ thêm fields OPTIONAL để nâng cấp.
export interface GameLevel {
  id: string;

  // đề bài (có thể là text hoặc audio)
  instruction: GameAsset;

  // danh sách lựa chọn/thẻ/vật thể (quiz/flashcard/drag-drop dùng chung)
  items: GameAsset[];

  // ===== Legacy / Existing =====
  correctAnswerId?: string; // cho quiz
  pairs?: { itemId: string; targetId: string }[]; // cho kéo thả
  dropZones?: GameAsset[]; // vùng thả

  order: number;

  // ===== New (Optional, V2) =====
  mechanic?: GameMechanic;

  /**
   * payload: chứa dữ liệu riêng theo mechanic mà không làm nổ interface cũ.
   * Ví dụ memory_match:
   * payload = { pairs: [{ pairId:'p1', a:{...}, b:{...} }, ...] }
   */
  payload?: Record<string, any>;

  // “Juice” giúp game cuốn hơn (AI có thể sinh)
  hint?: string;        // gợi ý sau vài lần sai
  celebrate?: string;   // câu khen riêng cho level
  difficulty?: 1 | 2 | 3 | 4 | 5;

  // Time / attempts (optional)
  timeLimitSec?: number;
  maxMistakes?: number;
}

// Game chính (V2)
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

  // Legacy fields
  gameUrl?: string;      // html5 iframe
  storyContent?: string; // story

  // config V2
  config: GameConfig;

  // levels
  levels: GameLevel[];

  totalPlays: number;
  createdAt: string;
  updatedAt: string;

  // Legacy compatibility
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
  fileType:
    | 'pdf'
    | 'docx'
    | 'xlsx'
    | 'pptx'
    | 'image'
    | 'video'
    | 'link'
    | 'other';

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
  'Mang thai',
  'Dinh dưỡng',
  'Sức khỏe',
  '0-1 tuổi',
  '1-3 tuổi',
  'Tâm lý',
  'Giáo dục sớm',
  'Gia đình',
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
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/[đĐ]/g, 'd');
  slug = slug.replace(/([^0-9a-z-\s])/g, '');
  slug = slug.replace(/(\s+)/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');

  return id ? `${slug}-${id}` : slug;
};

export const getIdFromSlug = (slug: string | undefined): string => {
  if (!slug) return '';
  const lastHyphenIndex = slug.lastIndexOf('-');
  return lastHyphenIndex !== -1 ? slug.substring(lastHyphenIndex + 1) : slug;
};
