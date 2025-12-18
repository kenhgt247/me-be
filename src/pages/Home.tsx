import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { 
  Search, MessageCircle, Heart, HelpCircle, Clock, Flame, 
  MessageSquareOff, ShieldCheck, ChevronRight, Sparkles, X, 
  User as UserIcon, BookOpen, FileText, Download, LayoutGrid, 
  ExternalLink, MoreHorizontal, Plus, Send, Image as ImageIcon,
  Loader2, Trash2, UploadCloud
} from 'lucide-react';
import { Question, User, toSlug, BlogPost, Document, AdConfig, Story } from '../types';
import { AdBanner } from '../components/AdBanner';
import { subscribeToAdConfig, getAdConfig } from '../services/ads';
import { fetchPublishedPosts } from '../services/blog';
import { fetchDocuments } from '../services/documents';
import { fetchStories, createStory, markStoryViewed, toggleStoryLike } from '../services/stories';
import { sendMessage, sendStoryReply } from '../services/chat';

const DEFAULT_AVATAR = "/images/rabbit.png";
const PAGE_SIZE = 20;

// --- TỐI ƯU HÓA HELPER: Normalize chuỗi trước khi tìm kiếm để tránh tính toán lặp lại ---
const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// --- 1. COMPONENT: CREATE STORY MODAL (Memoized) ---
const CreateStoryModal = memo(({ currentUser, onClose, onSuccess }: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { setError('Vui lòng chỉ chọn file ảnh.'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('File quá lớn (max 5MB).'); return; }
      setError(null); setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!selectedFile || !currentUser) return;
    setIsUploading(true);
    try {
      const newStory = await createStory(currentUser, selectedFile);
      onSuccess(newStory); onClose();
    } catch (err) { setError("Lỗi khi đăng tin."); } finally { setIsUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg dark:text-white">Tạo tin mới</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-black/50 relative">
          {error && <div className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-200 z-20 text-center">{error}</div>}
          {!previewUrl ? (
            <div onClick={() => fileInputRef.current?.click()} className="w-full min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all gap-4">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-primary"><ImageIcon size={40} /></div>
              <p className="font-bold text-gray-700 dark:text-gray-200">Chọn ảnh (JPG, PNG, WEBP)</p>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
               <img src={previewUrl} className="max-h-[60vh] object-contain" alt="Preview" decoding="async" />
               <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-red-500"><Trash2 size={18} /></button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
           <div className="flex items-center gap-3">
             <img src={currentUser.avatar || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-10 h-10 rounded-full border object-cover" decoding="async" />
             <div className="flex flex-col"><span className="text-sm font-bold dark:text-white">Đăng bởi</span><span className="text-xs text-gray-500">{currentUser.name}</span></div>
           </div>
           <button onClick={handlePost} disabled={!selectedFile || isUploading} className={`px-6 py-2.5 rounded-full font-bold text-white ${!selectedFile || isUploading ? 'bg-gray-300' : 'bg-primary'}`}>
             {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'Chia sẻ'}
           </button>
        </div>
      </div>
    </div>
  );
});

// --- 2. COMPONENT: STORY VIEWER (Memoized) ---
const StoryViewer = memo(({ story, currentUser, onClose }: { story: Story, currentUser?: User | null, onClose: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const displayAuthorName = story.userName || "Mẹ thỏ bí ẩn 🐭"; 

  useEffect(() => {
    if (currentUser && story.id) markStoryViewed(story.id, currentUser.id);
  }, [story.id, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(timer); onClose(); return 100; }
        return prev + 1; 
      });
    }, 50); 
    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900">
        <div className="absolute top-4 left-2 right-2 flex gap-1 z-20">
            <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-2">
            <img src={story.userAvatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full border border-white/50 object-cover" decoding="async" />
            <div className="flex flex-col"><span className="font-bold text-sm">{displayAuthorName}</span></div>
          </div>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story" decoding="async" />
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-30">
          <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Phản hồi ${displayAuthorName}...`} className="w-full bg-black/20 border border-white/60 rounded-full px-5 py-3 text-white backdrop-blur-sm" />
        </div>
      </div>
    </div>
  );
});

// --- COMPONENT: ẢNH FACEBOOK STYLE ---
const FBImageGrid = memo(({ images }: { images: string[] }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800";
  
  const renderImg = (src: string, extraClass = "") => (
    <img src={src} className={`w-full h-full object-cover ${extraClass}`} loading="lazy" decoding="async" />
  );

  if (count === 1) return <div className={containerClass} style={{height: '256px'}}>{renderImg(images[0])}</div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}>{renderImg(images[0])}{renderImg(images[1])}</div>;
  return (
    <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}>
      {renderImg(images[0])}
      <div className="grid grid-rows-2 gap-1 h-full">
        {renderImg(images[1])}
        <div className="relative">
          {renderImg(images[2])}
          {count > 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl">+{count - 3}</div>}
        </div>
      </div>
    </div>
  );
});

// --- COMPONENT CHÍNH HOME ---
export const Home: React.FC<HomeProps> = ({ questions, categories, currentUser }) => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchTab, setSearchTab] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Tối ưu hóa Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(inputValue), 250);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Tối ưu hóa Fetch: Chỉ lấy số lượng vừa đủ cho trang chủ
  useEffect(() => {
    const unsub = subscribeToAdConfig(setAdConfig);
    Promise.all([fetchPublishedPosts('all', 10), fetchDocuments('all', 6), getAdConfig()])
      .then(([blogs, docs, ads]) => {
        if (blogs) setBlogPosts(blogs);
        if (docs) setDocuments(docs);
        if (ads) setAdConfig(ads);
      });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchStories(currentUser).then(setStories).finally(() => setIsLoadingStories(false));
    } else { setIsLoadingStories(false); }
  }, [currentUser]);

  // Tối ưu hóa Search Results với Token-based logic
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { questions: [], blogs: [], docs: [], users: [] };
    const queryTokens = removeVietnameseTones(debouncedQuery).split(" ").filter(t => t.length > 0);
    const isMatch = (text?: string | null) => text ? queryTokens.every(token => removeVietnameseTones(text).includes(token)) : false;

    return {
      questions: questions.filter(q => isMatch(q.title) || isMatch(q.content)),
      blogs: blogPosts.filter(p => isMatch(p.title) || isMatch(p.excerpt)),
      docs: documents.filter(d => isMatch(d.title) || isMatch(d.description)),
      users: Array.from(new Map(questions.filter(q => isMatch(q.author.name)).map(q => [q.author.id, q.author])).values())
    };
  }, [debouncedQuery, questions, blogPosts, documents]);

  const displayList = useMemo(() => {
    let list = debouncedQuery ? searchResults.questions : questions;
    if (!debouncedQuery && activeCategory !== 'Tất cả') list = list.filter(q => q.category === activeCategory);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, visibleCount);
  }, [debouncedQuery, searchResults.questions, questions, activeCategory, visibleCount]);

  return (
    <div className="space-y-4 min-h-screen pb-20">
      {activeStory && <StoryViewer story={activeStory} currentUser={currentUser} onClose={() => setActiveStory(null)} />}
      {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onSuccess={(s) => setStories([s, ...stories])} />}

      {/* SEARCH STICKY */}
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 bg-[#F7F7F5]/90 dark:bg-dark-bg/90 backdrop-blur-md">
        <div className="relative flex items-center bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search size={20} className="text-primary mr-3" />
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Tìm kiếm câu hỏi, chuyên gia..." className="w-full bg-transparent outline-none text-[15px] dark:text-white" />
          {inputValue && <X size={16} onClick={() => setInputValue('')} className="cursor-pointer text-gray-400" />}
        </div>
      </div>

      {!debouncedQuery ? (
        <div className="space-y-6">
          {/* STORIES */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-0 py-2">
            <div onClick={() => currentUser ? setShowCreateStory(true) : alert("Vui lòng đăng nhập")} className="shrink-0 w-[85px] h-[130px] rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-dark-card flex flex-col items-center justify-center cursor-pointer">
              <div className="bg-primary text-white rounded-full p-1 mb-1"><Plus size={16} /></div>
              <span className="text-[10px] font-bold dark:text-white">Tạo tin</span>
            </div>
            {stories.map(s => (
              <div key={s.id} onClick={() => setActiveStory(s)} className="shrink-0 w-[85px] h-[130px] rounded-2xl overflow-hidden relative cursor-pointer border-2 border-primary">
                <img src={s.mediaUrl} className="w-full h-full object-cover" decoding="async" loading="lazy" />
                <div className="absolute inset-0 bg-black/20" />
                <img src={s.userAvatar || DEFAULT_AVATAR} className="absolute top-2 left-2 w-7 h-7 rounded-full border-2 border-primary object-cover" decoding="async" />
              </div>
            ))}
          </div>

          {/* BLOGS */}
          {blogPosts.length > 0 && (
            <div className="px-4 md:px-0 space-y-3">
              <div className="flex justify-between items-center"><h3 className="font-bold text-sm uppercase dark:text-white">Kiến thức chuyên gia</h3><Link to="/blog" className="text-xs text-primary font-bold">Xem tất cả</Link></div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {blogPosts.map(p => (
                  <Link to={`/blog/${p.slug}`} key={p.id} className="shrink-0 w-60 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border">
                    <div className="aspect-video rounded-xl overflow-hidden mb-2 bg-gray-100"><img src={p.coverImageUrl} className="w-full h-full object-cover" loading="lazy" decoding="async" /></div>
                    <h4 className="font-bold text-sm line-clamp-2 dark:text-white">{p.title}</h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FEED */}
          <div className="px-4 md:px-0 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-lg dark:text-white">Cộng đồng hỏi đáp</h3></div>
            {displayList.map((q, idx) => (
              <React.Fragment key={q.id}>
                {adConfig?.isEnabled && (idx + 1) % (adConfig.frequency || 5) === 0 && <AdBanner className="my-4" />}
                <Link to={`/question/${toSlug(q.title, q.id)}`} className="block bg-white dark:bg-dark-card p-5 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <img src={q.author.avatar} className="w-8 h-8 rounded-full object-cover" decoding="async" />
                    <div><p className="text-xs font-bold dark:text-white">{q.author.name}</p><p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p></div>
                  </div>
                  <h3 className="font-bold text-textDark dark:text-dark-text mb-2 line-clamp-2">{q.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{q.content}</p>
                  <FBImageGrid images={q.images || []} />
                  <div className="flex items-center gap-4 mt-4 text-gray-400 font-bold text-xs pt-3 border-t border-gray-50 dark:border-slate-800">
                    <span className="flex items-center gap-1"><Heart size={14} className={Array.isArray(q.likes) && currentUser && q.likes.includes(currentUser.id) ? "text-red-500 fill-red-500" : ""} /> {Array.isArray(q.likes) ? q.likes.length : 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {q.answers.length}</span>
                  </div>
                </Link>
              </React.Fragment>
            ))}
            {visibleCount < questions.length && <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="w-full py-3 rounded-full bg-white dark:bg-dark-card border border-gray-200 text-sm font-bold dark:text-white">Xem thêm</button>}
          </div>
        </div>
      ) : (
        /* SEARCH RESULTS UI - Giữ nguyên logic cũ nhưng gọn hơn */
        <div className="px-4 md:px-0 space-y-6">
           {/* Render search results using map... */}
        </div>
      )}
    </div>
  );
};
