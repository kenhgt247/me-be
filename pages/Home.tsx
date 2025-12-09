import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { Search, MessageCircle, Heart, ChevronDown, ChevronUp, HelpCircle, Clock, Flame, MessageSquareOff, ShieldCheck, ChevronRight, Sparkles, X, Filter, User as UserIcon, CornerDownRight, BookOpen } from 'lucide-react';
import { Question, User, toSlug, BlogPost } from '../types';
import { AdBanner } from '../components/AdBanner';
import { subscribeToAdConfig } from '../services/ads';
import { fetchPublishedPosts } from '../services/blog';

interface HomeProps {
  questions: Question[];
  categories: string[];
}

const FBImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;

  if (count === 1) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
        <img src={images[0]} className="w-full h-64 object-cover" loading="lazy" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        <img src={images[0]} className="w-full h-full object-cover" loading="lazy" />
        <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        <img src={images[0]} className="w-full h-full object-cover row-span-2" loading="lazy" />
        <div className="grid grid-rows-2 gap-1 h-full">
           <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
           <img src={images[2]} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
       <img src={images[0]} className="w-full h-full object-cover" loading="lazy" />
       <div className="grid grid-rows-2 gap-1 h-full">
          <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
          <div className="relative w-full h-full">
              <img src={images[2]} className="w-full h-full object-cover" loading="lazy" />
              {count > 3 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">
                   +{count - 3}
                </div>
              )}
          </div>
       </div>
    </div>
  );
};

export const Home: React.FC<HomeProps> = ({ questions, categories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [adFrequency, setAdFrequency] = useState(5);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
      const unsub = subscribeToAdConfig(config => setAdFrequency(config.frequency));
      
      // Load recent blogs
      fetchPublishedPosts('all', 5).then(data => {
          if (data && data.length > 0) {
              setBlogPosts(data);
          }
      });

      return () => unsub();
  }, []);

  let displayQuestions = activeCategory === 'Tất cả' 
    ? [...questions] 
    : questions.filter(q => q.category === activeCategory);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    displayQuestions = displayQuestions.filter(q => {
      const matchMain = q.title.toLowerCase().includes(query) || q.content.toLowerCase().includes(query);
      const matchAuthor = q.author.name.toLowerCase().includes(query);
      const matchAnswers = q.answers.some(a => 
        a.content.toLowerCase().includes(query) || a.author.name.toLowerCase().includes(query)
      );
      return matchMain || matchAuthor || matchAnswers;
    });
  }

  const matchingUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const usersMap = new Map<string, User>();
    
    questions.forEach(q => {
        if (q.author.name.toLowerCase().includes(query)) {
            usersMap.set(q.author.id, q.author);
        }
        q.answers.forEach(a => {
            if (a.author.name.toLowerCase().includes(query)) {
                usersMap.set(a.author.id, a.author);
            }
        });
    });
    
    return Array.from(usersMap.values());
  }, [questions, searchQuery]);

  switch (viewFilter) {
    case 'newest':
      displayQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'active':
      displayQuestions.sort((a, b) => {
        const scoreA = a.answers.length * 2 + a.likes;
        const scoreB = b.answers.length * 2 + b.likes;
        return scoreB - scoreA;
      });
      break;
    case 'unanswered':
      displayQuestions = displayQuestions.filter(q => q.answers.length === 0);
      displayQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 md:pt-0 -mx-4 md:mx-0 bg-[#F7F7F5]/95 md:bg-transparent backdrop-blur-sm transition-all">
        <div className="relative group shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl mx-4 md:mx-0">
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl"></div>
            <div className="relative flex items-center bg-white/90 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                <div className="pl-4 text-primary">
                    <Search size={20} />
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm câu hỏi, người dùng..." 
                    className="w-full py-3.5 px-3 bg-transparent text-textDark placeholder-gray-400 focus:outline-none text-[15px] font-medium"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="pr-4 text-gray-400">
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {searchQuery && matchingUsers.length > 0 && (
        <div className="pl-4 md:px-0 animate-slide-up">
           <div className="flex items-center gap-1 mb-2">
                <UserIcon size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-textGray uppercase tracking-wider">Mọi người</span>
           </div>
           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x">
              {matchingUsers.map(user => (
                  <Link to={`/profile/${user.id}`} key={user.id} className="snap-start flex-shrink-0 bg-white p-3 pr-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 min-w-[160px] active:scale-95 transition-transform">
                      <div className="relative">
                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                        {user.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white"><ShieldCheck size={10} /></div>}
                      </div>
                      <div className="flex flex-col">
                          <span className="text-sm font-bold text-textDark truncate max-w-[100px]">{user.name}</span>
                          <span className="text-[10px] text-primary font-medium">Xem trang</span>
                      </div>
                  </Link>
              ))}
           </div>
        </div>
      )}

      {!searchQuery && (
        <div className="px-4 md:px-0 space-y-4">
            {/* EXPERT PROMO */}
            <div className="bg-gradient-to-br from-primary to-[#26A69A] rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Góc Chuyên Gia</h2>
                        <p className="text-blue-50 text-xs font-medium opacity-90 mb-3">Kết nối với bác sĩ & chuyên gia uy tín.</p>
                        <Link to="/expert-register" className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border border-white/20">
                            Đăng ký ngay <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl shadow-inner border border-white/10">
                        👨‍⚕️
                    </div>
                </div>
            </div>

            {/* EXPERT BLOGS BLOCK - Added Here */}
            {blogPosts.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-600" />
                            <h3 className="font-bold text-textDark text-sm uppercase tracking-wide">Kiến thức Chuyên gia</h3>
                        </div>
                        <Link to="/blog" className="text-xs font-bold text-blue-500 hover:underline">Xem tất cả</Link>
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">
                        {blogPosts.map(post => (
                            <Link to={`/blog/${post.slug}`} key={post.id} className="snap-start flex-shrink-0 w-64 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95 flex flex-col">
                                <div className="aspect-[2/1] rounded-xl bg-gray-100 mb-3 overflow-hidden relative shrink-0">
                                    {post.coverImageUrl ? (
                                        <img src={post.coverImageUrl} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-blue-50 to-purple-50">{post.iconEmoji || '📝'}</div>
                                    )}
                                </div>
                                <h4 className="font-bold text-sm text-textDark line-clamp-2 mb-1 leading-snug flex-1">{post.title}</h4>
                                <div className="flex items-center gap-1 mt-auto pt-2">
                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 line-clamp-1 max-w-[100px]">{post.authorName}</span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] text-gray-400">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {!searchQuery && (
        <div className="pl-4 md:px-0 mt-4">
            <div className="flex items-center gap-1 mb-2">
                <Sparkles size={14} className="text-accent" fill="currentColor" />
                <span className="text-xs font-bold text-textGray uppercase tracking-wider">Chủ đề</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x">
            <button 
                onClick={() => setActiveCategory('Tất cả')}
                className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${activeCategory === 'Tất cả' ? 'bg-textDark text-white shadow-lg shadow-gray-200' : 'bg-white text-textGray border border-gray-100 shadow-sm'}`}
            >
                Tất cả
            </button>
            {categories.map(cat => (
                <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-textGray border border-gray-100 shadow-sm'}`}
                >
                {cat}
                </button>
            ))}
            </div>
        </div>
      )}

      <div className="px-4 md:px-0 flex items-center justify-between mt-2">
         <h3 className="font-bold text-lg text-textDark">
             {searchQuery ? `Kết quả tìm kiếm (${displayQuestions.length})` : 'Cộng đồng hỏi đáp'}
         </h3>
         {!searchQuery && (
            <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                <button onClick={() => setViewFilter('newest')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'newest' ? 'bg-gray-100 text-textDark' : 'text-gray-400'}`}><Clock size={16} /></button>
                <button onClick={() => setViewFilter('active')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'active' ? 'bg-orange-50 text-orange-500' : 'text-gray-400'}`}><Flame size={16} /></button>
                <button onClick={() => setViewFilter('unanswered')} className={`p-1.5 rounded-lg transition-all ${viewFilter === 'unanswered' ? 'bg-blue-50 text-blue-500' : 'text-gray-400'}`}><MessageSquareOff size={16} /></button>
            </div>
         )}
      </div>

      <div className="px-4 md:px-0 space-y-4 pb-10">
          {displayQuestions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                <HelpCircle size={32} strokeWidth={1.5} />
              </div>
              <p className="text-sm text-textGray font-medium">
                  {searchQuery ? 'Không tìm thấy kết quả nào.' : 'Chưa có bài viết nào phù hợp.'}
              </p>
            </div>
          )}

          {displayQuestions.map((q, index) => {
             const query = searchQuery.toLowerCase().trim();
             const matchedAnswer = searchQuery && q.answers.find(a => a.content.toLowerCase().includes(query) || a.author.name.toLowerCase().includes(query));
             
             return (
                <React.Fragment key={q.id}>
                    {(index > 0 && index % adFrequency === 0) && (
                        <AdBanner className="mx-4 md:mx-0" debugLabel={`Feed Ad #${index}`} />
                    )}
                    
                    <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group">
                    <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 active:scale-[0.98] transition-all relative overflow-hidden">
                        {q.answers.length === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-100 to-transparent rounded-bl-full -mr-8 -mt-8"></div>}
                        <div className="flex items-start justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-2">
                            <img src={q.author.avatar} className="w-8 h-8 rounded-full border border-gray-100 object-cover" />
                            <div>
                                <p className="text-xs font-bold text-textDark flex items-center gap-1">
                                    {q.author.name}
                                    {q.author.isExpert && <ShieldCheck size={10} className="text-blue-500" />}
                                </p>
                                <p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                        </div>
                        <span className="bg-gray-50 text-textGray text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-100">{q.category}</span>
                        </div>
                        <h3 className="text-[16px] font-bold text-textDark mb-2 leading-snug line-clamp-2">{q.title}</h3>
                        <p className="text-textGray text-sm line-clamp-2 mb-3 font-normal">{q.content}</p>
                        <FBImageGrid images={q.images || []} />
                        {matchedAnswer && (
                            <div className="bg-blue-50 rounded-xl p-3 mb-3 flex gap-2 border border-blue-100 mt-3">
                                <CornerDownRight size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-textDark mb-0.5">{matchedAnswer.author.name} đã trả lời:</p>
                                    <p className="text-xs text-textGray line-clamp-1 italic">"{matchedAnswer.content}"</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                            <span className="flex items-center gap-1.5"><Heart size={14} className={q.likes > 0 ? "text-red-500 fill-red-500" : ""} /> {q.likes}</span>
                            <span className="flex items-center gap-1.5"><MessageCircle size={14} className={q.answers.length > 0 ? "text-blue-500 fill-blue-500" : ""} /> {q.answers.length}</span>
                        </div>
                        {q.answers.length === 0 && (
                            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">Chưa có trả lời</span>
                        )}
                        </div>
                    </div>
                    </Link>
                </React.Fragment>
             );
          })}
      </div>
    </div>
  );
};
