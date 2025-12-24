import React, { memo } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { Question, toSlug } from '../types';

const DEFAULT_AVATAR = "/images/rabbit.png";

export const QuestionCard = memo(({ q, currentUser }: { q: Question, currentUser: any }) => {
  const likesCount = Array.isArray(q.likes) ? q.likes.length : (typeof q.likes === 'number' ? q.likes : 0);
  const isLiked = currentUser && Array.isArray(q.likes) && q.likes.includes(currentUser.id);

  // Component ảnh Facebook-style (nhúng gọn vào đây hoặc import nếu bạn đã có)
  const renderImages = (images?: string[]) => {
      if (!images || images.length === 0) return null;
      const count = images.length;
      const containerClass = "mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800";
      const imgClass = "w-full h-full object-cover";
      
      if (count === 1) return <div className={containerClass}><div className="h-64"><img src={images[0]} className={imgClass} loading="lazy" /></div></div>;
      if (count === 2) return <div className={`${containerClass} grid grid-cols-2 gap-1 h-64`}><img src={images[0]} className={imgClass} /><img src={images[1]} className={imgClass} /></div>;
      // ...các trường hợp khác giữ đơn giản...
      return <div className={containerClass}><div className="h-64"><img src={images[0]} className={imgClass} /></div></div>;
  };

  return (
    <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group">
      <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all relative overflow-hidden hover:border-blue-200 dark:hover:border-blue-900">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={q.author.avatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border border-gray-100 dark:border-slate-700 object-cover" loading="lazy" onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                {q.author.name} {q.author.isExpert && <ShieldCheck size={10} className="text-blue-500" />}
              </p>
              <p className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <span className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-700">{q.category}</span>
        </div>

        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{q.title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{q.content}</p>

        {renderImages(q.images)}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800 mt-3">
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <span className={`flex items-center gap-1.5 ${isLiked ? "text-red-500" : ""}`}><Heart size={14} className={isLiked ? "fill-red-500" : ""} /> {likesCount}</span>
            <span className="flex items-center gap-1.5"><MessageCircle size={14} /> {q.answers.length}</span>
          </div>
          {q.answers.length === 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">Chưa trả lời</span>}
        </div>
      </div>
    </Link>
  );
});