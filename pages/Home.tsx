import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { Search, MessageCircle, Heart, HelpCircle, Clock, Flame, MessageSquareOff, ShieldCheck, ChevronRight, Sparkles, X, User as UserIcon, CornerDownRight, BookOpen, FileText, Download, LayoutGrid, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Question, User, toSlug, BlogPost, Document, AdConfig } from '../types';
import { AdBanner } from '../components/AdBanner';
import { subscribeToAdConfig, getAdConfig } from '../services/ads';
import { fetchPublishedPosts } from '../services/blog';
import { fetchDocuments } from '../services/documents';

interface HomeProps {
  questions: Question[];
  categories: string[];
}

const PAGE_SIZE = 20;

// --- COMPONENT ẢNH FACEBOOK STYLE ---
const FBImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  // Cập nhật Dark Mode cho khung ảnh: border và background
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
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === tab.id 
              ? 'bg-textDark dark:bg-primary text-white shadow-md' 
              : 'bg-white dark:bg-dark-card text-gray-500 dark:text-dark-muted border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <tab.icon size={14} />
          {tab.label}
          {tab.count > 0 && <span className="ml-1 opacity-80 text-[10px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
};

export const Home: React.FC<HomeProps> = ({ questions, categories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

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
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, viewFilter, searchQuery, searchTab]);

  // --- LOGIC SEARCH (Giữ nguyên) ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { questions: [], blogs: [], docs: [], users: [] };
    const query = searchQuery.toLowerCase().trim();

    const matchedQuestions = questions.filter(q => {
      const matchMain = q.title.toLowerCase().includes(query) || q.content.toLowerCase().includes(query);
      const matchAuthor = q.author.name.toLowerCase().includes(query);
      const matchAnswers = q.answers.some(a => 
        a.content.toLowerCase().includes(query) || a.author.name.toLowerCase().includes(query)
      );
      return matchMain || matchAuthor || matchAnswers;
    });

    const matchedBlogs = blogPosts.filter(p => 
       p.title.toLowerCase().includes(query) || 
       p.excerpt?.toLowerCase().includes(query) ||
       p.authorName.toLowerCase().includes(query)
    );

    const matchedDocs = documents.filter(d => 
       d.title.toLowerCase().includes(query) ||
       d.authorName.toLowerCase().includes(query)
    );

    const usersMap = new Map<string, User>();
    questions.forEach(q => {
        if (q.author.name.toLowerCase().includes(query)) usersMap.set(q.author.id, q.author);
        q.answers.forEach(a => {
            if (a.author.name.toLowerCase().includes(query)) usersMap.set(a.author.id, a.author);
        });
    });
    
    return { questions: matchedQuestions, blogs: matchedBlogs, docs: matchedDocs, users: Array.from(usersMap.values()) };
  }, [searchQuery, questions, blogPosts, documents]);

  // --- LOGIC FILTER (Giữ nguyên) ---
  let displayList = [...questions];
  if (!searchQuery) {
      if (activeCategory !== 'Tất cả') {
          displayList = displayList.filter(q => q.category === activeCategory);
      }
      switch (viewFilter) {
        case 'newest': displayList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
        case 'active': displayList.sort((a, b) => (b.answers.length * 2 + b.likes) - (a.answers.length * 2 + a.likes)); break;
        case 'unanswered': 
            displayList = displayList.filter(q => q.answers.length === 0); 
            displayList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
      }
  } else {
      displayList = searchResults.questions; 
      displayList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const paginatedList = displayList.slice(0, visibleCount);

  // --- RENDER HELPERS (Đã thêm Dark Mode) ---
  const renderUserCard = (user: User) => (
    <Link to={`/profile/${user.username || user.id}`} key={user.id} 
      className="flex-shrink-0 bg-white dark:bg-dark-card p-3 pr-5 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-3 min-w-[160px] active:scale-95 transition-transform hover:border-blue-200 dark:hover:border-blue-500/50">
        <div className="relative">
          <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600" />
          {user.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white dark:border-dark-card"><ShieldCheck size={10} /></div>}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-textDark dark:text-dark-text truncate max-w-[100px]">{user.name}</span>
          <span className="text-[10px] text-primary font-medium">Xem trang</span>
        </div>
    </Link>
  );

  const renderBlogCard = (post: BlogPost) => (
     <Link to={`/blog/${post.slug}`} key={post.id} 
        className="flex gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all active:scale-[0.99]">
        <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
            {post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">{post.iconEmoji || '📝'}</div>}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-textDark dark:text-dark-text line-clamp-2 mb-1">{post.title}</h4>
            <p className="text-xs text-textGray dark:text-dark-muted line-clamp-2 mb-2">{post.excerpt}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span>{post.authorName}</span> • <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
        </div>
     </Link>
  );

  const renderDocCard = (doc: Document) => (
    <Link to={`/documents/${doc.slug}`} key={doc.id} 
       className="flex items-center gap-4 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm active:scale-[0.98] transition-transform group hover:border-green-200 dark:hover:border-green-500/50">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
            {doc.fileType === 'pdf' ? '📕' : doc.fileType === 'image' ? '🖼️' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-1 group-hover:text-green-600 dark:group-hover:text-green-400">{doc.title}</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 flex items-center gap-2">
                <span>{doc.authorName}</span> • <span className="flex items-center gap-0.5"><Download size={10}/> {doc.downloads}</span>
            </p>
        </div>
    </Link>
  );

  return (
    <div className="space-y-4 animate-fade-in min-h-screen">
      
      {/* SEARCH BAR (Sticky Header) */}
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 md:pt-0 -mx-4 md:mx-0 bg-[#F7F7F5]/95 dark:bg-dark-bg/95 md:bg-transparent backdrop-blur-sm transition-all">
        <div className="relative group shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl mx-4 md:mx-0">
            <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl rounded-2xl"></div>
            <div className={`relative flex items-center bg-white/90 dark:bg-dark-card/90 rounded-2xl border transition-all overflow-hidden 
                ${searchQuery ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100 dark:border-dark-border focus-within:ring-2 focus-within:ring-primary/20'}`}>
                <div className="pl-4 text-primary"><Search size={20} /></div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm câu hỏi, chuyên gia, tài liệu..." 
                    className="w-full py-3.5 px-3 bg-transparent text-textDark dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-[15px] font-medium"
                />
                {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchTab('all'); }} className="pr-4 text-gray-400 hover:text-textDark dark:hover:text-white"><X size={16} /></button>
                )}
            </div>
        </div>
      </div>

      {/* --- CONTENT RENDER --- */}
      {searchQuery ? (
         <div className="animate-slide-up space-y-4">
             <SearchTabs 
                activeTab={searchTab} 
                onChange={setSearchTab} 
                counts={{
                    questions: searchResults.questions.length,
                    blogs: searchResults.blogs.length,
                    docs: searchResults.docs.length,
                    users: searchResults.users.length
                }}
             />
             <div className="px-4 md:px-0 space-y-4 pb-20">
                {(searchTab === 'all' || searchTab === 'users') && searchResults.users.length > 0 && (
                    <div className="mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.users.map(renderUserCard)}</div>
                    </div>
                )}
                
                {/* Search Result Questions */}
                {(searchTab === 'all' || searchTab === 'questions') && (
                    <div className="space-y-4">
                        {paginatedList.map(q => (
                            <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block group">
                                <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border hover:border-primary/30 transition-all">
                                    <h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug">{q.title}</h3>
                                    <p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3">{q.content}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                        <img src={q.author.avatar} className="w-5 h-5 rounded-full border border-gray-100 dark:border-slate-700" />
                                        <span>{q.author.name}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {/* Logic render docs/blogs trong search tương tự, đã rút gọn */}
             </div>
         </div>
      ) : (
      /* --- HOME FEED --- */
      <div className="space-y-4">
           {/* EXPERT PROMO - Giữ nguyên Gradient */}
           <div className="bg-gradient-to-br from-primary to-[#26A69A] rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden mx-4 md:mx-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Góc Chuyên Gia</h2>
                        <p className="text-blue-50 text-xs font-medium opacity-90 mb-3">Chia sẻ kinh nghiệm: Góp phần tạo ra thay đổi tích cực cho cộng đồng.</p>
                        <Link to="/expert-register" className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border border-white/20">
                            Đăng ký ngay <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl shadow-inner border border-white/10">👨‍⚕️</div>
                </div>
           </div>

           {/* BLOG CARDS */}
           {blogPosts.length > 0 && (
                <div className="space-y-3 pt-2 px-4 md:px-0">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                             <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
                             <h3 className="font-bold text-textDark dark:text-dark-text text-sm uppercase tracking-wide">Kiến thức Chuyên gia</h3>
                        </div>
                        <Link to="/blog" className="text-xs font-bold text-blue-500 hover:underline">Xem tất cả</Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">
                        {blogPosts.slice(0, 5).map(post => (
                            <Link to={`/blog/${post.slug}`} key={post.id} 
                                className="snap-start flex-shrink-0 w-64 bg-white dark:bg-dark-card rounded-2xl p-3 border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all active:scale-95 flex flex-col">
                                <div className="aspect-[2/1] rounded-xl bg-gray-100 dark:bg-slate-700 mb-3 overflow-hidden relative shrink-0 flex items-center justify-center">
                                    {post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600">{post.iconEmoji || '📝'}</div>}
                                </div>
                                <h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-2 mb-1 leading-snug flex-1">{post.title}</h4>
                                <div className="flex items-center gap-1 mt-auto pt-2">
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-700 line-clamp-1 max-w-[100px]">{post.authorName}</span>
                                    <span className="text-[10px] text-gray-300 dark:text-slate-600">•</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
           )}

           {/* DOCUMENT CARDS */}
           {documents.length > 0 && (
                <div className="space-y-3 pt-2 px-4 md:px-0">
                     <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2"><FileText size={18} className="text-green-600 dark:text-green-400" /><h3 className="font-bold text-textDark dark:text-dark-text text-sm uppercase tracking-wide">Tài liệu chia sẻ</h3></div>
                        <Link to="/documents" className="text-xs font-bold text-green-500 hover:underline">Xem tất cả</Link>
                    </div>
                    <div className="space-y-3">
                        {documents.slice(0, 3).map(renderDocCard)}
                    </div>
                </div>
           )}

           {/* CATEGORY FILTER */}
           <div className="pl-4 md:px-0 mt-6">
                <div className="flex items-center gap-1 mb-2">
                    <Sparkles size={14} className="text-accent" fill="currentColor" />
                    <span className="text-xs font-bold text-textGray dark:text-dark-muted uppercase tracking-wider">Chủ đề</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x">
                    <button onClick={() => setActiveCategory('Tất cả')} 
                        className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 
                        ${activeCategory === 'Tất cả' 
                            ? 'bg-textDark dark:bg-primary text-white shadow-lg shadow-gray-200 dark:shadow-none' 
                            : 'bg-white dark:bg-dark-card text-textGray dark:text-dark-muted border border-gray-100 dark:border-dark-border shadow-sm'
                        }`}>
                        Tất cả
                    </button>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} 
                            className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 
                            ${activeCategory === cat 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-white dark:bg-dark-card text-textGray dark:text-dark-muted border border-gray-100 dark:border-dark-border shadow-sm'
                            }`}>
                            {cat}
                        </button>
                    ))}
                </div>
           </div>

           {/* MAIN FEED HEADER */}
           <div className="px-4 md:px-0 flex items-center justify-between mt-2">
                <h3 className="font-bold text-lg text-textDark dark:text-dark-text">Cộng đồng hỏi đáp</h3>
                <div className="flex bg-white dark:bg-dark-card p-1 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
                    <button onClick={() => setViewFilter('newest')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'newest' ? 'bg-gray-100 dark:bg-slate-700 text-textDark dark:text-white' : 'text-gray-400'}`}><Clock size={16} /></button>
                    <button onClick={() => setViewFilter('active')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'active' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 'text-gray-400'}`}><Flame size={16} /></button>
                    <button onClick={() => setViewFilter('unanswered')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'unanswered' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'text-gray-400'}`}><MessageSquareOff size={16} /></button>
                </div>
           </div>

           <div className="px-4 md:px-0 space-y-4 pb-10">
              {paginatedList.map((q, index) => {
                  const frequency = adConfig?.frequency || 5;
                  const shouldShowAd = adConfig?.isEnabled && (index + 1) % frequency === 0;

                  return (
                      <React.Fragment key={q.id}>
                        {/* --- RENDER QUẢNG CÁO (NẾU CÓ) --- */}
                        {shouldShowAd && (
                            adConfig.provider === 'adsense' ? (
                                <AdBanner className="mx-4 md:mx-0" debugLabel={`Ad #${index}`} />
                            ) : (
                                /* NATIVE AD CARD */
                                <a href={adConfig.homeAd?.link || '#'} target="_blank" rel="noopener noreferrer" className="block group">
                                    <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border hover:border-yellow-300 transition-all relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-3 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-[10px] font-bold text-green-700 dark:text-green-400">Ad</div>
                                                <div>
                                                    <p className="text-xs font-bold text-textDark dark:text-dark-text flex items-center gap-1">
                                                        {adConfig.homeAd?.sponsorName || 'Nhà tài trợ'}
                                                        <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-bold">Sponsored</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">Gợi ý dành cho bạn</p>
                                                </div>
                                            </div>
                                            <MoreHorizontal size={16} className="text-gray-300"/>
                                        </div>

                                        <h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug">{adConfig.homeAd?.title}</h3>
                                        <p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3 font-normal">{adConfig.homeAd?.content}</p>
                                        
                                        {adConfig.homeAd?.imageUrl && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-slate-800">
                                                <img src={adConfig.homeAd.imageUrl} className="w-full h-48 object-cover" alt="ad" />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-dark-border mt-3">
                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                                <span className="flex items-center gap-1.5"><Heart size={14} /> 1.2k</span>
                                                <span className="flex items-center gap-1.5"><MessageCircle size={14} /> 45</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm group-hover:bg-blue-700 transition-colors">
                                                {adConfig.homeAd?.ctaText || 'Xem ngay'} <ExternalLink size={10}/>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            )
                        )}

                        {/* --- RENDER CÂU HỎI THẬT --- */}
                        <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group">
                            <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-dark-border active:scale-[0.98] transition-all relative overflow-hidden">
                                {q.answers.length === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-100 to-transparent dark:from-orange-900/10 rounded-bl-full -mr-8 -mt-8"></div>}
                                <div className="flex items-start justify-between mb-3 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <img src={q.author.avatar} className="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-700 object-cover" />
                                        <div>
                                            <p className="text-xs font-bold text-textDark dark:text-dark-text flex items-center gap-1">{q.author.name} {q.author.isExpert && <ShieldCheck size={10} className="text-blue-500" />}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    </div>
                                    <span className="bg-gray-50 dark:bg-slate-700 text-textGray dark:text-dark-muted text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-600">{q.category}</span>
                                </div>
                                <h3 className="text-[16px] font-bold text-textDark dark:text-dark-text mb-2 leading-snug line-clamp-2">{q.title}</h3>
                                <p className="text-textGray dark:text-dark-muted text-sm line-clamp-2 mb-3 font-normal">{q.content}</p>
                                <FBImageGrid images={q.images || []} />
                                
                                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800 mt-3">
                                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400 dark:text-gray-500">
                                        <span className="flex items-center gap-1.5"><Heart size={14} className={q.likes > 0 ? "text-red-500 fill-red-500" : ""} /> {q.likes}</span>
                                        <span className="flex items-center gap-1.5"><MessageCircle size={14} className={q.answers.length > 0 ? "text-blue-500 fill-blue-500" : ""} /> {q.answers.length}</span>
                                    </div>
                                    {q.answers.length === 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">Chưa có trả lời</span>}
                                </div>
                            </div>
                        </Link>
                      </React.Fragment>
                  );
              })}
              
              {paginatedList.length < displayList.length && (
                 <div className="flex justify-center pt-2">
                    <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="px-6 py-2.5 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold text-textDark dark:text-dark-text shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all">Xem thêm câu hỏi</button>
                 </div>
              )}
           </div>
      </div>
      )}
    </div>
  );
};
