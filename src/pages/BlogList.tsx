import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlogPost, BlogCategory, User, AdConfig } from '../types';
import { fetchBlogCategories, fetchPublishedPosts } from '../services/blog';
import { getAdConfig, subscribeToAdConfig } from '../services/ads';
import { subscribeToAuthChanges } from '../services/auth';
import { 
  Loader2, BookOpen, Clock, PenTool, Search, X, ArrowDown, 
  Sparkles, AlertCircle, ChevronLeft, ChevronRight, Flame, Eye 
} from 'lucide-react';
import { ExpertPromoBox } from '../components/ExpertPromoBox';
import { BlogGridAd } from '../components/ads/BlogGridAd';
import { SidebarAd } from '../components/ads/SidebarAd';
import { BlogCard } from '../components/blog/BlogCard'; // Import component mới

const PAGE_SIZE = 10;

// --- SKELETON LOADER ---
const BlogSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-white dark:bg-dark-card rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-dark-border shadow-sm h-96 flex flex-col">
        <div className="aspect-video bg-gray-200 dark:bg-slate-700 animate-pulse" />
        <div className="p-5 flex-1 flex flex-col gap-3">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-full animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
            <div className="mt-auto flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                <div className="w-20 h-4 bg-gray-200 dark:bg-slate-700 rounded mt-2 animate-pulse" />
            </div>
        </div>
      </div>
    ))}
  </div>
);

export const BlogList: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges(user => setCurrentUser(user));
    const unsubAd = subscribeToAdConfig(setAdConfig);

    const init = async () => {
      setLoading(true);
      try {
        const [catsData, postsData] = await Promise.all([
            fetchBlogCategories(),
            fetchPublishedPosts('all', 100)
        ]);
        setCategories(catsData);
        setPosts(postsData);
      } catch (error) {
        console.error("Failed to load blog data", error);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { unsubAuth(); unsubAd(); };
  }, []);

  const handleFilter = async (catId: string) => {
    setActiveCat(catId);
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    setSearchTerm(''); 
    try {
        const data = await fetchPublishedPosts(catId, 100);
        setPosts(data);
    } catch (error) {
        console.error("Filter error", error);
    } finally {
        setLoading(false);
    }
  };

  const scrollCategory = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount = 300;
        if (direction === 'left') {
            current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
  };

  const isExpertOrAdmin = currentUser && (currentUser.isExpert || currentUser.isAdmin);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const trendingPosts = useMemo(() => {
    if (searchTerm || activeCat !== 'all') return []; 
    return [...posts]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5); 
  }, [posts, searchTerm, activeCat]);

  const showHero = !searchTerm && filteredPosts.length > 0;
  const heroPost = showHero ? filteredPosts[0] : null;
  const remainingPosts = showHero ? filteredPosts.slice(1) : filteredPosts;
  const visibleGridPosts = remainingPosts.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 animate-fade-in pt-safe-top transition-colors duration-300">
      {/* HEADER */}
      <div className="sticky top-0 z-30 pointer-events-none"> 
         <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none rounded-b-[2rem] pointer-events-auto transition-all duration-300 relative overflow-hidden">
             <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-purple-500 absolute top-0 left-0"></div>
             <div className="max-w-5xl mx-auto px-4 py-4 pt-safe-top">
                <div className="flex justify-between items-center mb-4 mt-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                            <BookOpen className="text-primary fill-primary/10" strokeWidth={2.5} /> 
                            Góc Chuyên Gia
                        </h1>
                    </div>
                    {isExpertOrAdmin && (
                        <button onClick={() => navigate('/admin/blog')} className="bg-gray-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform hover:bg-gray-800 dark:hover:bg-slate-600">
                            <PenTool size={16} /> <span className="hidden md:inline">Viết bài</span>
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pb-2">
                    <div className="relative w-full md:w-auto md:flex-1 max-w-md group shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm kiến thức..." className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-sm text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-inner" />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X size={16} /></button>}
                    </div>

                    <div className="flex-1 w-full min-w-0 relative group/scroll">
                        <button onClick={() => scrollCategory('left')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm shadow-md rounded-full items-center justify-center text-gray-600 dark:text-white hover:text-primary border border-gray-100 dark:border-slate-600 opacity-0 group-hover/scroll:opacity-100 transition-all active:scale-90 disabled:opacity-0"><ChevronLeft size={20} /></button>
                        <div ref={scrollRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-1">
                            <button onClick={() => handleFilter('all')} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCat === 'all' ? 'bg-gray-900 dark:bg-primary text-white border-gray-900 dark:border-primary shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Tất cả</button>
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => handleFilter(cat.id)} className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${activeCat === cat.id ? 'bg-white dark:bg-dark-card text-primary border-primary shadow-sm ring-2 ring-primary/10' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><span className="text-sm">{cat.iconEmoji}</span> {cat.name}</button>
                            ))}
                        </div>
                        <button onClick={() => scrollCategory('right')} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm shadow-md rounded-full items-center justify-center text-gray-600 dark:text-white hover:text-primary border border-gray-100 dark:border-slate-600 opacity-0 group-hover/scroll:opacity-100 transition-all active:scale-90"><ChevronRight size={20} /></button>
                    </div>
                </div>
             </div>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
         {loading ? (
             <BlogSkeleton />
         ) : filteredPosts.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                 <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600"><AlertCircle size={40} /></div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Không tìm thấy bài viết</h3>
                 <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xs mx-auto">{searchTerm ? `Chúng tôi không tìm thấy kết quả nào cho "${searchTerm}".` : 'Chưa có bài viết nào trong chủ đề này.'}</p>
                 {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-primary font-bold text-sm hover:underline">Xóa bộ lọc tìm kiếm</button>}
             </div>
         ) : (
             <>
                 {/* HERO POST */}
                 {heroPost && (
                    <div className="mb-10 animate-slide-up">
                        <Link to={`/blog/${heroPost.slug}`} className="group block relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all">
                             <div className="aspect-[2/1] md:aspect-[21/9] bg-gray-200 dark:bg-slate-700 w-full relative">
                                 {heroPost.coverImageUrl ? (
                                    <img src={heroPost.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" alt={heroPost.title} />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white text-6xl">{heroPost.iconEmoji}</div>
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                 <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-3/4">
                                     <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 shadow-md border border-white/20">
                                        <Sparkles size={10} /> Mới nhất
                                     </span>
                                     <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-3 drop-shadow-sm group-hover:text-blue-100 transition-colors">{heroPost.title}</h2>
                                     <p className="text-gray-200 text-sm md:text-base line-clamp-2 mb-4 font-medium hidden md:block opacity-90">{heroPost.excerpt}</p>
                                     <div className="flex items-center gap-3 text-white/90 text-xs font-bold">
                                         <img src={heroPost.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-8 h-8 rounded-full border-2 border-white/30" alt="avatar" />
                                         <span>{heroPost.authorName}</span>
                                         <span className="opacity-50">•</span>
                                         <span>{new Date(heroPost.createdAt).toLocaleDateString('vi-VN')}</span>
                                     </div>
                                 </div>
                             </div>
                        </Link>
                    </div>
                 )}

                 {/* PROMO BOX */}
                 {!currentUser?.isExpert && (
                    <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.08s' }}>
                        <ExpertPromoBox />
                    </div>
                 )}

                 {/* TRENDING SECTION */}
                 {trendingPosts.length > 0 && (
                     <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                        <div className="flex items-center gap-2 mb-4">
                             <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400"><Flame size={20} fill="currentColor" /></div>
                             <h3 className="font-bold text-xl text-gray-900 dark:text-white">Được quan tâm nhất</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">
                             {trendingPosts.map((post, index) => (
                                 <Link to={`/blog/${post.slug}`} key={post.id} className="snap-start flex-shrink-0 w-72 bg-white dark:bg-dark-card rounded-[1.5rem] p-3 border border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none hover:shadow-md transition-all active:scale-95 group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gray-900/10 dark:bg-white/5 text-gray-900 dark:text-white font-black text-[4rem] leading-none -mt-2 -mr-2 opacity-10 select-none pointer-events-none group-hover:scale-110 transition-transform">{index + 1}</div>
                                    <div className="flex gap-3">
                                        <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-slate-700 shrink-0 overflow-hidden relative">
                                            {post.coverImageUrl ? (
                                                <img src={post.coverImageUrl} className="w-full h-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl bg-blue-50 dark:bg-slate-800">{post.iconEmoji}</div>
                                            )}
                                            <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 rounded-md">#{index + 1}</div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Eye size={10} /> {post.views || 0} lượt xem</div>
                                            <h4 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">{post.title}</h4>
                                        </div>
                                    </div>
                                 </Link>
                             ))}
                        </div>
                     </div>
                 )}

                 {/* MAIN GRID POSTS */}
                 <div className="flex items-center gap-2 mb-4">
                     <h3 className="font-bold text-xl text-gray-900 dark:text-white">Bài viết mới</h3>
                 </div>
                 
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                     {visibleGridPosts.map((post, index) => {
                         const freq = adConfig?.frequencies?.blog || 4;
                         const shouldShowAd = adConfig?.isEnabled && (index + 1) % freq === 0;
                         const categoryName = categories.find(c => c.id === post.categoryId)?.name;

                         return (
                             <React.Fragment key={post.id}>
                                 <BlogCard post={post} categoryName={categoryName} />
                                 {shouldShowAd && <BlogGridAd />}
                             </React.Fragment>
                         );
                     })}
                 </div>

                 {/* LOAD MORE BUTTON */}
                 {visibleGridPosts.length < remainingPosts.length && (
                    <div className="flex justify-center mt-12 pb-8">
                        <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="px-8 py-3 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-2 group">
                           Xem thêm bài viết <ArrowDown size={16} className="group-hover:translate-y-1 transition-transform" />
                        </button>
                    </div>
                 )}
             </>
         )}
      </div>
    </div>
  );
};