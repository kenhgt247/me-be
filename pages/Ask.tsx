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
      alert("Mẹ ơi, hãy viết vài từ khóa để AI hiểu ý mẹ nhé!");
      return;
    }
    setIsSuggesting(true);
    try {
        const results = await suggestTitles(title, content);
        setSuggestions(results);
        setShowSuggestions(true);
    } catch (e) {
        alert("AI đang bận, mẹ thử lại sau nhé!");
    } finally {
        setIsSuggesting(false);
    }
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
    try {
        const aiContent = await generateQuestionContent(title);
        setContent(aiContent);
    } catch (error: any) {
        if (error.message?.includes('429')) {
            alert("Hệ thống AI đang quá tải. Mẹ vui lòng tự viết nội dung nhé!");
        } else {
            alert("Có lỗi khi gọi AI.");
        }
    } finally {
        setIsGeneratingContent(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (attachments.length + filesArray.length > 3) {
        alert("Chỉ được đăng tối đa 3 ảnh thôi mẹ nhé!");
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
              alert("Lỗi tải ảnh.");
          }
      });
    }
  };

  const removeImage = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
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
    if (attachments.some(a => a.uploading)) {
        alert("Ảnh đang được tải lên, mẹ đợi một xíu cho xong nhé!");
        return;
    }
    setIsSubmitting(true);
    try {
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
      setIsSubmitting(false);
      if (error.code === 'permission-denied') {
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
    <div className="min-h-screen bg-white flex flex-col animate-fade-in pb-safe-bottom">
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleEmailLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleAuth}
        onGuestContinue={handleGuestContinue}
      />

      {/* --- HEADER --- */}
      <div className="w-full bg-white/90 backdrop-blur-md sticky top-0 z-30 pt-safe-top border-b border-gray-50">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
                <ArrowLeft size={24} />
            </button>
            <span className="font-bold text-lg text-textDark">Đặt câu hỏi</span>
            <div className="w-10"></div> {/* Spacer to center title */}
          </div>
      </div>

      {/* --- MAIN EDITOR --- */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 overflow-y-auto pb-32">
        
        {/* User Info & Category */}
        <div className="flex items-center gap-3 mb-6">
            <img src={currentUser.avatar} className="w-11 h-11 rounded-full border border-gray-100 object-cover" />
            <div>
                <div className="font-bold text-sm text-textDark mb-0.5">{currentUser.name}</div>
                {/* NÚT CHỌN CHỦ ĐỀ Ở ĐÂY CHO GỌN */}
                <button 
                    onClick={() => setShowCategorySheet(true)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${getCategoryColor(category)}`}
                >
                    {getCategoryIcon(category)} {category} <ChevronDown size={12}/>
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="space-y-5">
            {/* Title */}
            <div className="relative group">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Tiêu đề: Mẹ đang lo lắng điều gì?..."
                    className="w-full text-xl md:text-2xl font-bold text-textDark placeholder-gray-300 border-none p-0 pr-20 focus:ring-0 bg-transparent leading-tight"
                    autoFocus
                />
                <button 
                    onClick={handleAiSuggest}
                    disabled={isSuggesting}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:bg-orange-100 transition-all border border-orange-100 active:scale-95"
                >
                    {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Gợi ý
                </button>
            </div>

            {/* Content */}
            <div className="relative min-h-[150px]">
                {title.length > 5 && !content && !isGeneratingContent && (
                    <button 
                        onClick={handleAiContent}
                        className="absolute right-0 -top-2 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-purple-100 transition-all border border-purple-100 shadow-sm z-10 animate-pop-in"
                    >
                        <Sparkles size={14} /> AI Viết hộ
                    </button>
                )}

                {isGeneratingContent && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-sm animate-pulse">
                            <Loader2 size={18} className="animate-spin" /> AI đang viết...
                        </div>
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Mô tả chi tiết để được tư vấn chính xác hơn..."
                    className="w-full text-base md:text-lg text-textDark/90 placeholder-gray-400 border-none p-0 focus:ring-0 bg-transparent resize-none leading-relaxed h-full min-h-[150px]"
                />
            </div>

            {/* Image Previews */}
            {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {attachments.map((att) => (
                        <div key={att.id} className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100 group bg-gray-50">
                            <img src={att.preview} className={`w-full h-full object-cover transition-opacity ${att.uploading ? 'opacity-50' : 'opacity-100'}`} />
                            {att.uploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={20} /></div>}
                            <button onClick={() => removeImage(att.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 backdrop-blur-sm active:scale-90 transition-transform"><X size={12} /></button>
                        </div>
                    ))}
                </div>
            )}

            {/* AI Suggestions List */}
            {showSuggestions && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 animate-pop-in">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-orange-700 uppercase">Gợi ý tiêu đề</h4>
                        <button onClick={() => setShowSuggestions(false)}><X size={16} className="text-orange-400"/></button>
                    </div>
                    <div className="space-y-2">
                        {suggestions.map((s, idx) => (
                            <button key={idx} onClick={() => { setTitle(s); setShowSuggestions(false); }} className="w-full text-left p-2.5 bg-white rounded-xl text-sm font-medium text-textDark border border-orange-100 shadow-sm active:scale-[0.99] transition-transform hover:border-orange-300">{s}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- STICKY FOOTER TOOLBAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe-bottom z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
              
              {/* Extra Tools Drawers (Link/Sticker) */}
              {showLinkInput && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex gap-2 animate-slide-up mb-2">
                      <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Dán link vào đây..." className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-primary" autoFocus />
                      <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-4 rounded-lg">Chèn</button>
                      <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-1"><X size={18}/></button>
                  </div>
              )}
              {showStickers && (
                  <div className="h-40 overflow-y-auto bg-white border border-gray-100 rounded-xl p-3 animate-slide-up mb-2 shadow-sm">
                      {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                          <div key={category} className="mb-3">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{category}</h4>
                              <div className="grid grid-cols-8 gap-2">
                                  {emojis.map(emoji => (
                                      <button key={emoji} onClick={() => handleInsertSticker(emoji)} className="text-2xl hover:scale-125 transition-transform p-1">{emoji}</button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* MAIN ACTION ROW */}
              <div className="flex items-center justify-between gap-4">
                  {/* Left: Tools */}
                  <div className="flex items-center gap-1">
                      {/* Image Button */}
                      <label className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${attachments.length >= 3 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-gray-50 text-green-600 hover:bg-green-50'}`}>
                          <ImageIcon size={22} />
                          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" disabled={attachments.length >= 3} />
                      </label>
                      
                      {/* Sticker Button */}
                      <button 
                         onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}}
                         className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${showStickers ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                         <Smile size={22} />
                      </button>

                      {/* Link Button */}
                      <button 
                         onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}}
                         className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${showLinkInput ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                         <LinkIcon size={22} />
                      </button>
                  </div>

                  {/* Right: Submit Button */}
                  <button 
                     onClick={handleSubmit} 
                     disabled={!title || !content || isSubmitting}
                     className="flex-1 bg-primary text-white h-11 rounded-full font-bold text-[15px] shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:bg-[#25A99C]"
                  >
                     {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <>Đăng câu hỏi <Send size={18} /></>}
                  </button>
              </div>
          </div>
      </div>

      {/* --- CATEGORY SHEET --- */}
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
                  className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] flex items-center gap-3 ${category === cat ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-100 bg-white shadow-sm'}`}
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
