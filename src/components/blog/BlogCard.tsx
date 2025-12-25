import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { BlogPost } from '../../types';
import { LazyImage } from '../common/LazyImage'; // <--- IMPORT COMPONENT MỚI

interface BlogCardProps {
  post: BlogPost;
  categoryName?: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, categoryName }) => {
  return (
    <Link 
      to={`/blog/${post.slug}`} 
      className="group bg-white dark:bg-dark-card rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col h-full"
    >
      {/* --- PHẦN ẢNH BÌA --- */}
      <div className="aspect-video bg-gray-100 dark:bg-slate-700 relative overflow-hidden shrink-0">
        {post.coverImageUrl ? (
          <LazyImage 
            src={post.coverImageUrl} 
            alt={post.title}
            // Giữ nguyên class hover hiệu ứng zoom
            className="w-full h-full group-hover:scale-105 transition-transform duration-700"
            // Ảnh fallback nếu link ảnh bìa bị lỗi
            fallbackSrc="https://placehold.co/600x400/e2e8f0/64748b?text=No+Image" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
            {post.iconEmoji || '📝'}
          </div>
        )}
        
        {/* Badge Category */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 dark:bg-dark-card/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-textDark dark:text-white shadow-sm border border-gray-100 dark:border-slate-700">
            {categoryName || 'Kiến thức'}
          </span>
        </div>
      </div>

      {/* --- PHẦN NỘI DUNG --- */}
      <div className="p-5 flex flex-col flex-1">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 font-normal flex-1">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-800 pt-4 mt-auto">
          <div className="flex items-center gap-2">
            {/* Avatar dùng LazyImage */}
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-slate-700">
                <LazyImage 
                    src={post.authorAvatar || ''} 
                    alt={post.authorName}
                    className="w-full h-full"
                    fallbackSrc="https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
                {post.authorName}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-full">
            <Clock size={10} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>
    </Link>
  );
};