import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, ShieldCheck,
  Sparkles, Loader2, Send, MoreVertical, Trash2, Edit2,
  Share2, Image as ImageIcon, X, Smile,
  ThumbsUp, CheckCircle2, Eye, Bookmark, Filter, LogIn, AtSign, Paperclip, Flag, ExternalLink, Info,
  TrendingUp, ChevronDown
} from 'lucide-react';

import { Question, Answer, User, getIdFromSlug, AdConfig, toSlug } from '../types';
import { generateDraftAnswer } from '../services/gemini';
import { toggleQuestionLikeDb, toggleSaveQuestion, toggleAnswerUseful, sendReport } from '../services/db';
import { getAdConfig } from '../services/ads';
import { ShareModal } from '../components/ShareModal';
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';
import { ExpertPromoBox } from '../components/ExpertPromoBox';

// --- INTERFACES ---

interface DetailProps {
  questions: Question[];
  currentUser: User;
  onAddAnswer: (questionId: string, answer: Answer) => Promise<void>;
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

// --- SUB-COMPONENTS ---

const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
        <X size={24} />
      </button>
      <img src={url} className="max-w-full max-h-full object-contain p-2" onClick={(e) => e.stopPropagation()} alt="Preview" />
    </div>
  );
};

const FBImageGridDetail: React.FC<{ images?: string[]; onImageClick: (url: string) => void }> = ({ images, onImageClick }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;

  const ImageItem = ({ src }: { src: string }) => (
    <img 
      src={src} 
      className="w-full h-full object-cover cursor-pointer active:opacity-90 hover:opacity-95 transition-opacity" 
      onClick={() => onImageClick(src)} 
      loading="lazy" 
      alt="Detail" 
    />
  );

  const containerClass = "mt-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800 shadow-sm";

  if (count === 1) return <div className={containerClass}><img src={images[0]} className="w-full max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={() => onImageClick(images[0])} alt="Single" /></div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-72`}><ImageItem src={images[0]} /><ImageItem src={images[1]} /></div>;
  
  return (
    <div className={`${containerClass} grid grid-cols-2 gap-1 h-72`}>
      <div className={count === 3 ? "row-span-2" : ""}>
         <ImageItem src={images[0]} />
      </div>
      <div className="grid grid-rows-2 gap-1 h-full">
        <ImageItem src={images[1]} />
        <div className="relative w-full h-full cursor-pointer active:opacity-90" onClick={() => onImageClick(images[2])}>
          <img src={images[2]} className="w-full h-full object-cover" alt="More" />
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

const RichTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  const isBigEmoji = useMemo(() => {
    return /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u.test(content) && [...content].length <= 5;
  }, [content]);

  if (isBigEmoji) return <div className="text-5xl md:text-6xl py-4 animate-pop-in">{content}</div>;

  const parts = content.split(/(!\[.*?\]\(https?:\/\/[^\s)]+\))/g);

  return (
    <div className="text-[15px] md:text-[16px] text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        const imgMatch = part.match(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
        if (imgMatch) {
          return (
            <img 
              key={i} 
              src={imgMatch[2]} 
              alt={imgMatch[1]} 
              className="max-w-full h-auto rounded-xl my-4 border border-gray-100 dark:border-slate-700 shadow-sm block cursor-zoom-in" 
              onClick={() => window.open(imgMatch[2], '_blank')} 
            />
          );
        }
        
        return (
          <span key={i}>
            {part.split(/((?:https?:\/\/[^\s]+)|(?:@[\w\p{L}]+))/gu).map((sub, j) => {
              if (sub.match(/^https?:\/\//)) {
                return <a key={j} href={sub} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium break-all">{sub}</a>;
              }
              if (sub.startsWith('@')) {
                return <span key={j} className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded cursor-pointer">{sub}</span>;
              }
              return sub;
            })}
          </span>
        );
      })}
    </div>
  );
};

const QuestionDetailAd = ({ config }: { config: NonNullable<AdConfig['questionDetailAd']> }) => {
  if (!config || !config.enabled) return null;
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm dark:shadow-none p-4 animate-fade-in relative overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-300 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold tracking-wider">AD</div>
      <a href={config.link} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-3">
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-slate-800 shrink-0 overflow-hidden border border-gray-100 dark:border-slate-700">
            {config.imageUrl ? (
              <img src={config.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="ad" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📢</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-0.5 flex items-center gap-1">
              <Sparkles size={10} /> {config.sponsorName}
            </p>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {config.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-snug">
              {config.description}
            </p>
          </div>
        </div>
        <button className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center justify-center gap-1">
          {config.ctaText} <ExternalLink size={12} />
        </button>
      </a>
    </div>
  );
};

const ReportModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (reason: string) => void }> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-card rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-pop-in border border-gray-100 dark:border-dark-border">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Flag className="text-red-500" size={20} /> Báo cáo vi phạm</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Giúp chúng tôi giữ cộng đồng trong sạch.</p>
        <textarea
          className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl mb-4 text-sm focus:border-red-500 outline-none bg-gray-50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-colors resize-none"
          rows={4}
          placeholder="Nhập lý do..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Hủy</button>
          <button onClick={() => onSubmit(reason)} disabled={!reason.trim()} className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">Gửi báo cáo</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function QuestionDetail({
  questions, currentUser, onAddAnswer, onMarkBestAnswer, onVerifyAnswer,
  onOpenAuth, onEditQuestion, onDeleteQuestion, onDeleteAnswer
}: DetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const questionId = useMemo(() => getIdFromSlug(slug), [slug]);
  const question = useMemo(() => questions.find(q => q.id === questionId), [questions, questionId]);

  // --- STATE ---
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  
  // Interaction State
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sortOption, setSortOption] = useState<'best' | 'newest' | 'oldest'>('newest');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Answer Form State
  const [newAnswer, setNewAnswer] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [answerImage, setAnswerImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false); 
  
  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Editing Question State
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');

  // Save State
  const [isSaved, setIsSaved] = useState(false);

  // Reporting State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string, type: 'question' | 'answer' } | null>(null);

  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---

  useEffect(() => {
    getAdConfig().then(setAdConfig).catch(e => console.error("Failed to load ads config", e));
  }, []);

  useEffect(() => {
    if (currentUser && question) {
      setIsSaved(currentUser.savedQuestions?.includes(question.id) || false);
    }
  }, [currentUser, question]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (answerInputRef.current) {
      answerInputRef.current.style.height = 'auto';
      answerInputRef.current.style.height = Math.min(answerInputRef.current.scrollHeight, 150) + 'px';
    }
  }, [newAnswer]);

  useEffect(() => {
    if (isInputOpen && answerInputRef.current) {
      setTimeout(() => answerInputRef.current?.focus(), 300);
    }
  }, [isInputOpen]);

  // --- MEMOIZED DATA ---

  const trendingQuestions = useMemo(() => {
    if (!questions || !question) return [];
    return questions
      .filter(q => q.id !== question.id)
      .sort((a, b) => {
        // Safe access to likes if it's undefined
        const likesA = Array.isArray(a.likes) ? a.likes.length : (typeof a.likes === 'number' ? a.likes : 0);
        const likesB = Array.isArray(b.likes) ? b.likes.length : (typeof b.likes === 'number' ? b.likes : 0);
        return ((b.views || 0) + likesB) - ((a.views || 0) + likesA);
      })
      .slice(0, 5);
  }, [questions, question]);

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

  const sortedAnswers = useMemo(() => {
    if (!question) return [];
    return [...question.answers].sort((a, b) => {
      if (a.isBestAnswer) return -1;
      if (b.isBestAnswer) return 1;
      if (a.isExpertVerified && !b.isExpertVerified) return -1;
      if (b.isExpertVerified && !a.isExpertVerified) return 1;
      
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      if (sortOption === 'newest') return timeB - timeA;
      if (sortOption === 'oldest') return timeA - timeB;
      if (sortOption === 'best') return b.likes - a.likes; // Answers use 'likes' as number
      
      return timeB - timeA;
    });
  }, [question, sortOption]);

  // ✅ SỬA LỖI HIỂN THỊ LIKE: Tính toán số lượng và trạng thái
  const likesCount = useMemo(() => {
      if (!question) return 0;
      return Array.isArray(question.likes) ? question.likes.length : (typeof question.likes === 'number' ? question.likes : 0);
  }, [question]);

  const isLiked = useMemo(() => {
      if (!question || !currentUser) return false;
      return Array.isArray(question.likes) 
          ? question.likes.includes(currentUser.id) 
          : false; 
  }, [question, currentUser]);

  // --- HANDLERS ---

  const ensureAuth = useCallback(async (): Promise<User> => {
    if (currentUser.isGuest) {
      try {
        return await loginAnonymously();
      } catch {
        onOpenAuth();
        throw new Error("LOGIN_REQUIRED");
      }
    }
    return currentUser;
  }, [currentUser, onOpenAuth]);

  const handleLike = useCallback(async () => {
    if (!question) return;
    try {
      const user = await ensureAuth();
      toggleQuestionLikeDb(question, user);
    } catch (e) { /* ignore */ }
  }, [question, ensureAuth]);

  const handleSave = useCallback(async () => {
    if (!question) return;
    try {
      const user = await ensureAuth();
      const newStatus = !isSaved;
      setIsSaved(newStatus);
      await toggleSaveQuestion(user.id, question.id, newStatus);
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== "LOGIN_REQUIRED") {
        setIsSaved(prev => !prev);
        alert("Lỗi lưu câu hỏi.");
      }
    }
  }, [question, isSaved, ensureAuth]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploadingImage(true);
      await ensureAuth();
      const url = await uploadFile(f, 'answer_images');
      setAnswerImage(url);
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== "LOGIN_REQUIRED") alert("Lỗi tải ảnh");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
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
    if (!linkUrl) { setShowLinkInput(false); return; }
    let safeUrl = linkUrl;
    if (!safeUrl.startsWith('http')) safeUrl = `https://${safeUrl}`;
    setNewAnswer(prev => prev + ` ${safeUrl} `);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleSubmitAnswer = async () => {
    if (!question) return;
    if (!newAnswer.trim() && !answerImage) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setShowStickers(false);

    try {
      const user = await ensureAuth();
      let content = newAnswer;
      if (answerImage) content += `\n\n![Image](${answerImage})`;

      const ans: Answer = {
        id: Date.now().toString(),
        questionId: question.id,
        author: user,
        content,
        likes: 0,
        isBestAnswer: false,
        createdAt: new Date().toISOString(),
        isAi: false
      };

      await onAddAnswer(question.id, ans);
      
      setNewAnswer('');
      setAnswerImage(null);
      setIsInputOpen(false);
      
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== "LOGIN_REQUIRED") alert("Lỗi gửi câu trả lời.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiDraft = async () => {
    if (!question) return;
    setIsGeneratingDraft(true);
    try {
      const draft = await generateDraftAnswer(question.title, question.content);
      setNewAnswer(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleReport = (id: string, type: 'question' | 'answer') => {
    setReportTarget({ id, type });
    setShowReportModal(true);
    setActiveMenuId(null);
  };

  const submitReport = async (reason: string) => {
    if (!reportTarget) return;
    try {
      let user = currentUser;
      if (user.isGuest) {
        try { user = await loginAnonymously(); } catch { onOpenAuth(); return; }
      }
      await sendReport(reportTarget.id, reportTarget.type, reason, user.id);
      alert("Đã gửi báo cáo thành công.");
      setShowReportModal(false);
    } catch {
      alert("Lỗi khi gửi báo cáo.");
    }
  };

  const handleToggleUseful = async (ans: Answer) => {
    if (!question) return;
    try {
      const user = await ensureAuth();
      await toggleAnswerUseful(question.id, ans.id, user.id);
    } catch (e) { /* ignore */ }
  };

  if (!question) {
    return (
      <div className="p-10 text-center text-gray-500 font-medium mt-10 flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-primary" /> Đang tải câu hỏi...
      </div>
    );
  }

  const isOwner = currentUser.id === question.author.id;
  const isAdmin = currentUser.isAdmin;

  const getTagColor = (cat: string) => {
    if (cat.includes('Mang thai')) return 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-900';
    if (cat.includes('Dinh dưỡng')) return 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
    return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-[100px] selectable-text animate-fade-in transition-colors duration-300">
      {previewImage && <ImageViewer url={previewImage} onClose={() => setPreviewImage(null)} />}

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between pt-safe-top shadow-sm transition-colors">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all text-gray-600 dark:text-gray-300">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-bold text-textDark dark:text-white truncate max-w-[200px] text-sm">{question.category}</h1>
        <div className="flex gap-1">
          <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full text-blue-600 dark:text-blue-400">
            <Share2 size={20} />
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === 'q_menu' ? null : 'q_menu'); }} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300">
              <MoreVertical size={20} />
            </button>
            {activeMenuId === 'q_menu' && (
              <div ref={menuRef} className="absolute right-0 top-full mt-2 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border w-48 overflow-hidden z-30 animate-pop-in">
                {(isOwner || isAdmin) && (
                  <>
                    <button onClick={() => { setIsEditingQuestion(true); setEditQTitle(question.title); setEditQContent(question.content); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-white flex items-center gap-2">
                      <Edit2 size={16} /> Chỉnh sửa
                    </button>
                    <button onClick={() => onDeleteQuestion(question.id)} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 flex items-center gap-2">
                      <Trash2 size={16} /> Xóa
                    </button>
                  </>
                )}
                <button onClick={() => handleReport(question.id, 'question')} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center gap-2 border-t border-gray-50 dark:border-dark-border">
                  <Flag size={16} /> Báo cáo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- CONTENT LAYOUT --- */}
      <div className="max-w-6xl mx-auto w-full px-0 md:px-6 pt-4 md:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT MAIN COLUMN */}
          <main className="lg:col-span-8 space-y-6">

            {/* 1. QUESTION CARD */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-[2rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border relative transition-colors">
              
              {/* Author & Meta */}
              <div className="flex items-center justify-between mb-4">
                <RouterLink to={`/profile/${question.author.id}`} className="flex items-center gap-3 group">
                  <div className="relative">
                    <img src={question.author.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-dark-border shadow-sm group-hover:scale-105 transition-transform" alt="Avatar" />
                    {question.author.isExpert && <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-dark-card"><ShieldCheck size={12} /></div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-textDark dark:text-white text-[16px] leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{question.author.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      <span>{new Date(question.createdAt).toLocaleDateString('vi-VN')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Eye size={12} /> {question.views || 0}</span>
                    </div>
                  </div>
                </RouterLink>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${getTagColor(question.category)}`}>{question.category}</span>
              </div>

              {/* Edit Mode or View Mode */}
              {isEditingQuestion ? (
                <div className="space-y-3 mb-4">
                  <input value={editQTitle} onChange={e => setEditQTitle(e.target.value)} className="w-full font-bold text-lg border-b border-gray-200 dark:border-slate-700 bg-transparent text-textDark dark:text-white p-2 outline-none" />
                  <textarea value={editQContent} onChange={e => setEditQContent(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 text-textDark dark:text-white rounded-xl min-h-[120px] outline-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditingQuestion(false)} className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400">Hủy</button>
                    <button onClick={() => { onEditQuestion(question.id, editQTitle, editQContent); setIsEditingQuestion(false); }} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg">Lưu</button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-textDark dark:text-white mb-3 leading-snug">{question.title}</h2>
                  <RichTextRenderer content={question.content} />
                  <FBImageGridDetail images={question.images || []} onImageClick={setPreviewImage} />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between py-3 border-t border-gray-50 dark:border-slate-800">
                <div className="flex items-center gap-6">
                  
                  {/* ✅ NÚT LIKE: CHỈ HIỂN THỊ SỐ LƯỢNG */}
                  <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-bold transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}>
                    <Heart size={20} className={isLiked ? "fill-red-500" : ""} />
                    <span>{likesCount > 0 ? likesCount : 'Thích'}</span>
                  </button>

                  <button onClick={() => setIsInputOpen(true)} className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-all active:scale-90">
                    <MessageCircle size={20} /><span>{question.answers.length || 'Trả lời'}</span>
                  </button>
                </div>
                <button onClick={handleSave} className={`transition-colors active:scale-90 ${isSaved ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500 hover:text-orange-500'}`}>
                  <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
                </button>
              </div>
            </div>

            {/* 2. MOBILE AD & PROMO */}
            <div className="lg:hidden space-y-6">
              {adConfig?.isEnabled && adConfig.questionDetailAd && <QuestionDetailAd config={adConfig.questionDetailAd} />}
              {!currentUser?.isExpert && <ExpertPromoBox />}
            </div>

            {/* 3. ANSWERS LIST */}
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-textDark dark:text-white text-lg">Trả lời ({question.answers.length})</h3>
                <div className="flex bg-white dark:bg-dark-card rounded-lg p-1 shadow-sm border border-gray-200 dark:border-slate-700">
                  <button onClick={() => setSortOption('best')} title="Hay nhất/Nhiều like" className={`p-1.5 rounded-md transition-all ${sortOption === 'best' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}><Sparkles size={16} /></button>
                  <button onClick={() => setSortOption('newest')} title="Mới nhất" className={`p-1.5 rounded-md transition-all ${sortOption === 'newest' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Filter size={16} /></button>
                </div>
              </div>

              <div className="space-y-4">
                {question.answers.length === 0 && (
                  <div className="bg-white dark:bg-dark-card rounded-3xl p-10 text-center border border-dashed border-gray-300 dark:border-slate-700">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4"><MessageCircle size={32} /></div>
                    <p className="text-textDark dark:text-white font-bold text-lg mb-1">Chưa có thảo luận</p>
                    <p className="text-sm text-textGray dark:text-gray-400">Hãy là người đầu tiên chia sẻ kiến thức nhé!</p>
                  </div>
                )}

                {sortedAnswers.map((ans) => {
                  const isAnsOwner = currentUser.id === ans.author.id;
                  const isBest = ans.isBestAnswer;
                  const isVerified = ans.isExpertVerified;
                  const isUseful = (ans.usefulBy || []).includes(currentUser.id);

                  return (
                    <div key={ans.id} className={`bg-white dark:bg-dark-card p-5 rounded-3xl border transition-all ${isBest ? 'border-yellow-400 shadow-lg shadow-yellow-50 dark:shadow-none ring-1 ring-yellow-200 dark:ring-yellow-700' : 'border-gray-200 dark:border-dark-border shadow-sm dark:shadow-none'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <RouterLink to={`/profile/${ans.author.id}`}>
                            <div className="relative">
                              <img src={ans.author.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700" alt={ans.author.name} />
                              {ans.author.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-dark-card"><ShieldCheck size={10} /></div>}
                            </div>
                          </RouterLink>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-textDark dark:text-white">{ans.author.name}</span>
                              {ans.author.isExpert && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md">Chuyên gia</span>}
                            </div>
                            <span className="text-[11px] text-gray-400">{new Date(ans.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        
                        {/* Answer Actions Menu */}
                        <div className="flex items-center gap-2">
                          {(isOwner || isAdmin) && !isBest && (
                            <button onClick={() => onMarkBestAnswer(question.id, ans.id)} className="text-gray-300 hover:text-yellow-500 transition-colors p-1" title="Chọn hay nhất"><Sparkles size={18} /></button>
                          )}
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === ans.id ? null : ans.id); }} className="text-gray-400 p-1 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full"><MoreVertical size={18} /></button>
                            {activeMenuId === ans.id && (
                              <div ref={menuRef} className="absolute right-0 mt-2 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-100 dark:border-dark-border w-40 overflow-hidden z-20 animate-pop-in">
                                {(isAnsOwner || isAdmin) && (
                                  <button onClick={() => onDeleteAnswer(question.id, ans.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2">
                                    <Trash2 size={14} /> Xóa
                                  </button>
                                )}
                                <button onClick={() => handleReport(ans.id, 'answer')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-gray-50 dark:border-dark-border">
                                  <Flag size={14} /> Báo cáo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 pl-1">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {isBest && <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm"><CheckCircle2 size={12} /> Câu trả lời hay nhất</div>}
                          {isVerified && <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-[11px] font-bold border border-green-100 dark:border-green-900/30"><ShieldCheck size={12} /> Đã xác thực y khoa</span>}
                        </div>
                        <RichTextRenderer content={ans.content} />
                      </div>

                      <div className="flex items-center gap-4 border-t border-gray-50 dark:border-slate-800 pt-3 mt-2">
                        {/* ✅ NÚT HỮU ÍCH ĐÃ SỬA: SỬA MÀU SẮC ĐỂ KHÔNG BỊ TỆP MÀU NỀN */}
                        <button 
                          onClick={() => handleToggleUseful(ans)} 
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 group 
                            ${isUseful 
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-bold' 
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium'}`}
                        >
                          <ThumbsUp size={16} className={`group-hover:scale-110 transition-transform ${isUseful ? 'fill-current scale-110' : ''}`} /> 
                          {/* ✅ SỬA LOGIC: Luôn hiển thị số lượng */}
                          <span className="text-xs">Hữu ích ({ans.likes || 0})</span>
                        </button>

                        {isAdmin && !isVerified && <button onClick={() => onVerifyAnswer(question.id, ans.id)} className="text-xs font-bold text-gray-400 hover:text-green-600 dark:hover:text-green-400 ml-auto flex items-center gap-1"><ShieldCheck size={14} /> Xác thực</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:block lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              
              {!currentUser?.isExpert && (
                <div className="animate-slide-up">
                  <ExpertPromoBox />
                </div>
              )}

              {/* Trending */}
              {trendingQuestions.length > 0 && (
                <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] border border-gray-200 dark:border-dark-border shadow-sm">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-1.5 rounded-lg"><TrendingUp size={18} /></span>
                    Đáng quan tâm
                  </h3>
                  <div className="flex flex-col gap-4">
                    {trendingQuestions.map((q, idx) => (
                      <RouterLink to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="group flex gap-3 items-start">
                        <span className={`text-xl font-black leading-none mt-0.5 ${idx === 0 ? 'text-orange-500' : idx === 1 ? 'text-blue-500' : idx === 2 ? 'text-green-500' : 'text-gray-300 dark:text-slate-600'}`}>
                          0{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">{q.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                            <span>{q.answers.length} trả lời</span>
                            <span>•</span>
                            <span>{q.views} xem</span>
                          </div>
                        </div>
                      </RouterLink>
                    ))}
                  </div>
                </div>
              )}

              {/* Ads */}
              {adConfig?.isEnabled && adConfig.questionDetailAd && (
                <div className="bg-white dark:bg-dark-card p-4 rounded-[1.5rem] border border-gray-200 dark:border-dark-border shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider flex items-center gap-1"><Info size={12} /> Gợi ý cho bạn</h4>
                  <QuestionDetailAd config={adConfig.questionDetailAd} />
                </div>
              )}

              {/* Guidelines */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/30">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2 text-sm"><ShieldCheck size={16} /> Lưu ý cộng đồng</h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                  <li>Chia sẻ kinh nghiệm thực tế, khách quan.</li>
                  <li>Tôn trọng ý kiến khác biệt của các mẹ.</li>
                  <li>Không quảng cáo hoặc spam link lạ.</li>
                  <li>Luôn hỏi ý kiến bác sĩ nếu bé có dấu hiệu bất thường.</li>
                </ul>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* --- FOOTER / BOTTOM SHEET INPUT --- */}
      <div className={`fixed bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end ${isInputOpen ? 'z-[60]' : 'z-40'}`}>
        <div className="max-w-6xl w-full mx-auto px-0 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 relative">
              
              {/* Placeholder Bar */}
              {!isInputOpen && (
                <div className="pointer-events-auto bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border p-3 pb-safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:rounded-t-2xl md:border-x md:border-t lg:mb-0">
                  <button 
                    onClick={() => setIsInputOpen(true)}
                    className="w-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-left rounded-full px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span>Viết câu trả lời của bạn...</span>
                    <MessageCircle size={18} className="text-gray-400" />
                  </button>
                </div>
              )}

              {/* Bottom Sheet */}
              {isInputOpen && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden pointer-events-auto" 
                    onClick={() => setIsInputOpen(false)} 
                  />
                  <div className="pointer-events-auto bg-white dark:bg-dark-card w-full rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] animate-slide-up border border-gray-100 dark:border-slate-800 flex flex-col max-h-[85vh] md:max-h-[600px] relative z-50">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-slate-800 bg-white/95 dark:bg-dark-card/95 backdrop-blur rounded-t-3xl">
                      <span className="font-bold text-sm text-gray-500 dark:text-gray-400">Trả lời bình luận</span>
                      <button onClick={() => setIsInputOpen(false)} className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        <ChevronDown size={20} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 pb-safe-bottom overflow-y-auto custom-scrollbar">
                      {currentUser.isGuest && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl flex justify-between items-center text-xs text-blue-700 dark:text-blue-300 mb-3 border border-blue-100 dark:border-blue-900/30">
                          <span className="font-bold flex items-center gap-1"><LogIn size={14} /> Bạn đang là Khách</span>
                          <button onClick={onOpenAuth} className="font-bold underline hover:text-blue-900 dark:hover:text-blue-100">Đăng nhập ngay</button>
                        </div>
                      )}

                      {/* Mentions List */}
                      {showMentions && filteredParticipants.length > 0 && (
                        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-100 dark:border-dark-border max-h-40 overflow-y-auto mb-2">
                          {filteredParticipants.map(p => (
                            <button key={p.id} onClick={() => handleSelectMention(p)} className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 dark:hover:bg-slate-700 text-left border-b border-gray-50 dark:border-slate-800 last:border-0">
                              <img src={p.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600" alt={p.name} />
                              <div><p className="font-bold text-sm text-textDark dark:text-white">{p.name}</p></div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Link Input */}
                      {showLinkInput && (
                        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2 flex gap-2 mb-3">
                          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Dán link..." className="flex-1 text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:border-primary text-textDark dark:text-white" autoFocus />
                          <button onClick={handleInsertLink} className="bg-primary text-white text-xs font-bold px-3 rounded-lg">Thêm</button>
                          <button onClick={() => setShowLinkInput(false)} className="text-gray-400 p-1"><X size={16} /></button>
                        </div>
                      )}

                      {/* Image Preview */}
                      {answerImage && (
                        <div className="flex items-center gap-2 mb-3 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl w-fit border border-gray-200 dark:border-slate-700">
                          <img src={answerImage} className="w-12 h-12 rounded-lg object-cover" alt="Uploaded" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-bold">Ảnh đính kèm</span>
                          <button onClick={() => setAnswerImage(null)} className="bg-white dark:bg-slate-700 text-gray-400 p-1 rounded-full hover:text-red-500 shadow-sm"><X size={12} /></button>
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <textarea
                          ref={answerInputRef}
                          value={newAnswer}
                          onChange={handleInputChange}
                          onClick={() => { setShowStickers(false); setShowLinkInput(false); }}
                          placeholder="Nhập nội dung thảo luận..."
                          className="w-full bg-gray-50 dark:bg-slate-800 rounded-xl border-none outline-none text-[16px] resize-none min-h-[100px] p-3 placeholder-gray-400 dark:placeholder-gray-500 text-textDark dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
                        />

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <button onClick={handleAiDraft} disabled={isGeneratingDraft} className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100" title="AI Gợi ý">
                              {isGeneratingDraft ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700" disabled={uploadingImage}>
                              {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <button onClick={() => { setShowStickers(!showStickers); setShowLinkInput(false); }} className={`p-2 rounded-full ${showStickers ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100'}`}><Smile size={20} /></button>
                            <button onClick={() => { setShowLinkInput(!showLinkInput); setShowStickers(false); }} className={`p-2 rounded-full ${showLinkInput ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><Paperclip size={20} /></button>
                            <button onClick={() => setNewAnswer(prev => prev + "@")} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 md:hidden"><AtSign size={20} /></button>
                          </div>

                          <button onClick={handleSubmitAnswer} disabled={(!newAnswer.trim() && !answerImage) || isSubmitting} className="px-5 py-2 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <>Gửi <Send size={18} /></>}
                          </button>
                        </div>
                      </div>

                      {/* Stickers */}
                      {showStickers && (
                        <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mt-3 p-3 animate-slide-up">
                          {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                            <div key={category} className="mb-3">
                              <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-gray-50 dark:bg-slate-800 py-1">{category}</h4>
                              <div className="grid grid-cols-8 gap-2">
                                {emojis.map(emoji => (
                                  <button key={emoji} onClick={() => setNewAnswer(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Empty column to respect grid */}
            <div className="hidden lg:block lg:col-span-4"></div>
          </div>
        </div>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} url={window.location.href} title={question.title} />
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={submitReport} />
    </div>
  );
}
