import React, { useEffect, useState } from 'react';
import { Document, DocumentCategory, User } from '../types';
import { fetchDocumentsPaginated, fetchDocumentCategories } from '../services/documents';
import { FileText, Search, Loader2, ArrowDown } from 'lucide-react';
import { DocumentCard } from '../components/documents/DocumentCard';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 9;

export const DocumentList: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cData = await fetchDocumentCategories();
        setCategories(cData);
        const { docs: initialDocs, lastDoc: initialLastDoc, hasMore: initialHasMore } = await fetchDocumentsPaginated('all', null, PAGE_SIZE);
        setDocs(initialDocs);
        setLastDoc(initialLastDoc);
        setHasMore(initialHasMore);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    init();
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || !lastDoc) return;
    setIsLoadingMore(true);
    try {
      const { docs: newDocs, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchDocumentsPaginated(activeCat, lastDoc, PAGE_SIZE);
      setDocs(prev => [...prev, ...newDocs]);
      setLastDoc(newLastDoc);
      setHasMore(newHasMore);
    } catch (error) { console.error(error); } finally { setIsLoadingMore(false); }
  };

  // ✅ Lọc kết quả tìm kiếm trên dữ liệu đã tải
  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 pt-safe-top">
      {/* UI Header của bạn */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredDocs.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
        {hasMore && !searchTerm && (
          <div className="text-center mt-10">
            <button onClick={handleLoadMore} disabled={isLoadingMore} className="px-6 py-2 bg-white rounded-full font-bold shadow-sm">
              {isLoadingMore ? "Đang tải..." : "Xem thêm tài liệu"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
