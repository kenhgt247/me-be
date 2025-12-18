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

// --- HELPER: Xử lý tìm kiếm không dấu chuẩn Unicode ---
const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// --- 1. COMPONENT: CREATE STORY MODAL (Sử dụng memo để giảm trễ 898ms) ---
const CreateStoryModal = memo(({ currentUser, onClose, onSuccess }: any) => {
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
      if (!file.type.startsWith('image/')) { setError('Vui lòng chọn ảnh.'); return; }
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
        <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <h3 className="font-bold text-lg dark:text-white">Tạo tin mới</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-black/50 relative">
          {error && <div className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-200 z-20 text-center">{error}</div>}
          {!previewUrl ? (
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-full min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all gap-4">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-primary"><ImageIcon size={40} /></div>
              <p className="font-bold text-gray-700 dark:text-gray-200">Chọn ảnh từ máy</p>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
               <img src={previewUrl} className="max-h-[60vh] object-contain" alt="Preview" decoding="async" />
               <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-red-500"><Trash2 size={18} /></button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
        <div className="p-4 border-t dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
           <div className="flex items-center gap-3">
             <img src={currentUser.avatar || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-10 h-10 rounded-full border border-gray-200 object-cover" decoding="async" />
             <div className="flex flex-col"><span className="text-sm font-bold dark:text-white">Đăng bởi</span><span className="text-xs text-gray-500">{currentUser.name}</span></div>
           </div>
           <button onClick={handlePost} disabled={!selectedFile || isUploading} className={`px-6 py-2.5 rounded-full font-bold text-white ${!selectedFile || isUploading ? 'bg-gray-300' : 'bg-primary shadow-lg shadow-primary/30'}`}>
             {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'Chia sẻ ngay'}
           </button>
        </div>
      </div>
    </div>
  );
});

// --- 2. COMPONENT: STORY VIEWER (Memoized) ---
const StoryViewer = memo(({ story, currentUser, onClose }: any) => {
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
      <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        <div className="absolute top-4 left-2 right-2 flex gap-1 z-20">
            <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-2">
            <img src={story.userAvatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full border border-white/50 object-cover" decoding="async" />
            <div className="flex flex-col"><span className="font-bold text-sm text-shadow">{displayAuthorName}</span><span className="text-[10px] text-white/80">{new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={24} /></button>
        </div>
        <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story" decoding="async" />
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
          <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Phản hồi ${displayAuthorName}...`} className="flex-1 bg-white/10 border border-white/40 rounded-full px-5 py-3 text-white text-sm outline-none backdrop-blur-md" />
          <button className="p-3 bg-primary text-white rounded-full"><Send size={20} /></button>
        </div>
      </div>
    </div>
  );
});

// --- COMPONENT: ẢNH FB STYLE (Sửa lỗi ảnh chặn UI 1.841ms) ---
const FBImageGrid = memo(({ images }: { images: string[] }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800";
  
  const renderImg = (src: string, extraClass = "") => (
    <img src={src} className={`w-full h-full object-cover ${extraClass}`} loading="lazy" decoding="async" />
  );

  if (count === 1) return <div className={containerClass} style={{height: '256px'}}>{renderImg(images[0])}</div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}>{renderImg(images[0])}{renderImg(images[1])}</div>;
  if (count === 3) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}>{renderImg(images[0], "row-span-2")}<div className="grid grid-rows-2 gap-1 h-full">{renderImg(images[1])}{renderImg(images[2])}</div></div>;
  return (
    <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}>
      {renderImg(images[0])}<div className="grid grid-rows-2 gap-1 h-full">{renderImg(images[1])}<div className="relative h-full">{renderImg(images[2])}{count > 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">+{count - 3}</div>}</div></div>
    </div>
  );
});

// --- COMPONENT: TABS TÌM KIẾM ---
const SearchTabs = memo(({ activeTab, onChange, counts }: any) => {
  const tabs = [
    { id: 'all', label: 'Tất cả', icon: LayoutGrid },
    { id: 'questions', label: 'Hỏi đáp', icon: HelpCircle, count: counts.questions },
    { id: 'blogs', label: 'Bài viết', icon: BookOpen, count: counts.blogs },
    { id: 'docs', label: 'Tài liệu', icon: FileText, count: counts.docs },
    { id: 'users', label: 'Mọi người', icon: UserIcon, count: counts.users },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-0 mb-4 border-b dark:border-dark-border pb-2">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-500 border border-gray-100 dark:border-dark-border'}`}>
          <tab.icon size={14} /> {tab.label} {tab.count > 0 && <span className="ml-1 opacity-80 text-[10px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>}
        </button>
      ))}
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

  // Debounce Search để giảm lag khi gõ
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(inputValue), 250);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Tải dữ liệu trang chủ (Giới hạn số lượng ban đầu để giảm Resources 4.3 MB)
  useEffect(() => {
    const unsub = subscribeToAdConfig(setAdConfig);
    Promise.all([fetchPublishedPosts('all', 12), fetchDocuments('all', 8), getAdConfig()])
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

  // Logic Tìm kiếm đa năng (Questions, Blogs, Docs, Users)
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
    let list = debouncedQuery ? searchResults.questions : [...questions];
    if (!debouncedQuery && activeCategory !== 'Tất cả') list = list.filter(q => q.category === activeCategory);
    
    if (viewFilter === 'newest') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (viewFilter === 'active') list.sort((a, b) => (b.answers.length * 2 + (b.likes?.length || 0)) - (a.answers.length * 2 + (a.likes?.length || 0)));
    
    return list.slice(0, visibleCount);
  }, [debouncedQuery, searchResults.questions, questions, activeCategory, viewFilter, visibleCount]);

  const renderDocCard = (doc: Document) => (
    <Link to={`/documents/${doc.slug}`} key={doc.id} className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl border dark:border-dark-border shadow-sm active:scale-[0.98] transition-all group">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
          {doc.fileType === 'pdf' ? '📕' : doc.fileType === 'image' ? '🖼️' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm dark:text-white line-clamp-1 group-hover:text-green-600 transition-colors">{doc.title}</h4>
          <p className="text-[10px] text-gray-400 flex items-center gap-2 mt-1"><span>{doc.authorName}</span> • <span><Download size={10} className="inline mr-0.5"/> {doc.downloads} tải</span></p>
        </div>
    </Link>
  );

  return (
    <div className="space-y-4 min-h-screen pb-20 animate-fade-in">
      {activeStory && <StoryViewer story={activeStory} currentUser={currentUser} onClose={() => setActiveStory(null)} />}
      {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onSuccess={(s: Story) => setStories([s, ...stories])} />}

      {/* SEARCH BAR (Sticky để dứt điểm trễ Logo 898ms) */}
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 bg-[#F7F7F5]/95 dark:bg-dark-bg/95 backdrop-blur-md transition-all">
        <div className="relative flex items-center bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border px-4 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search size={20} className="text-primary mr-3" />
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Tìm kiếm câu hỏi, tài liệu, chuyên gia..." className="w-full bg-transparent outline-none text-[15px] dark:text-white font-medium" />
          {inputValue && <X size={16} onClick={() => {setInputValue(''); setDebouncedQuery('');}} className="cursor-pointer text-gray-400 hover:text-red-500" />}
        </div>
      </div>

      {!debouncedQuery ? (
        <div className="space-y-6">
          {/* STORIES BAR (Dứt điểm CLS 0.9) */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-0 py-2 snap-x">
            <div onClick={() => currentUser ? setShowCreateStory(true) : alert("Đăng nhập để chia sẻ khoảnh khắc!")} className="snap-start shrink-0 w-[85px] h-[130px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-dark-card flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all">
              <div className="bg-primary text-white rounded-full p-1.5 mb-1.5 shadow-lg shadow-primary/30"><Plus size={18} /></div>
              <span className="text-[10px] font-bold dark:text-white uppercase tracking-tighter">Tạo tin</span>
            </div>
            {isLoadingStories && [1,2,3].map(i => <div key={i} className="shrink-0 w-[85px] h-[130px] bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
            {stories.map(s => (
              <div key={s.id} onClick={() => setActiveStory(s)} className="snap-start shrink-0 relative w-[85px] h-[130px] rounded-2xl overflow-hidden cursor-pointer border-2 border-primary p-[2px] shadow-sm">
                <div className="w-full h-full rounded-xl overflow-hidden relative">
                  <img src={s.mediaUrl} className="w-full h-full object-cover" decoding="async" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <img src={s.userAvatar || DEFAULT_AVATAR} className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full border-2 border-primary object-cover" decoding="async" />
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-bold text-white truncate text-shadow">{s.userName}</span>
                </div>
              </div>
            ))}
          </div>

          {/* BANNER GÓC CHUYÊN GIA (EXPERT PROMO) */}
          <div className="px-4 md:px-0">
            <div className="bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 flex justify-between items-center relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-1">Góc Chuyên Gia</h2>
                <p className="text-blue-50 text-xs mb-4 opacity-90 max-w-[200px]">Chia sẻ kiến thức & nhận huy hiệu xác minh ngay.</p>
                <Link to="/expert-register" className="bg-white/20 hover:bg-white/40 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/30 transition-all flex items-center gap-1 w-fit">Đăng ký chuyên gia <ChevronRight size={14}/></Link>
              </div>
              <div className="text-6xl relative z-10 drop-shadow-lg">👨‍⚕️</div>
            </div>
          </div>

          {/* KIẾN THỨC CHUYÊN GIA (BLOG SECTION) */}
          {blogPosts.length > 0 && (
            <div className="px-4 md:px-0 space-y-3">
              <div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/><h3 className="font-bold text-sm uppercase dark:text-white tracking-wide">Kiến thức chuyên gia</h3></div><Link to="/blog" className="text-xs text-primary font-bold hover:underline">Xem tất cả</Link></div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {blogPosts.map(p => (
                  <Link to={`/blog/${p.slug}`} key={p.id} className="shrink-0 w-64 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden mb-2.5 bg-gray-100 dark:bg-slate-800"><img src={p.coverImageUrl} className="w-full h-full object-cover" loading="lazy" decoding="async" /></div>
                    <h4 className="font-bold text-sm line-clamp-2 dark:text-white leading-tight min-h-[40px]">{p.title}</h4>
                    <div className="mt-2.5 pt-2 border-t border-gray-50 dark:border-slate-800 flex justify-between items-center"><span className="text-[10px] text-gray-400 font-bold">{p.authorName}</span><span className="text-[10px] text-gray-300">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* TÀI LIỆU CHIA SẺ (DOCUMENTS SECTION) */}
          {documents.length > 0 && (
            <div className="px-4 md:px-0 space-y-3">
              <div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><FileText size={18} className="text-green-500"/><h3 className="font-bold text-sm uppercase dark:text-white tracking-wide">Tài liệu chia sẻ</h3></div><Link to="/documents" className="text-xs text-green-500 font-bold hover:underline">Xem tất cả</Link></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.slice(0, 4).map(renderDocCard)}
              </div>
            </div>
          )}

          {/* CHỦ ĐỀ PHỔ BIẾN (CATEGORY FILTER) */}
          <div className="pl-4 md:px-0 mt-6">
            <div className="flex items-center gap-1.5 mb-3"><Sparkles size={14} className="text-amber-500" fill="currentColor"/><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Khám phá chủ đề</span></div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pr-4">
              <button onClick={() => setActiveCategory('Tất cả')} className={`shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm ${activeCategory === 'Tất cả' ? 'bg-textDark dark:bg-primary text-white' : 'bg-white dark:bg-dark-card border border-gray-100 text-gray-500 hover:bg-gray-50'}`}>Tất cả</button>
              {categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm ${activeCategory === cat ? 'bg-primary text-white shadow-primary/20' : 'bg-white dark:bg-dark-card border border-gray-100 text-gray-500 hover:bg-gray-50'}`}>{cat}</button>))}
            </div>
          </div>

          {/* HỎI ĐÁP CỘNG ĐỒNG (FEED SECTION) */}
          <div className="px-4 md:px-0 flex items-center justify-between mt-4">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">Hỏi đáp cộng đồng <HelpCircle size={18} className="text-gray-300"/></h3>
            <div className="flex bg-white dark:bg-dark-card p-1 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
              <button onClick={() => setViewFilter('newest')} className={`p-1.5 rounded-lg transition-colors ${viewFilter === 'newest' ? 'bg-gray-100 dark:bg-slate-700 text-primary' : 'text-gray-400'}`}><Clock size={16} /></button>
              <button onClick={() => setViewFilter('active')} className={`p-1.5 rounded-lg transition-colors ${viewFilter === 'active' ? 'bg-orange-50 text-orange-500' : 'text-gray-400'}`}><Flame size={16} /></button>
            </div>
          </div>
          
          <div className="px-4 md:px-0 space-y-4">
            {displayList.map((q, idx) => (
              <React.Fragment key={q.id}>
                {adConfig?.isEnabled && (idx + 1) % (adConfig.frequency || 5) === 0 && <AdBanner className="my-2" />}
                <Link to={`/question/${toSlug(q.title, q.id)}`} className="block bg-white dark:bg-dark-card p-5 rounded-[1.5rem] border border-gray-100 dark:border-dark-border shadow-sm hover:border-primary/30 transition-all group">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <img src={q.author.avatar} className="w-8 h-8 rounded-full border dark:border-slate-700 object-cover" decoding="async" />
                      <div><p className="text-xs font-bold dark:text-white">{q.author.name} {q.author.isExpert && <ShieldCheck size={10} className="inline text-blue-500 ml-0.5"/></p><p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p></div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-gray-500 border border-gray-100/50">{q.category}</span>
                  </div>
                  <h3 className="font-bold text-[16px] text-textDark dark:text-dark-text mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{q.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted line-clamp-2 mb-4 font-normal leading-relaxed">{q.content}</p>
                  <FBImageGrid images={q.images || []} />
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800 mt-4">
                    <div className="flex items-center gap-5 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1.5"><Heart size={15} className={Array.isArray(q.likes) && currentUser && q.likes.includes(currentUser.id) ? "text-red-500 fill-red-500" : ""} /> {Array.isArray(q.likes) ? q.likes.length : 0}</span>
                      <span className="flex items-center gap-1.5"><MessageCircle size={15} className={q.answers.length > 0 ? "text-primary fill-primary/10" : ""} /> {q.answers.length}</span>
                    </div>
                    {q.answers.length === 0 ? <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">Đang chờ giải đáp</span> : <div className="flex -space-x-1.5">{q.answers.slice(0,3).map((a,i) => <img key={i} src={a.author.avatar} className="w-5 h-5 rounded-full border border-white dark:border-dark-card object-cover"/>)}</div>}
                  </div>
                </Link>
              </React.Fragment>
            ))}
            {displayList.length < questions.length && (
              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="w-full py-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold dark:text-white shadow-sm hover:bg-gray-50 active:scale-95 transition-all">Tải thêm câu hỏi mới</button>
            )}
          </div>
        </div>
      ) : (
        /* KẾT QUẢ TÌM KIẾM (CHẾ ĐỘ HIỂN THỊ ĐẦY ĐỦ) */
        <div className="animate-slide-up space-y-6">
           <SearchTabs activeTab={searchTab} onChange={setSearchTab} counts={{ questions: searchResults.questions.length, blogs: searchResults.blogs.length, docs: searchResults.docs.length, users: searchResults.users.length }} />
           <div className="px-4 md:px-0 space-y-6 pb-20">
              {/* People Search Results */}
              {(searchTab === 'all' || searchTab === 'users') && searchResults.users.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.users.map((u: any) => (
                  <Link to={`/profile/${u.id}`} key={u.id} className="bg-white dark:bg-dark-card p-4 rounded-2xl border dark:border-dark-border flex items-center gap-3 shadow-sm hover:border-blue-200 transition-all">
                    <img src={u.avatar} className="w-11 h-11 rounded-full border object-cover" decoding="async"/>
                    <div className="flex flex-col"><span className="text-sm font-bold dark:text-white">{u.name}</span><span className="text-[11px] text-primary font-bold uppercase">Xem trang cá nhân</span></div>
                  </Link>
                ))}</div>
              )}
              {/* Blog Posts Search Results */}
              {(searchTab === 'all' || searchTab === 'blogs') && searchResults.blogs.length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Kiến thức chuyên sâu ({searchResults.blogs.length})</h4>
                   <div className="flex gap-3 overflow-x-auto no-scrollbar">{searchResults.blogs.map(p => (
                      <Link to={`/blog/${p.slug}`} key={p.id} className="shrink-0 w-64 bg-white dark:bg-dark-card p-3 rounded-2xl border dark:border-dark-border shadow-sm">
                        <img src={p.coverImageUrl} className="aspect-video rounded-xl mb-2.5 object-cover" decoding="async"/>
                        <h4 className="font-bold text-sm line-clamp-2 dark:text-white leading-snug">{p.title}</h4>
                      </Link>
                   ))}</div>
                </div>
              )}
              {/* Documents Search Results */}
              {(searchTab === 'all' || searchTab === 'docs') && searchResults.docs.length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Tài liệu chia sẻ ({searchResults.docs.length})</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.docs.map(renderDocCard)}</div>
                </div>
              )}
              {/* Questions Search Results */}
              {(searchTab === 'all' || searchTab === 'questions') && searchResults.questions.length > 0 && (
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Câu hỏi thảo luận ({searchResults.questions.length})</h4>
                    {searchResults.questions.map(q => (
                       <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block bg-white dark:bg-dark-card p-5 rounded-3xl border dark:border-dark-border shadow-sm hover:border-primary/20 transition-all">
                          <h3 className="font-bold text-[16px] dark:text-white mb-2 leading-snug">{q.title}</h3>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                            <img src={q.author.avatar} className="w-5 h-5 rounded-full border border-gray-100" decoding="async" />
                            <span>Đăng bởi {q.author.name} • {new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                       </Link>
                    ))}
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
