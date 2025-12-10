import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { Document, DocumentReview, User } from '../types';
import { fetchDocumentBySlug, incrementDownload, fetchDocumentReviews, addDocumentReview } from '../services/documents';
import { Loader2, ArrowLeft, Download, Star, FileText, Share2, Send, Link as LinkIcon } from 'lucide-react';
import { loginAnonymously } from '../services/auth';

export const DocumentDetail: React.FC<{ currentUser: User; onOpenAuth: () => void }> = ({ currentUser, onOpenAuth }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (slug) loadData(slug);
  }, [slug]);

  const loadData = async (slug: string) => {
    setLoading(true);
    const docData = await fetchDocumentBySlug(slug);
    if (docData) {
        setDoc(docData);
        const reviewsData = await fetchDocumentReviews(docData.id);
        setReviews(reviewsData);
    }
    setLoading(false);
  };

  const handleDownload = async () => {
      if (!doc) return;
      
      const targetUrl = doc.isExternal ? doc.externalLink : doc.fileUrl;
      if (!targetUrl) return;

      window.open(targetUrl, '_blank');
      await incrementDownload(doc.id);
      setDoc(prev => prev ? ({ ...prev, downloads: prev.downloads + 1 }) : null);
  };

  const handleSubmitReview = async () => {
      if (!doc || !reviewContent.trim()) return;
      
      let user = currentUser;
      if (user.isGuest) {
          try { user = await loginAnonymously(); } 
          catch { onOpenAuth(); return; }
      }

      setSubmittingReview(true);
      await addDocumentReview(user, doc.id, userRating, reviewContent, doc.rating, doc.ratingCount);
      
      const newReviews = await fetchDocumentReviews(doc.id);
      setReviews(newReviews);
      setReviewContent('');
      setSubmittingReview(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><Loader2 className="animate-spin text-green-600" size={32} /></div>;
  if (!doc) return <div className="p-10 text-center">Tài liệu không tồn tại.</div>;

  return (
    <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
       <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <button onClick={() => navigate('/documents')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-textDark">
              <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-sm text-textDark uppercase">Chi tiết tài liệu</span>
          <div className="w-10"></div>
       </div>

       <div className="max-w-3xl mx-auto p-4 space-y-6">
           <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
               <div className="flex flex-col items-center text-center mb-6">
                   <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-4 shadow-inner ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50'}`}>
                       {doc.isExternal ? <LinkIcon size={48} /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'docx' ? '📝' : '📄')}
                   </div>
                   <h1 className="text-2xl font-bold text-gray-900 mb-2">{doc.title}</h1>
                   <div className="flex items-center gap-4 text-sm text-gray-500">
                       <span className="bg-gray-100 px-2 py-0.5 rounded text-xs uppercase">{doc.isExternal ? 'Link' : doc.fileType}</span>
                       <span>{doc.downloads} lượt tải</span>
                       <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400"/> {doc.rating.toFixed(1)}</span>
                   </div>
               </div>
               
               <p className="text-gray-600 mb-6 leading-relaxed">{doc.description}</p>
               
               <button onClick={handleDownload} className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${doc.isExternal ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}>
                   {doc.isExternal ? <LinkIcon size={20} /> : <Download size={20} />} 
                   {doc.isExternal ? 'Truy cập liên kết' : 'Tải xuống ngay'}
               </button>
           </div>

           {/* Reviews */}
           <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
               <h3 className="font-bold text-lg mb-4">Đánh giá & Bình luận</h3>
               
               <div className="bg-gray-50 p-4 rounded-xl mb-6">
                   <div className="flex items-center gap-2 mb-3 justify-center">
                       {[1,2,3,4,5].map(star => (
                           <button key={star} onClick={() => setUserRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                               <Star size={24} className={star <= userRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                           </button>
                       ))}
                   </div>
                   <div className="flex gap-2">
                       <input value={reviewContent} onChange={e => setReviewContent(e.target.value)} className="flex-1 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" placeholder="Viết cảm nhận của bạn..." />
                       <button onClick={handleSubmitReview} disabled={submittingReview} className="bg-green-600 text-white p-3 rounded-xl shadow-md"><Send size={18} /></button>
                   </div>
               </div>

               <div className="space-y-4">
                   {reviews.map(rev => (
                       <div key={rev.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                           <div className="flex items-center justify-between mb-1">
                               <div className="flex items-center gap-2">
                                   <img src={rev.userAvatar} className="w-6 h-6 rounded-full bg-gray-200" />
                                   <span className="font-bold text-sm">{rev.userName}</span>
                               </div>
                               <div className="flex gap-0.5">
                                   {[...Array(5)].map((_, i) => (
                                       <Star key={i} size={10} className={i < rev.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                                   ))}
                               </div>
                           </div>
                           <p className="text-sm text-gray-600 ml-8">{rev.comment}</p>
                       </div>
                   ))}
               </div>
           </div>
       </div>
    </div>
  );
};
