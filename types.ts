
export interface User {
  id: string;
  name: string;
  avatar: string;
  isExpert: boolean;
  expertStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  specialty?: string; // e.g., "Bác sĩ Nhi khoa", "Chuyên gia Dinh dưỡng"
  workplace?: string;
  isAdmin?: boolean;
  bio?: string;
  points?: number;
  joinedAt?: string;
  isGuest?: boolean; // New flag for guest mode
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
  images?: string[]; // Array of image URLs
  isHidden?: boolean;
}

export enum GameType {
  NUMBERS = 'NUMBERS',
  COLORS = 'COLORS',
  ANIMALS = 'ANIMALS',
  EMOTIONS = 'EMOTIONS'
}

export interface GameItem {
  id: string;
  question: string; // "What color is this?"
  value: string; // The correct answer value (text or hex)
  display: string; // What to show (text, hex code, or emoji)
  options: string[]; // Possible answers
  audio: string; // Text to speak
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
