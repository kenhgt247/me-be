
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { 
  ArrowLeft, Heart, MessageCircle, ShieldCheck, 
  Sparkles, Loader2, Send, MoreVertical, Trash2, Edit2, 
  Share2, Image as ImageIcon, X, Smile, Link as LinkIcon,
  ThumbsUp, CheckCircle2, Eye, Bookmark, Filter, LogIn, AtSign, Paperclip
} from 'lucide-react';
import { Question, Answer, User, getIdFromSlug } from '../types';
import { generateDraftAnswer } from '../services/gemini';
import { toggleQuestionLikeDb, toggleSaveQuestion, toggleAnswerUseful } from '../services/db';
import { ShareModal } from '../components/ShareModal';
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';
import { AdBanner } from '../components/AdBanner';

interface DetailProps {
  questions: Question[];
  currentUser: User;
  onAddAnswer: (questionId: string, answer: Answer) => void;
  onMarkBestAnswer: (questionId: string, answerId: string) => void;
  onVerifyAnswer: (questionId: string, answerId: string) => void;
  onOpenAuth: () => void;
  onEditQuestion: (id: string, title: string, content: string) => void;
  onDeleteQuestion: (id: string) => void;
  onHideQuestion: (id: string) => void;
  onEditAnswer: (qId: string, aId: string, content: string) => void;
  onDeleteAnswer: (qId: string, aId: string) => void;
  onHideAnswer: (qId: string, aId: string) => void;
}

const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪"]
};

// --- SUBCOMPONENTS ---

const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700">
        <X size={24} />
      </button>
      <img src={url} className="max-w-full max-h-full object-contain p-2" onClick={(e) => e.stopPropagation()} />
    </div>
  );
};

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

// IMPROVED RICH TEXT RENDERER TO SUPPORT IMAGES
const RichTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  // 1. Check for Big Emoji (Only emojis, short length)
  const isBigEmoji = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u.test(content) && [...content].length <= 5;
  if (isBigEmoji) {
      return <div className="text-5xl md:text-6xl py-2 animate-pop-in">{content}</div>;
  }

  // 2. Split content by Image Markdown: ![alt](url)
  // This regex captures the whole image tag
  const imageRegex = /(!\[.*?\]\(https?:\/\/[^\s)]+\))/g;
  const parts = content.split(imageRegex);

  return (
    <div className="text-[15px] text-textDark leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        // Check if part is an image markdown
        const imgMatch = part.match(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
        if (imgMatch) {
           return (
             <img 
               key={i} 
               src={imgMatch[2]} 
               alt={imgMatch[1] || 'Image'} 
               className="max-w-full h-auto rounded-xl my-3 border border-gray-100 shadow-sm block hover:opacity-95 cursor-zoom-in" 
               loading="lazy"
               onClick={() => window.open(imgMatch[2], '_blank')}
             />
           );
        }

        // Process Links and Mentions in text parts
        const subRegex = /((?:https?:\/\/[^\s]+)|(?:@[\w\p{L}]+))/gu;
        const subParts = part.split(subRegex);
        
        return (
          <span key={i}>
            {subParts.map((subPart, j) => {
               if (subPart.match(/^https?:\/\//)) {
                  return (
                    <a key={j} href={subPart} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                      {subPart}
                    </a>
                  );
               }
               if (subPart.startsWith('@')) {
                  return <span key={j} className="font-bold text-blue-600 bg-blue-50 px-1 rounded hover:bg-blue-100 cursor-pointer transition-colors">{subPart}</span>;
               }
               return subPart;
            })}
          </span>
        );
      })}
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function QuestionDetail({ 
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
}: DetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const questionId = getIdFromSlug(slug);
  const question = questions.find(q => q.id === questionId);
  
  // --- STATE ---
  const [newAnswer, setNewAnswer] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<'best' | 'newest' | 'oldest'>('best');
  const [isSaved, setIsSaved] = useState(false);
  
  // Tool States
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // Mention States
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [answerImage, setAnswerImage] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const participants = useMemo(() => {
    if (!question) return [];
    const usersMap = new Map<string, User>();
    usersMap.set(question.author.id, question.author);
    question.answers.forEach(a => usersMap.set(a.author.id, a.author));
    if (currentUser && !currentUser.isGuest) {
        usersMap.delete(currentUser.id);
    }
    return Array.from(usersMap.values());
  }, [question, currentUser]);

  const filteredParticipants = useMemo(() => {
      if (!mentionQuery) return participants;
      return participants.filter(p => p.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [participants, mentionQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser && question) {
        setIsSaved(currentUser.savedQuestions?.includes(question.id) || false);
    }
  }, [currentUser, question]);

  useEffect(() => {
    if (answerInputRef.current) {
      answerInputRef.current.style.height = 'auto';
      answerInputRef.current.style.height = Math.min(answerInputRef.current.scrollHeight, 150) + 'px';
    }
  }, [newAnswer]);

  if (!question) return <div className="p-10 text-center text-gray-500 font-medium mt-10">Đang tải câu hỏi hoặc câu hỏi không tồn tại...</div>;

  const isOwner = currentUser.id === question.author.id;
  const isAdmin = currentUser.isAdmin;

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

  const handleSave = async () => {
    try {
        const user = await ensureAuth();
        const newStatus = !isSaved;
        setIsSaved(newStatus);
        await toggleSaveQuestion(user.id, question.id, newStatus);
    } catch (e) {
         if ((e as any).message !== "LOGIN_REQUIRED") {
             setIsSaved(!isSaved);
             alert("Không thể lưu. Vui lòng thử lại.");
         }
    }
  };

  const handleToggleUseful = async (ans: Answer) => {
      try {
          const user = await ensureAuth();
          await toggleAnswerUseful(question.id, ans.id, user.id);
      } catch (e) {
          // ignore, ensureAuth handles auth modal
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
    }

    try {
        setUploadingImage(true);
        await ensureAuth();
        const url = await uploadFile(file, 'answer_images');
        setAnswerImage(url);
    } catch (e: any) {
        console.error("Upload error details:", e);
        if (e.message.includes('unauthorized') || e.message.includes('permission')) {
            alert("Lỗi quyền: Bạn không có quyền đăng ảnh vào bình luận. Vui lòng kiểm tra Storage Rules trên Firebase Console.");
        } else {
            alert(`Lỗi tải ảnh: ${e.message}`);
        }
    } finally {
        setUploadingImage(false);
        if (e.target) e.target.value = ''; // Reset file input
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNewAnswer(val);
      setShowStickers(false);

      const lastWord = val.split(/[\s\n]+/).pop();
      if (lastWord && lastWord.startsWith('@')) {
          setShowMentions(true);
          setMentionQuery(lastWord.slice(1));
      } else {
          setShowMentions(false);
      }
  };

  const handleSelectMention = (user: User) => {
      const textBefore = newAnswer.substring(0, newAnswer.lastIndexOf('@'));
      setNewAnswer(textBefore + `@${user.name} `);
      setShowMentions(false);
      answerInputRef.current?.focus();
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
    setNewAnswer(prev => prev + ` ${safeUrl} `);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleInsertSticker = (sticker: string) => {
     setNewAnswer(prev => prev + sticker);
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
      {previewImage && <ImageViewer url={previewImage} onClose={() => setPreviewImage(null)} />}

      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between pt-safe-top shadow-sm transition-all">
         <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full active:scale-95 transition-all text-gray-600">
             <ArrowLeft size={22} />
         </button>
         <h1 className="font-bold text-textDark truncate max-w-[200px] text-center text-[15px]">{question.category}</h1>
         
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
          <div className="bg-white md:rounded-[2rem] md:mt-4 p-6 pb-4 shadow-sm border-b md:border border-gray-200 relative">
             <div className="flex items-center justify-between mb-4">
                 <RouterLink to={`/profile/${question.author.id}`} className="flex items-center gap-3 group">
                     <div className="relative">
                        <img src={question.author.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-active:scale-95 transition-transform" />
                        {question.author.isExpert && <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white"><ShieldCheck size={12} /></div>}
                     </div>
                     <div>
                         <h3 className="font-bold text-textDark text-[16px] flex items-center gap-1 leading-tight">
                             {question.author.name}
                         </h3>
                         <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                             <span>{new Date(question.createdAt).toLocaleDateString('vi-VN')}</span>
                             <span>•</span>
                             <span className="flex items-center gap-0.5"><Eye size={12}/> {question.views || 0}</span>
                         </div>
                     </div>
                 </RouterLink>
                 <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${getTagColor(question.category)}`}>
                     {question.category}
                 </span>
             </div>

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
                     <h2 className="text-[18px] md:text-xl font-bold text-textDark mb-3 leading-snug">{question.title}</h2>
                     <RichTextRenderer content={question.content} />
                     <FBImageGridDetail images={question.images || []} onImageClick={setPreviewImage} />
                 </div>
             )}

             <div className="flex items-center justify-between py-3 border-t border-gray-50 mt-4">
                 <div className="flex items-center gap-6">
                     <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-bold transition-all active:scale-90 ${question.likes > 0 ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                         <Heart size={20} className={question.likes > 0 ? "fill-red-500" : ""} />
                         <span>{question.likes > 0 ? question.likes : 'Thích'}</span>
                     </button>
                     <button onClick={() => answerInputRef.current?.focus()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-500 transition-all active:scale-90">
                         <MessageCircle size={20} />
                         <span>{question.answers.length > 0 ? question.answers.length : 'Trả lời'}</span>
                     </button>
                 </div>
                 <button onClick={handleSave} className={`transition-colors active:scale-90 ${isSaved ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}>
                     <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
                 </button>
             </div>
          </div>

          <div className="px-4 py-6 flex items-center justify-between">
              <h3 className="font-bold text-textDark text-lg">Trả lời ({question.answers.length})</h3>
              <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                  <button onClick={() => setSortOption('best')} className={`p-1.5 rounded-md transition-all ${sortOption === 'best' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-400'}`} title="Phù hợp nhất">
                      <Sparkles size={16} />
                  </button>
                  <button onClick={() => setSortOption('newest')} className={`p-1.5 rounded-md transition-all ${sortOption === 'newest' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400'}`} title="Mới nhất">
                      <Filter size={16} />
                  </button>
              </div>
          </div>

          <div className="space-y-4 px-4 pb-4">
              {question.answers.length === 0 && (
                  <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-gray-300">
                      <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-small">
                          <MessageCircle size={32} />
                      </div>
                      <p className="text-textDark font-bold text-lg mb-1">Chưa có thảo luận</p>
                      <p className="text-sm text-textGray">Hãy là người đầu tiên chia sẻ kiến thức nhé!</p>
                  </div>
              )}

              {sortedAnswers.map((ans, index) => {
                  const isAnsOwner = currentUser.id === ans.author.id;
                  const isBest = ans.isBestAnswer;
                  const isVerified = ans.isExpertVerified;
                  const isUseful = (ans.usefulBy || []).includes(currentUser.id);
                  
                  return (
                    <React.Fragment key={ans.id}>
                        {(index === 0) && <AdBanner className="mb-4" debugLabel="Detail Middle Ad" />}
                        
                        <div className={`bg-white p-5 rounded-3xl border transition-all ${isBest ? 'border-yellow-400 shadow-lg shadow-yellow-100 ring-1 ring-yellow-200' : 'border-gray-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <RouterLink to={`/profile/${ans.author.id}`}>
                                    <div className="relative">
                                        <img src={ans.author.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-gray-50" />
                                        {ans.author.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white"><ShieldCheck size={10} /></div>}
                                    </div>
                                    </RouterLink>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-sm text-textDark">{ans.author.name}</span>
                                            {ans.author.isExpert && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Chuyên gia</span>}
                                            {ans.author.isGuest && <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Khách</span>}
                                        </div>
                                        <span className="text-[11px] text-gray-400">{new Date(ans.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {(isOwner || isAdmin) && !isBest && (
                                        <button onClick={() => onMarkBestAnswer(question.id, ans.id)} className="text-gray-300 hover:text-yellow-500 transition-colors p-1" title="Chọn hay nhất">
                                            <Sparkles size={18} />
                                        </button>
                                    )}
                                    {(isAnsOwner || isAdmin) && (
                                        <button onClick={(e) => toggleMenu(ans.id, e)} className="text-gray-400 p-1 hover:bg-gray-50 rounded-full">
                                            <MoreVertical size={18} />
                                        </button>
                                    )}
                                </div>
                                
                                {activeMenuId === ans.id && (
                                    <div ref={menuRef} className="absolute right-6 mt-6 bg-white rounded-xl shadow-lg border border-gray-100 w-32 overflow-hidden z-20 animate-pop-in">
                                        <button onClick={() => onDeleteAnswer(question.id, ans.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mb-3 pl-1">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {isBest && (
                                        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                            <CheckCircle2 size={12} /> Câu trả lời hay nhất
                                        </div>
                                    )}
                                    {isVerified && (
                                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold border border-green-100">
                                            <ShieldCheck size={12} /> Đã xác thực y khoa
                                        </span>
                                    )}
                                </div>
                                <RichTextRenderer content={ans.content} />
                            </div>

                            <div className="flex items-center gap-4 border-t border-gray-50 pt-3 mt-2">
                                <button 
                                    onClick={() => handleToggleUseful(ans)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 group ${
                                        isUseful ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-500 hover:bg-gray-100 font-medium'
                                    }`}
                                >
                                    <ThumbsUp size={16} className={`group-hover:scale-110 transition-transform ${isUseful ? 'fill-current scale-110' : ''}`} /> 
                                    <span className="text-xs">Hữu ích {ans.likes > 0 ? `(${ans.likes})` : ''}</span>
                                </button>
                                {isAdmin && !isVerified && (
                                    <button onClick={() => onVerifyAnswer(question.id, ans.id)} className="text-xs font-bold text-gray-400 hover:text-green-600 ml-auto flex items-center gap-1">
                                        <ShieldCheck size={14} /> Xác thực
                                    </button>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                  );
              })}
          </div>
          
          <AdBanner className="mx-4 md:mx-0 mb-4" debugLabel="Detail Bottom Ad" />
      </div>

      <div className="fixed bottom-[88px] md:bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-5px_30px_rgba(0,0,0,0.06)] pb-2 md:pb-safe-bottom">
         {currentUser.isGuest && (
             <div className="bg-blue-50 px-4 py-1.5 flex justify-between items-center text-[10px] text-blue-700 border-b border-blue-100">
                 <span className="font-bold flex items-center gap-1"><LogIn size={12} /> Bạn đang là Khách</span>
                 <button onClick={onOpenAuth} className="font-bold underline hover:text-blue-900">Đăng nhập ngay</button>
             </div>
         )}

         {showMentions && filteredParticipants.length > 0 && (
             <div className="absolute bottom-full left-2 right-2 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-48 overflow-y-auto animate-slide-up max-w-lg mx-auto">
                 <div className="bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0">Gợi ý nhắc đến</div>
                 {filteredParticipants.map(p => (
                     <button key={p.id} onClick={() => handleSelectMention(p)} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50">
                         <img src={p.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                         <div>
                             <p className="font-bold text-sm text-textDark">{p.name}</p>
                             <p className="text-[10px] text-gray-400">{p.isExpert ? 'Chuyên gia' : 'Thành viên'}</p>
                         </div>
                     </button>
                 ))}
             </div>
         )}

         {showLinkInput && (
             <div className="bg-white border-b border-gray-200 p-3 flex gap-2 animate-slide-up items-center">
                 <input 
                    type="url" 
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Dán đường dẫn vào đây..."
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    autoFocus
                 />
                 <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform">Chèn</button>
                 <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"><X size={18}/></button>
             </div>
         )}

         {answerImage && (
             <div className="px-4 pt-3 flex items-center gap-2">
                 <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                     <img src={answerImage} className="w-full h-full object-cover" />
                     <button onClick={() => setAnswerImage(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-500 transition-colors"><X size={12}/></button>
                 </div>
                 <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">Ảnh đã sẵn sàng</span>
             </div>
         )}

         <div className="px-3 py-3 max-w-3xl mx-auto flex items-end gap-2">
             <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-full p-1 shadow-sm mb-0.5">
                 <button 
                    onClick={handleAiDraft}
                    disabled={isGeneratingDraft}
                    className="p-2.5 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 text-indigo-600 active:scale-90 transition-transform"
                    title="AI Gợi ý câu trả lời"
                 >
                    {isGeneratingDraft ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                 </button>
                 
                 <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-primary active:scale-90 transition-transform">
                    {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                 </button>
                 
                 <button onClick={() => {setShowStickers(!showStickers); setShowLinkInput(false)}} className={`p-2.5 rounded-full transition-transform active:scale-90 ${showStickers ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100 hover:text-yellow-500'}`}>
                    <Smile size={20} />
                 </button>

                 <button onClick={() => {setShowLinkInput(!showLinkInput); setShowStickers(false)}} className={`hidden md:block p-2.5 rounded-full transition-transform active:scale-90 ${showLinkInput ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-blue-500'}`}>
                    <Paperclip size={20} />
                 </button>

                 <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
             </div>

             <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-transparent focus-within:bg-white focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/10 transition-all flex items-center px-4 py-2 min-h-[48px]">
                 <textarea
                    ref={answerInputRef}
                    value={newAnswer}
                    onChange={handleInputChange}
                    onClick={() => {setShowStickers(false); setShowLinkInput(false)}}
                    placeholder="Viết câu trả lời..."
                    className="w-full bg-transparent border-none outline-none text-[15px] placeholder-gray-400 resize-none max-h-[120px] py-1"
                    rows={1}
                 />
                 <button 
                     onClick={() => setNewAnswer(prev => prev + "@")} 
                     className="text-gray-400 hover:text-blue-500 p-1 rounded-md transition-colors md:hidden"
                 >
                     <AtSign size={18} />
                 </button>
             </div>

             <button 
                onClick={handleSubmitAnswer}
                disabled={(!newAnswer.trim() && !answerImage) || isSubmitting}
                className="p-3 bg-gradient-to-tr from-primary to-[#26A69A] text-white rounded-full shadow-lg shadow-primary/30 active:scale-90 disabled:opacity-50 disabled:shadow-none transition-all mb-0.5 hover:shadow-xl"
             >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className={newAnswer.trim() ? "translate-x-0.5" : ""} />}
             </button>
         </div>

         {showStickers && (
             <div className="h-56 overflow-y-auto bg-gray-50 border-t border-gray-100 p-4 animate-slide-up shadow-inner">
                 {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                     <div key={category} className="mb-4">
                         <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider sticky top-0 bg-gray-50 py-1 z-10">{category}</h4>
                         <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                             {emojis.map(emoji => (
                                 <button 
                                     key={emoji} 
                                     onClick={() => handleInsertSticker(emoji)}
                                     className="text-3xl hover:scale-125 transition-transform active:scale-90 p-2"
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
}
