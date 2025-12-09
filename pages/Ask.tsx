
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, Image as ImageIcon, Loader2, ChevronDown, Check, 
  Tag, Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Plus,
  Link as LinkIcon
} from 'lucide-react';
import { Question, User } from '../types';
import { suggestTitles } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
import { uploadMultipleFiles } from '../services/storage';
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

// Map categories to icons for visual appeal
const getCategoryIcon = (cat: string) => {
  if (cat.includes("Mang thai")) return <Baby size={24} />;
  if (cat.includes("Dinh dưỡng")) return <Utensils size={24} />;
  if (cat.includes("Sức khỏe")) return <Stethoscope size={24} />;
  if (cat.includes("0-1") || cat.includes("1-3")) return <Smile size={24} />;
  if (cat.includes("Tâm lý")) return <Brain size={24} />;
  if (cat.includes("Giáo dục")) return <BookOpen size={24} />;
  if (cat.includes("Gia đình")) return <Users size={24} />;
  return <Tag size={24} />;
};

const getCategoryColor = (cat: string) => {
  if (cat.includes("Mang thai")) return "bg-pink-100 text-pink-600";
  if (cat.includes("Dinh dưỡng")) return "bg-green-100 text-green-600";
  if (cat.includes("Sức khỏe")) return "bg-blue-100 text-blue-600";
  return "bg-orange-100 text-orange-600";
};

// Reuse Sticker Packs
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
  
  // Custom Category State
  const [customCategory, setCustomCategory] = useState('');
  
  // Image State
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Tool States
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // UI States
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);
  
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleAiSuggest = async () => {
    if (title.length < 5) {
      alert("Mẹ ơi, hãy viết một chút tiêu đề để AI hiểu ý mẹ nhé!");
      return;
    }
    setIsSuggesting(true);
    setShowSuggestions(true);
    const results = await suggestTitles(title, content);
    setSuggestions(results);
    setIsSuggesting(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalImages = selectedImages.length + filesArray.length;
      if (totalImages > 3) {
        alert("Mẹ chỉ được đăng tối đa 3 ảnh thôi nhé!");
        return;
      }
      const newImages = [...selectedImages, ...filesArray];
      setSelectedImages(newImages);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file as Blob));
      setPreviewUrls([...previewUrls, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
    const newPreviews = [...previewUrls];
    URL.revokeObjectURL(newPreviews[index]); 
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      onAddCategory(customCategory.trim());
      setCategory(customCategory.trim());
      setCustomCategory('');
      setShowCategorySheet(false);
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
    
    // Restore focus and cursor position
    setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleInsertLink = () => {
    if (!linkUrl) {
       setShowLinkInput(false);
       return;
    }
    let safeUrl = linkUrl;
    if (!safeUrl.startsWith('http')) {
        safeUrl = `https://${safeUrl}`;
    }
    insertAtCursor(` ${safeUrl} `);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleInsertSticker = (sticker: string) => {
    insertAtCursor(sticker);
  };

  const finalizeSubmission = async (user: User) => {
    if (!title || !content) return;
    setIsSubmitting(true);
    setLoadingText('Đang đăng bài...');

    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        setLoadingText('Đang tải ảnh lên...');
        imageUrls = await uploadMultipleFiles(selectedImages, 'question_images');
      }

      const newQuestion: Question = {
        id: Date.now().toString(),
        title,
        content,
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
      console.error("Failed to submit", error);
      setIsSubmitting(false);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
         alert("Lỗi quyền truy cập. Vui lòng thử lại hoặc đăng nhập.");
         setShowAuthModal(true);
      } else {
         alert("Có lỗi xảy ra. Mẹ thử lại nhé!");
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) return;

    if (currentUser.isGuest) {
        try {
            setIsSubmitting(true);
            setLoadingText('Đang xác thực...');
            const anonymousUser = await loginAnonymously();
            await finalizeSubmission(anonymousUser);
        } catch (error: any) {
            console.error("Guest login failed:", error);
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

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden animate-slide-up">
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleEmailLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleAuth}
        onGuestContinue={handleGuestContinue}
      />

      {/* --- 1. HEADER --- */}
      <header className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md pt-safe-top z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <X size={24} />
        </button>
        <span className="font-bold text-lg text-textDark">Tạo câu hỏi</span>
        <div className="w-10"></div> 
      </header>

      {/* --- 2. MAIN CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pb-40" onClick={() => setShowStickers(false)}>
        
        {/* User Info */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
           <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
           <div className="flex flex-col">
              <span className="font-bold text-sm text-textDark">{currentUser.name} {currentUser.isGuest && "(Khách)"}</span>
              <span className="text-xs text-textGray">Đang soạn thảo...</span>
           </div>
        </div>

        {/* INPUTS */}
        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề: Mẹ đang băn khoăn điều gì?..."
            className="w-full text-xl font-bold text-textDark placeholder-gray-300 border-none p-0 focus:ring-0 bg-transparent leading-tight"
            autoFocus
          />
          
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết chi tiết nội dung để các chuyên gia và mẹ khác dễ dàng tư vấn hơn nhé..."
            className="w-full text-base text-textDark/90 placeholder-gray-400 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed min-h-[150px]"
          />
        </div>

        {/* Image Preview Grid */}
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-6 animate-fade-in">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                <img src={url} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 backdrop-blur-sm active:scale-90 transition-transform"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {previewUrls.length < 3 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
                    <ImageIcon size={24} />
                    <span className="text-xs font-bold mt-1">Thêm ảnh</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
            )}
          </div>
        )}

        {/* AI Suggestions Panel */}
        {showSuggestions && (
          <div className="mt-6 bg-orange-50 rounded-2xl p-4 border border-orange-100 animate-pop-in">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-orange-100 rounded-lg text-orange-500"><Sparkles size={16} fill="currentColor" /></div>
                   <span className="text-sm font-bold text-orange-700">Gợi ý tiêu đề hay</span>
                </div>
                <button onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
             </div>
             
             {isSuggesting ? (
                <div className="flex items-center gap-2 text-sm text-orange-600 py-2">
                   <Loader2 size={16} className="animate-spin" /> Đang suy nghĩ...
                </div>
             ) : (
                <div className="space-y-2">
                   {suggestions.map((s, idx) => (
                      <button 
                        key={idx}
                        onClick={() => { setTitle(s); setShowSuggestions(false); }}
                        className="w-full text-left p-3 bg-white rounded-xl text-sm font-medium text-textDark border border-orange-100 shadow-sm active:scale-[0.99] transition-transform"
                      >
                        {s}
                      </button>
                   ))}
                </div>
             )}
          </div>
        )}
      </div>

      {/* --- 3. BOTTOM CONTROL CENTER (Sticky) --- */}
      <div className="border-t border-gray-100 bg-white px-5 py-4 pb-safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4">
         
         {/* Link Input Popover */}
         {showLinkInput && (
             <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex gap-2 animate-slide-up">
                 <input 
                    type="url" 
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Dán đường link vào đây..."
                    className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                    autoFocus
                 />
                 <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">Chèn link</button>
                 <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-1"><X size={18}/></button>
             </div>
         )}

         {/* Tools Row */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
               {/* Category Selector */}
               <button 
                  onClick={() => setShowCategorySheet(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-textDark text-sm font-bold border border-gray-100 active:scale-95 transition-transform whitespace-nowrap"
               >
                  {getCategoryIcon(category)}
                  <span className="max-w-[80px] truncate">{category}</span>
                  <ChevronDown size={14} className="text-gray-400" />
               </button>

               {/* Image Button */}
               <label className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors active:scale-90 cursor-pointer border border-gray-100">
                  <ImageIcon size={20} />
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
               </label>
               
               {/* Sticker Button */}
               <button 
                  onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}}
                  className={`p-2 rounded-xl border transition-colors active:scale-90 ${showStickers ? 'bg-yellow-100 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
               >
                  <Smile size={20} />
               </button>

               {/* Link Button */}
               <button 
                  onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}}
                  className={`p-2 rounded-xl border transition-colors active:scale-90 ${showLinkInput ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
               >
                  <LinkIcon size={20} />
               </button>
            </div>

            {/* AI Magic Button */}
            <button 
               onClick={handleAiSuggest}
               className="p-2 rounded-xl bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600 active:scale-95 transition-transform border border-orange-200 shrink-0"
            >
               <Sparkles size={20} />
            </button>
         </div>

         {/* Sticker Drawer */}
         {showStickers && (
            <div className="h-48 overflow-y-auto bg-gray-50 border border-gray-100 rounded-xl p-4 animate-slide-up shadow-inner">
                {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                    <div key={category} className="mb-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider sticky top-0 bg-gray-50 py-1 z-10">{category}</h4>
                        <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                            {emojis.map(emoji => (
                                <button 
                                    key={emoji} 
                                    onClick={() => handleInsertSticker(emoji)}
                                    className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
         )}

         {/* BIG POST BUTTON */}
         <button 
            onClick={handleSubmit} 
            disabled={!title || !content || isSubmitting}
            className="w-full bg-gradient-to-r from-primary to-[#26A69A] text-white py-3.5 rounded-2xl font-bold text-[16px] shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
         >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Đăng câu hỏi ngay"}
         </button>
      </div>

      {/* --- 4. CATEGORY BOTTOM SHEET --- */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowCategorySheet(false)}></div>
          <div className="bg-white rounded-t-[2rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="font-bold text-lg text-textDark mb-4 text-center">Chọn chủ đề</h3>
            
            {/* Custom Category Input */}
            <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Nhập chủ đề mới (nếu không có sẵn)..."
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
                <button 
                  onClick={handleAddCustomCategory}
                  disabled={!customCategory.trim()}
                  className="bg-textDark text-white px-4 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <Plus size={20} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategorySheet(false); }}
                  className={`
                    p-4 rounded-2xl border text-left transition-all active:scale-[0.98] flex items-center gap-3
                    ${category === cat 
                      ? 'border-primary bg-primary/5 shadow-inner' 
                      : 'border-gray-100 bg-white shadow-sm'
                    }
                  `}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getCategoryColor(cat)}`}>
                     {getCategoryIcon(cat)}
                  </div>
                  <div className="flex-1 min-w-0">
                     <span className={`block font-bold text-sm truncate ${category === cat ? 'text-primary' : 'text-textDark'}`}>{cat}</span>
                     {category === cat && <span className="text-[10px] text-primary font-medium flex items-center gap-1"><Check size={10} /> Đang chọn</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
         <div className="absolute inset-0 z-[70] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="font-bold text-primary animate-pulse">{loadingText}</p>
         </div>
      )}
    </div>
  );
};
