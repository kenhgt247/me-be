import React, { useEffect, useState, useRef } from 'react';
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

export const BlogList: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges(user => setCurrentUser(user));
    const unsubAd = subscribeToAdConfig(setAdConfig);
    const init = async () => {
      setLoading(true);
      try {
        const catsData = await fetchBlogCategories();
        setCategories(catsData);
        const trendingData = await fetchPublishedPosts('all', 10);
        setTrendingPosts(trendingData.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
        const { posts: initialPosts, lastDoc: initialLastDoc, hasMore: initialHasMore } = await fetchPostsPaginated('all', null, PAGE_SIZE);
        setPosts(initialPosts);
        setLastDoc(initialLastDoc);
        setHasMore(initialHasMore);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    init();
    return () => { unsubAuth(); unsubAd(); };
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !lastDoc) return;
    setIsLoadingMore(true);
    try {
        const { posts: newPosts, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchPostsPaginated(activeCat, lastDoc, PAGE_SIZE);
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(newLastDoc);
        setHasMore(newHasMore);
    } catch (error) { console.error(error); } finally { setIsLoadingMore(false); }
  };

  const handleFilter = async (catId: string) => {
    if (catId === activeCat) return;
    setActiveCat(catId);
    setLoading(true);
    setPosts([]);
    setLastDoc(null);
    try {
        const { posts: newPosts, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchPostsPaginated(catId, null, PAGE_SIZE);
        setPosts(newPosts);
        setLastDoc(newLastDoc);
        setHasMore(newHasMore);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // ✅ Định nghĩa lại biến gây lỗi ReferenceError
  const visiblePosts = searchTerm 
    ? posts.filter(post => post.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : posts;

  const showHero = !searchTerm && visiblePosts.length > 0 && activeCat === 'all';
  const heroPost = showHero ? visiblePosts[0] : null;
  const gridPosts = showHero ? visiblePosts.slice(1) : visiblePosts;

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline" /> Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 pt-safe-top">
      {/* Giữ nguyên phần Header UI của bạn */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {visiblePosts.length === 0 ? (
           <div className="text-center py-20">Không tìm thấy bài viết</div>
        ) : (
          <>
            {heroPost && <BlogCard post={heroPost} categoryName={categories.find(c => c.id === heroPost.categoryId)?.name} />}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {gridPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                   <BlogCard post={post} categoryName={categories.find(c => c.id === post.categoryId)?.name} />
                   {adConfig?.isEnabled && (index + 1) % 4 === 0 && <BlogGridAd />}
                </React.Fragment>
              ))}
            </div>
            {hasMore && !searchTerm && (
              <div className="text-center mt-10">
                <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-6 py-2 bg-white rounded-full font-bold shadow-sm">
                  {isLoadingMore ? "Đang tải..." : "Xem thêm bài viết"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
