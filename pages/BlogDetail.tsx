import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BlogPost, BlogComment, User } from '../types';
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment } from '../services/blog';
import { loginAnonymously } from '../services/auth';
import { Loader2, ArrowLeft, Calendar, User as UserIcon, Share2, MessageCircle, Send, PlayCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { ShareModal } from '../components/ShareModal';

export const BlogDetail: React.FC<{ currentUser: User; onOpenAuth: () => void }> = ({ currentUser, onOpenAuth }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (slug) loadData(slug);
  }, [slug]);

  const loadData = async (slug: string) => {
    setLoading(true);
    const postData = await fetchPostBySlug(slug);
    if (postData) {
      setPost(postData);
      const [related, cmts] = await Promise.all([
        fetchRelatedPosts(postData.id, postData.categoryId),
        fetchBlogComments(postData.id)
      ]);
      setRelatedPosts(related);
      setComments(cmts);
    }
    setLoading(false);
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
    setCommentContent('');
    const newComments = await fetchBlogComments(post.id);
    setComments(newComments);
    setSubmittingComment(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  
  if (!post) return <div className="p-10 text-center">Bài viết không tồn tại. <button onClick={() => navigate('/blog')} className="text-blue-500 underline">Quay lại</button></div>;

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
       {/* Nav */}
       <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <button onClick={() => navigate('/blog')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-textDark transition-colors">
              <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-sm text-textDark uppercase tracking-wider">Bài viết chuyên gia</span>
          <button onClick={() => setShowShare(true)} className="p-2 -mr-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors">
              <Share2 size={20} />
          </button>
       </div>

       {/* Content */}
       <article className="max-w-3xl mx-auto bg-white min-h-screen shadow-sm md:my-6 md:rounded-[2rem] overflow-hidden">
          {/* Cover */}
          {post.coverImageUrl && (
              <div className="w-full h-56 md:h-80 relative">
                  <img src={post.coverImageUrl} className="w-full h-full object-cover" alt={post.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
          )}

          <div className="px-6 py-8 md:px-10">
              {/* Meta */}
              <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {post.iconEmoji} Blog
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                  </span>
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">{post.title}</h1>

              {/* Author */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                  <div>
                      <p className="font-bold text-textDark text-sm flex items-center gap-1">
                          {post.authorName}
                          {post.authorIsExpert && <ShieldCheck size={14} className="text-blue-500" />}
                      </p>
                      <p className="text-xs text-textGray">Tác giả</p>
                  </div>
              </div>

              {/* Excerpt */}
              <p className="text-lg font-medium text-gray-600 mb-8 italic border-l-4 border-primary pl-4 py-1">
                  {post.excerpt}
              </p>

              {/* Youtube Embed */}
              {post.youtubeUrl && (
                  <div className="mb-8 rounded-2xl overflow-hidden shadow-lg aspect-video">
                      <iframe 
                          src={`https://www.youtube.com/embed/${getYoutubeId(post.youtubeUrl)}`} 
                          className="w-full h-full border-none"
                          allowFullScreen
                      />
                  </div>
              )}

              {/* Main Content - Dangerous HTML */}
              <div 
                  className="prose prose-lg prose-indigo max-w-none text-gray-800 leading-loose"
                  dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Source */}
              {post.sourceUrl && (
                  <div className="mt-8 pt-4 border-t border-gray-100">
                      <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors">
                          <ExternalLink size={16} /> Nguồn tham khảo: {post.sourceLabel || 'Xem chi tiết'}
                      </a>
                  </div>
              )}
          </div>
       </article>

       {/* Related Posts */}
       {relatedPosts.length > 0 && (
           <div className="max-w-3xl mx-auto px-4 py-8">
               <h3 className="font-bold text-xl text-textDark mb-4">Bài viết liên quan</h3>
               <div className="space-y-4">
                   {relatedPosts.map(p => (
                       <Link to={`/blog/${p.slug}`} key={p.id} className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                           <div className="w-24 h-24 rounded-xl bg-gray-200 shrink-0 overflow-hidden">
                               {p.coverImageUrl ? <img src={p.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{p.iconEmoji}</div>}
                           </div>
                           <div className="flex-1 min-w-0">
                               <h4 className="font-bold text-textDark line-clamp-2 mb-1">{p.title}</h4>
                               <p className="text-xs text-textGray line-clamp-2">{p.excerpt}</p>
                           </div>
                       </Link>
                   ))}
               </div>
           </div>
       )}

       {/* Comments Section */}
       <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
           <h3 className="font-bold text-xl text-textDark mb-4 flex items-center gap-2">
               <MessageCircle /> Bình luận ({comments.length})
           </h3>
           
           {/* Comment List */}
           <div className="space-y-4 mb-6">
               {comments.map(c => (
                   <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                       <div className="flex items-center gap-2 mb-2">
                           <img src={c.authorAvatar} className="w-6 h-6 rounded-full bg-gray-200" />
                           <span className="font-bold text-sm text-textDark">{c.authorName}</span>
                           {c.isExpert && <ShieldCheck size={12} className="text-blue-500" />}
                           <span className="text-[10px] text-gray-400">• {new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                       </div>
                       <p className="text-sm text-gray-700">{c.content}</p>
                   </div>
               ))}
           </div>

           {/* Input */}
           <div className="flex gap-2">
               <input 
                   value={commentContent}
                   onChange={e => setCommentContent(e.target.value)}
                   className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm"
                   placeholder="Viết bình luận..."
               />
               <button 
                   onClick={handleSendComment}
                   disabled={!commentContent.trim() || submittingComment}
                   className="bg-primary text-white p-3 rounded-xl shadow-lg active:scale-90 transition-transform disabled:opacity-50"
               >
                   {submittingComment ? <Loader2 className="animate-spin" /> : <Send />}
               </button>
           </div>
       </div>

       {/* Share Modal */}
       <ShareModal 
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          url={window.location.href}
          title={post.title}
       />
    </div>
  );
};

const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};