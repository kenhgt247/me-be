import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BlogPost, BlogCategory, User, AdConfig } from '../types';
import { fetchBlogCategories, fetchPostsPaginated, fetchPublishedPosts } from '../services/blog';
import { getAdConfig, subscribeToAdConfig } from '../services/ads';
import { subscribeToAuthChanges } from '../services/auth';
import { 
  Loader2, BookOpen, PenTool, Search, X, ArrowDown, 
  Sparkles, AlertCircle, ChevronLeft, ChevronRight, Flame, Eye 
} from 'lucide-react';
import { ExpertPromoBox } from '../components/ExpertPromoBox';
import { BlogGridAd } from '../components/ads/BlogGridAd';
import { BlogCard } from '../components/blog/BlogCard'; 
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 9;

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
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([]);
  
  // State Phân trang (LOGIC MỚI - GIỮ CÁI NÀY)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges(user => setCurrentUser(user));
    const unsubAd = subscribeToAdConfig(setAdConfig);

    const init = async () => {
      setLoading(true);
      try {
        const catsData = await fetchBlogCategories();
        setCategories(catsData);

        // Lấy Trending (Logic cũ OK, nhưng tách ra cho gọn)
        const trendingData = await fetchPublishedPosts('all', 10);
        setTrendingPosts(trendingData.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));

        // Lấy bài viết Grid (Phân trang - LOGIC MỚI)
        const { posts: initialPosts, lastDoc: initialLastDoc, hasMore: initialHasMore } = await fetchPostsPaginated('all', null, PAGE_SIZE);
        
        setPosts(initialPosts);
        setLastDoc(initialLastDoc);
        setHasMore(initialHasMore);

      } catch (error) {
        console.error("Failed to load blog data", error);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { unsubAuth(); unsubAd(); };
  }, []);

  // Load More Handler (LOGIC MỚI - GIỮ CÁI NÀY)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !lastDoc) return;
    
    setIsLoadingMore(true);
    try {
        const { posts: newPosts, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchPostsPaginated(activeCat, lastDoc, PAGE_SIZE);
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(newLastDoc);
        setHasMore(newHasMore);
    } catch (error) {
        console.error("Lỗi tải thêm:", error);
    } finally {
        setIsLoadingMore(false);
    }
  };

  // Filter Handler (LOGIC MỚI - GIỮ CÁI NÀY)
  const handleFilter = async (catId: string) => {
    if (catId === activeCat) return;

    setActiveCat(catId);
    setLoading(true);
    setSearchTerm(''); 
    setPosts([]); 
    setLastDoc(null);

    try {
        const { posts: newPosts, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchPostsPaginated(catId, null, PAGE_SIZE);
        setPosts(newPosts);
        setLastDoc(newLastDoc);
        setHasMore(newHasMore);
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
        if (direction === 'left') current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        else current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const isExpertOrAdmin = currentUser && (currentUser.isExpert || currentUser.isAdmin);

  const visiblePosts = searchTerm 
    ? posts.filter(post => post.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : posts;

  const showHero = !searchTerm && visiblePosts.length > 0 && activeCat === 'all';
  const heroPost = showHero ? visiblePosts[0] : null;
  const gridPosts = showHero ? visiblePosts.slice(1) : visiblePosts;

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
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm bài viết đã tải..." className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-sm text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-inner" />
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
         ) : visiblePosts.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                 <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600"><AlertCircle size={40} /></div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">Không tìm thấy bài viết</h3>
                 <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xs mx-auto">{searchTerm ? `Không tìm thấy kết quả nào cho "${searchTerm}".` : 'Chưa có bài viết nào trong chủ đề này.'}</p>
                 {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-primary font-bold text-sm hover:underline">Xóa bộ lọc tìm kiếm</button>}
             </div>
         ) : (
             <>
                 {/* HERO POST */}
                 {heroPost && (
                    <div className="mb-10 animate-slide-up">
                        <BlogCard post={heroPost} categoryName={categories.find(c => c.id === heroPost.categoryId)?.name} />
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
                                 <div key={post.id} className="snap-start flex-shrink-0 w-72">
                                     <BlogCard post={post} categoryName={categories.find(c => c.id === post.categoryId)?.name} />
                                 </div>
                             ))}
                        </div>
                     </div>
                 )}

                 {/* MAIN GRID POSTS */}
                 <div className="flex items-center gap-2 mb-4">
                     <h3 className="font-bold text-xl text-gray-900 dark:text-white">Bài viết mới</h3>
                 </div>
                 
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                     {gridPosts.map((post, index) => {
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
                 {hasMore && !searchTerm && (
                    <div className="flex justify-center mt-12 pb-8">
                        <button 
                            onClick={handleLoadMore} 
                            disabled={isLoadingMore}
                            className="px-8 py-3 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-2 group disabled:opacity-70"
                        >
                           {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : 'Xem thêm bài viết'} 
                           {!isLoadingMore && <ArrowDown size={16} className="group-hover:translate-y-1 transition-transform" />}
                        </button>
                    </div>
                 )}
             </>
         )}
      </div>
    </div>
  );
};