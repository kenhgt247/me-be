import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, X, Image as ImageIcon, Loader2, ChevronDown, Check,
  Tag, Baby, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Plus,
  Link as LinkIcon, ArrowLeft, Send, AlertCircle, CheckCircle2, Eye
} from 'lucide-react';

import { Question, User } from '../types';
import { suggestTitles, generateQuestionContent } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
import { uploadFile } from '../services/storage';
import { loginAnonymously } from '../services/auth';
import { fetchCategories, addCategory } from '../services/admin';

// --- CONFIGURATION & CONSTANTS ---
const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string, border: string }> = {
  "Mang thai": { icon: Baby, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20", border: "border-pink-100 dark:border-pink-900/30" },
  "Dinh dưỡng": { icon: Utensils, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-100 dark:border-green-900/30" },
  "Sức khỏe": { icon: Stethoscope, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-900/30" },
  "0-1 tuổi": { icon: Smile, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-100 dark:border-indigo-900/30" },
  "1-3 tuổi": { icon: Smile, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-100 dark:border-indigo-900/30" },
  "Tâm lý": { icon: Brain, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-900/30" },
  "Giáo dục": { icon: BookOpen, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-100 dark:border-yellow-900/30" },
  "Gia đình": { icon: Users, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-100 dark:border-teal-900/30" },
  "Default": { icon: Tag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-100 dark:border-orange-900/30" }
};

const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Mẹ & Bé": ["👶", "👧", "🧒", "🤰", "🤱", "🍼", "🧸", "🎈", "🎂", "💊"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪"]
};

const DRAFT_KEY = "ask_draft_v2";
const RECENT_CATS_KEY = "ask_recent_categories_v1";

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

const getCategoryStyle = (catName: string) => {
  const key = Object.keys(CATEGORY_CONFIG).find(k => catName.includes(k)) || "Default";
  return CATEGORY_CONFIG[key];
};

const ToastContainer = ({ toasts }: { toasts: ToastMessage[] }) => (
  <div className="fixed top-20 left-0 right-0 z-[110] flex flex-col items-center gap-2 pointer-events-none px-4">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl animate-slide-down backdrop-blur-md max-w-sm w-full pointer-events-auto border ${
        t.type === 'error' ? 'bg-red-50/90 text-red-600 border-red-100' : 
        t.type === 'success' ? 'bg-green-50/90 text-green-600 border-green-100' : 
        'bg-blue-50/90 text-blue-600 border-blue-100'
      }`}>
        {t.type === 'error' ? <AlertCircle size={18} /> : t.type === 'success' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
        <span className="text-sm font-bold">{t.message}</span>
      </div>
    ))}
  </div>
);

const PreviewImagesGrid = ({ images }: { images?: string[] }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  const containerClass = "mt-3 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shadow-inner";

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
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[2px]">+{count - 3}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export const Ask: React.FC<AskProps> = ({
  onAddQuestion, currentUser, categories, onAddCategory,
  onLogin, onRegister, onGoogleLogin
}) => {
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [allCategories, setAllCategories] = useState<string[]>(categories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories?.[0] || "Tất cả");
  const [customCategory, setCustomCategory] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const previewsRef = useRef<Set<string>>(new Set());

  const activeCategoryStyle = useMemo(() => getCategoryStyle(category), [category]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    const loadDynamicCategories = async () => {
      try {
        const dbCategories = await fetchCategories();
        const dbCategoryNames = dbCategories.map(c => c.name);
        const merged = Array.from(new Set([...(categories || []), ...dbCategoryNames]));
        setAllCategories(merged);
        if (!category && merged.length) setCategory(merged[0]);
      } catch (error) { console.error(error); }
    };
    loadDynamicCategories();
  }, [categories]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.content) setContent(d.content);
      if (d.category) setCategory(d.category);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, category }));
    }, 1000);
    return () => clearTimeout(t);
  }, [title, content, category]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const pushRecentCategory = (cat: string) => {
    try {
      const raw = localStorage.getItem(RECENT_CATS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const next = [cat, ...prev.filter((c: string) => c !== cat)].slice(0, 6);
      localStorage.setItem(RECENT_CATS_KEY, JSON.stringify(next));
    } catch (e) {}
  };

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
    return s;
  }, [titleLen, contentLen]);

  const qualityLabel = useMemo(() => {
    if (qualityScore >= 75) return { text: "Rất ổn", cls: "bg-green-500", txtCls: "text-green-600" };
    if (qualityScore >= 50) return { text: "Tạm ổn", cls: "bg-blue-500", txtCls: "text-blue-600" };
    return { text: "Cần chi tiết hơn", cls: "bg-orange-400", txtCls: "text-orange-600" };
  }, [qualityScore]);

  const handleAiSuggest = async () => {
    if (titleLen < 3) { showToast("Mẹ viết thêm vài từ để AI gợi ý nhé!", "error"); return; }
    setIsSuggesting(true);
    try {
      const results = await suggestTitles(title, content);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (e) { showToast("AI đang bận, mẹ thử lại sau nhé!", "error"); }
    finally { setIsSuggesting(false); }
  };

  const handleAiContent = async () => {
    if (!title || titleLen < 5) { showToast("Mẹ nhập tiêu đề trước nhé!", "error"); return; }
    if (contentLen > 50 && !window.confirm("AI sẽ viết đè nội dung cũ. Mẹ đồng ý không?")) return;
    setIsGeneratingContent(true);
    try {
      const aiContent = await generateQuestionContent(title);
      setContent(aiContent);
      showToast("AI đã hoàn thành bài viết!", "success");
    } catch (e) { showToast("AI đang bận rồi mẹ ơi!", "error"); }
    finally { setIsGeneratingContent(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (attachments.length + filesArray.length > 3) { showToast("Tối đa 3 ảnh thôi mẹ nhé!", "error"); return; }
      const newAttachments: Attachment[] = filesArray.map(file => {
        const preview = URL.createObjectURL(file);
        previewsRef.current.add(preview);
        return { id: Math.random().toString(36).substr(2, 9), file, preview, uploading: true };
      });
      setAttachments(prev => [...prev, ...newAttachments]);
      newAttachments.forEach(async (att) => {
        try {
          if (att.file.size > 12 * 1024 * 1024) throw new Error("Quá nặng");
          const url = await uploadFile(att.file, 'question_images');
          setAttachments(prev => prev.map(p => p.id === att.id ? { ...p, url, uploading: false } : p));
        } catch (e) {
          setAttachments(prev => prev.filter(p => p.id !== att.id));
          showToast("Lỗi tải ảnh, mẹ thử lại nhé!", "error");
        }
      });
    }
  };

  const removeImage = (id: string) => {
    const target = attachments.find(a => a.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleAddCustomCategory = async () => {
    const newCat = customCategory.trim();
    if (!newCat) return;
    if (allCategories.includes(newCat)) { setCategory(newCat); pushRecentCategory(newCat); setCustomCategory(''); setShowCategorySheet(false); return; }
    setIsAddingCategory(true);
    try {
      await addCategory(newCat);
      setAllCategories(prev => [...prev, newCat]);
      setCategory(newCat);
      pushRecentCategory(newCat);
      onAddCategory?.(newCat);
      setCustomCategory('');
      setShowCategorySheet(false);
      showToast("Đã thêm chủ đề mới!", "success");
    } catch (e) { setShowAuthModal(true); }
    finally { setIsAddingCategory(false); }
  };

  const insertAtCursor = (text: string) => {
    const input = textareaRef.current;
    if (!input) { setContent(prev => prev + text); return; }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    setContent(content.substring(0, start) + text + content.substring(end));
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const finalizeSubmission = async (user: User) => {
    if (!title.trim() || !content.trim()) { showToast("Mẹ đừng bỏ trống nội dung nhé!", "error"); return; }
    setIsSubmitting(true);
    try {
      const imageUrls = attachments.map(a => a.url).filter((u): u is string => !!u);
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
    } catch (e) { 
        if ((e as any)?.code === 'permission-denied') setShowAuthModal(true);
        else showToast("Lỗi hệ thống, mẹ thử lại nhé!", "error");
    }
    finally { setIsSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!titleOk || !contentOk) { showToast("Bài viết hơi ngắn, mẹ thêm chi tiết nhé!", "error"); return; }
    if (currentUser?.isGuest) {
      try {
        setIsSubmitting(true);
        const anon = await loginAnonymously();
        await finalizeSubmission(anon);
      } catch (e) { setShowAuthModal(true); }
      return;
    }
    await finalizeSubmission(currentUser);
  };

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return q ? allCategories.filter(c => c.toLowerCase().includes(q)) : allCategories;
  }, [allCategories, catSearch]);

  const recentCats = useMemo(() => {
    const raw = localStorage.getItem(RECENT_CATS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((c: string) => allCategories.includes(c)) : [];
  }, [allCategories]);
// CHÈN VÀO ĐÂY NÈ:
  const canTogglePreview = useMemo(() => {
    return title.trim().length > 0 || content.trim().length > 0 || attachments.length > 0;
  }, [title, content, attachments]);
  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg flex flex-col animate-fade-in relative transition-colors duration-300">
      <ToastContainer toasts={toasts} />
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)}
        onLogin={async (e, p) => { const u = await onLogin(e, p); await finalizeSubmission(u); }}
        onRegister={async (e, p, n) => { const u = await onRegister(e, p, n); await finalizeSubmission(u); }}
        onGoogleLogin={async () => { const u = await onGoogleLogin(); await finalizeSubmission(u); }}
        onGuestContinue={() => setShowAuthModal(false)} />

      {/* --- NÂNG CẤP HEADER --- */}
      <div className="w-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl sticky top-0 z-50 pt-safe-top border-b border-gray-100 dark:border-dark-border shadow-sm transition-all">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-90 transition-all text-gray-500">
            <X size={24} />
          </button>
          
          <div className="flex-1 flex flex-col items-center overflow-hidden px-2">
            <div className="h-1.5 w-full max-w-[120px] bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
              <div className={`h-full transition-all duration-500 ${qualityLabel.cls}`} style={{ width: `${qualityScore}%` }} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest truncate ${qualityLabel.txtCls}`}>
              {isPreview ? "Chế độ xem trước" : qualityLabel.text}
            </span>
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting || qualityScore < 25}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 rounded-full font-bold text-sm shadow-lg shadow-teal-600/20 disabled:opacity-30 transition-all active:scale-95 flex items-center gap-1.5">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Đăng <Send size={14} /></>}
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div ref={scrollContainerRef} className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 overflow-y-auto pb-[200px]">
        {!isPreview ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Category selection */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative">
                <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl border-2 border-white dark:border-slate-700 shadow-md object-cover" alt="Me" />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-dark-bg"></div>
              </div>
              <button onClick={() => setShowCategorySheet(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all border shadow-sm active:scale-95 ${activeCategoryStyle.bg} ${activeCategoryStyle.color} ${activeCategoryStyle.border}`}>
                {React.createElement(activeCategoryStyle.icon, { size: 14 })}
                {category}
                <ChevronDown size={14} className="opacity-50" />
              </button>
            </div>

            {/* Editor Card */}
            <div className="bg-white dark:bg-dark-card rounded-[2.5rem] p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-dark-border">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề câu hỏi</label>
                  <button onClick={handleAiSuggest} disabled={isSuggesting}
                    className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-orange-100 transition-all active:scale-95 border border-orange-100">
                    {isSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Gợi ý AI
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tiêu đề rõ ràng giúp mẹ nhận câu trả lời nhanh hơn..."
                  className="w-full text-xl md:text-2xl font-bold text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 border-none p-0 focus:ring-0 bg-transparent resize-none leading-tight"
                />
              </div>

              {showSuggestions && (
                <div className="mb-6 space-y-2 animate-slide-down">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setTitle(s); setShowSuggestions(false); }}
                      className="w-full text-left p-3 bg-orange-50/50 dark:bg-slate-800 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 border border-orange-100 dark:border-slate-700 hover:border-orange-300 transition-all active:scale-[0.98]">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="h-px bg-gray-50 dark:bg-slate-800 w-full my-6"></div>

              <div className="relative min-h-[250px]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                  {titleLen > 5 && !content && !isGeneratingContent && (
                    <button onClick={handleAiContent} className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-purple-100 border border-purple-100 animate-pulse shadow-sm">
                      <Sparkles size={12} /> AI viết hộ
                    </button>
                  )}
                </div>

                {isGeneratingContent && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-dark-card/90 z-20 flex flex-col items-center justify-center rounded-3xl backdrop-blur-sm">
                    <Loader2 size={32} className="animate-spin text-purple-600 mb-2" />
                    <span className="text-purple-600 font-black text-xs animate-pulse tracking-widest uppercase">AI đang soạn thảo...</span>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả cụ thể triệu chứng, độ tuổi của bé, thời gian mẹ gặp vấn đề..."
                  className="w-full text-base md:text-lg text-gray-800 dark:text-dark-text placeholder-gray-400 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed"
                />
              </div>

              {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pt-4 border-t border-gray-50 mt-4">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative w-24 h-24 shrink-0 rounded-[1.5rem] overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                      <img src={att.preview} className={`w-full h-full object-cover ${att.uploading ? 'opacity-40' : ''}`} alt="thumb" />
                      {att.uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={20} /></div>}
                      <button onClick={() => removeImage(att.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 active:scale-90 shadow-lg"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* --- PREVIEW MODE NÂNG CẤP --- */
          <div className="animate-in zoom-in-95 duration-300">
             <div className="bg-white dark:bg-dark-card p-6 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-3 mb-6">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-2xl object-cover" alt="Me" />
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{category}</p>
                  </div>
                  <div className="ml-auto bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Bản xem trước</div>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3 leading-tight">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed whitespace-pre-wrap">{content}</p>
                <PreviewImagesGrid images={attachments.map(a => a.url).filter(Boolean) as string[]} />
             </div>
             <div className="mt-6 p-5 bg-teal-50 dark:bg-teal-900/20 rounded-3xl border border-teal-100 dark:border-teal-900/30 flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm text-teal-600"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-sm font-bold text-teal-900 dark:text-teal-300 mb-1">Mọi thứ đã sẵn sàng!</p>
                  <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed font-medium opacity-80">Bài viết của mẹ trông rất chuyên nghiệp. Nhấn "Đăng" để gửi câu hỏi đến cộng đồng nhé.</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* --- NÂNG CẤP FLOATING TOOLBAR --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 transition-all duration-300 pointer-events-none">
        <div className="max-w-3xl mx-auto flex flex-col gap-3 pointer-events-auto">
          {/* Sub-panels dính trên Toolbar */}
          {!isPreview && showLinkInput && (
            <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-3xl p-3 shadow-2xl flex gap-2 animate-slide-up">
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Dán đường link..."
                className="flex-1 text-sm bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-400/20 text-gray-900 dark:text-white" autoFocus />
              <button onClick={handleInsertLink} className="bg-blue-600 text-white px-4 py-2 rounded-2xl font-bold text-xs active:scale-95 transition-all">Chèn</button>
            </div>
          )}

          {!isPreview && showStickers && (
            <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-gray-100 dark:border-slate-800 rounded-[2rem] p-4 shadow-2xl max-h-[250px] overflow-y-auto animate-slide-up no-scrollbar">
              {Object.entries(STICKER_PACKS).map(([cat, emojis]) => (
                <div key={cat} className="mb-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{cat}</h4>
                  <div className="grid grid-cols-5 gap-4">
                    {emojis.map(e => (
                      <button key={e} onClick={() => handleInsertSticker(e)} className="text-4xl hover:scale-125 transition-transform active:scale-90">{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CHÍNH: Floating Bar */}
          <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-2xl border border-gray-100 dark:border-slate-800 rounded-[2rem] px-3 py-2 shadow-2xl flex items-center justify-between transition-all">
            <div className="flex items-center gap-1">
              <label className={`p-3 rounded-2xl cursor-pointer active:scale-90 transition-all ${attachments.length >= 3 ? 'opacity-20' : 'text-teal-600 bg-teal-50 dark:bg-teal-900/30'}`}>
                <ImageIcon size={22} /><input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" disabled={isPreview || attachments.length >= 3} />
              </label>
              <button onClick={() => { setShowStickers(!showStickers); setShowLinkInput(false); }} disabled={isPreview}
                className={`p-3 rounded-2xl active:scale-90 transition-all ${showStickers ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <Smile size={22} />
              </button>
              <button onClick={() => { setShowLinkInput(!showLinkInput); setShowStickers(false); }} disabled={isPreview}
                className={`p-3 rounded-2xl active:scale-90 transition-all ${showLinkInput ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <LinkIcon size={22} />
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-800 mx-2" />
              <button onClick={() => setIsPreview(!isPreview)} disabled={!canTogglePreview}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isPreview ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                {isPreview ? <ArrowLeft size={14} /> : <Eye size={14} />} {isPreview ? "Sửa" : "Xem thử"}
              </button>
            </div>

            <button onClick={handleSubmit} disabled={isSubmitting || qualityScore < 25}
              className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/40 active:scale-90 transition-all disabled:opacity-20">
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- DANH MỤC SHEET --- */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCategorySheet(false)}></div>
          <div className="bg-white dark:bg-dark-card rounded-t-[3rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6 shrink-0"></div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white mb-6 text-center tracking-tight">Chọn chủ đề phù hợp</h3>

            <div className="mb-6 shrink-0 relative">
               <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Tìm kiếm nhanh chủ đề..."
                className="w-full p-4 pl-12 bg-gray-50 dark:bg-slate-800 border-none rounded-3xl focus:ring-2 focus:ring-teal-500/20 text-gray-900 dark:text-white" />
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>

            <div className="overflow-y-auto no-scrollbar flex-1 pb-10">
              {recentCats.length > 0 && !catSearch && (
                <div className="mb-6">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Dùng gần đây</div>
                  <div className="flex flex-wrap gap-2">
                    {recentCats.map(c => (
                      <button key={c} onClick={() => { setCategory(c); setShowCategorySheet(false); }}
                        className="px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-300 active:scale-95 transition-all">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-6">
                <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Thêm chủ đề mới của mẹ..."
                  className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-gray-900 dark:text-white" />
                <button onClick={handleAddCustomCategory} disabled={!customCategory.trim() || isAddingCategory}
                  className="bg-gray-900 text-white px-6 rounded-2xl font-black active:scale-95 disabled:opacity-30">
                  {isAddingCategory ? <Loader2 className="animate-spin" size={20}/> : <Plus size={24} />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCategories.map(cat => {
                  const style = getCategoryStyle(cat);
                  const isSelected = category === cat;
                  return (
                    <button key={cat} onClick={() => { setCategory(cat); setShowCategorySheet(false); }}
                      className={`p-4 rounded-[1.75rem] border text-left transition-all active:scale-[0.98] flex items-center gap-4 ${isSelected ? `border-teal-500 bg-teal-50/50` : 'border-gray-50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${style.bg} ${style.color}`}>
                        {React.createElement(style.icon, { size: 20 })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`block font-black text-sm truncate ${isSelected ? 'text-teal-700' : 'text-gray-800 dark:text-white'}`}>{cat}</span>
                        {isSelected && <span className="text-[10px] text-teal-600 font-black flex items-center gap-1 mt-1 uppercase tracking-tighter"><Check size={10} /> Đang chọn</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
