import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { Document, DocumentCategory } from '../types';
import { fetchDocuments, fetchDocumentCategories } from '../services/documents';
import { FileText, Download, Star, Filter, Loader2, Search, Link as LinkIcon } from 'lucide-react';

export const DocumentList: React.FC = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        const [cData, dData] = await Promise.all([
            fetchDocumentCategories(),
            fetchDocuments()
        ]);
        setCategories(cData);
        setDocs(dData);
        setLoading(false);
    };
    init();
  }, []);

  const handleFilter = async (catId: string) => {
      setActiveCat(catId);
      setLoading(true);
      const data = await fetchDocuments(catId);
      setDocs(data);
      setLoading(false);
  };

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
       {/* Header */}
       <div className="px-4 py-6 bg-white border-b border-gray-100 shadow-sm sticky top-[68px] md:top-20 z-30">
          <div className="max-w-5xl mx-auto">
             <h1 className="text-2xl font-bold text-textDark mb-2 flex items-center gap-2">
                 <FileText className="text-green-600" /> Thư viện Tài liệu
             </h1>
             
             <div className="relative mt-4 mb-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Tìm tài liệu..." 
                    className="w-full pl-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-100"
                 />
             </div>

             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                 <button onClick={() => handleFilter('all')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCat === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                     Tất cả
                 </button>
                 {categories.map(cat => (
                     <button key={cat.id} onClick={() => handleFilter(cat.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCat === cat.id ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                         <span>{cat.iconEmoji}</span> {cat.name}
                     </button>
                 ))}
             </div>
          </div>
       </div>

       <div className="max-w-5xl mx-auto px-4 py-6">
           {loading ? (
               <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" size={32} /></div>
           ) : filteredDocs.length === 0 ? (
               <div className="text-center py-20 text-gray-400">Chưa có tài liệu nào.</div>
           ) : (
               <div className="grid md:grid-cols-2 gap-4">
                   {filteredDocs.map(doc => (
                       <Link to={`/documents/${doc.slug}`} key={doc.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-4 items-start group">
                           <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50'}`}>
                               {doc.isExternal ? <LinkIcon /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'docx' ? '📝' : '📄')}
                           </div>
                           <div className="flex-1 min-w-0">
                               <h3 className="font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-green-700 transition-colors">{doc.title}</h3>
                               <p className="text-xs text-gray-500 line-clamp-2 mb-2">{doc.description}</p>
                               <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                                   <span className="flex items-center gap-1"><Download size={12}/> {doc.downloads}</span>
                                   <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {doc.rating.toFixed(1)}</span>
                                   <span>{doc.authorName}</span>
                               </div>
                           </div>
                       </Link>
                   ))}
               </div>
           )}
       </div>
    </div>
  );
};
