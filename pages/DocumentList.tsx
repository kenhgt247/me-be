import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { Document, DocumentCategory, User } from '../types';
import { fetchDocuments, fetchDocumentCategories } from '../services/documents';
import { FileText, Download, Star, Filter, Loader2, Search, Link as LinkIcon, UploadCloud, ArrowDown, ChevronRight } from 'lucide-react';
import { subscribeToAuthChanges } from '../services/auth';

// Số lượng tài liệu hiển thị mỗi lần (9 là đẹp cho lưới 3 cột)
const PAGE_SIZE = 9;

export const DocumentList: React.FC = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State quản lý số lượng hiển thị
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges(user => {
      setCurrentUser(user);
    });

    const init = async () => {
        setLoading(true);
        const [cData, dData] = await Promise.all([
            fetchDocumentCategories(),
            // Lấy 100 tài liệu ban đầu để có dữ liệu phân trang
            fetchDocuments('all', 100) 
        ]);
        setCategories(cData);
        setDocs(dData);
        setLoading(false);
    };
    init();

    return () => unsubAuth();
  }, []);

  const handleFilter = async (catId: string) => {
      setActiveCat(catId);
      setLoading(true);
      setVisibleCount(PAGE_SIZE); // Reset về trang đầu
      
      const data = await fetchDocuments(catId, 100);
      setDocs(data);
      setLoading(false);
  };

  const handleLoadMore = () => {
      setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Cắt danh sách để hiển thị
  const visibleDocs = filteredDocs.slice(0, visibleCount);

  const canShare = currentUser && (currentUser.isAdmin || currentUser.isExpert);

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
       {/* Header */}
       <div className="px-4 py-6 bg-white border-b border-gray-100 shadow-sm sticky top-[68px] md:top-20 z-30">
          <div className="max-w-6xl mx-auto">
             <div className="flex justify-between items-start mb-4">
                 <div>
                     <h1 className="text-2xl font-bold text-textDark mb-1 flex items-center gap-2">
                         <FileText className="text-green-600" /> Thư viện Tài liệu
                     </h1>
                     <p className="text-sm text-gray-500">Kho tài liệu chọn lọc dành cho mẹ và bé.</p>
                 </div>
                 
                 {canShare && (
                     <button 
                        onClick={() => navigate('/admin/documents')}
                        className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform hover:bg-green-700"
                     >
                        <UploadCloud size={16} />
                        <span className="hidden md:inline">Chia sẻ tài liệu</span>
                        <span className="md:hidden">Tải lên</span>
                     </button>
                 )}
             </div>
             
             <div className="relative mb-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)} 
                   placeholder="Tìm kiếm tài liệu..." 
                   className="w-full pl-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-100 transition-all"
                 />
             </div>

             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                 <button onClick={() => handleFilter('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCat === 'all' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-textGray hover:bg-gray-200'}`}>
                     Tất cả
                 </button>
                 {categories.map(cat => (
                     <button key={cat.id} onClick={() => handleFilter(cat.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCat === cat.id ? 'bg-green-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                         <span>{cat.iconEmoji}</span> {cat.name}
                     </button>
                 ))}
             </div>
          </div>
       </div>

       <div className="max-w-6xl mx-auto px-4 py-6">
           {loading ? (
               <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" size={32} /></div>
           ) : filteredDocs.length === 0 ? (
               <div className="text-center py-20 text-gray-400 italic">Chưa có tài liệu nào phù hợp.</div>
           ) : (
               <>
                   {/* ĐÃ SỬA: Thêm lg:grid-cols-3 để hiện 3 cột trên Desktop */}
                   <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {visibleDocs.map(doc => (
                           <Link to={`/documents/${doc.slug}`} key={doc.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex gap-4 items-start group active:scale-[0.98] hover:-translate-y-1">
                               <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50'}`}>
                                   {doc.isExternal ? <LinkIcon /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'docx' ? '📝' : '📄')}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-green-700 transition-colors leading-tight h-10">{doc.title}</h3>
                                   <p className="text-xs text-gray-500 line-clamp-1 mb-2">{doc.description}</p>
                                   <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mt-auto">
                                       <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"><Download size={10}/> {doc.downloads}</span>
                                       <span className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded"><Star size={10} className="fill-yellow-500"/> {doc.rating.toFixed(1)}</span>
                                   </div>
                               </div>
                               <div className="self-center p-1 text-gray-300 group-hover:text-green-600 transition-colors"><ChevronRight size={20} /></div>
                           </Link>
                       ))}
                   </div>

                   {/* NÚT XEM THÊM */}
                   {visibleCount < filteredDocs.length && (
                       <div className="flex justify-center mt-10">
                           <button
                               onClick={handleLoadMore}
                               className="px-8 py-3 rounded-full bg-white border border-gray-200 text-sm font-bold text-textDark shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 active:scale-95 transition-all flex items-center gap-2"
                           >
                               Xem thêm tài liệu <ArrowDown size={16} />
                           </button>
                       </div>
                   )}
               </>
           )}
       </div>
    </div>
  );
};
