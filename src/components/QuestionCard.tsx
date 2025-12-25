import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, ShieldCheck, Eye } from 'lucide-react';
import { Question, User, toSlug } from '../types';
import { LazyImage } from './common/LazyImage'; // Import component tối ưu ảnh

interface QuestionCardProps {
  q: Question;
  currentUser: User | null;
}

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

export const QuestionCard = memo(({ q, currentUser }: QuestionCardProps) => {
  // Tính toán lượt like
  const likesCount = Array.isArray(q.likes) ? q.likes.length : (typeof q.likes === 'number' ? q.likes : 0);
  const isLiked = currentUser && Array.isArray(q.likes) && q.likes.includes(currentUser.id);

  // Hàm render ảnh thông minh (Facebook style mini)
  const renderImages = (images?: string[]) => {
    if (!images || images.length === 0) return null;
    const count = images.length;

    // Class chung cho container
    const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800";

    // 1 Ảnh
    if (count === 1) {
        return (
            <div className={`${containerClass} aspect-video`}>
                <LazyImage src={images[0]} alt="Question Image" className="w-full h-full" />
            </div>
        );
    }

    // 2 Ảnh (Chia đôi)
    if (count === 2) {
        return (
            <div className={`${containerClass} grid grid-cols-2 gap-1 aspect-[2/1]`}>
                <LazyImage src={images[0]} alt="Img 1" className="w-full h-full" />
                <LazyImage src={images[1]} alt="Img 2" className="w-full h-full" />
            </div>
        );
    }

    // 3 Ảnh trở lên (Hiển thị 3 ảnh, ảnh cuối có overlay số dư)
    return (
        <div className={`${containerClass} grid grid-cols-3 gap-1 aspect-[3/1]`}>
            {images.slice(0, 3).map((img, idx) => (
                <div key={idx} className="relative w-full h-full">
                    <LazyImage src={img} alt={`Img ${idx}`} className="w-full h-full" />
                    
                    {/* Overlay nếu còn ảnh thừa */}
                    {idx === 2 && count > 3 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[2px]">
                            +{count - 3}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
  };

  return (
    <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group">
      <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-dark-border active:scale-[0.99] transition-all relative overflow-hidden hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-md">
        
        {/* --- HEADER: AVATAR & INFO --- */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar dùng LazyImage */}
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 dark:border-slate-700 shrink-0">
                <LazyImage 
                    src={q.author.avatar || DEFAULT_AVATAR} 
                    alt={q.author.name} 
                    className="w-full h-full"
                    fallbackSrc={DEFAULT_AVATAR}
                />
            </div>
            
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1 leading-none mb-1">
                {q.author.name} 
                {q.author.isExpert && <ShieldCheck size={12} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                {new Date(q.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg">
            {q.category}
          </span>
        </div>

        {/* --- CONTENT --- */}
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1.5 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {q.title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3 leading-relaxed">
            {q.content}
        </p>

        {/* --- IMAGES GRID --- */}
        {renderImages(q.images)}

        {/* --- FOOTER ACTIONS --- */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800/50 mt-3">
          <div className="flex items-center gap-5 text-xs font-bold text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
                <Eye size={16} /> {q.views || 0}
            </span>
            <span className={`flex items-center gap-1.5 ${isLiked ? "text-red-500" : ""}`}>
                <Heart size={16} className={isLiked ? "fill-current" : ""} /> {likesCount}
            </span>
            <span className="flex items-center gap-1.5">
                <MessageCircle size={16} /> {q.answers.length}
            </span>
          </div>
          
          {q.answers.length === 0 && (
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                Chưa trả lời
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});