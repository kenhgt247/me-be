import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, DocumentReview, User, AdConfig } from '../types';
import { fetchDocumentBySlug, incrementDownload, fetchDocumentReviews, addDocumentReview, fetchDocuments } from '../services/documents'; 
import { getAdConfig } from '../services/ads';
import { loginAnonymously } from '../services/auth';
import { 
  Loader2, ArrowLeft, Download, Star, FileText, Share2, Send, 
  Link as LinkIcon, ExternalLink, MessageCircle, Home, ChevronRight,
  Eye, Calendar, CheckCircle2, Info, Sparkles, MousePointerClick
} from 'lucide-react';
import { ShareModal } from '../components/ShareModal';

// --- TYPES & CONSTANTS ---
interface ExpandedReview extends DocumentReview {
    isExpanded?: boolean;
}
const PAGE_SIZE = 5;
const MAX_REVIEW_LENGTH = 150;

// --- COMPONENT: NATIVE AD (SIDEBAR) ---
const DocumentSidebarAd = ({ config }: { config: NonNullable<AdConfig['documentAd']> }) => {
    if (!config.enabled) return null;
    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 animate-fade-in relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-bl-lg font-bold tracking-wider">AD</div>
            <a href={config.link} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-4">
                <div className="flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center">
                        {config.imageUrl ? (
                            <img src={config.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="ad"/>
                        ) : (
                            <span className="text-3xl">🎁</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-0.5 flex items-center gap-1">
                            <Sparkles size={10} /> {config.sponsorName}
                        </p>
                        <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {config.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-snug">
                            {config.description}
                        </p>
                    </div>
                </div>
                <button className="w-full py-2.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                    {config.ctaText} <MousePointerClick size={14}/>
                </button>
            </a>
        </div>
    );
};

export const DocumentDetail: React.FC<{ currentUser: User; onOpenAuth: () => void }> = ({ currentUser, onOpenAuth }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    
    // Data State
    const [doc, setDoc] = useState<Document | null>(null);
    const [reviews, setReviews] = useState<ExpandedReview[]>([]); 
    const [relatedDocs, setRelatedDocs] = useState<Document[]>([]); // Tài liệu liên quan
    const [adConfig, setAdConfig] = useState<AdConfig | null>(null); // Cấu hình quảng cáo
    
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Interaction State
    const [userRating, setUserRating] = useState(5);
    const [reviewContent, setReviewContent] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
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
            const docData = await fetchDocumentBySlug(slug);
            if (docData) {
                // Fetch song song: Reviews, AdConfig, Related Docs
                const [initialReviews, adSettings, relatedData] = await Promise.all([
                    fetchDocumentReviews(docData.id),
                    getAdConfig(),
                    fetchDocuments(docData.categoryId, 5) // Lấy 5 tài liệu cùng danh mục
                ]);

                setDoc(docData);
                setReviews(initialReviews.map(rev => ({ ...rev, isExpanded: false }) as ExpandedReview));
                setAdConfig(adSettings);
                setRelatedDocs(relatedData.filter(d => d.id !== docData.id)); // Loại bỏ chính nó
                setHasMore(initialReviews.length === PAGE_SIZE); 
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
        setLoading(false);
    };

    const handleLoadMore = async () => {
        if (!doc || isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);
        const lastReview = reviews[reviews.length - 1];
        try {
            if (!lastReview || !lastReview.id) { setHasMore(false); return; }
            const nextReviews = await fetchDocumentReviews(doc.id, lastReview.id);
            setReviews(prev => [...prev, ...nextReviews.map(rev => ({ ...rev, isExpanded: false }) as ExpandedReview)]);
            setHasMore(nextReviews.length === PAGE_SIZE); 
        } catch (error) { setHasMore(false); } finally { setIsFetchingMore(false); }
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
        const initialReviews = await fetchDocumentReviews(doc.id);
        setReviews(initialReviews.map(rev => ({ ...rev, isExpanded: false }) as ExpandedReview));
        setHasMore(initialReviews.length === PAGE_SIZE);
        setReviewContent('');
        setSubmittingReview(false);
    };

    const handleDownload = async () => {
        if (!doc) return;
        const targetUrl = doc.isExternal ? doc.externalLink : doc.fileUrl;
        if (!targetUrl) { alert("Không tìm thấy đường dẫn."); return; }
        window.open(targetUrl, '_blank');
        await incrementDownload(doc.id);
        setDoc(prev => prev ? ({ ...prev, downloads: prev.downloads + 1 }) : null);
    };

    const toggleExpand = (reviewId: string) => {
        setReviews(reviews.map(rev => rev.id === reviewId ? { ...rev, isExpanded: !rev.isExpanded } : rev));
    };
    
    const getFileIcon = (type: string, isExternal?: boolean) => {
        if (isExternal) return <LinkIcon size={48} className="text-blue-500" />;
        switch (type) {
            case 'pdf': return <span className="text-6xl">📕</span>;
            case 'docx': return <span className="text-6xl">📝</span>;
            case 'xlsx': return <span className="text-6xl">📊</span>;
            case 'pptx': return <span className="text-6xl">📽️</span>;
            case 'image': return <span className="text-6xl">🖼️</span>;
            case 'video': return <span className="text-6xl">🎬</span>;
            default: return <span className="text-6xl">📄</span>;
        }
    };
    
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-green-600" size={32} /></div>;
    
    if (!doc) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white">
            <FileText size={64} className="text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-700">Tài liệu không tồn tại</h2>
            <button onClick={() => navigate('/documents')} className="mt-4 px-6 py-2 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">Quay lại thư viện</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
            
            {/* HEADER */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm transition-all">
                <button onClick={() => navigate('/documents')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-600 transition-colors">
                    <ArrowLeft size={22} />
                </button>
                <div className="flex gap-2">
                    <button onClick={() => setShowShare(true)} className="p-2 hover:bg-gray-50 rounded-full text-blue-600 transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8">
                
                {/* BREADCRUMBS */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <Link to="/" className="hover:text-black flex items-center gap-1"><Home size={14}/> Trang chủ</Link>
                    <ChevronRight size={14} className="text-gray-300" />
                    <Link to="/documents" className="hover:text-black">Tài liệu</Link>
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">
                        {doc.fileType.toUpperCase()}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- MAIN CONTENT (LEFT - 8) --- */}
                    <main className="lg:col-span-8 space-y-8">
                        
                        {/* 1. DOCUMENT INFO CARD */}
                        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-50 to-transparent rounded-bl-[100%] -z-0 pointer-events-none opacity-50"></div>
                            
                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Icon Box */}
                                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center shadow-inner border border-gray-100 shrink-0 mx-auto md:mx-0 ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600'}`}>
                                        {getFileIcon(doc.fileType, doc.isExternal)}
                                    </div>
                                    
                                    {/* Text Info */}
                                    <div className="flex-1 text-center md:text-left">
                                        <h1 className="text-2xl md:text-4xl font-black text-gray-900 mb-4 leading-tight tracking-tight">{doc.title}</h1>
                                        
                                        <div className="flex flex-wrap justify-center md:justify-start gap-3 text-xs font-bold text-gray-500 mb-6">
                                            <span className="bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1"><Calendar size={12}/> {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                                            <span className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-yellow-100"><Star size={12} fill="currentColor"/> {doc.rating.toFixed(1)} ({doc.ratingCount})</span>
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-blue-100"><Download size={12}/> {doc.downloads} tải</span>
                                        </div>

                                        <div className="flex items-center justify-center md:justify-start gap-3">
                                            <img src={doc.authorAvatar} className="w-8 h-8 rounded-full object-cover border border-gray-200" alt="author"/>
                                            <div className="text-left">
                                                <p className="text-xs text-gray-400 font-bold uppercase">Đăng bởi</p>
                                                <p className="text-sm font-bold text-gray-900">{doc.authorName} {doc.isExpert && <CheckCircle2 size={12} className="inline text-blue-500"/>}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-8 border-gray-100" />

                                {/* Description */}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2"><Info size={20} className="text-gray-400"/> Giới thiệu tài liệu</h3>
                                    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-[15px]">
                                        {doc.description || "Chưa có mô tả chi tiết."}
                                    </div>
                                </div>

                                {/* Download Action */}
                                <div className="mt-10">
                                    <button 
                                        onClick={handleDownload} 
                                        className={`w-full text-white font-bold py-4 rounded-2xl shadow-xl shadow-green-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg group ${doc.isExternal ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        <div className="p-1 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                                            {doc.isExternal ? <ExternalLink size={20} /> : <Download size={20} />} 
                                        </div>
                                        {doc.isExternal ? 'Truy cập liên kết gốc' : 'Tải xuống miễn phí'}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-3 italic">
                                        * Tài liệu được chia sẻ miễn phí cho cộng đồng.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. REVIEWS SECTION */}
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                                <MessageCircle className="text-green-600" /> Đánh giá ({doc.ratingCount})
                            </h3>

                            {/* Add Review Box */}
                            <div className="bg-gray-50 p-5 rounded-2xl mb-8 border border-gray-100">
                                <div className="text-center mb-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Bạn thấy tài liệu này thế nào?</p>
                                    <div className="flex items-center justify-center gap-2">
                                        {[1,2,3,4,5].map(star => (
                                            <button key={star} onClick={() => setUserRating(star)} className="focus:outline-none transition-transform hover:scale-125 active:scale-90">
                                                <Star size={32} className={`${star <= userRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} drop-shadow-sm`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input value={reviewContent} onChange={e => setReviewContent(e.target.value)} className="flex-1 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all bg-white" placeholder="Viết cảm nhận..." />
                                    <button onClick={handleSubmitReview} disabled={submittingReview || !reviewContent.trim()} className="bg-green-600 text-white p-3 rounded-xl shadow-md hover:bg-green-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-90">
                                        {submittingReview ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Reviews List */}
                            <div className="space-y-6">
                                {reviews.length === 0 && !loading && <div className="text-center text-gray-400 py-4 text-sm italic">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>}
                                {reviews.map(rev => (
                                    <div key={rev.id} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <img src={rev.userAvatar} className="w-10 h-10 rounded-full bg-gray-100 object-cover border border-gray-100" />
                                                <div>
                                                    <span className="font-bold text-sm text-textDark block leading-none mb-1">{rev.userName}</span>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(5)].map((_, i) => <Star key={i} size={10} className={i < rev.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        
                                        {(() => {
                                            const isLong = rev.comment && rev.comment.length > MAX_REVIEW_LENGTH;
                                            const content = rev.isExpanded ? rev.comment : rev.comment?.substring(0, MAX_REVIEW_LENGTH) + (isLong ? '...' : '');
                                            return (
                                                <div className="pl-13 ml-12">
                                                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl rounded-tl-none">{content}</p>
                                                    {isLong && <button onClick={() => toggleExpand(rev.id)} className="text-xs font-bold text-green-600 hover:underline mt-1 ml-1">{rev.isExpanded ? 'Thu gọn' : 'Xem thêm'}</button>}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                                
                                {hasMore && (
                                    <div className="pt-2 text-center">
                                        <button onClick={handleLoadMore} disabled={isFetchingMore} className="px-6 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-full hover:bg-gray-100 transition-colors text-sm disabled:opacity-70">
                                            {isFetchingMore ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Xem thêm đánh giá'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </main>

                    {/* --- SIDEBAR (RIGHT - 4) --- */}
                    <aside className="lg:col-span-4 space-y-6">
                         <div className="sticky top-24 space-y-6">
                            
                             {/* 1. NATIVE AD (CẤU HÌNH TỪ ADMIN) */}
                             {adConfig?.isEnabled && adConfig.documentAd && (
                                 <div className="bg-white p-4 rounded-[1.5rem] border border-gray-200 shadow-sm">
                                     <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider flex items-center gap-1"><Info size={12}/> Có thể bạn quan tâm</h4>
                                     <DocumentSidebarAd config={adConfig.documentAd} />
                                 </div>
                             )}

                             {/* 2. RELATED DOCUMENTS */}
                             {relatedDocs.length > 0 && (
                                 <div className="bg-gray-50/50 p-5 rounded-[1.5rem] border border-gray-100">
                                     <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm"><FileText size={16}/> Tài liệu liên quan</h4>
                                     <div className="flex flex-col gap-3">
                                         {relatedDocs.map(d => (
                                             <Link key={d.id} to={`/documents/${d.slug}`} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group">
                                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${d.isExternal ? 'bg-blue-50' : 'bg-green-50'}`}>
                                                     {d.isExternal ? <LinkIcon size={16} className="text-blue-500"/> : (d.fileType === 'pdf' ? '📕' : '📄')}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <h5 className="text-xs font-bold text-gray-800 line-clamp-2 group-hover:text-green-600 transition-colors">{d.title}</h5>
                                                     <p className="text-[10px] text-gray-400 mt-0.5">{d.downloads} lượt tải</p>
                                                 </div>
                                             </Link>
                                         ))}
                                     </div>
                                 </div>
                             )}

                         </div>
                    </aside>

                </div>
            </div>

            <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} title={doc.title} />
        </div>
    );
};
