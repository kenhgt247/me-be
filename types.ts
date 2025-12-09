
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

export enum GameType {
  NUMBERS = 'NUMBERS',
  COLORS = 'COLORS',
  ANIMALS = 'ANIMALS',
  ALPHABET = 'ALPHABET',
  SHAPES = 'SHAPES',
  FRUITS = 'FRUITS',
  VEHICLES = 'VEHICLES',
  BODY = 'BODY',
  FAMILY = 'FAMILY',
  VEGETABLES = 'VEGETABLES',
  CLOTHES = 'CLOTHES',
  SCHOOL = 'SCHOOL',
  NATURE = 'NATURE',
  JOBS = 'JOBS',
  MUSIC = 'MUSIC',
  SPORTS = 'SPORTS',
  HOUSE = 'HOUSE',
  FOOD = 'FOOD'
}

export interface GameItem {
  id: string;
  question: string;
  value: string;
  display: string;
  options: string[];
  audio: string;
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
