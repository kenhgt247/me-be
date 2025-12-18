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

interface HomeProps {
  questions: Question[];
  categories: string[];
  currentUser?: User | null; 
}

// --- HELPER: Xử lý tìm kiếm không dấu ---
const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// --- 1. COMPONENT: CREATE STORY MODAL (Dùng memo để giảm trễ INP 1,720ms) ---
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
      if (file.size > 5 * 1024 * 1024) { setError('File tối đa 5MB.'); return; }
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
          {!previewUrl ? (
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-full min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all gap-4">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-primary"><ImageIcon size={40} /></div>
              <p className="font-bold text-gray-700 dark:text-gray-200">Chọn ảnh chia sẻ</p>
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
             <img src={currentUser.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full border border-gray-200 object-cover" decoding="async" />
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

// --- 2. COMPONENT: STORY VIEWER (Dùng memo để giảm tải CPU 4.3 MB) ---
const StoryViewer = memo(({ story, currentUser, onClose }: any) => {
  const [progress, setProgress] = useState(0);
  const displayAuthorName = story.userName || "Thành viên ẩn danh"; 

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
      </div>
    </div>
  );
});

// --- COMPONENT: ẢNH FB STYLE (Fix lỗi ảnh chặn UI 1.841ms) ---
const FBImageGrid = memo(({ images }: { images: string[] }) => {
  if (!images || images.length === 0) return null;
  const renderImg = (src: string, extraClass = "") => (
    <img src={src} className={`w-full h-full object-cover ${extraClass}`} loading="lazy" decoding="async" />
  );
  const count = images.length;
  const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800 h-64";
  if (count === 1) return <div className={containerClass}>{renderImg(images[0])}</div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1`}>{renderImg(images[0])}{renderImg(images[1])}</div>;
  return <div className={`${containerClass} grid grid-cols-2 gap-1`}>{renderImg(images[0])}<div className="grid grid-rows-2 gap-1 h-full">{renderImg(images[1])}<div className="relative">{renderImg(images[2])}{count > 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold">+{count - 3}</div>}</div></div></div>;
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

  // Giảm lag khi gõ tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(inputValue), 250);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Tải dữ liệu trang chủ (Giới hạn số lượng để tối ưu 4.3 MB ban đầu)
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

  // Logic Tìm kiếm đa năng
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
    return list.slice(0, visibleCount);
  }, [debouncedQuery, searchResults.questions, questions, activeCategory, viewFilter, visibleCount]);

  const renderDocCard = (doc: Document) => (
    <Link to={`/documents/${doc.slug}`} key={doc.id} className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl border dark:border-dark-border shadow-sm active:scale-[0.98] transition-all">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
          {doc.fileType === 'pdf' ? '📕' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm dark:text-white line-clamp-1">{doc.title}</h4>
          <p className="text-[10px] text-gray-400 mt-1">{doc.authorName} • <Download size={10} className="inline"/> {doc.downloads} tải</p>
        </div>
    </Link>
  );

  return (
    <div className="space-y-4 min-h-screen pb-20 animate-fade-in">
      {activeStory && <StoryViewer story={activeStory} currentUser={currentUser} onClose={() => setActiveStory(null)} />}
      {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onSuccess={(s: Story) => setStories([s, ...stories])} />}

      {/* SEARCH BAR STICKY (Fix độ trễ 898ms khi click Logo) */}
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 bg-[#F7F7F5]/95 dark:bg-dark-bg/95 backdrop-blur-md">
        <div className="relative flex items-center bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border px-4 py-3 shadow-sm">
          <Search size={20} className="text-primary mr-3" />
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Tìm câu hỏi, tài liệu, chuyên gia..." className="w-full bg-transparent outline-none text-[15px] dark:text-white" />
          {inputValue && <X size={16} onClick={() => setInputValue('')} className="cursor-pointer text-gray-400" />}
        </div>
      </div>

      {!debouncedQuery ? (
        <div className="space-y-6">
          {/* STORIES BAR */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 md:px-0 py-2 snap-x">
            <div onClick={() => currentUser ? setShowCreateStory(true) : alert("Đăng nhập để tạo tin")} className="snap-start shrink-0 w-[85px] h-[130px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-dark-card flex flex-col items-center justify-center cursor-pointer">
              <Plus size={20} className="text-primary mb-1" />
              <span className="text-[10px] font-bold dark:text-white">Tạo tin</span>
            </div>
            {stories.map(s => (
              <div key={s.id} onClick={() => setActiveStory(s)} className="snap-start shrink-0 relative w-[85px] h-[130px] rounded-2xl overflow-hidden border-2 border-primary p-[2px]">
                <div className="w-full h-full rounded-xl overflow-hidden relative">
                  <img src={s.mediaUrl} className="w-full h-full object-cover" decoding="async" loading="lazy" />
                  <img src={s.userAvatar || DEFAULT_AVATAR} className="absolute top-1 left-1 w-6 h-6 rounded-full border border-primary object-cover" decoding="async" />
                </div>
              </div>
            ))}
          </div>

          {/* BANNER GÓC CHUYÊN GIA (EXPERT PROMO) */}
          <div className="px-4 md:px-0">
            <div className="bg-gradient-to-br from-primary to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-1">Góc Chuyên Gia</h2>
                <p className="text-blue-50 text-xs mb-3 opacity-90">Chia sẻ kiến thức & giúp đỡ cộng đồng.</p>
                <Link to="/expert-register" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold border border-white/20">Đăng ký ngay <ChevronRight size={14} className="inline"/></Link>
              </div>
              <div className="text-5xl opacity-40">👨‍⚕️</div>
            </div>
          </div>

          {/* KIẾN THỨC CHUYÊN GIA (BLOG SECTION) */}
          {blogPosts.length > 0 && (
            <div className="px-4 md:px-0 space-y-3">
              <div className="flex justify-between items-center"><div className="flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/><h3 className="font-bold text-sm uppercase dark:text-white">Kiến thức chuyên gia</h3></div><Link to="/blog" className="text-xs text-primary font-bold">Tất cả</Link></div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {blogPosts.map(p => (
                  <Link to={`/blog/${p.slug}`} key={p.id} className="shrink-0 w-64 bg-white dark:bg-dark-card p-3 rounded-2xl border dark:border-dark-border shadow-sm">
                    <img src={p.coverImageUrl} className="aspect-video rounded-xl mb-2 object-cover" loading="lazy" decoding="async" />
                    <h4 className="font-bold text-sm line-clamp-2 dark:text-white leading-snug">{p.title}</h4>
                    <div className="mt-2 text-[10px] text-gray-400 font-bold">{p.authorName}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* TÀI LIỆU CHIA SẺ (DOCUMENTS SECTION) */}
          {documents.length > 0 && (
            <div className="px-4 md:px-0 space-y-3">
              <div className="flex justify-between items-center"><div className="flex items-center gap-2"><FileText size={18} className="text-green-500"/><h3 className="font-bold text-sm uppercase dark:text-white">Tài liệu chia sẻ</h3></div><Link to="/documents" className="text-xs text-green-500 font-bold">Tất cả</Link></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documents.slice(0, 4).map(renderDocCard)}
              </div>
            </div>
          )}

          {/* CỘNG ĐỒNG HỎI ĐÁP (FEED SECTION) */}
          <div className="px-4 md:px-0 flex items-center justify-between mt-4">
            <h3 className="font-bold text-lg dark:text-white">Hỏi đáp cộng đồng</h3>
            <div className="flex bg-white dark:bg-dark-card p-1 rounded-xl border border-gray-100">
              <button onClick={() => setViewFilter('newest')} className={`p-1.5 rounded-lg ${viewFilter === 'newest' ? 'bg-gray-100' : 'text-gray-400'}`}><Clock size={16} /></button>
              <button onClick={() => setViewFilter('active')} className={`p-1.5 rounded-lg ${viewFilter === 'active' ? 'bg-orange-50 text-orange-500' : 'text-gray-400'}`}><Flame size={16} /></button>
            </div>
          </div>
          
          <div className="px-4 md:px-0 space-y-4">
            {displayList.map((q, idx) => (
              <React.Fragment key={q.id}>
                {adConfig?.isEnabled && (idx + 1) % (adConfig.frequency || 5) === 0 && <AdBanner className="my-2" />}
                <Link to={`/question/${toSlug(q.title, q.id)}`} className="block bg-white dark:bg-dark-card p-5 rounded-[1.5rem] border dark:border-dark-border shadow-sm hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <img src={q.author.avatar} className="w-8 h-8 rounded-full border dark:border-slate-700 object-cover" decoding="async" />
                      {/* --- ĐÃ SỬA LỖI CÚ PHÁP THIẾU DẤU } TẠI ĐÂY --- */}
                      <div><p className="text-xs font-bold dark:text-white">{q.author.name} {q.author.isExpert && <ShieldCheck size={10} className="inline text-blue-500 ml-0.5" />}</p><p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p></div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-gray-500 border border-gray-100/50">{q.category}</span>
                  </div>
                  <h3 className="font-bold text-[16px] text-textDark dark:text-dark-text mb-2 line-clamp-2 leading-snug">{q.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted line-clamp-2 mb-4 font-normal">{q.content}</p>
                  <FBImageGrid images={q.images || []} />
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800 mt-4">
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1.5"><Heart size={14} className={Array.isArray(q.likes) && currentUser && q.likes.includes(currentUser.id) ? "text-red-500 fill-red-500" : ""} /> {Array.isArray(q.likes) ? q.likes.length : 0}</span>
                      <span className="flex items-center gap-1.5"><MessageCircle size={14} /> {q.answers.length}</span>
                    </div>
                    {q.answers.length === 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">Đang chờ trả lời</span>}
                  </div>
                </Link>
              </React.Fragment>
            ))}
            {displayList.length < questions.length && (
              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="w-full py-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 text-sm font-bold dark:text-white shadow-sm hover:bg-gray-50 transition-all">Tải thêm câu hỏi</button>
            )}
          </div>
        </div>
      ) : (
        /* KẾT QUẢ TÌM KIẾM (Questions, Blogs, Docs, People) */
        <div className="animate-slide-up space-y-6">
           <SearchTabs activeTab={searchTab} onChange={setSearchTab} counts={{ questions: searchResults.questions.length, blogs: searchResults.blogs.length, docs: searchResults.docs.length, users: searchResults.users.length }} />
           <div className="px-4 md:px-0 space-y-6 pb-20">
              {(searchTab === 'all' || searchTab === 'users') && searchResults.users.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.users.map((u: any) => (
                  <Link to={`/profile/${u.id}`} key={u.id} className="bg-white dark:bg-dark-card p-4 rounded-2xl border dark:border-dark-border flex items-center gap-3">
                    <img src={u.avatar} className="w-10 h-10 rounded-full border object-cover" decoding="async"/>
                    <div className="flex flex-col"><span className="text-sm font-bold dark:text-white">{u.name}</span><span className="text-[10px] text-primary font-bold">Xem chuyên gia</span></div>
                  </Link>
                ))}</div>
              )}
              {(searchTab === 'all' || searchTab === 'blogs') && searchResults.blogs.length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Bài viết ({searchResults.blogs.length})</h4>
                   <div className="flex gap-3 overflow-x-auto no-scrollbar">{searchResults.blogs.map(p => (
                      <Link to={`/blog/${p.slug}`} key={p.id} className="shrink-0 w-64 bg-white dark:bg-dark-card p-3 rounded-2xl border dark:border-dark-border">
                        <img src={p.coverImageUrl} className="aspect-video rounded-xl mb-2 object-cover" decoding="async"/>
                        <h4 className="font-bold text-sm line-clamp-2 dark:text-white">{p.title}</h4>
                      </Link>
                   ))}</div>
                </div>
              )}
              {(searchTab === 'all' || searchTab === 'docs') && searchResults.docs.length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Tài liệu ({searchResults.docs.length})</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.docs.map(renderDocCard)}</div>
                </div>
              )}
              {(searchTab === 'all' || searchTab === 'questions') && searchResults.questions.length > 0 && (
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase px-2 tracking-widest">Hỏi đáp ({searchResults.questions.length})</h4>
                    {searchResults.questions.map(q => (
                       <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block bg-white dark:bg-dark-card p-5 rounded-3xl border dark:border-dark-border shadow-sm">
                          <h3 className="font-bold text-[16px] dark:text-white mb-2 leading-snug">{q.title}</h3>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                            <img src={q.author.avatar} className="w-5 h-5 rounded-full" decoding="async" />
                            <span>Đăng bởi {q.author.name}</span>
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
