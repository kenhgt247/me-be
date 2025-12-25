import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Document, DocumentCategory, User, AdConfig } from '../types';
import { fetchDocumentsPaginated, fetchDocumentCategories } from '../services/documents'; // Dùng hàm mới
import { getAdConfig, subscribeToAdConfig } from '../services/ads';
import { subscribeToAuthChanges } from '../services/auth';
import { 
  FileText, UploadCloud, ArrowDown, ChevronRight, ChevronLeft, AlertCircle, Search
} from 'lucide-react';
import { ExpertPromoBox } from '../components/ExpertPromoBox';
import { DocumentGridAd } from '../components/ads/DocumentGridAd';
import { DocumentCard } from '../components/documents/DocumentCard'; // Import component mới

const PAGE_SIZE = 9;

const DocSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm flex gap-4 h-32">
        <div className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-slate-700 animate-pulse shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full animate-pulse" />
            <div className="mt-auto h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const DocumentList: React.FC = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  
  // State Phân trang (LOGIC MỚI - GIỮ CÁI NÀY)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);
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
            // Lấy danh mục
            const cData = await fetchDocumentCategories();
            setCategories(cData);

            // Lấy trang 1 tài liệu (Phân trang - LOGIC MỚI)
            const { docs: initialDocs, lastDoc: initialLastDoc, hasMore: initialHasMore } = await fetchDocumentsPaginated('all', null, PAGE_SIZE);
            
            setDocs(initialDocs);
            setLastDoc(initialLastDoc);
            setHasMore(initialHasMore);

        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setLoading(false);
        }
    };
    init();
    return () => { unsubAuth(); unsubAd(); };
  }, []);

  const handleFilter = async (catId: string) => {
      if (catId === activeCat) return;

      setActiveCat(catId);
      setLoading(true);
      setSearchTerm(''); 
      setDocs([]); // Clear cũ
      setLastDoc(null);

      try {
          const { docs: newDocs, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchDocumentsPaginated(catId, null, PAGE_SIZE);
          setDocs(newDocs);
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

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const visibleDocs = filteredDocs.slice(0, visibleCount);
  const canShare = currentUser && (currentUser.isAdmin || currentUser.isExpert);

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 animate-fade-in pt-safe-top transition-colors duration-300">
       <div className="sticky top-0 z-30 pointer-events-none">
          <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none rounded-b-[2rem] pointer-events-auto transition-all duration-300 relative overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-green-500 via-teal-400 to-blue-500 absolute top-0 left-0"></div>
              <div className="max-w-6xl mx-auto px-4 py-4 pt-safe-top">
                  <div className="flex justify-between items-start mb-4 mt-2">
                      <div>
                          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1 flex items-center gap-2 tracking-tight">
                              <FileText className="text-green-600 fill-green-100 dark:fill-green-900" /> Thư viện Tài liệu
                          </h1>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Kho tri thức chọn lọc dành cho mẹ và bé.</p>
                      </div>
                      
                      {canShare && (
                          <button onClick={() => navigate('/admin/documents')} className="bg-gray-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform hover:bg-black dark:hover:bg-slate-600">
                              <UploadCloud size={16} /> <span className="hidden md:inline">Tải lên</span>
                          </button>
                      )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center pb-2">
                      <div className="relative w-full md:w-auto md:flex-1 max-w-md group shrink-0">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tài liệu..." className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-sm text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-inner" />
                      </div>

                      <div className="flex-1 w-full min-w-0 relative group/scroll">
                          <button onClick={() => scrollCategory('left')} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm shadow-md rounded-full items-center justify-center text-gray-600 dark:text-white hover:text-green-600 border border-gray-100 dark:border-slate-600 opacity-0 group-hover/scroll:opacity-100 transition-all active:scale-90 disabled:opacity-0"><ChevronLeft size={20} /></button>
                          <div ref={scrollRef} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-1">
                              <button onClick={() => handleFilter('all')} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCat === 'all' ? 'bg-gray-900 dark:bg-green-600 text-white border-gray-900 dark:border-green-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>Tất cả</button>
                              {categories.map(cat => (
                                  <button key={cat.id} onClick={() => handleFilter(cat.id)} className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${activeCat === cat.id ? 'bg-white dark:bg-dark-card text-green-600 border-green-500 shadow-sm ring-2 ring-green-500/10' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><span>{cat.iconEmoji}</span> {cat.name}</button>
                              ))}
                          </div>
                          <button onClick={() => scrollCategory('right')} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm shadow-md rounded-full items-center justify-center text-gray-600 dark:text-white hover:text-green-600 border border-gray-100 dark:border-slate-600 opacity-0 group-hover/scroll:opacity-100 transition-all active:scale-90"><ChevronRight size={20} /></button>
                      </div>
                  </div>
               </div>
           </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
            {loading ? (
                <DocSkeleton />
            ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600"><AlertCircle size={40} /></div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Không tìm thấy tài liệu</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Thử tìm kiếm với từ khóa khác xem sao mẹ nhé.</p>
                </div>
            ) : (
                <>  
                    {!currentUser?.isExpert && (
                       <div className="mb-8 animate-slide-up">
                           <ExpertPromoBox />
                       </div>
                    )}

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                        {visibleDocs.map((doc, index) => {
                            const freq = adConfig?.frequencies?.document || 6;
                            const shouldShowAd = adConfig?.isEnabled && (index + 1) % freq === 0;

                            return (
                                <React.Fragment key={doc.id}>
                                    <DocumentCard doc={doc} />
                                    {shouldShowAd && <DocumentGridAd />}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {visibleCount < filteredDocs.length && (
                        <div className="flex justify-center mt-12 pb-8">
                            <button onClick={handleLoadMore} className="px-8 py-3 rounded-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm font-bold text-gray-900 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-2 group">
                                Xem thêm tài liệu <ArrowDown size={16} className="group-hover:translate-y-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};