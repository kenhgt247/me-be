import React, { useState, useMemo, useEffect, useRef } from 'react';
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

// --- KẾT NỐI SERVICE STORIES VÀ CHAT ---
import { fetchStories, createStory, markStoryViewed, toggleStoryLike } from '../services/stories';
import { sendMessage, sendStoryReply } from '../services/chat';

// --- ẢNH MẶC ĐỊNH CHO KHÁCH ẨN DANH / LỖI AVATAR ---
const DEFAULT_AVATAR = "/images/rabbit.png";

interface HomeProps {
  questions: Question[];
  categories: string[];
  currentUser?: User | null; 
}

const PAGE_SIZE = 20;

// --- HELPER: Hàm xóa dấu tiếng Việt chuẩn Unicode để tìm kiếm chính xác ---
const removeVietnameseTones = (str: string) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD") // Tách tổ hợp dấu
        .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s]/g, " ") // Chỉ giữ lại chữ cái, số và khoảng trắng
        .replace(/\s+/g, " ") // Gộp khoảng trắng thừa
        .trim();
}

// --- 1. COMPONENT: CREATE STORY MODAL ---
interface CreateStoryModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: (newStory: Story) => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ currentUser, onClose, onSuccess }) => {
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
    setIsUploading(true); setError(null);
    try {
      const newStory = await createStory(currentUser, selectedFile);
      onSuccess(newStory); onClose();
    } catch (err) {
      console.error(err); setError("Lỗi khi đăng tin.");
    } finally { setIsUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Tạo tin mới</h3>
          <button onClick={onClose} disabled={isUploading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-black/50 relative overflow-hidden">
          {error && <div className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-200 z-20 text-center animate-shake">{error}</div>}
          {!previewUrl ? (
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-full min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer group hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all gap-4 p-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300"><ImageIcon size={40} /></div>
              <div className="text-center"><p className="font-bold text-gray-700 dark:text-gray-200 text-lg mb-1">Chọn ảnh</p><p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG, WEBP</p></div>
              <button className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-gray-200 dark:border-gray-700 mt-2 flex items-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"><UploadCloud size={16} /> Tải lên</button>
            </div>
          ) : (
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center animate-zoom-in">
               <img src={previewUrl} className="w-full h-full object-contain max-h-[60vh]" alt="Preview" />
               {!isUploading && <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-red-500 backdrop-blur-md transition-all shadow-lg"><Trash2 size={18} /></button>}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
           <div className="flex items-center gap-3">
             {/* SỬA LỖI AVATAR TRONG MODAL */}
             <img 
               src={currentUser.avatar || DEFAULT_AVATAR} 
               onError={(e) => e.currentTarget.src = DEFAULT_AVATAR}
               className="w-10 h-10 rounded-full border border-gray-200 object-cover" 
               alt="User" 
             />
             <div className="flex flex-col"><span className="text-sm font-bold text-gray-900 dark:text-white">Đăng bởi</span><span className="text-xs text-gray-500">{currentUser.name}</span></div>
           </div>
           <div className="flex gap-3">
             <button onClick={onClose} disabled={isUploading} className="px-5 py-2.5 rounded-full font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Hủy</button>
             <button onClick={handlePost} disabled={!selectedFile || isUploading} className={`px-6 py-2.5 rounded-full font-bold text-white flex items-center gap-2 transition-all shadow-lg ${!selectedFile || isUploading ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 active:scale-95 shadow-primary/30'}`}>{isUploading ? <><Loader2 size={18} className="animate-spin" /><span>Đang xử lý...</span></> : <><Send size={18} /><span>Chia sẻ</span></>}</button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. COMPONENT: STORY VIEWER (ĐÃ SỬA TÊN HIỂN THỊ DỄ THƯƠNG) ---
const StoryViewer = ({ story, currentUser, onClose }: { story: Story, currentUser?: User | null, onClose: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // --- LOGIC TÊN DỄ THƯƠNG ---
  // Nếu không có tên (undefined/null) thì hiện tên cute
  const displayAuthorName = story.userName || "Mẹ thỏ bí ẩn 🐭"; 

  useEffect(() => {
    if (currentUser && story.id) { 
        markStoryViewed(story.id, currentUser.id); 
        const userHasLiked = story.likes?.includes(currentUser.id) || false;
        setIsLiked(userHasLiked);
    }
  }, [story, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(timer); onClose(); return 100; }
        return prev + 1; 
      });
    }, 50); 
    return () => clearInterval(timer);
  }, [onClose]);

  const handleToggleLike = async () => {
    if (!currentUser) return;
    setIsLiked(!isLiked);
    try {
      await toggleStoryLike(story.id, currentUser.id);
    } catch (error) {
      console.error("Lỗi like story:", error);
      setIsLiked(!isLiked); 
    }
  };

  const handleSendReply = async () => {
      if(!replyText.trim() || !currentUser || isSending) return;
      setIsSending(true);
      try {
        await sendStoryReply(
            currentUser, 
            story.userId, 
            replyText, 
            { id: story.id, url: story.mediaUrl }
        );
        setReplyText(''); 
        alert('Đã gửi phản hồi!'); 
      } catch (error) {
        console.error("Lỗi gửi tin:", error);
      } finally {
        setIsSending(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
      <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        
        {/* Progress Bar */}
        <div className="absolute top-4 left-2 right-2 flex gap-1 z-20">
            <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-2">
            <img 
              src={story.userAvatar || DEFAULT_AVATAR} 
              onError={(e) => e.currentTarget.src = DEFAULT_AVATAR}
              className="w-9 h-9 rounded-full border border-white/50 object-cover" 
              alt="" 
            />
            <div className="flex flex-col">
                {/* Dùng biến displayAuthorName ở đây */}
                <span className="font-bold text-sm text-shadow">{displayAuthorName}</span>
                <span className="text-[10px] text-white/80">
                    {new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Ảnh Story */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 flex items-center gap-3">
          <div className="flex-1 relative">
            <input 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                // SỬA Ở ĐÂY: Dùng displayAuthorName thay vì story.userName trực tiếp
                placeholder={`Gửi tin nhắn cho ${displayAuthorName}...`} 
                className="w-full bg-transparent border border-white/60 rounded-full pl-5 pr-10 py-3 text-white placeholder-white/70 text-sm outline-none focus:border-white focus:bg-black/20 transition-all backdrop-blur-sm" 
            />
          </div>
           
          {replyText.trim() ? (
            <button 
                onClick={handleSendReply} 
                disabled={isSending}
                className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
            >
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
          ) : (
            <button 
                onClick={handleToggleLike} 
                className={`p-3 rounded-full transition-all active:scale-90 ${isLiked ? 'bg-red-500/20' : 'hover:bg-white/10'}`}
            >
                <Heart 
                    size={28} 
                    className={isLiked ? "text-red-500 fill-red-500 animate-bounce-custom" : "text-white"} 
                />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT ẢNH FACEBOOK STYLE ---
const FBImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800";
  if (count === 1) return <div className={containerClass}><img src={images[0]} className="w-full h-64 object-cover" loading="lazy" /></div>;
  if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}><img src={images[0]} className="w-full h-full object-cover" loading="lazy" /><img src={images[1]} className="w-full h-full object-cover" loading="lazy" /></div>;
  if (count === 3) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}><img src={images[0]} className="w-full h-full object-cover row-span-2" loading="lazy" /><div className="grid grid-rows-2 gap-1 h-full"><img src={images[1]} className="w-full h-full object-cover" loading="lazy" /><img src={images[2]} className="w-full h-full object-cover" loading="lazy" /></div></div>;
  return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}><img src={images[0]} className="w-full h-full object-cover" loading="lazy" /><div className="grid grid-rows-2 gap-1 h-full"><img src={images[1]} className="w-full h-full object-cover" loading="lazy" /><div className="relative w-full h-full"><img src={images[2]} className="w-full h-full object-cover" loading="lazy" />{count > 3 && (<div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">+{count - 3}</div>)}</div></div></div>;
};

// --- COMPONENT TAB TÌM KIẾM ---
const SearchTabs = ({ activeTab, onChange, counts }: { activeTab: string, onChange: (t: string) => void, counts: any }) => {
  const tabs = [
    { id: 'all', label: 'Tất cả', icon: LayoutGrid },
    { id: 'questions', label: 'Câu hỏi', icon: HelpCircle, count: counts.questions },
    { id: 'blogs', label: 'Bài viết', icon: BookOpen, count: counts.blogs },
    { id: 'docs', label: 'Tài liệu', icon: FileText, count: counts.docs },
    { id: 'users', label: 'Mọi người', icon: UserIcon, count: counts.users },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-0 mb-4 border-b border-gray-100 dark:border-dark-border pb-2">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-textDark dark:bg-primary text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-500 dark:text-dark-muted border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
          <tab.icon size={14} /> {tab.label} {tab.count > 0 && <span className="ml-1 opacity-80 text-[10px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
};

// --- COMPONENT CHÍNH HOME ---
export const Home: React.FC<HomeProps> = ({ questions, categories, currentUser }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
   
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
   
  const [searchTab, setSearchTab] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [stories, setStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedQuery(inputValue);
    }, 300); 

    return () => clearTimeout(handler);
  }, [inputValue]);

  useEffect(() => {
      const unsub = subscribeToAdConfig(config => setAdConfig(config));
      Promise.all([
          fetchPublishedPosts('all', 50),
          fetchDocuments('all', 50),
          getAdConfig()
      ]).then(([blogs, docs, ads]) => {
          if (blogs) setBlogPosts(blogs);
          if (docs) setDocuments(docs);
          if (ads) setAdConfig(ads);
      });
      return () => unsub();
  }, []);

  useEffect(() => {
    const loadStories = async () => {
        if (currentUser) {
            try {
                const data = await fetchStories(currentUser);
                setStories(data);
            } catch (err) { console.error("Lỗi tải story:", err); } finally { setIsLoadingStories(false); }
        } else { setIsLoadingStories(false); }
    };
    loadStories();
  }, [currentUser]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, viewFilter, debouncedQuery, searchTab]);

  const handleOpenCreateStory = () => {
    if (!currentUser) { alert("Vui lòng đăng nhập để đăng khoảnh khắc!"); return; }
    setShowCreateStory(true);
  };
  const handleStoryCreated = (newStory: Story) => { setStories(prev => [newStory, ...prev]); };

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { questions: [], blogs: [], docs: [], users: [] };
    
    // --- LOGIC TÌM KIẾM THEO TỪ KHÓA (TOKEN-BASED) ---
    const normalizedQuery = removeVietnameseTones(debouncedQuery);
    const queryTokens = normalizedQuery.split(" ").filter(t => t.length > 0); // Tách chuỗi thành các từ khóa

    // Hàm kiểm tra: Văn bản phải chứa tất cả các từ khóa
    const isMatch = (text: string | undefined | null) => {
        if (!text) return false;
        const normalizedText = removeVietnameseTones(text);
        return queryTokens.every(token => normalizedText.includes(token));
    }

    const matchedQuestions = questions.filter(q => 
        isMatch(q.title) ||              
        isMatch(q.content) ||            
        isMatch(q.author.name) ||
        (q.answers && q.answers.some(ans => isMatch(ans.content) || isMatch(ans.author.name)))
    );
    
    const matchedBlogs = blogPosts.filter(p => 
        isMatch(p.title) ||              
        isMatch(p.excerpt) ||            
        isMatch(p.authorName)            
    );
    
    const matchedDocs = documents.filter(d => 
        isMatch(d.title) ||              
        isMatch(d.description) ||        
        isMatch(d.authorName)            
    );
    
    const usersMap = new Map<string, User>();
    matchedQuestions.forEach(q => usersMap.set(q.author.id, q.author));
    matchedBlogs.forEach(p => {
        if(isMatch(p.authorName)) usersMap.set(p.authorId, { id: p.authorId, name: p.authorName, avatar: p.authorAvatar || '', isExpert: true } as User);
    });

    return { 
        questions: matchedQuestions, 
        blogs: matchedBlogs, 
        docs: matchedDocs, 
        users: Array.from(usersMap.values()) 
    };
  }, [debouncedQuery, questions, blogPosts, documents]);

  let displayList = [...questions];
   
  if (!debouncedQuery) {
      if (activeCategory !== 'Tất cả') displayList = displayList.filter(q => q.category === activeCategory);
      switch (viewFilter) {
        case 'newest': displayList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
        case 'active': displayList.sort((a, b) => (b.answers.length * 2 + b.likes) - (a.answers.length * 2 + a.likes)); break;
        case 'unanswered': displayList = displayList.filter(q => q.answers.length === 0).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      }
  } else { 
      displayList = searchResults.questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); 
  }
   
  const paginatedList = displayList.slice(0, visibleCount);

  const getProfileSlug = (user: User) => user.username || user.id;

  const renderUserCard = (user: User) => (
    <Link to={`/profile/${getProfileSlug(user)}`} key={user.id} className="flex-shrink-0 bg-white dark:bg-dark-card p-3 pr-5 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-3 min-w-[160px] active:scale-95 transition-transform hover:border-blue-200 dark:hover:border-blue-500/50">
        <div className="relative"><img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600" />{user.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white dark:border-dark-card"><ShieldCheck size={10} /></div>}</div>
        <div className="flex flex-col"><span className="text-sm font-bold text-textDark dark:text-dark-text truncate max-w-[100px]">{user.name}</span><span className="text-[10px] text-primary font-medium">Xem trang</span></div>
    </Link>
  );
   
  const renderDocCard = (doc: Document) => (
    <Link to={`/documents/${doc.slug}`} key={doc.id} className="flex items-center gap-4 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm active:scale-[0.98] transition-transform group hover:border-green-200 dark:hover:border-green-500/50">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">{doc.fileType === 'pdf' ? '📕' : doc.fileType === 'image' ? '🖼️' : '📄'}</div>
        <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400">{doc.title}</h4><p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 flex items-center gap-2"><span>{doc.authorName}</span> • <span className="flex items-center gap-0.5"><Download size={10}/> {doc.downloads}</span></p></div>
    </Link>
  );

  return (
    <div className="space-y-4 animate-fade-in min-h-screen">
       
      {activeStory && <StoryViewer story={activeStory} currentUser={currentUser} onClose={() => setActiveStory(null)} />}

      {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onSuccess={handleStoryCreated} />}

      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 md:pt-0 -mx-4 md:mx-0 bg-[#F7F7F5]/95 dark:bg-dark-bg/95 md:bg-transparent backdrop-blur-sm transition-all">
        <div className="relative group shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl mx-4 md:mx-0">
            <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl rounded-2xl"></div>
            <div className={`relative flex items-center bg-white/90 dark:bg-dark-card/90 rounded-2xl border transition-all overflow-hidden ${inputValue ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100 dark:border-dark-border focus-within:ring-2 focus-within:ring-primary/20'}`}>
                <div className="pl-4 text-primary"><Search size={20} /></div>
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder="Tìm kiếm câu hỏi, chuyên gia, tài liệu..." 
                  className="w-full py-3.5 px-3 bg-transparent text-textDark dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-[15px] font-medium" 
                />
                {inputValue && (<button onClick={() => { setInputValue(''); setDebouncedQuery(''); setSearchTab('all'); }} className="pr-4 text-gray-400 hover:text-textDark dark:hover:text-white"><X size={16} /></button>)}
            </div>
        </div>
      </div>

      {debouncedQuery ? (
           <div className="animate-slide-up space-y-4">
               <SearchTabs activeTab={searchTab} onChange={setSearchTab} counts={{ questions: searchResults.questions.length, blogs: searchResults.blogs.length, docs: searchResults.docs.length, users: searchResults.users.length }} />
               <div className="px-4 md:px-0 space-y-4 pb-20">
                  
                   {(searchTab === 'all' || searchTab === 'users') && searchResults.users.length > 0 && (<div className="mb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.users.map(renderUserCard)}</div></div>)}
                   
                   {(searchTab === 'all' || searchTab === 'blogs') && searchResults.blogs.length > 0 && (
                       <div className="mb-6 space-y-3">
                           <h4 className="text-sm font-bold text-gray-500 uppercase px-1">Bài viết ({searchResults.blogs.length})</h4>
                           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{searchResults.blogs.map(post => (
                               <Link to={`/blog/${post.slug}`} key={post.id} className="flex-shrink-0 w-64 bg-white dark:bg-dark-card rounded-2xl p-3 border border-gray-100 dark:border-dark-border shadow-sm flex flex-col">
                                   <div className="aspect-[2/1] rounded-xl bg-gray-100 mb-3 overflow-hidden relative shrink-0"><img src={post.coverImageUrl} className="w-full h-full object-cover" /></div>
                                   <h4 className="font-bold text-sm line-clamp-2 mb-1">{post.title}</h4>
                                   <div className="text-[10px] text-gray-400">{post.authorName}</div>
                               </Link>
                           ))}</div>
                       </div>
                   )}

                   {(searchTab === 'all' || searchTab === 'docs') && searchResults.docs.length > 0 && (
                       <div className="mb-6 space-y-3">
                           <h4 className="text-sm font-bold text-gray-500 uppercase px-1">Tài liệu ({searchResults.docs.length})</h4>
                           <div className="space-y-3">{searchResults.docs.map(renderDocCard)}</div>
                       </div>
                   )}
                   
                   {(searchTab === 'all' || searchTab === 'questions') && (
                     <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase px-1">Câu hỏi thảo luận ({searchResults.questions.length})</h4>
                        {paginatedList.map(q => (
                          <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block group">
                            <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border hover:border-primary/30 transition-all">
                              <h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug">{q.title}</h3>
                              <p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3">{q.content}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                <img src={q.author.avatar} className="w-5 h-5 rounded-full border border-gray-100 dark:border-slate-700" alt="" />
                                <span>{q.author.name}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                     </div>
                   )}
               </div>
           </div>
      ) : (
      <div className="space-y-4">
           
          {/* --- STORIES BAR --- */}
          <div className="px-4 md:px-0">
             <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                {/* Card Tạo Tin */}
                <div className="snap-start shrink-0 relative group cursor-pointer w-[85px] h-[130px] md:w-[100px] md:h-[150px]" onClick={handleOpenCreateStory}>
                    <div className="w-full h-full rounded-2xl overflow-hidden relative border border-gray-200 dark:border-slate-700 bg-white dark:bg-dark-card shadow-sm">
                        {/* SỬA LỖI AVATAR Ở CARD TẠO TIN */}
                        <img 
                          src={currentUser?.avatar || DEFAULT_AVATAR} 
                          onError={(e) => e.currentTarget.src = DEFAULT_AVATAR}
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                          alt="me" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center">
                            <div className="bg-primary text-white rounded-full p-1 border-2 border-white dark:border-dark-card mb-1 transition-transform group-hover:scale-110"><Plus size={16} /></div>
                            <span className="text-[10px] font-bold text-white">Tạo tin</span>
                        </div>
                    </div>
                </div>
                {/* Skeleton Loading */}
                {isLoadingStories && [1,2,3].map(i => (<div key={i} className="snap-start shrink-0 w-[85px] h-[130px] bg-gray-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>))}
                {/* Danh sách Stories */}
                {!isLoadingStories && stories.map((story) => (
                    <div key={story.id} onClick={() => setActiveStory(story)} className="snap-start shrink-0 relative group cursor-pointer w-[85px] h-[130px] md:w-[100px] md:h-[150px]">
                        <div className={`w-full h-full rounded-2xl overflow-hidden relative border-[2px] p-[2px] transition-all ${story.viewers.includes(currentUser?.id || '') ? 'border-gray-200 dark:border-slate-700' : 'border-blue-500'}`}>
                            <div className="w-full h-full rounded-xl overflow-hidden relative">
                                <img src={story.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="story" />
                                <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors"></div>
                                {/* SỬA LỖI AVATAR Ở BUBBLE STORY */}
                                <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-blue-500 overflow-hidden shadow-md">
                                  <img 
                                    src={story.userAvatar || DEFAULT_AVATAR} 
                                    onError={(e) => e.currentTarget.src = DEFAULT_AVATAR}
                                    className="w-full h-full object-cover" 
                                    alt="avatar" 
                                  />
                                </div>
                                <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white truncate text-shadow">{story.userName}</span>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* EXPERT PROMO */}
          <div className="bg-gradient-to-br from-primary to-[#26A69A] rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden mx-4 md:mx-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10 flex justify-between items-center">
                  <div><h2 className="text-xl font-bold mb-1">Góc Chuyên Gia</h2><p className="text-blue-50 text-xs font-medium opacity-90 mb-3">Chia sẻ kinh nghiệm: Góp phần tạo ra thay đổi tích cực cho cộng đồng.</p><Link to="/expert-register" className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border border-white/20">Đăng ký ngay <ChevronRight size={14} /></Link></div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl shadow-inner border border-white/10">👨‍⚕️</div>
              </div>
          </div>

          {/* BLOG CARDS */}
          {blogPosts.length > 0 && (<div className="space-y-3 pt-2 px-4 md:px-0"><div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><BookOpen size={18} className="text-blue-600 dark:text-blue-400" /><h3 className="font-bold text-textDark dark:text-dark-text text-sm uppercase tracking-wide">Kiến thức Chuyên gia</h3></div><Link to="/blog" className="text-xs font-bold text-blue-500 hover:underline">Xem tất cả</Link></div><div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">{blogPosts.slice(0, 5).map(post => (<Link to={`/blog/${post.slug}`} key={post.id} className="snap-start flex-shrink-0 w-64 bg-white dark:bg-dark-card rounded-2xl p-3 border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all active:scale-95 flex flex-col"><div className="aspect-[2/1] rounded-xl bg-gray-100 dark:bg-slate-700 mb-3 overflow-hidden relative shrink-0 flex items-center justify-center">{post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600">{post.iconEmoji || '📝'}</div>}</div><h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-2 mb-1 leading-snug flex-1">{post.title}</h4><div className="flex items-center gap-1 mt-auto pt-2"><span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-700 line-clamp-1 max-w-[100px]">{post.authorName}</span><span className="text-[10px] text-gray-300 dark:text-slate-600">•</span><span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span></div></Link>))}</div></div>)}

          {/* DOCUMENT CARDS */}
          {documents.length > 0 && (<div className="space-y-3 pt-2 px-4 md:px-0"><div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><FileText size={18} className="text-green-600 dark:text-green-400" /><h3 className="font-bold text-textDark dark:text-dark-text text-sm uppercase tracking-wide">Tài liệu chia sẻ</h3></div><Link to="/documents" className="text-xs font-bold text-green-500 hover:underline">Xem tất cả</Link></div><div className="space-y-3">{documents.slice(0, 3).map(renderDocCard)}</div></div>)}

          {/* CATEGORY FILTER */}
          <div className="pl-4 md:px-0 mt-6"><div className="flex items-center gap-1 mb-2"><Sparkles size={14} className="text-accent" fill="currentColor" /><span className="text-xs font-bold text-textGray dark:text-dark-muted uppercase tracking-wider">Chủ đề</span></div><div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x"><button onClick={() => setActiveCategory('Tất cả')} className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${activeCategory === 'Tất cả' ? 'bg-textDark dark:bg-primary text-white shadow-lg shadow-gray-200 dark:shadow-none' : 'bg-white dark:bg-dark-card text-textGray dark:text-dark-muted border border-gray-100 dark:border-dark-border shadow-sm'}`}>Tất cả</button>{categories.map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-dark-card text-textGray dark:text-dark-muted border border-gray-100 dark:border-dark-border shadow-sm'}`}>{cat}</button>))}</div></div>

          {/* MAIN FEED */}
          <div className="px-4 md:px-0 flex items-center justify-between mt-2"><h3 className="font-bold text-lg text-textDark dark:text-dark-text">Cộng đồng hỏi đáp</h3><div className="flex bg-white dark:bg-dark-card p-1 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm"><button onClick={() => setViewFilter('newest')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'newest' ? 'bg-gray-100 dark:bg-slate-700 text-textDark dark:text-white' : 'text-gray-400'}`}><Clock size={16} /></button><button onClick={() => setViewFilter('active')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'active' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 'text-gray-400'}`}><Flame size={16} /></button><button onClick={() => setViewFilter('unanswered')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'unanswered' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'text-gray-400'}`}><MessageSquareOff size={16} /></button></div></div>
          <div className="px-4 md:px-0 space-y-4 pb-10">
              {paginatedList.map((q, index) => {
                  const frequency = adConfig?.frequency || 5;
                  const shouldShowAd = adConfig?.isEnabled && (index + 1) % frequency === 0;

                  // --- LOGIC MỚI ĐỂ TÍNH LƯỢT THÍCH (FIX LỖI) ---
                  const likesCount = Array.isArray(q.likes) ? q.likes.length : (typeof q.likes === 'number' ? q.likes : 0);
                  const isLikedByCurrentUser = currentUser && Array.isArray(q.likes) && q.likes.includes(currentUser.id);
                  // ----------------------------------------------------

                  return (
                      <React.Fragment key={q.id}>
                          {shouldShowAd && (adConfig.provider === 'adsense' ? <AdBanner className="mx-4 md:mx-0" debugLabel={`Ad #${index}`} /> : <a href={adConfig.homeAd?.link || '#'} target="_blank" rel="noopener noreferrer" className="block group"><div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border hover:border-yellow-300 transition-all relative overflow-hidden"><div className="flex items-start justify-between mb-3 relative z-10"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-[10px] font-bold text-green-700 dark:text-green-400">Ad</div><div><p className="text-xs font-bold text-textDark dark:text-dark-text flex items-center gap-1">{adConfig.homeAd?.sponsorName || 'Nhà tài trợ'}<span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-bold">Sponsored</span></p><p className="text-[10px] text-gray-400">Gợi ý dành cho bạn</p></div></div><MoreHorizontal size={16} className="text-gray-300"/></div><h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug">{adConfig.homeAd?.title}</h3><p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3 font-normal">{adConfig.homeAd?.content}</p>{adConfig.homeAd?.imageUrl && (<div className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800"><img src={adConfig.homeAd.imageUrl} className="w-full h-48 object-cover" alt="ad" /></div>)}<div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800 mt-3"><div className="flex items-center gap-4 text-xs font-bold text-gray-400"><span className="flex items-center gap-1.5"><Heart size={14} /> 1.2k</span><span className="flex items-center gap-1.5"><MessageCircle size={14} /> 45</span></div><div className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm group-hover:bg-blue-700 transition-colors">{adConfig.homeAd?.ctaText || 'Xem ngay'} <ExternalLink size={10}/></div></div></div></a>)}
                          <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group"><div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-dark-border active:scale-[0.98] transition-all relative overflow-hidden">{q.answers.length === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-100 to-transparent dark:from-orange-900/10 rounded-bl-full -mr-8 -mt-8"></div>}<div className="flex items-start justify-between mb-3 relative z-10"><div className="flex items-center gap-2"><img src={q.author.avatar} className="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-700 object-cover" /><div><p className="text-xs font-bold text-textDark dark:text-dark-text flex items-center gap-1">{q.author.name} {q.author.isExpert && <ShieldCheck size={10} className="text-blue-500" />}</p><p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p></div></div><span className="bg-gray-50 dark:bg-slate-700 text-textGray dark:text-dark-muted text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-600">{q.category}</span></div><h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug line-clamp-2">{q.title}</h3><p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3 font-normal">{q.content}</p><FBImageGrid images={q.images || []} /><div className="flex items-center justify-between pt-3 border-t border-gray-5 dark:border-slate-800 mt-3"><div className="flex items-center gap-4 text-xs font-bold text-gray-400 dark:text-gray-500">
                            {/* DÒNG CODE ĐÃ FIX */}
                            <span className="flex items-center gap-1.5">
                                <Heart size={14} className={likesCount > 0 || isLikedByCurrentUser ? "text-red-500 fill-red-500" : ""} /> 
                                {likesCount}
                            </span>
                            {/* KẾT THÚC DÒNG CODE ĐÃ FIX */}
                            <span className="flex items-center gap-1.5"><MessageCircle size={14} className={q.answers.length > 0 ? "text-blue-500 fill-blue-500" : ""} /> {q.answers.length}</span></div>{q.answers.length === 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">Chưa có trả lời</span>}</div></div></Link>
                      </React.Fragment>
                  );
              })}
              {paginatedList.length < displayList.length && (<div className="flex justify-center pt-2"><button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="px-6 py-2.5 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold text-textDark dark:text-dark-text shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all">Xem thêm câu hỏi</button></div>)}
          </div>
      </div>
      )}
    </div>
  );
};
