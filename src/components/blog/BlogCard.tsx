import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { BlogPost } from '../../types';

interface BlogCardProps {
  post: BlogPost;
  categoryName?: string;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, categoryName }) => {
  return (
    <Link to={`/blog/${post.slug}`} className="group bg-white dark:bg-dark-card rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col h-full">
      <div className="aspect-video bg-gray-100 dark:bg-slate-700 relative overflow-hidden shrink-0">
        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt={post.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
            {post.iconEmoji || '📝'}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 dark:bg-dark-card/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-textDark dark:text-white shadow-sm border border-gray-100 dark:border-slate-700">
            {categoryName || 'Kiến thức'}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 font-normal flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-800 pt-4 mt-auto">
          <div className="flex items-center gap-2">
            <img src={post.authorAvatar || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"} className="w-6 h-6 rounded-full object-cover bg-gray-100" alt="avatar" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[100px]">{post.authorName}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-full">
            <Clock size={10} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>
    </Link>
  );
};