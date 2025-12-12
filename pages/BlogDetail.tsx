import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BlogPost, BlogComment, User } from '../types';
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment } from '../services/blog';
import { loginAnonymously } from '../services/auth';
import { 
  Loader2, ArrowLeft, Calendar, Share2, MessageCircle, Send, 
  ExternalLink, ShieldCheck, Heart, ChevronDown, ChevronRight, Eye, Home, Clock 
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

// Hàm tính thời gian đọc (giả định 200 từ/phút)
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
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
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
        const related = await fetchRelatedPosts(postData.id, postData.categoryId);
        const initialComments = await fetchBlogComments(postData.id); 

        setPost(postData);
        setRelatedPosts(related);
        setComments(initialComments as BlogCommentWithUI[]);
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
      
      {/* 1. STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-50 transition-all">
        <div className="max-w-[720px] mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={() => navigate('/blog')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                <ArrowLeft size={22} />
            </button>
            <div className="flex gap-2">
                <button onClick={() => setShowShare(true)} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
                    <Share2 size={20} />
                </button>
            </div>
        </div>
      </div>

      {/* 2. ARTICLE CONTAINER */}
      <article className="max-w-[720px] mx-auto px-5 pt-8 md:pt-10">
        
        {/* === [NEW] BREADCRUMBS & META SECTION === */}
        <header className="mb-8 text-center md:text-left">
            
            {/* Breadcrumb Navigation: Trang chủ > Blog > Chủ đề */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-gray-500 mb-6 font-medium">
                <Link to="/" className="hover:text-black flex items-center gap-1"><Home size={14}/> Trang chủ</Link>
                <ChevronRight size={14} className="text-gray-300" />
                <Link to="/blog" className="hover:text-black">Blog</Link>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {post.categoryId || 'Kiến thức'}
                </span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-[1.2] tracking-tight">
                {post.title}
            </h1>

            {/* Meta Info: Author | Date | Views | Time */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-gray-100 pb-8">
                
                {/* Author Info */}
                <div className="flex items-center gap-3">
                    <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="Author" />
                    <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                            {post.authorName} {post.authorIsExpert && <ShieldCheck size={14} className="text-blue-500" />}
                        </p>
                        <p className="text-xs text-gray-500">Tác giả</p>
                    </div>
                </div>

                {/* Stats Divider (Desktop) */}
                <div className="hidden md:block w-px h-8 bg-gray-200"></div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                        <Calendar size={14} /> 
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                        <Eye size={14} /> 
                        {post.views || 0} lượt xem
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                        <Clock size={14} /> 
                        {calculateReadingTime(post.content)} phút đọc
                    </span>
                </div>
            </div>
        </header>

        {/* COVER IMAGE */}
        {post.coverImageUrl && (
            <div className="w-full aspect-video md:aspect-[2/1] rounded-2xl overflow-hidden mb-12 shadow-sm bg-gray-100">
                <img src={post.coverImageUrl} className="w-full h-full object-cover" alt={post.title} />
            </div>
        )}

        {/* --- CONTENT BODY --- */}
        <div className="text-gray-800 text-lg leading-relaxed md:text-xl md:leading-[1.8] mb-16
            [&>p]:mb-6 
            [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-10 [&>h2]:mb-4 
            [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-8 [&>h3]:mb-3
            [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>ul>li]:mb-2
            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-6 [&>ol>li]:mb-2
            [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:mb-6
            [&>img]:rounded-xl [&>img]:w-full [&>img]:my-8 [&>img]:shadow-sm
            [&>a]:text-blue-600 [&>a]:underline [&>a]:font-medium
            [&>strong]:font-bold [&>strong]:text-gray-900
        ">
            {/* Excerpt */}
            <p className="text-xl md:text-2xl text-gray-500 font-normal mb-10 border-b border-gray-100 pb-10 leading-relaxed font-serif italic">
                {post.excerpt}
            </p>

            {/* Youtube Embed */}
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

        {/* SOURCE LINK */}
        {post.sourceUrl && (
            <div className="mb-16 pt-6 border-t border-gray-100">
                <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors">
                    <ExternalLink size={16} /> Nguồn tham khảo
                </a>
            </div>
        )}

        {/* 3. RELATED POSTS */}
        {relatedPosts.length > 0 && (
            <div className="mb-20">
                <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span> Bài viết liên quan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {relatedPosts.map(p => (
                        <Link to={`/blog/${p.slug}`} key={p.id} className="group cursor-pointer bg-gray-50 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100">
                            <div className="aspect-[3/2] rounded-xl bg-gray-200 overflow-hidden mb-4 relative">
                                {p.coverImageUrl ? (
                                    <img src={p.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl bg-white">{p.iconEmoji}</div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{p.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-2">{p.excerpt}</p>
                        </Link>
                    ))}
                </div>
            </div>
        )}
      </article>

      {/* 4. COMMENTS SECTION */}
      <div className="bg-[#FAFAFA] border-t border-gray-100 py-16">
        <div className="max-w-[700px] mx-auto px-5">
            <h3 className="font-bold text-2xl text-gray-900 mb-8 flex items-center gap-3">
                Bình luận <span className="text-lg font-medium text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">{post.commentCount || comments.length}</span>
            </h3>

            {/* Input Box */}
            <div className="bg-white p-2 rounded-3xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all mb-12">
                <textarea 
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    className="w-full bg-transparent border-none rounded-2xl px-4 py-3 focus:ring-0 resize-none text-base min-h-[80px] placeholder-gray-400"
                    placeholder="Chia sẻ suy nghĩ của bạn..."
                />
                <div className="flex justify-between items-center px-2 pb-2 mt-2">
                    <span className="text-xs text-gray-400 font-medium pl-2 truncate max-w-[150px]">
                        {currentUser?.name || 'Khách'}
                    </span>
                    <button 
                        onClick={handleSendComment}
                        disabled={!commentContent.trim() || submittingComment}
                        className="bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors flex items-center gap-2"
                    >
                        {submittingComment ? <Loader2 className="animate-spin" size={16} /> : <>Gửi <Send size={14}/></>}
                    </button>
                </div>
            </div>

            {/* Comment List */}
            <div className="space-y-8">
                {comments.map(c => (
                    <div key={c.id} className="flex gap-4 animate-fade-in">
                        <div className="shrink-0">
                            <img src={c.authorAvatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-white shadow-sm" alt="avatar" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900">{c.authorName}</span>
                                        {c.isExpert && <ShieldCheck size={14} className="text-blue-500" />}
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">
                                    {c.content}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={isFetchingMore}
                        className="w-full py-3 mt-6 text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {isFetchingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16}/>}
                        Xem thêm bình luận cũ hơn
                    </button>
                )}
                
                {comments.length === 0 && (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                            <MessageCircle size={24} />
                        </div>
                        <p className="text-gray-500 text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                    </div>
                )}
            </div>
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
