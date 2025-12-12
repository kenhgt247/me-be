import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BlogPost, BlogComment, User } from '../types'; 
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment } from '../services/blog'; 
import { loginAnonymously } from '../services/auth';
import { 
  Loader2, ArrowLeft, Calendar, Share2, MessageCircle, Send, 
  ExternalLink, ShieldCheck, Heart, ChevronDown 
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  
  if (!post) return <div className="min-h-screen flex flex-col items-center justify-center bg-white"><p>Bài viết không tồn tại.</p><button onClick={() => navigate('/blog')} className="text-black underline mt-2">Quay lại</button></div>;

  return (
    <div className="min-h-screen bg-white animate-fade-in pb-32">
      
      {/* 1. MINIMAL HEADER (Thanh điều hướng siêu đơn giản) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-50 transition-all">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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

      {/* 2. MAIN CONTENT CONTAINER (Căn giữa, rộng vừa phải để đọc) */}
      <article className="max-w-[700px] mx-auto px-5 pt-8 md:pt-12">
        
        {/* HERO SECTION: Title & Author */}
        <header className="mb-8 md:mb-10 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    {post.iconEmoji} Blog
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                     {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-[1.15] tracking-tight">
                {post.title}
            </h1>

            {/* Author info - Clean & Simple */}
            <div className="flex items-center justify-center md:justify-start gap-3">
                <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-10 h-10 rounded-full object-cover bg-gray-50" />
                <div className="text-left">
                    <p className="font-bold text-gray-900 text-sm">
                        {post.authorName} {post.authorIsExpert && <ShieldCheck size={14} className="inline text-blue-500 ml-0.5" />}
                    </p>
                    <p className="text-xs text-gray-500">Tác giả chuyên mục</p>
                </div>
            </div>
        </header>

        {/* FEATURED IMAGE (Full width of container) */}
        {post.coverImageUrl && (
            <div className="w-full aspect-[16/9] md:aspect-[2/1] rounded-xl overflow-hidden mb-10 bg-gray-50">
                <img src={post.coverImageUrl} className="w-full h-full object-cover" alt={post.title} />
            </div>
        )}

        {/* --- CONTENT BODY --- */}
        {/* Sử dụng prose-lg để chữ to hơn, dễ đọc hơn. Màu chữ gray-800 thay vì đen tuyền */}
        <div className="prose prose-lg md:prose-xl prose-slate max-w-none 
            prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-10 prose-headings:mb-4
            prose-p:text-gray-800 prose-p:leading-[1.8] prose-p:font-serif md:prose-p:font-sans
            prose-a:text-black prose-a:underline hover:prose-a:text-gray-600
            prose-img:rounded-xl prose-img:my-8
            prose-strong:font-bold prose-strong:text-black
            prose-li:text-gray-800
            mb-16">
            
            {/* Excerpt - Giống đoạn mở đầu của báo chí */}
            <p className="lead text-xl md:text-2xl text-gray-500 font-light mb-8 not-italic">
                {post.excerpt}
            </p>

            {/* Youtube Embed */}
            {post.youtubeUrl && (
                <div className="my-8 rounded-xl overflow-hidden aspect-video bg-black">
                    <iframe 
                        src={`https://www.youtube.com/embed/${getYoutubeId(post.youtubeUrl)}`} 
                        className="w-full h-full border-none"
                        allowFullScreen
                    />
                </div>
            )}

            <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Source Link */}
        {post.sourceUrl && (
            <div className="mb-14 pt-6 border-t border-gray-100">
                <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors">
                    <ExternalLink size={14} /> Nguồn tham khảo
                </a>
            </div>
        )}

        {/* 3. RELATED POSTS (Dạng Grid đơn giản) */}
        {relatedPosts.length > 0 && (
            <div className="mb-16">
                <h3 className="font-bold text-lg text-gray-900 mb-6">Bài viết cùng chủ đề</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {relatedPosts.map(p => (
                        <Link to={`/blog/${p.slug}`} key={p.id} className="group cursor-pointer">
                            <div className="aspect-[3/2] rounded-lg bg-gray-100 overflow-hidden mb-3">
                                {p.coverImageUrl ? (
                                    <img src={p.coverImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">{p.iconEmoji}</div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 leading-tight group-hover:text-gray-600 transition-colors">{p.title}</h4>
                        </Link>
                    ))}
                </div>
            </div>
        )}
      </article>

      {/* 4. COMMENTS SECTION (Tách biệt nhẹ nhàng bằng nền xám nhạt) */}
      <div className="bg-[#FAFAFA] border-t border-gray-100 py-12">
        <div className="max-w-[700px] mx-auto px-5">
            <h3 className="font-bold text-xl text-gray-900 mb-8">
                Bình luận ({post.commentCount || comments.length})
            </h3>

            {/* Input Box - Minimal Style */}
            <div className="mb-10 relative">
                <textarea 
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 focus:ring-1 focus:ring-black focus:border-black transition-all resize-none text-base min-h-[100px] shadow-sm placeholder-gray-400"
                    placeholder="Viết bình luận của bạn..."
                />
                <div className="absolute bottom-3 right-3">
                    <button 
                        onClick={handleSendComment}
                        disabled={!commentContent.trim() || submittingComment}
                        className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                    >
                        {submittingComment ? <Loader2 className="animate-spin" size={14} /> : 'Gửi'}
                    </button>
                </div>
            </div>

            {/* Comment List - Clean & Linear */}
            <div className="space-y-8">
                {comments.map(c => (
                    <div key={c.id} className="group">
                        <div className="flex items-center gap-3 mb-2">
                            <img src={c.authorAvatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                            <div>
                                <span className="font-bold text-sm text-gray-900 mr-2">{c.authorName}</span>
                                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                            {c.isExpert && <ShieldCheck size={14} className="text-blue-500" />}
                        </div>
                        <div className="pl-11 text-gray-700 leading-relaxed text-[15px]">
                            {c.content}
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={isFetchingMore}
                        className="w-full py-3 mt-4 text-sm font-medium text-gray-500 hover:text-black transition-colors flex items-center justify-center gap-2"
                    >
                        {isFetchingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16}/>}
                        Xem thêm bình luận
                    </button>
                )}
                
                {comments.length === 0 && (
                    <p className="text-gray-400 italic text-center text-sm py-4">Chưa có bình luận nào.</p>
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
