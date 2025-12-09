
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  ArrowLeft, Heart, MessageCircle, ShieldCheck, 
  Sparkles, Loader2, Send, MoreVertical, Trash2, Edit2, 
  Share2, Image as ImageIcon, X, Smile, Link as LinkIcon,
  ThumbsUp, CheckCircle2, Eye, Bookmark, Filter, LogIn
} from 'lucide-react';
import { Question, Answer, User } from '../types';
import { generateDraftAnswer } from '../services/gemini';
import { toggleQuestionLikeDb } from '../services/db';
import { ShareModal } from '../components/ShareModal';
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';

interface DetailProps {
  questions: Question[];
  currentUser: User;
  onAddAnswer: (questionId: string, answer: Answer) => void;
  onMarkBestAnswer: (questionId: string, answerId: string) => void;
  onVerifyAnswer: (questionId: string, answerId: string) => void;
  onOpenAuth: () => void;
  
  // CRUD Actions
  onEditQuestion: (id: string, title: string, content: string) => void;
  onDeleteQuestion: (id: string) => void;
  onHideQuestion: (id: string) => void;
  onEditAnswer: (qId: string, aId: string, content: string) => void;
  onDeleteAnswer: (qId: string, aId: string) => void;
  onHideAnswer: (qId: string, aId: string) => void;
}

// --- CONSTANTS ---
const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪"]
};

// --- SUBCOMPONENTS ---

// 1. Image Viewer (Lightbox)
const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full">
        <X size={24} />
      </button>
      <img src={url} className="max-w-full max-h-full object-contain p-2" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

// 2. FB Style Image Grid
const FBImageGridDetail: React.FC<{ images: string[]; onImageClick: (url: string) => void }> = ({ images, onImageClick }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;

  if (count === 1) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 cursor-pointer shadow-sm active:opacity-90 transition-opacity" onClick={() => onImageClick(images[0])}>
        <img src={images[0]} className="w-full max-h-[400px] object-cover" />
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        {images.map(img => (
            <img key={img} src={img} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => onImageClick(img)} />
        ))}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        <img src={images[0]} className="w-full h-full object-cover row-span-2 cursor-pointer active:opacity-90" onClick={() => onImageClick(images[0])} />
        <div className="grid grid-rows-2 gap-1 h-full">
           <img src={images[1]} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => onImageClick(images[1])} />
           <img src={images[2]} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => onImageClick(images[2])} />
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
       <img src={images[0]} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => onImageClick(images[0])} />
       <div className="grid grid-rows-2 gap-1 h-full">
          <img src={images[1]} className="w-full h-full object-cover cursor-pointer active:opacity-90" onClick={() => onImageClick(images[1])} />
          <div className="relative w-full h-full cursor-pointer active:opacity-90" onClick={() => onImageClick(images[2])}>
              <img src={images[2]} className="w-full h-full object-cover" />
              {count > 3 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">
                   +{count - 3}
                </div>
              )}
          </div>
       </div>
    </div>
  );
};

// 3. Rich Text Renderer (Detect Links)
const RichTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Regex detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Check if content is just a few emojis (Big Emoji logic)
  const isBigEmoji = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u.test(content) && [...content].length <= 5;

  if (isBigEmoji) {
      return <div className="text-5xl md:text-6xl py-2">{content}</div>;
  }

  const parts = content.split(urlRegex);

  return (
    <p className="text-[15px] text-textDark leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a 
                key={i} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium break-all"
                onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
};

// --- MAIN COMPONENT ---

export const QuestionDetail: React.FC<DetailProps> = ({ 
  questions, 
  currentUser, 
  onAddAnswer, 
  onMarkBestAnswer, 
  onVerifyAnswer, 
  onOpenAuth, 
  onEditQuestion, 
  onDeleteQuestion, 
  onHideQuestion, 
  onEditAnswer, 
  onDeleteAnswer, 
  onHideAnswer 
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const question = questions.find(q => q.id === id);
  
  // --- STATE ---
  const [newAnswer, setNewAnswer] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<'best' | 'newest' | 'oldest'>('best');
  
  // Tool States
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');
  
  // Image Viewer State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Upload State for Answer
  const [uploadingImage, setUploadingImage] = useState(false);
  const [answerImage, setAnswerImage] = useState<string | null>(null);
  
  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle auto-resize of textarea
  useEffect(() => {
    if (answerInputRef.current) {
      answerInputRef.current.style.height = 'auto';
      answerInputRef.current.style.height = Math.min(answerInputRef.current.scrollHeight, 150) + 'px';
    }
  }, [newAnswer]);

  if (!question) return <div className="p-10 text-center">Không tìm thấy câu hỏi.</div>;

  const isOwner = currentUser.id === question.author.id;
  const isAdmin = currentUser.isAdmin;

  // --- LOGIC ---

  const ensureAuth = async (): Promise<User> => {
    if (currentUser.isGuest) {
        try {
            return await loginAnonymously();
        } catch (e: any) {
            console.error("Guest auth failed:", e);
            onOpenAuth();
            throw new Error("LOGIN_REQUIRED"); 
        }
    }
    return currentUser;
  };

  const handleLike = async () => {
    try {
      const user = await ensureAuth();
      toggleQuestionLikeDb(question, user);
    } catch (e) {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        setUploadingImage(true);
        // Ensure auth (even guest) before upload
        await ensureAuth();
        const url = await uploadFile(file, 'answer_images');
        setAnswerImage(url);
    } catch (e) {
        console.error(e);
        alert("Lỗi tải ảnh. Vui lòng thử lại.");
    } finally {
        setUploadingImage(false);
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl) {
       setShowLinkInput(false);
       return;
    }
    // Check if URL is valid roughly
    let safeUrl = linkUrl;
    if (!safeUrl.startsWith('http')) {
        safeUrl = `https://${safeUrl}`;
    }

    const currentPos = answerInputRef.current?.selectionStart || newAnswer.length;
    const textBefore = newAnswer.substring(0, currentPos);
    const textAfter = newAnswer.substring(currentPos);
    
    // Simple insert URL
    setNewAnswer(`${textBefore} ${safeUrl} ${textAfter}`);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleInsertSticker = (sticker: string) => {
     setNewAnswer(prev => prev + sticker);
     // Keep sticker drawer open or close? Let's keep open for multiple
  };

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim() && !answerImage) return;
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setShowStickers(false);

    try {
      const user = await ensureAuth();
      
      let finalContent = newAnswer;
      if (answerImage) {
          finalContent += `\n\n![Image](${answerImage})`;
      }

      const answer: Answer = {
        id: Date.now().toString(),
        questionId: question.id,
        author: user,
        content: finalContent,
        likes: 0,
        isBestAnswer: false,
        createdAt: new Date().toISOString(),
        isAi: false
      };

      await onAddAnswer(question.id, answer);
      setNewAnswer('');
      setAnswerImage(null);
      
      // Scroll slightly to show new answer
      setTimeout(() => {
         window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);

    } catch (e: any) {
      if (e.message !== "LOGIN_REQUIRED") {
        alert("Có lỗi xảy ra khi gửi. Thử lại nhé!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiDraft = async () => {
    setIsGeneratingDraft(true);
    const draft = await generateDraftAnswer(question.title, question.content);
    setNewAnswer(draft);
    setIsGeneratingDraft(false);
  };

  // Sorting Logic
  const sortedAnswers = [...question.answers].sort((a, b) => {
      if (a.isBestAnswer && !b.isBestAnswer) return -1;
      if (!a.isBestAnswer && b.isBestAnswer) return 1;

      if (sortOption === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      
      if (a.isExpertVerified && !b.isExpertVerified) return -1;
      if (!a.isExpertVerified && b.isExpertVerified) return 1;
      
      return b.likes - a.likes; 
  });

  const toggleMenu = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setActiveMenuId(activeMenuId === id ? null : id); };
  const startEditQuestion = () => { setIsEditingQuestion(true); setEditQTitle(question.title); setEditQContent(question.content); setActiveMenuId(null); };
  const saveQuestionEdit = () => { onEditQuestion(question.id, editQTitle, editQContent); setIsEditingQuestion(false); };
  
  const getTagColor = (cat: string) => {
     if (cat.includes('Mang thai')) return 'bg-pink-100 text-pink-700';
     if (cat.includes('Dinh dưỡng')) return 'bg-green-100 text-green-700';
     if (cat.includes('Sức khỏe')) return 'bg-blue-100 text-blue-700';
     return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F5] pb-[240px] md:pb-[100px] selectable-text animate-fade-in">
      {/* Lightbox */}
      {previewImage && <ImageViewer url={previewImage} onClose={() => setPreviewImage(null)} />}

      {/* --- 1. HEADER (Fixed) --- */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between pt-safe-top shadow-sm transition-all">
         <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full active:scale-95 transition-all text-gray-600">
             <ArrowLeft size={22} />
         </button>
         <h1 className="font-bold text-textDark truncate max-w-[200px] text-center">{question.category}</h1>
         
         <div className="flex gap-1">
             <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-gray-50 rounded-full text-blue-600">
                 <Share2 size={20} />
             </button>
             {(isOwner || isAdmin) && (
                <div className="relative">
                    <button onClick={(e) => toggleMenu('q_menu', e)} className="p-2 hover:bg-gray-50 rounded-full text-gray-600">
                        <MoreVertical size={20} />
                    </button>
                    {activeMenuId === 'q_menu' && (
                        <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 w-44 overflow-hidden z-30 animate-pop-in">
                            <button onClick={startEditQuestion} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-textDark">
                                <Edit2 size={16} /> Chỉnh sửa
                            </button>
                            <button onClick={() => onDeleteQuestion(question.id)} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 text-red-600 flex items-center gap-2">
                                <Trash2 size={16} /> Xóa câu hỏi
                            </button>
                        </div>
                    )}
                </div>
             )}
         </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-0 md:px-4">
          
          {/* --- 2. QUESTION CARD --- */}
          <div className="bg-white md:rounded-[2rem] md:mt-4 p-5 pb-2 shadow-sm border-b md:border border-gray-100 relative">
             {/* User Info */}
             <div className="flex items-center justify-between mb-4">
                 <RouterLink to={`/profile/${question.author.id}`} className="flex items-center gap-3 group">
                     <img src={question.author.avatar} className="w-11 h-11 rounded-full object-cover border border-gray-100 group-active:scale-95 transition-transform" />
                     <div>
                         <h3 className="font-bold text-textDark text-[15px] flex items-center gap-1">
                             {question.author.name}
                             {question.author.isExpert && <ShieldCheck size={14} className="text-blue-500" />}
                         </h3>
                         <div className="flex items-center gap-2 text-xs text-gray-400">
                             <span>{new Date(question.createdAt).toLocaleDateString('vi-VN')}</span>
                             <span>•</span>
                             <span className="flex items-center gap-0.5"><Eye size={12}/> {question.views || 0}</span>
                         </div>
                     </div>
                 </RouterLink>
                 <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${getTagColor(question.category)}`}>
                     {question.category}
                 </span>
             </div>

             {/* Content */}
             {isEditingQuestion ? (
                 <div className="space-y-3 mb-4">
                    <input value={editQTitle} onChange={e => setEditQTitle(e.target.value)} className="w-full font-bold text-lg border-b border-gray-200 p-2 outline-none" />
                    <textarea value={editQContent} onChange={e => setEditQContent(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl min-h-[120px] outline-none" />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditingQuestion(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Hủy</button>
                        <button onClick={saveQuestionEdit} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg">Lưu</button>
                    </div>
                 </div>
             ) : (
                 <div className="mb-4">
                     <h2 className="text-xl font-bold text-textDark mb-3 leading-snug">{question.title}</h2>
                     <RichTextRenderer content={question.content} />
                     <FBImageGridDetail images={question.images || []} onImageClick={setPreviewImage} />
                 </div>
             )}

             {/* Action Stats Row */}
             <div className="flex items-center justify-between py-3 border-t border-gray-50 mt-4">
                 <div className="flex items-center gap-6">
                     <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-bold transition-colors ${question.likes > 0 ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                         <Heart size={20} className={question.likes > 0 ? "fill-red-500" : ""} />
                         {question.likes > 0 ? question.likes : 'Thích'}
                     </button>
                     <button onClick={() => answerInputRef.current?.focus()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors">
                         <MessageCircle size={20} />
                         {question.answers.length > 0 ? question.answers.length : 'Trả lời'}
                     </button>
                 </div>
                 <button className="text-gray-400 hover:text-orange-500 transition-colors">
                     <Bookmark size={20} />
                 </button>
             </div>
          </div>

          {/* --- 3. FILTER / SORT BAR --- */}
          <div className="px-4 py-4 flex items-center justify-between">
              <h3 className="font-bold text-textDark text-lg">Trả lời ({question.answers.length})</h3>
              <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                  <button onClick={() => setSortOption('best')} className={`p-1.5 rounded-md transition-all ${sortOption === 'best' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-400'}`} title="Phù hợp nhất">
                      <Sparkles size={16} />
                  </button>
                  <button onClick={() => setSortOption('newest')} className={`p-1.5 rounded-md transition-all ${sortOption === 'newest' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400'}`} title="Mới nhất">
                      <Filter size={16} />
                  </button>
              </div>
          </div>

          {/* --- 4. ANSWERS LIST --- */}
          <div className="space-y-4 px-4 pb-4">
              {question.answers.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                      <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                          <MessageCircle size={32} />
                      </div>
                      <p className="text-textGray font-medium">Chưa có câu trả lời nào.</p>
                      <p className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên chia sẻ kiến thức nhé!</p>
                  </div>
              )}

              {sortedAnswers.map(ans => {
                  const isAnsOwner = currentUser.id === ans.author.id;
                  const isBest = ans.isBestAnswer;
                  
                  return (
                    <div key={ans.id} className={`bg-white p-5 rounded-2xl border transition-all ${isBest ? 'border-yellow-400 shadow-md ring-1 ring-yellow-100' : 'border-gray-100 shadow-sm'}`}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <RouterLink to={`/profile/${ans.author.id}`}>
                                   <img src={ans.author.avatar} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                </RouterLink>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-sm text-textDark">{ans.author.name}</span>
                                        {ans.author.isExpert && (
                                            <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                <ShieldCheck size={10} /> Chuyên gia
                                            </span>
                                        )}
                                        {ans.author.isGuest && (
                                            <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded-md">Khách</span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-400">{new Date(ans.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>

                            {/* Menu/Actions */}
                            <div className="flex items-center gap-2">
                                {(isOwner || isAdmin) && !isBest && (
                                    <button onClick={() => onMarkBestAnswer(question.id, ans.id)} className="text-gray-300 hover:text-yellow-500 transition-colors" title="Chọn hay nhất">
                                        <Sparkles size={18} />
                                    </button>
                                )}
                                {(isAnsOwner || isAdmin) && (
                                    <button onClick={(e) => toggleMenu(ans.id, e)} className="text-gray-400 p-1">
                                        <MoreVertical size={16} />
                                    </button>
                                )}
                            </div>
                            
                            {/* Dropdown Menu for Answer */}
                            {activeMenuId === ans.id && (
                                <div ref={menuRef} className="absolute right-6 mt-6 bg-white rounded-xl shadow-lg border border-gray-100 w-32 overflow-hidden z-20">
                                    <button onClick={() => onDeleteAnswer(question.id, ans.id)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Xóa</button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="mb-3">
                             {/* Best Answer Badge */}
                             {isBest && (
                                <div className="inline-flex items-center gap-1 bg-yellow-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 shadow-sm">
                                    <CheckCircle2 size={12} /> Câu trả lời hay nhất
                                </div>
                             )}
                             <RichTextRenderer content={ans.content} />
                        </div>

                        {/* Footer / Vote */}
                        <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                            <button className="flex items-center gap-1.5 text-gray-500 hover:text-primary transition-colors active:scale-95">
                                <ThumbsUp size={16} /> <span className="text-xs font-bold">Hữu ích</span>
                            </button>
                            {ans.isExpertVerified && (
                                <span className="flex items-center gap-1 text-xs font-bold text-green-600 ml-auto">
                                    <ShieldCheck size={14} /> Đã xác thực y khoa
                                </span>
                            )}
                        </div>
                    </div>
                  );
              })}
          </div>
      </div>

      {/* --- 5. STICKY ACTION & INPUT BAR --- */}
      {/* 
          UPDATED: Added bottom-[88px] on mobile to sit ABOVE the mobile nav bar (which is approx 80-85px tall).
          On Desktop (md), it resets to bottom-0.
      */}
      <div className="fixed bottom-[88px] md:bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-2 md:pb-safe-bottom z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
         
         {/* Guest Prompt (Mini) */}
         {currentUser.isGuest && (
             <div className="bg-blue-50 px-4 py-1.5 flex justify-between items-center border-b border-blue-100">
                 <span className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                    <LogIn size={12} /> Bạn đang là Khách. Đăng nhập để lưu điểm nhé!
                 </span>
                 <button onClick={onOpenAuth} className="text-[10px] font-bold text-blue-600 underline">Đăng nhập</button>
             </div>
         )}
         
         {/* Link Input Popover */}
         {showLinkInput && (
             <div className="bg-white border-b border-gray-200 p-2 flex gap-2 animate-slide-up">
                 <input 
                    type="url" 
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Dán đường link vào đây..."
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                    autoFocus
                 />
                 <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg">Chèn</button>
                 <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-1"><X size={18}/></button>
             </div>
         )}

         {/* Image Preview in Input */}
         {answerImage && (
             <div className="px-4 pt-2 flex items-center gap-2">
                 <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-gray-200">
                     <img src={answerImage} className="w-full h-full object-cover" />
                     <button onClick={() => setAnswerImage(null)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5"><X size={12}/></button>
                 </div>
                 <span className="text-xs text-green-600 font-bold">Đã chọn 1 ảnh</span>
             </div>
         )}

         <div className="px-3 py-2 flex items-end gap-2 max-w-3xl mx-auto">
             {/* Action Buttons (Left) */}
             <div className="flex items-center gap-1 mb-1">
                 <button 
                    onClick={handleAiDraft}
                    disabled={isGeneratingDraft}
                    className="p-2.5 rounded-full bg-orange-50 text-orange-500 active:scale-90 transition-transform"
                    title="AI Gợi ý"
                 >
                    {isGeneratingDraft ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                 </button>
                 
                 <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 active:scale-90 transition-transform">
                     {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                 </button>
                 
                 <button onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}} className={`p-2.5 rounded-full transition-transform active:scale-90 ${showStickers ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                    <Smile size={20} />
                 </button>

                 <button onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}} className={`p-2.5 rounded-full transition-transform active:scale-90 ${showLinkInput ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                    <LinkIcon size={20} />
                 </button>

                 <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
             </div>

             {/* Input Area */}
             <div className="flex-1 bg-gray-100 rounded-[1.5rem] px-4 py-2.5 flex items-center border border-transparent focus-within:bg-white focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                 <textarea
                     ref={answerInputRef}
                     value={newAnswer}
                     onChange={(e) => {
                         setNewAnswer(e.target.value);
                         setShowStickers(false);
                     }}
                     onClick={() => {setShowStickers(false); setShowLinkInput(false)}}
                     placeholder={currentUser.isGuest ? "Trả lời với tư cách Khách..." : "Viết câu trả lời..."}
                     className="w-full bg-transparent border-none outline-none text-[15px] placeholder-gray-400 resize-none max-h-[120px] py-0.5"
                     rows={1}
                 />
             </div>

             {/* Send Button */}
             <button 
                 onClick={handleSubmitAnswer}
                 disabled={(!newAnswer.trim() && !answerImage) || isSubmitting}
                 className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/30 active:scale-90 disabled:opacity-50 disabled:shadow-none transition-all mb-0.5"
             >
                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={newAnswer.trim() ? "translate-x-0.5" : ""} />}
             </button>
         </div>

         {/* Sticker Drawer (Conditional) */}
         {showStickers && (
            <div className="h-48 overflow-y-auto bg-gray-50 border-t border-gray-100 p-4 animate-slide-up">
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
      </div>

      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={question.title}
      />
    </div>
  );
};
