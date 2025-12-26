import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  Check,
  Tag,
  Baby,
  Utensils,
  Brain,
  BookOpen,
  Users,
  Stethoscope,
  Smile,
  Plus,
  Link as LinkIcon,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  Eye
} from 'lucide-react';

import { Question, User } from '../types';
import { suggestTitles, generateQuestionContent } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
import { uploadFile } from '../services/storage';
import { loginAnonymously } from '../services/auth';
import { fetchCategories, addCategory } from '../services/admin';

// =========================
// CONFIGURATION & CONSTANTS
// =========================
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  'Mang thai': {
    icon: Baby,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-100 dark:border-pink-900/30'
  },
  'Dinh dưỡng': {
    icon: Utensils,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-100 dark:border-green-900/30'
  },
  'Sức khỏe': {
    icon: Stethoscope,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-100 dark:border-blue-900/30'
  },
  '0-1 tuổi': {
    icon: Smile,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-100 dark:border-indigo-900/30'
  },
  '1-3 tuổi': {
    icon: Smile,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-100 dark:border-indigo-900/30'
  },
  'Tâm lý': {
    icon: Brain,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-100 dark:border-purple-900/30'
  },
  'Giáo dục': {
    icon: BookOpen,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-100 dark:border-yellow-900/30'
  },
  'Gia đình': {
    icon: Users,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-100 dark:border-teal-900/30'
  },
  Default: {
    icon: Tag,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-100 dark:border-orange-900/30'
  }
};

const STICKER_PACKS: Record<string, string[]> = {
  'Cảm xúc': ['😀', '😂', '🥰', '😎', '😭', '😡', '😱', '🥳', '😴', '🤔'],
  'Yêu thương': ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💝', '💋', '💌'],
  'Mẹ & Bé': ['👶', '👧', '🧒', '🤰', '🤱', '🍼', '🧸', '🎈', '🎂', '💊'],
  'Động vật': ['🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸'],
  'Đồ ăn': ['🍎', '🍌', '🍉', '🍓', '🥕', '🌽', '🍕', '🍔', '🍦', '🍪']
};

const DRAFT_KEY = 'ask_draft_v2';
const RECENT_CATS_KEY = 'ask_recent_categories_v1';

// =========================
// TYPES
// =========================
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

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// =========================
// HELPERS (NO DEPENDENCIES)
// =========================
const getCategoryStyle = (catName: string) => {
  const key = Object.keys(CATEGORY_CONFIG).find((k) => catName.includes(k)) || 'Default';
  return CATEGORY_CONFIG[key];
};

function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handle = () => {
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(keyboard);
    };

    handle();
    vv.addEventListener('resize', handle);
    vv.addEventListener('scroll', handle);
    window.addEventListener('orientationchange', handle);
      vv.removeEventListener('scroll', handle);
      window.removeEventListener('orientationchange', handle);
    };
  }, []);

  return inset;
}

function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 1200) {
  const cbRef = useRef(cb);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => cbRef.current(...args), delay);
    },
    [delay]
  ) as T;
}

// =========================
// UI COMPONENTS
// =========================
const ToastContainer = ({ toasts }: { toasts: ToastMessage[] }) => (
  <div className="fixed top-4 left-0 right-0 z-[110] flex flex-col items-center gap-2 pointer-events-none px-4">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg shadow-black/5 animate-slide-down backdrop-blur-md max-w-sm w-full pointer-events-auto border ${
          t.type === 'error'
            ? 'bg-red-50/90 dark:bg-red-900/80 text-red-600 dark:text-red-200 border-red-100 dark:border-red-800'
            : t.type === 'success'
              ? 'bg-green-50/90 dark:bg-green-900/80 text-green-600 dark:text-green-200 border-green-100 dark:border-green-800'
              : 'bg-blue-50/90 dark:bg-blue-900/80 text-blue-600 dark:text-blue-200 border-blue-100 dark:border-blue-800'
        }`}
      >
        {t.type === 'error' ? (
          <AlertCircle size={18} />
        ) : t.type === 'success' ? (
          <CheckCircle2 size={18} />
        ) : (
          <Sparkles size={18} />
        )}
        <span className="text-sm font-medium">{t.message}</span>
      </div>
    ))}
  </div>
);

const PreviewImagesGrid = ({ images }: { images?: string[] }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  const containerClass =
    'mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800';

  const Img = ({ src }: { src: string }) => (
    <img src={src} alt="Preview" className="w-full h-full object-cover" loading="lazy" />
  );

  if (count === 1) return <div className={`${containerClass} aspect-video`}><Img src={images[0]} /></div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 aspect-[2/1]`}><Img src={images[0]} /><Img src={images[1]} /></div>;

  return (
    <div className={`${containerClass} grid grid-cols-3 gap-1 aspect-[3/1]`}>
      {images.slice(0, 3).map((img, idx) => (
        <div key={idx} className="relative w-full h-full">
          <Img src={img} />
          {idx === 2 && count > 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[2px]">
              +{count - 3}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// =========================
// MAIN COMPONENT
// =========================
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewsRef = useRef<Set<string>>(new Set());

  const keyboardInset = useKeyboardInset();

  // Core states
  const [allCategories, setAllCategories] = useState<string[]>(categories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories?.[0] || 'Tất cả');
  const [customCategory, setCustomCategory] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // AI
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Tool panels
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Category sheet
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  // Auth + submit
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Preview mode
  const [isPreview, setIsPreview] = useState(false);

  // UX focus mode
  const [isTyping, setIsTyping] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const activeCategoryStyle = useMemo(() => getCategoryStyle(category), [category]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // =========
  // LOAD CATS
  // =========
  useEffect(() => {
    const loadDynamicCategories = async () => {
      try {
        const dbCategories = await fetchCategories();
        const dbCategoryNames = dbCategories.map((c: any) => c.name);
        const merged = Array.from(new Set([...(categories || []), ...dbCategoryNames]));
        setAllCategories(merged);
        if (!category && merged.length) setCategory(merged[0]);
      } catch (error) {
        console.error('Lỗi tải danh mục:', error);
      }
    };
    loadDynamicCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // ==========================
  // AUTOSIZE CONTENT TEXTAREA
  // ==========================
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // ====================
  // CLEANUP OBJECT URLS
  // ====================
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewsRef.current.clear();
    };
  }, []);

  // ==========
  // DRAFT LOAD
  // ==========
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d?.title === 'string') setTitle(d.title);
      if (typeof d?.content === 'string') setContent(d.content);
      if (typeof d?.category === 'string') setCategory(d.category);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================
  // DRAFT SAVE (STRONG DEBOUNCE)
  // ==========================
  const saveDraftDebounced = useDebouncedCallback(
    (next: { title: string; content: string; category: string }) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...next, updatedAt: Date.now() }));
      } catch {
        // ignore
      }
    },
    1200
  );

  useEffect(() => {
    saveDraftDebounced({ title, content, category });
  }, [title, content, category, saveDraftDebounced]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  };

  // ==========================
  // RECENT CATEGORIES
  // ==========================
  const getRecentCategories = (): string[] => {
    try {
      const raw = localStorage.getItem(RECENT_CATS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      return [];
    }
  };

  const pushRecentCategory = (cat: string) => {
    try {
      const prev = getRecentCategories();
      const next = [cat, ...prev.filter((c) => c !== cat)].slice(0, 6);
      localStorage.setItem(RECENT_CATS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // ==========================
  // QUALITY / GAMIFICATION
  // ==========================
  const titleLen = title.trim().length;
  const contentLen = content.trim().length;

  const titleOk = titleLen >= 15;
  const contentOk = contentLen >= 40;

  const qualityScore = useMemo(() => {
    let s = 0;
    if (titleLen >= 8) s += 25;
    if (titleLen >= 15) s += 25;
    if (contentLen >= 40) s += 25;
    if (contentLen >= 120) s += 25;
    return Math.min(100, s);
  }, [titleLen, contentLen]);

  const qualityAdvice = useMemo(() => {
    if (!title.trim()) return 'Mẹ nhập tiêu đề trước để mọi người hiểu câu hỏi nhanh nhé.';
    if (!titleOk) return 'Mẹ viết tiêu đề rõ hơn (≥ 15 ký tự) để nhận trả lời đúng trọng tâm.';
    if (!content.trim()) return 'Mẹ mô tả chi tiết: độ tuổi, thời gian, triệu chứng, đã làm gì...';
    if (!contentOk) return 'Mẹ thêm độ tuổi, thời gian, triệu chứng và đã làm gì để được tư vấn đúng hơn.';
    if (attachments.length === 0) return 'Mẹ ơi, nếu phù hợp hãy thêm 1 tấm ảnh — bác sĩ/mẹ bỉm tư vấn kỹ hơn đó!';
    if (contentLen < 120) return 'Mẹ thêm 1–2 chi tiết nữa (ăn ngủ, thuốc đã dùng...) để câu trả lời sát hơn nhé.';
    return 'Quá ổn rồi ✅ Mẹ có thể xem trước và đăng câu hỏi nhé.';
  }, [titleOk, contentOk, attachments.length, contentLen, title, content]);

  const qualityLabel = useMemo(() => {
    if (qualityScore >= 75)
      return {
        text: 'Rất ổn',
        cls: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30'
      };
    if (qualityScore >= 50)
      return {
        text: 'Tạm ổn',
        cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
      };
    return {
      text: 'Cần thêm',
      cls: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30'
    };
  }, [qualityScore]);

  // Focus experience
  const handleFocusStart = () => {
    setIsTyping(true);
    setShowTips(false);
    setShowStickers(false);
    setShowLinkInput(false);
    setShowSuggestions(false);
  };

  const handleFocusEnd = () => {
    window.setTimeout(() => setIsTyping(false), 180);
  };

  // ==========
  // AI HANDLERS
  // ==========
  const handleAiSuggest = async () => {
    if (titleLen < 3) {
      showToast('Mẹ ơi, viết thêm vài từ để AI hiểu ý nhé!', 'error');
      return;
    }
    setIsSuggesting(true);
    try {
      const results = await suggestTitles(title, content);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch {
      showToast('AI đang bận, mẹ thử lại sau nhé!', 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAiContent = async () => {
    if (!title || titleLen < 5) {
      showToast('Mẹ nhập tiêu đề rõ ràng trước (≥ 5 ký tự) nhé!', 'error');
      return;
    }
    if (contentLen > 50 && !window.confirm('AI sẽ viết đè lên nội dung hiện tại. Mẹ đồng ý không?')) return;

    setIsGeneratingContent(true);
    try {
      const aiContent = await generateQuestionContent(title);
      setContent(aiContent);
      showToast('AI đã viết xong nội dung cho mẹ!', 'success');
    } catch (error: any) {
      if (String(error?.message || '').includes('429')) showToast('Hệ thống quá tải. Mẹ thử lại sau nhé!', 'error');
      else showToast('Có lỗi khi gọi AI.', 'error');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // ==========================
  // IMAGE UPLOAD
  // ==========================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    // reset input để chọn lại cùng file vẫn trigger change
    try {
      e.target.value = '';
    } catch {
      // ignore
    }

    if (attachments.length + filesArray.length > 3) {
      showToast('Chỉ được đăng tối đa 3 ảnh thôi mẹ nhé!', 'error');
      return;
    }

    const newAttachments: Attachment[] = filesArray.map((file) => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.add(preview);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        uploading: true
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    newAttachments.forEach(async (att) => {
      try {
        if (att.file.size > 12 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
        const url = await uploadFile(att.file, 'question_images');
        setAttachments((prev) => prev.map((p) => (p.id === att.id ? { ...p, url, uploading: false } : p)));
      } catch (error: any) {
        setAttachments((prev) => prev.filter((p) => p.id !== att.id));
        if (att.preview) {
          try {
            URL.revokeObjectURL(att.preview);
          } catch {
            // ignore
          }
          previewsRef.current.delete(att.preview);
        }
        if (error?.message === 'FILE_TOO_LARGE') showToast('Ảnh hơi nặng (>12MB). Mẹ chọn ảnh nhỏ hơn nhé.', 'error');
        else showToast('Không tải được ảnh lên, mẹ thử lại nhé.', 'error');
      }
    });
  };

  const removeImage = (id: string) => {
    const target = attachments.find((a) => a.id === id);
    if (target?.preview) {
      try {
        URL.revokeObjectURL(target.preview);
      } catch {
        // ignore
      }
      previewsRef.current.delete(target.preview);
    }
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  // ==========================
  // ADD CATEGORY
  // ==========================
  const handleAddCustomCategory = async () => {
    const newCat = customCategory.trim();
    if (!newCat) return;

    if (allCategories.includes(newCat)) {
      setCategory(newCat);
      pushRecentCategory(newCat);
      setCustomCategory('');
      setShowCategorySheet(false);
      return;
    }

    setIsAddingCategory(true);
    try {
      await addCategory(newCat);
      setAllCategories((prev) => [...prev, newCat]);
      setCategory(newCat);
      pushRecentCategory(newCat);
      onAddCategory?.(newCat);
      setCustomCategory('');
      setShowCategorySheet(false);
      showToast('Đã thêm chủ đề mới!', 'success');
    } catch (error) {
      console.error('Lỗi thêm danh mục:', error);
      showToast('Không thêm được chủ đề. Bạn cần đăng nhập!', 'error');
      if (!currentUser?.id) setShowAuthModal(true);
    } finally {
      setIsAddingCategory(false);
    }
  };

  // ==========================
  // INSERT UTILITIES
  // ==========================
  const insertAtCursor = (textToInsert: string) => {
    const input = textareaRef.current;
    if (!input) {
      setContent((prev) => prev + textToInsert);
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = content;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setContent(before + textToInsert + after);
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleInsertLink = () => {
    if (!linkUrl) {
      setShowLinkInput(false);
      return;
    }
    let safeUrl = linkUrl.trim();
    if (!safeUrl) {
      setShowLinkInput(false);
      return;
    }
    if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
    insertAtCursor(` ${safeUrl} `);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleInsertSticker = (sticker: string) => {
    insertAtCursor(sticker);
  };

  // ==========================
  // VALIDATION + SUBMIT
  // ==========================
  const validateBeforePreviewOrSubmit = () => {
    if (!title.trim() || !content.trim()) {
      showToast('Mẹ ơi, đừng để trống tiêu đề hoặc nội dung nhé!', 'error');
      return false;
    }
    if (!titleOk) {
      showToast(`Tiêu đề hơi ngắn. Mẹ viết rõ hơn (≥ 15 ký tự) nhé! (${titleLen}/15)`, 'error');
      return false;
    }
    if (!contentOk) {
      showToast(`Nội dung hơi ngắn. Mẹ mô tả thêm nhé! (${contentLen}/40)`, 'error');
      return false;
    }
    if (attachments.some((a) => a.uploading)) {
      showToast('Ảnh đang tải lên, mẹ đợi xíu nhé!', 'info');
      return false;
    }
    return true;
  };

  const finalizeSubmission = async (user: User) => {
    if (!validateBeforePreviewOrSubmit()) return;

    setIsSubmitting(true);
    try {
      const imageUrls = attachments.map((a) => a.url).filter((url): url is string => !!url);

      const newQuestion: Question = {
        id: Date.now().toString(),
        title: title.trim(),
        content: content.trim(),
        category,
        author: user,
        answers: [],
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        images: imageUrls.length ? imageUrls : undefined
      } as any;

      await onAddQuestion(newQuestion);

      pushRecentCategory(category);
      clearDraft();
      navigate('/');
    } catch (error: any) {
      if (error?.code === 'permission-denied') setShowAuthModal(true);
      else showToast('Có lỗi lạ quá. Mẹ thử lại sau nhé!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateBeforePreviewOrSubmit()) return;

    // guest -> login anonymous trước
    if ((currentUser as any)?.isGuest) {
      try {
        setIsSubmitting(true);
        const anonymousUser = await loginAnonymously();
        await finalizeSubmission(anonymousUser);
      } catch {
        setShowAuthModal(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    await finalizeSubmission(currentUser);
  };

  const handleEmailLogin = async (e: string, p: string) => {
    const u = await onLogin(e, p);
    await finalizeSubmission(u);
  };

  const handleRegister = async (e: string, p: string, n: string) => {
    const u = await onRegister(e, p, n);
    await finalizeSubmission(u);
  };

  const handleGoogleAuth = async () => {
    const u = await onGoogleLogin();
    await finalizeSubmission(u);
  };

  const handleGuestContinue = async () => {
    try {
      await loginAnonymously();
      showToast('Bạn đang dùng chế độ Khách ẩn danh ✅', 'success');
    } catch {
      showToast('Không thể vào chế độ khách. Mẹ thử lại nhé!', 'error');
    } finally {
      setShowAuthModal(false);
    }
  };

  // ==========================
// ==========================
  // CATEGORY FILTERING
  // ==========================
  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return allCategories;
    return allCategories.filter((c) => c.toLowerCase().includes(q));
  }, [allCategories, catSearch]);

  const recentCats = useMemo(
    () => getRecentCategories().filter((c) => allCategories.includes(c)),
    [allCategories]
  );

  // UI guards - Xác định điều kiện để nút Xem trước sáng lên
  const canTogglePreview = title.trim().length > 0 || content.trim().length > 0 || attachments.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col animate-fade-in relative transition-colors duration-300">
      <ToastContainer toasts={toasts} />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleEmailLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleAuth}
        onGuestContinue={handleGuestContinue}
      />

      {/* =========================
          HEADER (Progress + Advice)
         ========================= */}
      <div className="w-full bg-white/95 dark:bg-dark-card/95 backdrop-blur-md sticky top-0 z-30 pt-safe-top border-b border-gray-50 dark:border-dark-border shadow-sm transition-colors">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300 active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-lg text-gray-800 dark:text-white truncate">
              {isPreview ? 'Xem trước' : 'Đặt câu hỏi'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${qualityLabel.cls}`}>
              {qualityLabel.text}
            </span>
          </div>

          <button
            disabled={!canTogglePreview}
            onClick={() => {
              if (!isPreview) {
                const ok = validateBeforePreviewOrSubmit();
                if (!ok) return;
              }
              setIsPreview((p) => !p);
              setShowStickers(false);
              setShowLinkInput(false);
              setShowSuggestions(false);
              setShowTips(false);
            }}
            className={`px-3 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 ${
              canTogglePreview
                ? isPreview
                  ? 'bg-gray-900 text-white border-gray-900 hover:bg-black'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
            }`}
          >
            {isPreview ? 'Chỉnh sửa' : 'Xem trước'}
          </button>
        </div>

        {/* Progress + Advice under header (ẩn khi đang gõ để đỡ xao nhãng) */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#25A99C] transition-all duration-500"
              style={{ width: `${qualityScore}%` }}
            />
          </div>

          {!isTyping && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 line-clamp-1">
                {qualityAdvice}
              </p>
              <button
                type="button"
                onClick={() => setShowTips((v) => !v)}
                className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-200 active:scale-95"
              >
                {showTips ? 'Ẩn mẹo' : 'Mẹo'}
              </button>
            </div>
          )}

          {!isTyping && showTips && !isPreview && (
            <div className="mt-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 p-3">
              <ul className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1 leading-relaxed list-disc pl-4">
                <li>Nêu rõ <b>độ tuổi</b>, <b>thời gian</b>, <b>triệu chứng</b>, <b>đã làm gì</b>.</li>
                <li>Đính kèm ảnh (nếu cần), tránh ảnh quá nặng.</li>
                <li>Không chia sẻ thông tin riêng tư của bé.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* =========================
          MAIN
         ========================= */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 overflow-y-auto pb-[190px]">
        {!isPreview ? (
          <>
            {/* User & Category Selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={(currentUser as any)?.avatar}
                  className="w-12 h-12 rounded-full border border-gray-100 dark:border-slate-700 object-cover shadow-sm"
                  alt="Avatar"
                />
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    {(currentUser as any)?.name || 'Bạn'}
                  </div>
                  <button
                    onClick={() => setShowCategorySheet(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm active:scale-95 ${activeCategoryStyle.bg} ${activeCategoryStyle.color} ${activeCategoryStyle.border}`}
                  >
                    {React.createElement(activeCategoryStyle.icon, { size: 14 })}
                    {category}
                    <ChevronDown size={14} className="opacity-70" />
                  </button>
                </div>
              </div>

              <div className={`text-[10px] font-bold px-3 py-1 rounded-full border ${qualityLabel.cls}`}>
                {qualityScore}%
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-6">
              {/* Title Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
                    Tiêu đề
                  </label>
                  <button
                    onClick={handleAiSuggest}
                    disabled={isSuggesting}
                    className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all border border-orange-100 dark:border-orange-900/30 active:scale-95 disabled:opacity-50"
                  >
                    {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {isSuggesting ? 'AI đang nghĩ...' : 'Gợi ý tiêu đề'}
                  </button>
                </div>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={handleFocusStart}
                  onBlur={handleFocusEnd}
                  placeholder="VD: Bé 6 tháng tuổi bị sốt, mẹ nên làm gì?... "
                  className="w-full text-xl md:text-2xl font-bold text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none p-0 focus:ring-0 bg-transparent leading-tight"
                  autoFocus
                />

                <div className="flex items-center justify-between text-[11px]">
                  <span className={`${titleOk ? 'text-green-600' : 'text-gray-400'} font-bold`}>
                    {titleOk ? '✅ Tiêu đề ổn' : `Gợi ý: ≥ 15 ký tự (${titleLen}/15)`}
                  </span>
                  <span className="text-gray-300 font-bold">{titleLen} ký tự</span>
                </div>
              </div>

              {/* AI Suggestions Dropdown */}
              {showSuggestions && (
                <div className="bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 border border-orange-100 dark:border-slate-700 animate-slide-down shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      <Sparkles size={14} /> Gợi ý từ AI
                    </h4>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="p-1 hover:bg-orange-100 dark:hover:bg-slate-700 rounded-full"
                    >
                      <X size={16} className="text-orange-400" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTitle(s);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-white dark:bg-dark-card rounded-xl text-sm font-medium text-gray-700 dark:text-slate-200 border border-orange-100 dark:border-slate-700 shadow-sm active:scale-[0.99] transition-transform hover:border-orange-300 dark:hover:border-slate-500 hover:text-orange-700 dark:hover:text-white"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px bg-gray-100 dark:bg-dark-border w-full"></div>

              {/* Main Content Section */}
              <div className="relative min-h-[200px] group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
                    Nội dung chi tiết
                  </label>
                  {titleLen > 5 && !content && !isGeneratingContent && (
                    <button
                      onClick={handleAiContent}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all border border-purple-100 dark:border-purple-900/30 shadow-sm animate-fade-in active:scale-95"
                    >
                      <Sparkles size={14} /> AI Viết hộ
                    </button>
                  )}
                </div>

                <div className="relative w-full">
                  {isGeneratingContent && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-[1px]">
                      <Loader2 size={24} className="animate-spin text-purple-600 dark:text-purple-400 mb-2" />
                      <span className="text-purple-600 dark:text-purple-400 font-bold text-sm animate-pulse">
                        AI đang viết, mẹ đợi xíu nhé...
                      </span>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={handleFocusStart}
                    onBlur={handleFocusEnd}
                    placeholder="Mô tả kỹ hơn về tình trạng của bé hoặc vấn đề mẹ đang gặp..."
                    className="w-full text-base md:text-lg text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-600 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed min-h-[200px]"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] mt-2">
                  <span className={`${contentOk ? 'text-green-600' : 'text-gray-400'} font-bold`}>
                    {contentOk ? '✅ Nội dung ổn' : `Gợi ý: ≥ 40 ký tự (${contentLen}/40)`}
                  </span>
                  <span className="text-gray-300 font-bold">{contentLen} ký tự</span>
                </div>
              </div>

              {/* Image Previews */}
              {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 no-scrollbar">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-dark-border group bg-gray-50 dark:bg-slate-700"
                    >
                      <img
                        src={att.preview}
                        className={`w-full h-full object-cover transition-opacity ${att.uploading ? 'opacity-50' : 'opacity-100'}`}
                        alt="preview"
                      />
                      {att.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="animate-spin text-[#25A99C]" size={24} />
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(att.id)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm active:scale-90 transition-transform hover:bg-black/80"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          // ==========================
          // PREVIEW MODE
          // ==========================
          <div className="space-y-4">
            <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 dark:border-slate-700 shrink-0">
                    <img
                      src={(currentUser as any)?.avatar}
                      alt={(currentUser as any)?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">
                      {(currentUser as any)?.name || 'Bạn'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">{new Date().toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg">
                  {category}
                </span>
              </div>

              <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1.5 leading-snug">
                {title.trim()}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {content.trim()}
              </p>

              <PreviewImagesGrid images={attachments.map((a) => a.url).filter(Boolean) as string[]} />

              <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800/50 mt-4">
                <div className="flex items-center gap-5 text-xs font-bold text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Eye size={16} /> 0
                  </span>
                  <span className="flex items-center gap-1.5">❤️ 0</span>
                  <span className="flex items-center gap-1.5">💬 0</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                  Preview
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-dark-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">Sẵn sàng đăng?</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Nếu cần, bấm <b>Chỉnh sửa</b> để thêm thông tin (độ tuổi, thời gian, triệu chứng…). Bài càng rõ thì
                    càng dễ được trả lời đúng trọng tâm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          TOOLBAR (FLOAT ABOVE KEYBOARD)
         ========================= */}
      <div
        className="fixed left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border px-4 py-3 pb-safe-bottom z-40 shadow-[0_-5px_25px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors"
        style={{ bottom: keyboardInset }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {!isPreview && showLinkInput && (
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-2 flex gap-2 animate-slide-up mb-2 backdrop-blur-sm">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Dán đường link vào đây..."
                className="flex-1 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-gray-900 dark:text-white"
                autoFocus
              />
              <button
                onClick={handleInsertLink}
                className="bg-blue-600 text-white text-xs font-bold px-4 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
              >
                Chèn
              </button>
              <button
                onClick={() => setShowLinkInput(false)}
                className="text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {!isPreview && showStickers && (
            <div className="h-48 overflow-y-auto bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl p-3 animate-slide-up mb-2 shadow-lg scroll-smooth">
              {Object.entries(STICKER_PACKS).map(([cat, emojis]) => (
                <div key={cat} className="mb-4 last:mb-0">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-white dark:bg-dark-card py-1">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-6 gap-3">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleInsertSticker(emoji)}
                        className="text-3xl hover:scale-125 transition-transform p-1 active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {/* Left: tools */}
            <div className="flex items-center gap-2">
              <label
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                  isPreview
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400'
                    : attachments.length >= 3
                      ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                <ImageIcon size={24} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isPreview || attachments.length >= 3}
                />
              </label>

              <button
                onClick={() => {
                  setShowStickers(!showStickers);
                  setShowLinkInput(false);
                }}
                disabled={isPreview}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
                  isPreview
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400'
                    : showStickers
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400'
                      : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <Smile size={24} />
              </button>

              <button
                onClick={() => {
                  setShowLinkInput(!showLinkInput);
                  setShowStickers(false);
                }}
                disabled={isPreview}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
                  isPreview
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400'
                    : showLinkInput
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                <LinkIcon size={24} />
              </button>
            </div>

            {/* Right: submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || attachments.some((a) => a.uploading) || !title.trim() || !content.trim()}
              className="flex-1 bg-[#25A99C] text-white h-12 rounded-2xl font-bold text-base shadow-lg shadow-[#25A99C]/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.97] flex items-center justify-center gap-2 hover:bg-[#1E8A7F]"
            >
              {isSubmitting ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <>
                  {isPreview ? 'Đăng bài ngay' : 'Đăng câu hỏi'}
                  <Send size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          CATEGORY SHEET (MODAL)
         ========================= */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowCategorySheet(false)}
          ></div>

          <div className="bg-white dark:bg-dark-card rounded-t-[2rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto transition-colors">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full mx-auto mb-6"></div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4 text-center">Chọn chủ đề câu hỏi</h3>

            <div className="mb-4">
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Gõ để tìm chủ đề..."
                className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#25A99C]/20 outline-none text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {recentCats.length > 0 && !catSearch.trim() && (
              <div className="mb-5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Chủ đề gần đây</div>
                <div className="flex flex-wrap gap-2">
                  {recentCats.map((c) => {
                    const style = getCategoryStyle(c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          pushRecentCategory(c);
                          setShowCategorySheet(false);
                        }}
                        className={`px-3 py-2 rounded-full border text-xs font-bold shadow-sm active:scale-95 transition-all ${style.bg} ${style.color} ${style.border}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Hoặc nhập chủ đề khác..."
                className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#25A99C]/20 outline-none text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                onClick={handleAddCustomCategory}
                disabled={!customCategory.trim() || isAddingCategory}
                className="bg-gray-900 dark:bg-slate-700 text-white px-5 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center"
              >
                {isAddingCategory ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
              {filteredCategories.map((cat) => {
                const style = getCategoryStyle(cat);
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      pushRecentCategory(cat);
                      setShowCategorySheet(false);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] flex items-center gap-4 ${
                      isSelected
                        ? `border-[#25A99C] bg-[#25A99C]/5 dark:bg-[#25A99C]/10 shadow-sm`
                        : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                      {React.createElement(style.icon, { size: 20 })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`block font-bold text-base truncate ${isSelected ? 'text-[#25A99C]' : 'text-gray-800 dark:text-white'}`}>
                        {cat}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-[#25A99C] font-medium flex items-center gap-1 mt-0.5">
                          <Check size={12} /> Đang chọn
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400 font-bold">
                  Không tìm thấy chủ đề phù hợp.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
