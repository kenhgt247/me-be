import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BlogPost, BlogComment, User } from '../types';
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment, fetchPublishedPosts, fetchBlogCategories } from '../services/blog';
import { loginAnonymously } from '../services/auth';
import { 
  Loader2, ArrowLeft, Calendar, Share2, MessageCircle, Send, 
  ExternalLink, ShieldCheck, ChevronRight, Eye, Home, Clock, 
  TrendingUp, Megaphone, Star 
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { ShareModal } from '../components/ShareModal';

// --- CONSTANTS ---
const PAGE_SIZE = 5;

interface BlogCommentWithUI extends BlogComment {}

// Hàm lấy Youtube ID
const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Hàm tính thời gian đọc
const calculateReadingTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
};

export const BlogDetail: React.FC<{ currentUser: User; onOpenAuth: () => void }> = ({ currentUser, onOpenAuth }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Data State
  const [post, setPost] = useState<BlogPost | null>(null);
  const [categoryName, setCategoryName] = useState<string>('Kiến thức'); // State lưu tên danh mục hiển thị
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [mostViewedPosts, setMostViewedPosts] = useState<BlogPost[]>([]); 
  const [comments, setComments] = useState<BlogCommentWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Interaction State
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (slug) {
        window.scrollTo(0, 0); 
        loadData(slug);
    }
  }, [slug]);

  const loadData = async (slug: string) => {
    setLoading(true);
    try {
      const postData = await fetchPostBySlug(slug);
      
      if (postData) {
        // Fetch dữ liệu song song
        const [categories, related, initialComments, trending] = await Promise.all([
            fetchBlogCategories(), // Lấy danh mục để map ID sang Tên
            fetchRelatedPosts(postData.id, postData.categoryId),
            fetchBlogComments(postData.id),
            fetchPublishedPosts('all', 5) // Giả lập lấy bài xem nhiều
        ]);

        // Tìm tên danh mục từ ID
        const matchedCat = categories.find(c => c.id === postData.categoryId);
        if (matchedCat) setCategoryName(matchedCat.name);

        setPost(postData);
        setRelatedPosts(related);
        setComments(initialComments as BlogCommentWithUI[]);
        setMostViewedPosts(trending);
        setHasMore(initialComments.length === PAGE_SIZE); 
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
    setLoading(false);
  };
    
  const handleLoadMore = async () => {
    if (!post || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    const lastComment = comments[comments.length - 1];
    
    try {
        if (!lastComment || !lastComment.id) {
            setHasMore(false);
            return;
        }
      const nextComments = await fetchBlogComments(post.id, lastComment.id); 
      setComments(prev => [...prev, ...(nextComments as BlogCommentWithUI[])]);
      setHasMore(nextComments.length === PAGE_SIZE); 
    } catch (error) {
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentContent.trim() || !post) return;
    
    let user = currentUser;
    if (user.isGuest) {
      try {
        user = await loginAnonymously();
      } catch (e) {
        onOpenAuth();
        return;
      }
    }

    setSubmittingComment(true);
    await addBlogComment(user, post.id, commentContent);
    
    const initialComments = await fetchBlogComments(post.id);
    setComments(initialComments as BlogCommentWithUI[]);
    setHasMore(initialComments.length === PAGE_SIZE);
    setCommentContent('');
    setSubmittingComment(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  );
  
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <p className="text-gray-500 mb-4">Bài viết không tồn tại.</p>
        <button onClick={() => navigate('/blog')} className="px-4 py-2 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">
            Quay lại Blog
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white animate-fade-in pb-32">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/blog')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div className="flex gap-2">
                <button onClick={() => setShowShare(true)} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                    <Share2 size={22} />
                </button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* LAYOUT GRID: CONTENT TRÁI (8) - SIDEBAR PHẢI (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* --- MAIN CONTENT (LEFT - Chiếm 8 phần) --- */}
            <main className="lg:col-span-8">
                
                {/* BREADCRUMBS (Đã sửa hiển thị tên danh mục) */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <Link to="/" className="hover:text-black flex items-center gap-1"><Home size={14}/> Trang chủ</Link>
                    <ChevronRight size={14} className="text-gray-300" />
                    <Link to="/blog" className="hover:text-black">Blog</Link>
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">
                        {categoryName} {/* Hiển thị tên danh mục thật */}
                    </span>
                </div>

                {/* TITLE */}
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                    {post.title}
                </h1>
                
                {/* META INFO (Đã thêm Lượt xem) */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-8 pb-8 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                        <span className="font-bold text-gray-900">{post.authorName}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="flex items-center gap-1 text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                        <Eye size={14}/> {post.views || 0} lượt xem
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="flex items-center gap-1"><Clock size={14}/> {calculateReadingTime(post.content)} phút đọc</span>
                </div>

                {/* COVER IMAGE */}
                {post.coverImageUrl && (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden mb-10 shadow-sm bg-gray-100">
                        <img src={post.coverImageUrl} className="w-full h-full object-cover" alt={post.title} />
                    </div>
                )}

                {/* CONTENT BODY */}
                <div className="text-gray-800 text-lg leading-relaxed md:text-xl md:leading-[1.9]
                    [&>p]:mb-8 [&>p]:text-justify
                    [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-12 [&>h2]:mb-6 
                    [&>h3]:text-2xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-10 [&>h3]:mb-4
                    [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-8 [&>ul>li]:mb-3 [&>ul>li]:pl-2
                    [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-8 [&>ol>li]:mb-3 [&>ol>li]:pl-2
                    [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-6 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:mb-8 [&>blockquote]:text-xl
                    [&>img]:rounded-2xl [&>img]:w-full [&>img]:my-10 [&>img]:shadow-md
                    [&>a]:text-blue-600 [&>a]:underline [&>a]:font-medium
                    [&>strong]:font-bold [&>strong]:text-gray-900
                ">
                    <p className="text-xl md:text-2xl text-gray-600 font-serif italic mb-10 leading-relaxed">
                        {post.excerpt}
                    </p>

                    {post.youtubeUrl && (
                        <div className="my-10 rounded-2xl overflow-hidden aspect-video bg-black shadow-lg">
                            <iframe 
                                src={`https://www.youtube.com/embed/${getYoutubeId(post.youtubeUrl)}`} 
                                className="w-full h-full border-none"
                                allowFullScreen
                            />
                        </div>
                    )}

                    <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>

                {/* SOURCE & SHARE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-8 border-t border-b border-gray-100 mt-8 mb-12">
                     {post.sourceUrl ? (
                        <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-base font-bold text-gray-500 hover:text-blue-600 transition-colors">
                            <ExternalLink size={18} /> Nguồn tham khảo
                        </a>
                    ) : <span></span>}
                    
                    <button onClick={() => setShowShare(true)} className="inline-flex items-center gap-2 text-base font-bold text-gray-900 hover:text-blue-600 transition-colors bg-gray-50 px-5 py-2.5 rounded-full">
                        <Share2 size={18} /> Chia sẻ bài viết
                    </button>
                </div>

                {/* COMMENT SECTION */}
                <div className="bg-gray-50/50 rounded-[2rem] p-6 md:p-10 border border-gray-100">
                     <h3 className="font-bold text-2xl text-gray-900 mb-8 flex items-center gap-3">
                        Bình luận <span className="text-base font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">{post.commentCount || comments.length}</span>
                    </h3>

                    <div className="bg-white p-2 rounded-3xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all mb-10">
                        <textarea 
                            value={commentContent}
                            onChange={e => setCommentContent(e.target.value)}
                            className="w-full bg-transparent border-none rounded-2xl px-4 py-3 focus:ring-0 resize-none text-base min-h-[80px] placeholder-gray-400"
                            placeholder="Mẹ nghĩ sao về bài viết này?..."
                        />
                        <div className="flex justify-between items-center px-2 pb-2 mt-2">
                             <span className="text-xs text-gray-400 font-medium pl-2">
                                {currentUser.isGuest ? 'Đang ẩn danh' : currentUser.name}
                            </span>
                            <button 
                                onClick={handleSendComment}
                                disabled={!commentContent.trim() || submittingComment}
                                className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-gray-800 transition-colors flex items-center gap-2"
                            >
                                {submittingComment ? <Loader2 className="animate-spin" size={16} /> : <>Gửi <Send size={14}/></>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-4 animate-fade-in">
                                <img src={c.authorAvatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-white shadow-sm shrink-0" />
                                <div className="flex-1">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-gray-900">{c.authorName}</span>
                                            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="text-gray-800 text-[15px] whitespace-pre-wrap">{c.content}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {hasMore && (
                            <button onClick={handleLoadMore} disabled={isFetchingMore} className="w-full py-3 mt-4 text-sm font-bold text-gray-500 hover:bg-white hover:shadow-sm rounded-xl transition-all">
                                {isFetchingMore ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Xem thêm bình luận"}
                            </button>
                        )}
                        {comments.length === 0 && <p className="text-center text-gray-400 italic">Chưa có bình luận nào.</p>}
                    </div>
                </div>
            </main>

            {/* --- RIGHT SIDEBAR (Sticky on Desktop) --- */}
            <aside className="lg:col-span-4 space-y-8">
                <div className="sticky top-24 space-y-8">
                    
                    {/* 1. MOST VIEWED (Đã thêm số lượt xem) */}
                    {mostViewedPosts.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg"><TrendingUp size={18} /></span>
                                Đọc nhiều nhất
                            </h3>
                            <div className="flex flex-col gap-5">
                                {mostViewedPosts.map((p, index) => (
                                    <Link to={`/blog/${p.slug}`} key={p.id} className="group flex gap-4 items-start">
                                        <span className={`text-2xl font-black leading-none mt-1 ${
                                            index === 0 ? 'text-orange-500' : 
                                            index === 1 ? 'text-blue-500' : 
                                            index === 2 ? 'text-green-500' : 'text-gray-200'
                                        }`}>
                                            0{index + 1}
                                        </span>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-900 leading-snug group-hover:text-primary transition-colors mb-1 line-clamp-2">
                                                {p.title}
                                            </h4>
                                            {/* Hiển thị số lượt xem */}
                                            <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                                                <Eye size={12} /> {p.views || 0} lượt xem
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. AD BANNER */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg text-center">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-3 border border-white/20">Quảng cáo</span>
                            <Megaphone size={32} className="mb-3 animate-bounce" />
                            <h4 className="font-bold text-lg mb-1">Khóa học Ăn dặm</h4>
                            <p className="text-xs text-indigo-100 mb-4">Giúp bé ăn ngon, mẹ nhàn tênh chỉ sau 7 ngày.</p>
                            <button className="bg-white text-indigo-600 px-6 py-2 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors w-full">
                                Xem ngay
                            </button>
                        </div>
                    </div>

                    {/* 3. RELATED POSTS */}
                    {relatedPosts.length > 0 && (
                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                             <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                                <span className="w-1 h-5 bg-blue-600 rounded-full"></span> Có thể mẹ quan tâm
                            </h3>
                            <div className="flex flex-col gap-4">
                                {relatedPosts.map(p => (
                                    <Link to={`/blog/${p.slug}`} key={p.id} className="group flex gap-3 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                            {p.coverImageUrl ? (
                                                <img src={p.coverImageUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl">{p.iconEmoji}</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-xs text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">{p.title}</h4>
                                            <span className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </aside>
        </div>
      </div>
      
      <ShareModal 
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={window.location.href}
        title={post?.title}
      />
    </div>
  );
};
