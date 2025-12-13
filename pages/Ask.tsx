import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, Image as ImageIcon, Loader2, ChevronDown, Check, 
  Tag, Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Plus,
  Link as LinkIcon, ArrowLeft, Send, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Question, User } from '../types';
import { suggestTitles, generateQuestionContent } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
import { uploadFile } from '../services/storage'; 
import { loginAnonymously } from '../services/auth';
// --- IMPORT MỚI: Thêm hàm addCategory để lưu danh mục người dùng tạo ---
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

// --- TYPES ---
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
  <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg shadow-black/5 animate-slide-down backdrop-blur-md max-w-sm w-full pointer-events-auto border ${
        t.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/80 text-red-600 dark:text-red-200 border-red-100 dark:border-red-800' : 
        t.type === 'success' ? 'bg-green-50/90 dark:bg-green-900/80 text-green-600 dark:text-green-200 border-green-100 dark:border-green-800' : 
        'bg-blue-50/90 dark:bg-blue-900/80 text-blue-600 dark:text-blue-200 border-blue-100 dark:border-blue-800'
      }`}>
        {t.type === 'error' ? <AlertCircle size={18} /> : 
         t.type === 'success' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
        <span className="text-sm font-medium">{t.message}</span>
      </div>
    ))}
  </div>
);

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
  
  const [allCategories, setAllCategories] = useState<string[]>(categories);
  const [isAddingCategory, setIsAddingCategory] = useState(false); // Loading state khi thêm danh mục

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const loadDynamicCategories = async () => {
      try {
        const dbCategories = await fetchCategories();
        const dbCategoryNames = dbCategories.map(c => c.name);
        const merged = Array.from(new Set([...categories, ...dbCategoryNames]));
        setAllCategories(merged);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    loadDynamicCategories();
  }, [categories]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);
  
  useEffect(() => {
    return () => attachments.forEach(att => URL.revokeObjectURL(att.preview));
  }, []);

  // --- HANDLERS ---
  const handleAiSuggest = async () => {
    if (title.length < 3) {
      showToast("Mẹ ơi, viết thêm vài từ để AI hiểu ý nhé!", "error");
      return;
    }
    setIsSuggesting(true);
    try {
        const results = await suggestTitles(title, content);
        setSuggestions(results);
        setShowSuggestions(true);
    } catch (e) {
        showToast("AI đang bận, mẹ thử lại sau nhé!", "error");
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleAiContent = async () => {
    if (!title || title.length < 5) {
      showToast("Mẹ nhập tiêu đề rõ ràng trước (ít nhất 5 ký tự) nhé!", "error");
      return;
    }
    if (content.length > 50) {
       if (!confirm("AI sẽ viết đè lên nội dung hiện tại. Mẹ đồng ý không?")) return; 
    }
    setIsGeneratingContent(true);
    try {
        const aiContent = await generateQuestionContent(title);
        setContent(aiContent);
        showToast("AI đã viết xong nội dung cho mẹ!", "success");
    } catch (error: any) {
        if (error.message?.includes('429')) {
            showToast("Hệ thống quá tải. Mẹ tự viết giúp mình nhé!", "error");
        } else {
            showToast("Có lỗi khi gọi AI.", "error");
        }
    } finally {
        setIsGeneratingContent(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (attachments.length + filesArray.length > 3) {
        showToast("Chỉ được đăng tối đa 3 ảnh thôi mẹ nhé!", "error");
        return;
      }
      const newAttachments: Attachment[] = filesArray.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(file),
          uploading: true
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
      newAttachments.forEach(async (att) => {
          try {
              const url = await uploadFile(att.file, 'question_images');
              setAttachments(prev => prev.map(p => 
                  p.id === att.id ? { ...p, url, uploading: false } : p
              ));
          } catch (error) {
              setAttachments(prev => prev.filter(p => p.id !== att.id));
              showToast("Không tải được ảnh lên, mẹ thử lại nhé.", "error");
          }
      });
    }
  };

  const removeImage = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // --- XỬ LÝ THÊM DANH MỤC MỚI VÀO FIREBASE ---
  const handleAddCustomCategory = async () => {
    const newCat = customCategory.trim();
    if (newCat) {
      // 1. Kiểm tra xem đã có chưa
      if (allCategories.includes(newCat)) {
          setCategory(newCat);
          setCustomCategory('');
          setShowCategorySheet(false);
          return;
      }

      setIsAddingCategory(true);
      try {
          // 2. Lưu vào Firebase (Collection 'categories')
          await addCategory(newCat);
          
          // 3. Cập nhật state cục bộ để hiện ngay
          setAllCategories(prev => [...prev, newCat]);
          setCategory(newCat);
          
          // 4. Reset form
          setCustomCategory('');
          setShowCategorySheet(false);
          showToast("Đã thêm chủ đề mới!", "success");
      } catch (error) {
          console.error("Lỗi thêm danh mục:", error);
          showToast("Không thêm được chủ đề. Bạn cần đăng nhập!", "error");
          if (!currentUser.id) setShowAuthModal(true);
      } finally {
          setIsAddingCategory(false);
      }
    }
  };

  const insertAtCursor = (textToInsert: string) => {
    const input = textareaRef.current;
    if (!input) {
        setContent(prev => prev + textToInsert);
        return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = content;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setContent(before + textToInsert + after);
    setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleInsertLink = () => {
    if (!linkUrl) { setShowLinkInput(false); return; }
    let safeUrl = linkUrl;
    if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
    insertAtCursor(` ${safeUrl} `);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleInsertSticker = (sticker: string) => { insertAtCursor(sticker); };

  const finalizeSubmission = async (user: User) => {
    if (!title.trim() || !content.trim()) {
        showToast("Mẹ ơi, đừng để trống tiêu đề hoặc nội dung nhé!", "error");
        return;
    }
    if (attachments.some(a => a.uploading)) {
        showToast("Ảnh đang tải lên, đợi xíu xong ngay thôi!", "info");
        return;
    }
    
    setIsSubmitting(true);
    try {
      const imageUrls = attachments.map(a => a.url).filter((url): url is string => !!url);
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
        images: imageUrls
      };
      await onAddQuestion(newQuestion);
      setIsSubmitting(false);
      navigate('/');
    } catch (error: any) {
      setIsSubmitting(false);
      if (error.code === 'permission-denied') {
         setShowAuthModal(true);
      } else {
         showToast("Có lỗi lạ quá. Mẹ thử lại sau nhé!", "error");
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) {
         showToast("Vui lòng nhập đủ thông tin trước khi đăng.", "error");
         return;
    }
    if (currentUser.isGuest) {
        try {
            setIsSubmitting(true);
            const anonymousUser = await loginAnonymously();
            await finalizeSubmission(anonymousUser);
        } catch (error: any) {
            setIsSubmitting(false);
            setShowAuthModal(true);
        }
    } else {
        finalizeSubmission(currentUser);
    }
  };

  const handleEmailLogin = async (e: string, p: string) => { const u = await onLogin(e, p); finalizeSubmission(u); };
  const handleRegister = async (e: string, p: string, n: string) => { const u = await onRegister(e, p, n); finalizeSubmission(u); };
  const handleGoogleAuth = async () => { const u = await onGoogleLogin(); finalizeSubmission(u); };
  const handleGuestContinue = async () => { setShowAuthModal(false); };

  const activeCategoryStyle = getCategoryStyle(category);

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

      {/* --- HEADER --- */}
      <div className="w-full bg-white/95 dark:bg-dark-card/95 backdrop-blur-md sticky top-0 z-30 pt-safe-top border-b border-gray-50 dark:border-dark-border shadow-sm transition-colors">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button 
                onClick={() => navigate(-1)} 
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300 active:scale-90"
            >
                <ArrowLeft size={24} />
            </button>
            <span className="font-bold text-lg text-gray-800 dark:text-white">Đặt câu hỏi</span>
            <div className="w-10"></div>
          </div>
      </div>

      {/* --- MAIN EDITOR --- */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 overflow-y-auto pb-[180px]"> 
      
        {/* User & Category Selector */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <img src={currentUser.avatar} className="w-12 h-12 rounded-full border border-gray-100 dark:border-slate-700 object-cover shadow-sm" alt="Avatar"/>
                <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white mb-1">{currentUser.name}</div>
                    <button 
                        onClick={() => setShowCategorySheet(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm active:scale-95 ${activeCategoryStyle.bg} ${activeCategoryStyle.color} ${activeCategoryStyle.border}`}
                    >
                        {React.createElement(activeCategoryStyle.icon, { size: 14 })} 
                        {category} 
                        <ChevronDown size={14} className="opacity-70"/>
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
            
            {/* Title Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Tiêu đề</label>
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
                    placeholder="VD: Bé 6 tháng tuổi bị sốt, mẹ nên làm gì?..."
                    className="w-full text-xl md:text-2xl font-bold text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none p-0 focus:ring-0 bg-transparent leading-tight"
                    autoFocus
                />
            </div>

            {/* AI Suggestions Dropdown */}
            {showSuggestions && (
                <div className="bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 border border-orange-100 dark:border-slate-700 animate-slide-down shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                             <Sparkles size={14}/> Gợi ý từ AI
                        </h4>
                        <button onClick={() => setShowSuggestions(false)} className="p-1 hover:bg-orange-100 dark:hover:bg-slate-700 rounded-full"><X size={16} className="text-orange-400"/></button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {suggestions.map((s, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { setTitle(s); setShowSuggestions(false); }} 
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
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Nội dung chi tiết</label>
                    {title.length > 5 && !content && !isGeneratingContent && (
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
                            <span className="text-purple-600 dark:text-purple-400 font-bold text-sm animate-pulse">AI đang viết, mẹ đợi xíu nhé...</span>
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Mô tả kỹ hơn về tình trạng của bé hoặc vấn đề mẹ đang gặp..."
                        className="w-full text-base md:text-lg text-gray-800 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-600 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed min-h-[200px]"
                    />
                </div>
            </div>

            {/* Image Previews */}
            {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 no-scrollbar">
                    {attachments.map((att) => (
                        <div key={att.id} className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-dark-border group bg-gray-50 dark:bg-slate-700">
                            <img src={att.preview} className={`w-full h-full object-cover transition-opacity ${att.uploading ? 'opacity-50' : 'opacity-100'}`} alt="preview" />
                            {att.uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>}
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
      </div>

      {/* --- STICKY FOOTER TOOLBAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border px-4 py-3 pb-safe-bottom z-40 shadow-[0_-5px_25px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
              
              {/* Extra Tools Drawers */}
              {showLinkInput && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-2 flex gap-2 animate-slide-up mb-2 backdrop-blur-sm">
                      <input 
                        type="url" 
                        value={linkUrl} 
                        onChange={(e) => setLinkUrl(e.target.value)} 
                        placeholder="Dán đường link vào đây..." 
                        className="flex-1 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-textDark dark:text-white" 
                        autoFocus 
                      />
                      <button onClick={handleInsertLink} className="bg-blue-600 text-white text-xs font-bold px-4 rounded-lg hover:bg-blue-700 active:scale-95 transition-all">Chèn</button>
                      <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><X size={18}/></button>
                  </div>
              )}
              {showStickers && (
                  <div className="h-48 overflow-y-auto bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl p-3 animate-slide-up mb-2 shadow-lg scroll-smooth">
                      {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                          <div key={category} className="mb-4 last:mb-0">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-white dark:bg-dark-card py-1">{category}</h4>
                              <div className="grid grid-cols-6 gap-3">
                                  {emojis.map(emoji => (
                                      <button key={emoji} onClick={() => handleInsertSticker(emoji)} className="text-3xl hover:scale-125 transition-transform p-1 active:scale-90">{emoji}</button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* MAIN ACTION ROW */}
              <div className="flex items-center justify-between gap-4">
                  {/* Left: Tools */}
                  <div className="flex items-center gap-2">
                      <label className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${attachments.length >= 3 ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>
                          <ImageIcon size={24} />
                          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" disabled={attachments.length >= 3} />
                      </label>
                      
                      <button 
                         onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}}
                         className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${showStickers ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
                      >
                          <Smile size={24} />
                      </button>

                      <button 
                          onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${showLinkInput ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
                      >
                          <LinkIcon size={24} />
                      </button>
                  </div>

                  {/* Right: Submit Button */}
                  <button 
                      onClick={handleSubmit} 
                      disabled={!title || !content || isSubmitting}
                      className="flex-1 bg-[#25A99C] text-white h-12 rounded-2xl font-bold text-base shadow-lg shadow-[#25A99C]/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.97] flex items-center justify-center gap-2 hover:bg-[#1E8A7F]"
                  >
                      {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : <>Đăng câu hỏi <Send size={20} /></>}
                  </button>
              </div>
          </div>
      </div>

      {/* --- CATEGORY SHEET (MODAL) --- */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowCategorySheet(false)}></div>
          <div className="bg-white dark:bg-dark-card rounded-t-[2rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto transition-colors">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full mx-auto mb-6"></div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-6 text-center">Chọn chủ đề câu hỏi</h3>
            
            {/* Input Custom Category */}
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
                  {isAddingCategory ? <Loader2 className="animate-spin" size={24}/> : <Plus size={24} />}
                </button>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
              {allCategories.map(cat => {
                const style = getCategoryStyle(cat);
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setShowCategorySheet(false); }}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] flex items-center gap-4 ${
                      isSelected ? `border-[#25A99C] bg-[#25A99C]/5 dark:bg-[#25A99C]/10 shadow-sm` : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                        {React.createElement(style.icon, { size: 20 })}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`block font-bold text-base truncate ${isSelected ? 'text-[#25A99C]' : 'text-gray-800 dark:text-white'}`}>{cat}</span>
                        {isSelected && <span className="text-xs text-[#25A99C] font-medium flex items-center gap-1 mt-0.5"><Check size={12} /> Đang chọn</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
