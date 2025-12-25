import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, X, Sparkles, Clock, Flame, MessageSquareOff, 
  BookOpen, FileText, ShieldCheck, Download, Loader2, ArrowDown
} from 'lucide-react';
import { Question, User, BlogPost, Document, AdConfig, Story } from '../types';
import { subscribeToAdConfig } from '../services/ads';
import { fetchPublishedPosts } from '../services/blog';
import { fetchDocuments } from '../services/documents';
import { fetchStories } from '../services/stories';
import { fetchQuestionsPaginated } from '../services/db'; 
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// --- IMPORT CÁC COMPONENT ---
import { QuestionCard } from '../components/QuestionCard';
import { FeedAd } from '../components/ads/FeedAd';
import { AdBanner } from '../components/AdBanner'; 
import { ExpertPromoBox } from '../components/ExpertPromoBox';
import { CreateStoryModal } from '../components/stories/CreateStoryModal';
import { StoryViewer } from '../components/stories/StoryViewer';
import { SearchTabs } from '../components/common/SearchTabs';
import { removeVietnameseTones } from '../utils/textUtils';

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
const PAGE_SIZE = 10; 

export interface HomeProps {
  categories: string[];
  currentUser: User | null;
}

export const Home: React.FC<HomeProps> = ({ categories, currentUser }) => {
  // State Filter
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  
  // State Data (LOGIC MỚI - GIỮ CÁI NÀY)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Other States
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchTab, setSearchTab] = useState('all');
  
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  
  // --- 1. LOAD DATA BAN ĐẦU ---
  useEffect(() => {
      const unsub = subscribeToAdConfig(setAdConfig);
      
      Promise.all([fetchPublishedPosts('all', 5), fetchDocuments('all', 3)]).then(([blogs, docs]) => {
          if (blogs) setBlogPosts(blogs);
          if (docs) setDocuments(docs);
      });

      return () => unsub();
  }, []);

  // --- 2. LOAD CÂU HỎI (CHUẨN SERVER-SIDE - GIỮ CÁI NÀY) ---
  useEffect(() => {
      const loadInitialQuestions = async () => {
          setIsInitialLoading(true);
          setQuestions([]); // Reset list
          setLastDoc(null);

          try {
              // Gọi API lấy dữ liệu mới theo Category và Filter
              const { questions: newQs, lastDoc: newLastDoc, hasMore: newHasMore } = 
                  await fetchQuestionsPaginated(activeCategory, viewFilter, null, PAGE_SIZE);
              
              setQuestions(newQs);
              setLastDoc(newLastDoc);
              setHasMore(newHasMore);
          } catch (e) {
              console.error("Lỗi tải câu hỏi:", e);
          } finally {
              setIsInitialLoading(false);
          }
      };

      loadInitialQuestions();
  }, [activeCategory, viewFilter]);

  // --- 3. LOAD MORE (LOGIC MỚI - GIỮ CÁI NÀY) ---
  const handleLoadMore = async () => {
      if (isLoadingMore || !hasMore || !lastDoc) return;
      setIsLoadingMore(true);
      try {
          const { questions: newQs, lastDoc: newLastDoc, hasMore: newHasMore } = 
              await fetchQuestionsPaginated(activeCategory, viewFilter, lastDoc, PAGE_SIZE);
          
          setQuestions(prev => [...prev, ...newQs]);
          setLastDoc(newLastDoc);
          setHasMore(newHasMore);
      } catch (e) {
          console.error("Lỗi tải thêm:", e);
      } finally {
          setIsLoadingMore(false);
      }
  };

  // --- STORIES & SEARCH ---
  useEffect(() => {
    const loadStories = async () => {
        if (currentUser) {
            try { const data = await fetchStories(currentUser); setStories(data); } 
            catch (err) { console.error(err); } 
            finally { setIsLoadingStories(false); }
        } else { setIsLoadingStories(false); }
    };
    loadStories();
  }, [currentUser]);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(inputValue); }, 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const handleOpenCreateStory = () => { 
      if (!currentUser) { alert("Vui lòng đăng nhập!"); return; } 
      setShowCreateStory(true); 
  };
  
  const handleStoryCreated = (newStory: Story) => { setStories(prev => [newStory, ...prev]); };

  // --- HELPER: RENDER BADGE ĐẸP MẮT ---
  const renderFilterBadge = () => {
      switch (viewFilter) {
          case 'active':
              return (
                  <span className="ml-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] font-bold shadow-md shadow-orange-200 dark:shadow-none flex items-center gap-1 animate-fade-in select-none">
                      <Flame size={12} fill="currentColor" /> Sôi nổi nhất
                  </span>
              );
          case 'unanswered':
              return (
                  <span className="ml-3 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[11px] font-bold shadow-md shadow-blue-200 dark:shadow-none flex items-center gap-1 animate-fade-in select-none">
                      <MessageSquareOff size={12} /> Chưa có trả lời
                  </span>
              );
          default: // newest
              return (
                  <span className="ml-3 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-[11px] font-bold shadow-md shadow-emerald-200 dark:shadow-none flex items-center gap-1 animate-fade-in select-none">
                      <Clock size={12} /> Mới nhất
                  </span>
              );
      }
  };

  // --- SEARCH LOGIC ---
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return { questions: [], blogs: [], docs: [], users: [] };
    const queryTokens = removeVietnameseTones(debouncedQuery).split(" ").filter(t => t.length > 0);
    const isMatch = (text: string | undefined | null) => {
        if (!text) return false;
        const normalizedText = removeVietnameseTones(text);
        return queryTokens.every(token => normalizedText.includes(token));
    }
    const matchedQuestions = questions.filter(q => isMatch(q.title) || isMatch(q.content) || isMatch(q.author.name));
    const matchedBlogs = blogPosts.filter(p => isMatch(p.title) || isMatch(p.excerpt) || isMatch(p.authorName));
    const matchedDocs = documents.filter(d => isMatch(d.title) || isMatch(d.description) || isMatch(d.authorName));
    const usersMap = new Map<string, User>();
    matchedQuestions.forEach(q => usersMap.set(q.author.id, q.author));
    
    return { questions: matchedQuestions, blogs: matchedBlogs, docs: matchedDocs, users: Array.from(usersMap.values()) };
  }, [debouncedQuery, questions, blogPosts, documents]);

  // --- DANH SÁCH HIỂN THỊ (LOGIC MỚI) ---
  const displayList = debouncedQuery ? searchResults.questions : questions;

  // Render Helpers
  const renderUserCard = (user: User) => (
    <Link to={`/profile/${user.username || user.id}`} key={user.id} className="flex-shrink-0 bg-white dark:bg-dark-card p-3 pr-5 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-3 min-w-[160px] active:scale-95 transition-transform hover:border-blue-200">
        <div className="relative"><img src={user.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover border border-gray-100" decoding="async" />{user.isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border border-white"><ShieldCheck size={10} /></div>}</div>
        <div className="flex flex-col"><span className="text-sm font-bold text-textDark dark:text-dark-text truncate max-w-[100px]">{user.name}</span><span className="text-[10px] text-primary font-medium">Xem trang</span></div>
    </Link>
  );
  const renderDocCard = (doc: Document) => (
    <Link to={`/documents/${doc.slug}`} key={doc.id} className="flex items-center gap-4 bg-white dark:bg-dark-card p-3 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm active:scale-[0.98] transition-transform group hover:border-green-200">
        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">{doc.fileType === 'pdf' ? '📕' : '📄'}</div>
        <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-1 group-hover:text-green-600">{doc.title}</h4><p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 flex items-center gap-2"><span>{doc.authorName}</span> • <span className="flex items-center gap-0.5"><Download size={10}/> {doc.downloads}</span></p></div>
    </Link>
  );

  return (
    <div className="space-y-4 animate-fade-in min-h-screen">
      {activeStory && <StoryViewer story={activeStory} currentUser={currentUser} onClose={() => setActiveStory(null)} />}
      {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onSuccess={handleStoryCreated} />}

      {/* 1. HEADER SEARCH */}
      <div className="px-4 md:px-0 sticky top-[68px] md:top-20 z-30 py-2 md:pt-0 -mx-4 md:mx-0 bg-[#F7F7F5]/95 dark:bg-dark-bg/95 backdrop-blur-sm">
        <div className="relative group shadow-sm rounded-2xl mx-4 md:mx-0">
            <div className={`relative flex items-center bg-white dark:bg-dark-card rounded-2xl border ${inputValue ? 'border-primary' : 'border-gray-200 dark:border-slate-700'} overflow-hidden`}>
                <div className="pl-4 text-gray-400"><Search size={20} /></div>
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Tìm kiếm câu hỏi, chuyên gia, tài liệu..." className="w-full py-3.5 px-3 bg-transparent text-textDark dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-[15px] font-medium" />
                {inputValue && <button onClick={() => { setInputValue(''); setDebouncedQuery(''); setSearchTab('all'); }} className="pr-4 text-gray-400"><X size={16} /></button>}
            </div>
        </div>
      </div>

      {debouncedQuery ? (
        // --- SEARCH RESULTS VIEW ---
        <div className="animate-slide-up space-y-4">
            <SearchTabs activeTab={searchTab} onChange={setSearchTab} counts={{ questions: searchResults.questions.length, blogs: searchResults.blogs.length, docs: searchResults.docs.length, users: searchResults.users.length }} />
            <div className="px-4 md:px-0 space-y-4 pb-20">
                {(searchTab === 'all' || searchTab === 'users') && searchResults.users.length > 0 && (<div className="mb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{searchResults.users.map(renderUserCard)}</div></div>)}
                {(searchTab === 'all' || searchTab === 'blogs') && searchResults.blogs.length > 0 && (<div className="mb-6 space-y-3"><h4 className="text-sm font-bold text-gray-500 uppercase px-1">Bài viết</h4><div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{searchResults.blogs.map(post => (<Link to={`/blog/${post.slug}`} key={post.id} className="flex-shrink-0 w-64 bg-white dark:bg-dark-card rounded-2xl p-3 border shadow-sm flex flex-col"><div className="aspect-[2/1] rounded-xl bg-gray-100 mb-3 overflow-hidden relative shrink-0"><img src={post.coverImageUrl} className="w-full h-full object-cover" /></div><h4 className="font-bold text-sm line-clamp-2 mb-1">{post.title}</h4></Link>))}</div></div>)}
                {(searchTab === 'all' || searchTab === 'docs') && searchResults.docs.length > 0 && (<div className="mb-6 space-y-3"><h4 className="text-sm font-bold text-gray-500 uppercase px-1">Tài liệu</h4><div className="space-y-3">{searchResults.docs.map(renderDocCard)}</div></div>)}
                {(searchTab === 'all' || searchTab === 'questions') && (<div className="space-y-4"><h4 className="text-sm font-bold text-gray-500 uppercase px-1">Câu hỏi thảo luận</h4>{displayList.map(q => <QuestionCard key={q.id} q={q} currentUser={currentUser} />)}</div>)}
            </div>
        </div>
      ) : (
        // --- NORMAL FEED VIEW ---
        <div className="space-y-4">
          
          {/* STORIES */}
          <div className="px-4 md:px-0">
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                <div className="snap-start shrink-0 relative group cursor-pointer w-[85px] h-[130px] md:w-[100px] md:h-[150px]" onClick={handleOpenCreateStory}>
                    <div className="w-full h-full rounded-2xl overflow-hidden relative border border-gray-200 dark:border-slate-700 bg-white dark:bg-dark-card shadow-sm">
                        <img src={currentUser?.avatar || DEFAULT_AVATAR} onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} className="w-full h-full object-cover opacity-80" alt="me" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center"><div className="bg-primary text-white rounded-full p-1 border-2 border-white mb-1"><Plus size={16} /></div><span className="text-[10px] font-bold text-white">Tạo tin</span></div>
                    </div>
                </div>
                {isLoadingStories && [1,2,3].map(i => (<div key={i} className="snap-start shrink-0 w-[85px] h-[130px] bg-gray-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>))}
                {!isLoadingStories && stories.map((story) => (
                    <div key={story.id} onClick={() => setActiveStory(story)} className="snap-start shrink-0 relative group cursor-pointer w-[85px] h-[130px] md:w-[100px] md:h-[150px]">
                        <div className={`w-full h-full rounded-2xl overflow-hidden relative border-[2px] p-[2px] transition-all ${story.viewers.includes(currentUser?.id || '') ? 'border-gray-200 dark:border-slate-700' : 'border-blue-500'}`}>
                            <div className="w-full h-full rounded-xl overflow-hidden relative">
                                <img src={story.mediaUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20"></div>
                                <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-blue-500 overflow-hidden">
                                    <img src={story.author?.avatar || story.userAvatar || DEFAULT_AVATAR} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} />
                                </div>
                                <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white truncate text-shadow">
                                    {story.author?.name || story.userName || "Người dùng"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
              </div>
          </div>

          {/* EXPERT PROMO */}
          {!currentUser?.isExpert && (
             <div className="px-4 md:px-0 mt-4"><ExpertPromoBox /></div>
          )}

          {/* BLOG CARDS */}
          {blogPosts.length > 0 && (
            <div className="space-y-3 pt-2 px-4 md:px-0">
              <div className="flex justify-between items-center px-1">
                <Link to="/blog" className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300">
                  <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full group-hover:scale-110 transition-transform"><BookOpen size={16} className="text-blue-600 dark:text-blue-300" /></div>
                  <h3 className="font-bold text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide">Kiến thức Chuyên gia</h3>
                </Link>
                <Link to="/blog" className="text-xs font-bold text-gray-400 hover:text-blue-500 hover:underline transition-colors">Xem tất cả</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {blogPosts.slice(0, 5).map(post => (
                  <Link to={`/blog/${post.slug}`} key={post.id} className="snap-start flex-shrink-0 w-64 bg-white dark:bg-dark-card rounded-2xl p-3 border border-gray-100 dark:border-dark-border shadow-sm flex flex-col hover:shadow-md transition-shadow">
                    <div className="aspect-[2/1] rounded-xl bg-gray-100 mb-3 overflow-hidden relative shrink-0"><img src={post.coverImageUrl} className="w-full h-full object-cover" /></div>
                    <h4 className="font-bold text-sm text-textDark dark:text-dark-text line-clamp-2 mb-1 flex-1">{post.title}</h4>
                    <div className="flex items-center gap-1 mt-auto pt-2"><span className="text-[10px] text-gray-400">{post.authorName}</span></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENT CARDS */}
          {documents.length > 0 && (
            <div className="space-y-3 pt-2 px-4 md:px-0">
              <div className="flex justify-between items-center px-1">
                <Link to="/documents" className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-300">
                  <div className="p-1 bg-green-100 dark:bg-green-800 rounded-full group-hover:scale-110 transition-transform"><FileText size={16} className="text-green-600 dark:text-green-300" /></div>
                  <h3 className="font-bold text-green-700 dark:text-green-300 text-sm uppercase tracking-wide">Tài liệu chia sẻ</h3>
                </Link>
                <Link to="/documents" className="text-xs font-bold text-gray-400 hover:text-green-500 hover:underline transition-colors">Xem tất cả</Link>
              </div>
              <div className="space-y-3">{documents.slice(0, 3).map(renderDocCard)}</div>
            </div>
          )}

          {/* FILTERS & FEED HEADER */}
          <div className="pl-4 md:px-0 mt-6">
            <div className="flex items-center gap-2 mb-3 px-1">
               <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm shadow-purple-200 dark:shadow-none"><Sparkles size={14} fill="currentColor" /></div>
               <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 uppercase tracking-wide">Chủ đề nổi bật</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4 snap-x">
              <button onClick={() => setActiveCategory('Tất cả')} className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === 'Tất cả' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-100 dark:bg-dark-card dark:border-dark-border dark:text-gray-400 hover:border-purple-200 hover:text-purple-500'}`}>Tất cả</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md shadow-purple-200 dark:shadow-none' : 'bg-white text-gray-500 border-gray-100 dark:bg-dark-card dark:border-dark-border dark:text-gray-400 hover:border-purple-200 hover:text-purple-500'}`}>{cat}</button>
              ))}
            </div>
          </div>

          <div className="px-4 md:px-0 flex items-center justify-between mt-6 mb-4">
            <h3 className="font-bold text-lg text-textDark dark:text-dark-text flex items-center gap-2">
              Cộng đồng hỏi đáp
              {/* --- GIỮ CÁI NÀY: HIỂN THỊ BADGE ĐẸP --- */}
              {renderFilterBadge()}
            </h3>
            <div className="flex bg-white dark:bg-dark-card p-1 rounded-full border border-gray-100 dark:border-dark-border shadow-sm gap-1">
              <button onClick={() => setViewFilter('newest')} title="Mới nhất" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${viewFilter === 'newest' ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-black' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}><Clock size={18} /></button>
              <button onClick={() => setViewFilter('active')} title="Sôi nổi nhất" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${viewFilter === 'active' ? 'bg-gradient-to-tr from-orange-500 to-red-500 text-white shadow-sm shadow-orange-200 dark:shadow-none' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}><Flame size={18} fill={viewFilter === 'active' ? "currentColor" : "none"} /></button>
              <button onClick={() => setViewFilter('unanswered')} title="Chưa có trả lời" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${viewFilter === 'unanswered' ? 'bg-gradient-to-tr from-blue-500 to-cyan-500 text-white shadow-sm shadow-blue-200 dark:shadow-none' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}><MessageSquareOff size={18} /></button>
            </div>
          </div>
          
          {/* FEED QUESTIONS (SỬ DỤNG DISPLAY LIST CHUẨN) */}
          <div className="px-4 md:px-0 space-y-4 pb-10">
              {isInitialLoading ? (
                  // Loading Skeleton
                  <div className="space-y-4">
                      {[1,2,3].map(i => <div key={i} className="h-40 bg-white dark:bg-dark-card rounded-2xl animate-pulse" />)}
                  </div>
              ) : displayList.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">Chưa có câu hỏi nào.</div>
              ) : (
                  <>
                      {/* Hiển thị danh sách câu hỏi */}
                      {displayList.map((q, index) => {
                          const frequency = adConfig?.frequencies?.home || 5;
                          const shouldShowAd = adConfig?.isEnabled && (index + 1) % frequency === 0;
                          return (
                              <React.Fragment key={q.id}>
                                  {shouldShowAd && (adConfig.provider === 'adsense' ? <AdBanner placement="home" /> : <FeedAd />)}
                                  <QuestionCard q={q} currentUser={currentUser} />
                              </React.Fragment>
                          );
                      })}

                      {/* NÚT TẢI THÊM */}
                      {hasMore && !debouncedQuery && (
                          <div className="flex justify-center pt-2">
                              <button 
                                  onClick={handleLoadMore} 
                                  disabled={isLoadingMore}
                                  className="px-6 py-2.5 rounded-full bg-white dark:bg-dark-card border border-gray-200 text-sm font-bold text-textDark dark:text-dark-text shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                              >
                                  {isLoadingMore ? <Loader2 className="animate-spin" size={16}/> : 'Xem thêm câu hỏi'}
                                  {!isLoadingMore && <ArrowDown size={16}/>}
                              </button>
                          </div>
                      )}
                  </>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;