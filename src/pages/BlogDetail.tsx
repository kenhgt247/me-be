import React, { useEffect, useState } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';
// SỬA: ../ thay vì ../../
import { BlogPost, BlogComment, User, AdConfig } from '../types';
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment, fetchPublishedPosts, fetchBlogCategories } from '../services/blog';
import { getAdConfig, subscribeToAdConfig } from '../services/ads'; 
import { loginAnonymously } from '../services/auth';
import { 
  Loader2, ArrowLeft, Calendar, Share2, MessageCircle, Send, 
  ExternalLink, ChevronRight, Eye, Home, Clock, 
  TrendingUp, Megaphone 
} from 'lucide-react';
// SỬA: ../ thay vì ../../
import { ShareModal } from '../components/ShareModal';
import { ExpertPromoBox } from '../components/ExpertPromoBox';
import { SidebarAd } from '../components/ads/SidebarAd'; 

// --- CONSTANTS ---
const PAGE_SIZE = 5;

interface BlogCommentWithUI extends BlogComment {}

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

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
  const [categoryName, setCategoryName] = useState<string>('Kiến thức');
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [mostViewedPosts, setMostViewedPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogCommentWithUI[]>([]);
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

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
        const [categories, related, initialComments, trending, adSettings] = await Promise.all([
            fetchBlogCategories(),
            fetchRelatedPosts(postData.id, postData.categoryId),
            fetchBlogComments(postData.id),
            fetchPublishedPosts('all', 5),
            getAdConfig()
        ]);

        const matchedCat = categories.find(c => c.id === postData.categoryId);
        if (matchedCat) setCategoryName(matchedCat.name);

        setPost(postData);
        setRelatedPosts(related);
        setComments(initialComments as BlogCommentWithUI[]);
        setMostViewedPosts(trending);
        setAdConfig(adSettings); 
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-dark-bg p-4 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Bài viết không tồn tại.</p>
        <button onClick={() => navigate('/blog')} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-full font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Quay lại Blog</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg animate-fade-in pb-32 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-gray-50 dark:border-dark-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/blog')} className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-300 transition-colors"><ArrowLeft size={24} /></button>
            <div className="flex gap-2">
                <button onClick={() => setShowShare(true)} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-300 transition-colors"><Share2 size={22} /></button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* MAIN CONTENT (LEFT) */}
            <main className="lg:col-span-8">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                    <Link to="/" className="hover:text-black dark:hover:text-white flex items-center gap-1"><Home size={14}/> Trang chủ</Link>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                    <Link to="/blog" className="hover:text-black dark:hover:text-white">Blog</Link>
                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                    <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">{categoryName}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">{post.title}</h1>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-8 pb-8 border-b border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2">
                        <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-slate-600" />
                        <span className="font-bold text-gray-900 dark:text-white">{post.authorName}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full"><Eye size={14}/> {post.views || 0} lượt xem</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="flex items-center gap-1"><Clock size={14}/> {calculateReadingTime(post.content)} phút đọc</span>
                </div>

                {post.coverImageUrl && (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden mb-10 shadow-sm bg-gray-100 dark:bg-slate-800">
                        <img src={post.coverImageUrl} className="w-full h-full object-cover" alt={post.title} />
                    </div>
                )}

              {/* RICH TEXT CONTENT */}
              <article className="prose prose-xl md:prose-2xl max-w-none 
                  font-sans font-medium text-gray-900 dark:text-gray-50
                  prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white 
                  prose-headings:mt-12 prose-headings:mb-6
                  prose-p:text-gray-800 dark:prose-p:text-gray-100 
                  prose-p:leading-loose prose-p:mb-8 prose-p:text-justify
                  prose-a:text-blue-700 dark:prose-a:text-blue-400 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                  prose-img:rounded-3xl prose-img:shadow-md prose-img:my-10 prose-img:w-full
                  prose-li:text-gray-800 dark:prose-li:text-gray-100 prose-li:marker:text-blue-600
                  prose-strong:text-black dark:prose-strong:text-white prose-strong:font-black
                  prose-blockquote:border-l-8 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 
                  prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic 
                  prose-blockquote:text-xl prose-blockquote:font-semibold prose-blockquote:text-blue-900 dark:prose-blockquote:text-blue-100
              ">
                  {/* Excerpt */}
                  <div className="text-xl md:text-2xl text-gray-800 dark:text-gray-100 font-sans font-semibold italic mb-12 leading-relaxed border-l-8 border-orange-400 pl-6 bg-orange-50 dark:bg-orange-900/10 py-6 pr-6 rounded-r-3xl">
                      {post.excerpt}
                  </div>

                  {/* Youtube */}
                  {post.youtubeUrl && (
                      <div className="my-12 rounded-3xl overflow-hidden aspect-video bg-black shadow-xl ring-4 ring-gray-100 dark:ring-gray-700">
                          <iframe src={`https://www.youtube.com/embed/${getYoutubeId(post.youtubeUrl)}`} className="w-full h-full border-none" allowFullScreen />
                      </div>
                  )}

                  {/* HTML Content */}
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </article>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-8 border-t border-b border-gray-100 dark:border-dark-border mt-8 mb-12">
                     {post.sourceUrl ? <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-base font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><ExternalLink size={18} /> Nguồn tham khảo</a> : <span></span>}
                    <button onClick={() => setShowShare(true)} className="inline-flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-slate-700 px-5 py-2.5 rounded-full"><Share2 size={18} /> Chia sẻ bài viết</button>
                </div>

                {/* COMMENTS */}
                <div className="bg-gray-50/50 dark:bg-dark-card/50 rounded-[2rem] p-6 md:p-10 border border-gray-100 dark:border-dark-border">
                     <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-8 flex items-center gap-3">Bình luận <span className="text-base font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-slate-700 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-600">{post.commentCount || comments.length}</span></h3>
                    
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all mb-10">
                        <textarea value={commentContent} onChange={e => setCommentContent(e.target.value)} className="w-full bg-transparent border-none rounded-2xl px-4 py-3 focus:ring-0 resize-none text-base min-h-[80px] placeholder-gray-400 dark:placeholder-gray-500 text-textDark dark:text-white" placeholder="Mẹ nghĩ sao về bài viết này?..." />
                        <div className="flex justify-between items-center px-2 pb-2 mt-2">
                             <span className="text-xs text-gray-400 dark:text-gray-500 font-medium pl-2">{currentUser.isGuest ? 'Đang ẩn danh' : currentUser.name}</span>
                            <button onClick={handleSendComment} disabled={!commentContent.trim() || submittingComment} className="bg-black dark:bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-primary/80 transition-colors flex items-center gap-2">{submittingComment ? <Loader2 className="animate-spin" size={16} /> : <>Gửi <Send size={14}/></>}</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-4 animate-fade-in">
                                <img src={c.authorAvatar} className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 object-cover border border-white dark:border-slate-600 shadow-sm shrink-0" />
                                <div className="flex-1">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">{c.authorName}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="text-gray-800 dark:text-gray-200 text-[15px] whitespace-pre-wrap">{c.content}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {hasMore && <button onClick={handleLoadMore} disabled={isFetchingMore} className="w-full py-3 mt-4 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-xl transition-all">{isFetchingMore ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Xem thêm bình luận"}</button>}
                        {comments.length === 0 && <p className="text-center text-gray-400 dark:text-gray-600 italic">Chưa có bình luận nào.</p>}
                    </div>
                </div>
            </main>

            {/* --- RIGHT SIDEBAR --- */}
            <aside className="lg:col-span-4 space-y-8">
                <div className="sticky top-24 space-y-8">
                    {/* --- KHỐI ĐĂNG KÝ CHUYÊN GIA --- */}
                    {!currentUser?.isExpert && (
                        <div className="animate-slide-up">
                            <ExpertPromoBox />
                        </div>
                    )}
                    
                    {/* 1. MOST VIEWED */}
                    {mostViewedPosts.length > 0 && (
                        <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-gray-100 dark:border-dark-border shadow-sm">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-1.5 rounded-lg"><TrendingUp size={18} /></span>
                                Đọc nhiều nhất
                            </h3>
                            <div className="flex flex-col gap-5">
                                {mostViewedPosts.map((p, index) => (
                                    <Link to={`/blog/${p.slug}`} key={p.id} className="group flex gap-4 items-start">
                                        <span className={`text-2xl font-black leading-none mt-1 ${index === 0 ? 'text-orange-500' : index === 1 ? 'text-blue-500' : index === 2 ? 'text-green-500' : 'text-gray-200 dark:text-slate-700'}`}>0{index + 1}</span>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-200 leading-snug group-hover:text-primary transition-colors mb-1 line-clamp-2">{p.title}</h4>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 font-medium"><Eye size={12} /> {p.views || 0} lượt xem</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. DYNAMIC AD BANNER (TỰ ĐỘNG RANDOM) */}
                    {adConfig?.isEnabled && (
                        <SidebarAd variant="gradient" />
                    )}
                </div>
            </aside>
        </div>
      </div>
      
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} url={window.location.href} title={post?.title} />
    </div>
  );
};
