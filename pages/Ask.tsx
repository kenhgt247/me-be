import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, Image as ImageIcon, Loader2, ChevronDown, Check, 
  Tag, Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Plus,
  Link as LinkIcon, PenTool, Trash2
} from 'lucide-react';
import { Question, User } from '../types';
import { suggestTitles, generateQuestionContent } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';
// ĐỔI IMPORT: Dùng uploadFile thay vì uploadMultipleFiles để upload từng cái
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

// Kiểu dữ liệu cho ảnh đính kèm (Upload ngầm)
interface Attachment {
    id: string;
    file: File;
    preview: string;
    url?: string;      // Link ảnh sau khi upload xong
    uploading: boolean; // Trạng thái đang tải
    error?: boolean;
}

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
  
  // --- THAY ĐỔI: STATE QUẢN LÝ ẢNH ---
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // ------------------------------------
  
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
  
  // Cleanup preview URLs khi component unmount
  useEffect(() => {
    return () => {
      attachments.forEach(att => URL.revokeObjectURL(att.preview));
    };
  }, []); // Chỉ chạy khi unmount

  const handleAiSuggest = async () => {
    if (title.length < 3) {
      alert("Mẹ ơi, hãy viết vài từ khóa để AI hiểu ý mẹ nhé!");
      return;
    }
    setIsSuggesting(true);
    setShowSuggestions(true);
    const results = await suggestTitles(title, content);
    setSuggestions(results);
    setIsSuggesting(false);
  };

  const handleAiContent = async () => {
    if (!title || title.length < 5) {
      alert("Mẹ ơi, hãy nhập tiêu đề rõ ràng trước (ít nhất 5 ký tự) nhé!");
      return;
    }
    if (content.length > 50) {
        if (!confirm("AI sẽ viết đè lên nội dung hiện tại. Mẹ đồng ý không?")) return;
    }
    setIsGeneratingContent(true);
    const aiContent = await generateQuestionContent(title);
    setContent(aiContent);
    setIsGeneratingContent(false);
  };

  // --- LOGIC UPLOAD ẢNH NGẦM (BACKGROUND UPLOAD) ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (attachments.length + filesArray.length > 3) {
        alert("Chỉ được đăng tối đa 3 ảnh thôi mẹ nhé!");
        return;
      }

      // 1. Tạo danh sách Attachment tạm thời để hiện Preview ngay
      const newAttachments: Attachment[] = filesArray.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(file),
          uploading: true // Đánh dấu là đang upload
      }));

      setAttachments(prev => [...prev, ...newAttachments]);

      // 2. Thực hiện Upload từng file
      newAttachments.forEach(async (att) => {
          try {
              const url = await uploadFile(att.file, 'question_images');
              // Upload xong -> Cập nhật URL và tắt trạng thái uploading
              setAttachments(prev => prev.map(p => 
                  p.id === att.id ? { ...p, url, uploading: false } : p
              ));
          } catch (error) {
              console.error("Upload failed", error);
              alert("Lỗi tải ảnh. Vui lòng thử lại ảnh khác.");
              // Xóa ảnh lỗi khỏi danh sách
              setAttachments(prev => prev.filter(p => p.id !== att.id));
          }
      });
    }
  };

  const removeImage = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };
  // ----------------------------------------------------

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
    if (!title || !content) return;

    // Kiểm tra xem có ảnh nào đang upload dở không
    if (attachments.some(a => a.uploading)) {
        alert("Ảnh đang được tải lên, mẹ đợi một xíu cho xong nhé!");
        return;
    }

    setIsSubmitting(true);

    try {
      // Lấy danh sách URL từ các ảnh đã upload xong
      const imageUrls = attachments.map(a => a.url).filter((url): url is string => !!url);

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

      {/* HEADER */}
      <header className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md pt-safe-top z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <X size={24} />
        </button>
        <span className="font-bold text-lg text-textDark">Tạo câu hỏi</span>
        <div className="w-10"></div> 
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pb-40" onClick={() => setShowStickers(false)}>
        
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
           <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
           <div className="flex flex-col">
              <span className="font-bold text-sm text-textDark">{currentUser.name} {currentUser.isGuest && "(Khách)"}</span>
              <span className="text-xs text-textGray">Đang soạn thảo...</span>
           </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
             <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề: Mẹ đang băn khoăn điều gì?..."
                className="w-full text-xl font-bold text-textDark placeholder-gray-300 border-none p-0 pr-24 focus:ring-0 bg-transparent leading-tight"
                autoFocus
             />
             <button 
               onClick={handleAiSuggest}
               disabled={isSuggesting}
               className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:bg-orange-100 transition-all border border-orange-100 active:scale-95"
             >
                {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Gợi ý
             </button>
          </div>
          
          <div className="relative">
              {title.length > 5 && !content && !isGeneratingContent && (
                  <button 
                    onClick={handleAiContent}
                    className="absolute right-0 -top-8 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-purple-100 transition-all border border-purple-100 shadow-sm animate-pop-in z-20"
                  >
                      <Sparkles size={14} /> AI Viết nội dung
                  </button>
              )}
              
              {isGeneratingContent && (
                  <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                          <Loader2 size={18} className="animate-spin" /> AI đang viết...
                      </div>
                  </div>
              )}

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Viết chi tiết nội dung để các chuyên gia và mẹ khác dễ dàng tư vấn hơn nhé..."
                className="w-full text-base text-textDark/90 placeholder-gray-400 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed min-h-[150px]"
              />
          </div>
        </div>

        {/* IMAGE PREVIEW WITH UPLOAD STATUS */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-6 animate-fade-in">
            {attachments.map((att) => (
              <div key={att.id} className="relative aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 group bg-gray-50">
                <img src={att.preview} className={`w-full h-full object-cover transition-opacity ${att.uploading ? 'opacity-50' : 'opacity-100'}`} />
                
                {/* Loading Indicator */}
                {att.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                )}

                <button
                  onClick={() => removeImage(att.id)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 backdrop-blur-sm active:scale-90 transition-transform"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            {/* Nút thêm ảnh (chỉ hiện khi chưa đủ 3 ảnh) */}
            {attachments.length < 3 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer hover:border-primary/50 hover:text-primary">
                    <ImageIcon size={24} />
                    <span className="text-xs font-bold mt-1">Thêm ảnh</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
            )}
          </div>
        )}

        {/* AI Suggestions */}
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

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-100 bg-white px-5 py-4 pb-safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4">
          
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
                  <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">Chèn</button>
                  <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-1"><X size={18}/></button>
              </div>
          )}

          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
                <button 
                   onClick={() => setShowCategorySheet(true)}
                   className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-textDark text-sm font-bold border border-gray-100 active:scale-95 transition-transform whitespace-nowrap"
                >
                   {getCategoryIcon(category)}
                   <span className="max-w-[80px] truncate">{category}</span>
                   <ChevronDown size={14} className="text-gray-400" />
                </button>

                {/* IMAGE BUTTON - CHỈ HIỆN KHI CHƯA ĐỦ 3 ẢNH */}
                {attachments.length < 3 && (
                    <label className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors active:scale-90 cursor-pointer border border-gray-100">
                       <ImageIcon size={20} />
                       <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                )}
                
                <button 
                   onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}}
                   className={`p-2 rounded-xl border transition-colors active:scale-90 ${showStickers ? 'bg-yellow-100 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                >
                   <Smile size={20} />
                </button>

                <button 
                   onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}}
                   className={`p-2 rounded-xl border transition-colors active:scale-90 ${showLinkInput ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                >
                   <LinkIcon size={20} />
                </button>
             </div>
          </div>

          {showStickers && (
             <div className="h-48 overflow-y-auto bg-gray-50 border border-gray-100 rounded-xl p-4 animate-slide-up shadow-inner">
                 {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                     <div key={category} className="mb-4">
                         <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider sticky top-0 bg-gray-50 py-1 z-10">{category}</h4>
                         <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                             {emojis.map(emoji => (
                                 <button key={emoji} onClick={() => handleInsertSticker(emoji)} className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1">{emoji}</button>
                             ))}
                         </div>
                     </div>
                 ))}
             </div>
          )}

          <button 
             onClick={handleSubmit} 
             disabled={!title || !content || isSubmitting}
             className="w-full bg-gradient-to-r from-primary to-[#26A69A] text-white py-3.5 rounded-2xl font-bold text-[16px] shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
             {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "Đăng câu hỏi ngay"}
          </button>
      </div>

      {/* CATEGORY SHEET */}
      {showCategorySheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowCategorySheet(false)}></div>
          <div className="bg-white rounded-t-[2rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="font-bold text-lg text-textDark mb-4 text-center">Chọn chủ đề</h3>
            
            <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Nhập chủ đề mới..."
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
                    ${category === cat ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-100 bg-white shadow-sm'}
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
    </div>
  );
};
