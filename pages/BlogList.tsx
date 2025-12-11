import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { BlogPost, BlogCategory, User } from '../types';
import { fetchBlogCategories, fetchPublishedPosts } from '../services/blog';
import { subscribeToAuthChanges } from '../services/auth';
import { Loader2, BookOpen, Clock, ChevronRight, PenTool, Hash, ArrowDown } from 'lucide-react';

// Số lượng bài hiển thị mỗi lần (9 bài cho đẹp grid 3 cột)
const PAGE_SIZE = 9; 

export const BlogList: React.FC = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // State quản lý số lượng bài đang hiện
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAuthChanges(user => {
      setCurrentUser(user);
    });

    const init = async () => {
      setLoading(true);
      const [catsData, postsData] = await Promise.all([
        fetchBlogCategories(),
        // Lấy 100 bài để có dữ liệu cho nút Xem thêm hoạt động
        fetchPublishedPosts('all', 100) 
      ]);
      setCategories(catsData);
      setPosts(postsData);
      setLoading(false);
    };
    init();

    return () => unsub();
  }, []);

  const handleFilter = async (catId: string) => {
    setActiveCat(catId);
    setLoading(true);
    // Reset lại số lượng hiển thị về mặc định khi chuyển danh mục
    setVisibleCount(PAGE_SIZE); 
    
    // Lấy 100 bài theo danh mục
    const data = await fetchPublishedPosts(catId, 100);
    setPosts(data);
    setLoading(false);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const isExpertOrAdmin = currentUser && (currentUser.isExpert || currentUser.isAdmin);

  // Cắt danh sách bài viết dựa trên visibleCount
  const visiblePosts = posts.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
      {/* Header */}
      <div className="px-4 py-6 bg-white border-b border-gray-100 shadow-sm sticky top-[68px] md:top-20 z-30">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-textDark mb-2 flex items-center gap-2">
                        <BookOpen className="text-primary" /> Góc Chuyên Gia
                    </h1>
                    <p className="text-textGray text-sm">Kiến thức y khoa & nuôi dạy con chuẩn xác.</p>
                </div>
                
                {/* EXPERT ACTION BUTTON */}
                {isExpertOrAdmin && (
                    <button 
                        onClick={() => navigate('/admin/blog')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                    >
                        <PenTool size={16} />
                        <span className="hidden md:inline">Viết Blog</span>
                        <span className="md:hidden">Viết</span>
                    </button>
                )}
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mt-4 pb-1">
                <button 
                    onClick={() => handleFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCat === 'all' ? 'bg-textDark text-white shadow-md' : 'bg-gray-100 text-textGray hover:bg-gray-200'}`}
                >
                    Tất cả
                </button>
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => handleFilter(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCat === cat.id ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-textGray hover:bg-gray-50'}`}
                    >
                        <span>{cat.iconEmoji}</span> {cat.name}
                    </button>
                ))}
            </div>
         </div>
      </div>

      {/* Blog Grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
         {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
         ) : posts.length === 0 ? (
             <div className="text-center py-20 text-gray-400">Chưa có bài viết nào trong mục này.</div>
         ) : (
             <>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {visiblePosts.map(post => (
                         <Link to={`/blog/${post.slug}`} key={post.id} className="group bg-white rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                             <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                 {post.coverImageUrl ? (
                                     <img src={post.coverImageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-blue-50 to-purple-50">
                                         {post.iconEmoji || '📝'}
                                     </div>
                                 )}
                                 <div className="absolute top-3 left-3">
                                     <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-textDark shadow-sm">
                                         {categories.find(c => c.id === post.categoryId)?.name || 'Kiến thức'}
                                     </span>
                                 </div>
                             </div>
                             <div className="p-5">
                                 <h2 className="font-bold text-lg text-textDark mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                     {post.title}
                                 </h2>
                                 <p className="text-sm text-textGray line-clamp-3 mb-4 font-normal">
                                     {post.excerpt}
                                 </p>
                                 <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                                     <div className="flex items-center gap-2">
                                         <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-6 h-6 rounded-full object-cover" />
                                         <span className="text-xs font-bold text-textDark truncate max-w-[100px]">{post.authorName}</span>
                                     </div>
                                     <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                         <Clock size={12} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                     </div>
                                 </div>
                             </div>
                         </Link>
                     ))}
                 </div>

                 {/* NÚT XEM THÊM (LOAD MORE) */}
                 {visibleCount < posts.length && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={handleLoadMore}
                            className="px-6 py-3 rounded-full bg-white border border-gray-200 text-sm font-bold text-textDark shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2"
                        >
                            Xem thêm bài viết <ArrowDown size={16} />
                        </button>
                    </div>
                 )}
             </>
         )}
      </div>
    </div>
  );
};
