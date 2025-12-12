import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, Image as ImageIcon, Loader2, ChevronDown, Check, 
  Tag, Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Plus,
  Link as LinkIcon, ArrowLeft, Send
} from 'lucide-react';
import { Question, User } from '../types';
import { suggestTitles, generateQuestionContent } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
import { uploadFile } from '../services/storage'; 
import { loginAnonymously } from '../services/auth';

interface AskProps {
  onAddQuestion: (q: Question) => Promise<void>;
  currentUser: User;
  categories: string[];
  onAddCategory: (category: string) => void;
  onLogin: (email: string, pass: string) => Promise<User>;
  onRegister: (email: string, pass: string, name: string) => Promise<User>;
  onGoogleLogin: () => Promise<User>;
}

interface Attachment {
  id: string;
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  error?: boolean;
}

const getCategoryIcon = (cat: string) => {
  if (cat.includes("Mang thai")) return <Baby size={18} />;
  if (cat.includes("Dinh dưỡng")) return <Utensils size={18} />;
  if (cat.includes("Sức khỏe")) return <Stethoscope size={18} />;
  if (cat.includes("0-1") || cat.includes("1-3")) return <Smile size={18} />;
  if (cat.includes("Tâm lý")) return <Brain size={18} />;
  if (cat.includes("Giáo dục")) return <BookOpen size={18} />;
  if (cat.includes("Gia đình")) return <Users size={18} />;
  return <Tag size={18} />;
};

const getCategoryColor = (cat: string) => {
  if (cat.includes("Mang thai")) return "bg-pink-50 text-pink-600 border-pink-100";
  if (cat.includes("Dinh dưỡng")) return "bg-green-50 text-green-600 border-green-100";
  if (cat.includes("Sức khỏe")) return "bg-blue-50 text-blue-600 border-blue-100";
  return "bg-orange-50 text-orange-600 border-orange-100";
};

const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Mẹ & Bé": ["👶", "👧", "🧒", "🤰", "🤱", "🍼", "🧸", "🎈", "🎂", "💊"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪"]
};

export const Ask: React.FC<AskProps> = ({
  onAddQuestion,
  currentUser,
  categories,
  onAddCategory,
  onLogin,
  onRegister,
  onGoogleLogin
}) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const [customCategory, setCustomCategory] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  useEffect(() => {
    return () => {
      attachments.forEach(att => URL.revokeObjectURL(att.preview));
    };
  }, []);

  const handleAiSuggest = async () => {
    if (title.length < 3) {
      alert("Mẹ ơi, nhập vài từ khóa để AI gợi ý tiêu đề hay hơn nhé 🌸");
      return;
    }
    setIsSuggesting(true);
    try {
      const results = await suggestTitles(title, content);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch {
      alert("AI đang bận, mẹ thử lại sau nhé!");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAiContent = async () => {
    if (title.length < 5) {
      alert("Mẹ nhập tiêu đề rõ hơn một chút để AI viết chính xác nhé ❤️");
      return;
    }
    if (content.length > 50 && !confirm("AI sẽ viết lại nội dung hiện tại. Mẹ đồng ý nhé?")) return;

    setIsGeneratingContent(true);
    try {
      const aiContent = await generateQuestionContent(title);
      setContent(aiContent);
    } catch {
      alert("AI đang quá tải, mẹ tự viết giúp nhé!");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 3) {
      alert("Mỗi câu hỏi tối đa 3 ảnh thôi mẹ nhé 📸");
      return;
    }

    const newAttachments: Attachment[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      uploading: true
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach(async att => {
      try {
        const url = await uploadFile(att.file, 'question_images');
        setAttachments(prev =>
          prev.map(p => p.id === att.id ? { ...p, url, uploading: false } : p)
        );
      } catch {
        setAttachments(prev => prev.filter(p => p.id !== att.id));
        alert("Tải ảnh lỗi rồi mẹ ơi 😥");
      }
    });
  };

  const finalizeSubmission = async (user: User) => {
    if (attachments.some(a => a.uploading)) {
      alert("Ảnh đang tải, mẹ đợi xíu nhé ⏳");
      return;
    }

    setIsSubmitting(true);
    try {
      const images = attachments.map(a => a.url).filter(Boolean) as string[];

      await onAddQuestion({
        id: Date.now().toString(),
        title,
        content,
        category,
        author: user,
        answers: [],
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        images
      });

      alert("🎉 Câu hỏi đã được đăng! Mẹ chờ tư vấn nhé 💕");
      navigate('/');
    } catch {
      setShowAuthModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) return;

    if (currentUser.isGuest) {
      const guest = await loginAnonymously();
      finalizeSubmission(guest);
    } else {
      finalizeSubmission(currentUser);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-safe-bottom">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={onLogin}
        onRegister={onRegister}
        onGoogleLogin={onGoogleLogin}
        onGuestContinue={() => setShowAuthModal(false)}
      />

      {/* HEADER */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft size={24} />
          </button>
          <span className="font-bold">Đặt câu hỏi</span>
          <div className="w-8" />
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 max-w-3xl mx-auto px-4 py-5 space-y-6 pb-32">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Mẹ đang băn khoăn điều gì?"
          className="w-full text-2xl font-bold outline-none"
        />
        <p className="text-xs text-gray-400">
          Tiêu đề rõ ràng giúp mẹ nhận được nhiều tư vấn hơn ❤️
        </p>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Mô tả chi tiết để chuyên gia và các mẹ hiểu rõ hơn nhé..."
          className="w-full resize-none outline-none text-base"
        />

        {content.length > 100 && (
          <p className="text-xs text-green-600">✔ Nội dung đã khá đầy đủ rồi mẹ ơi</p>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <label className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center">
            <ImageIcon />
            <input type="file" hidden multiple onChange={handleImageChange} />
          </label>

          <button
            disabled={!title || !content || isSubmitting}
            onClick={handleSubmit}
            className="flex-1 bg-primary text-white rounded-full font-bold"
          >
            {isSubmitting ? "Đang đăng..." : "Đăng câu hỏi"}
          </button>
        </div>

        {(!title || !content) && (
          <p className="text-xs text-gray-400 text-center mt-1">
            Mẹ nhập tiêu đề và nội dung để đăng nhé 🌸
          </p>
        )}
      </div>
    </div>
  );
};
