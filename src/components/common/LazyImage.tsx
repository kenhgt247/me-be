import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string; // Ảnh hiển thị nếu ảnh chính lỗi
  placeholderClassName?: string; // Class cho khung skeleton
}

const DEFAULT_FALLBACK = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"; // Avatar mặc định

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  fallbackSrc = DEFAULT_FALLBACK,
  placeholderClassName = "bg-gray-200 dark:bg-slate-700",
  ...props 
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    // Reset state khi src thay đổi (ví dụ: avatar user thay đổi)
    setStatus('loading');
    setCurrentSrc(src);
    
    const img = new Image();
    img.src = src;
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
  }, [src]);

  // Nếu lỗi, hiển thị ảnh fallback
  if (status === 'error') {
    return (
      <img 
        src={fallbackSrc} 
        alt={alt} 
        className={`${className} object-cover`} 
        {...props} 
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 1. Skeleton Loading (Hiện khi đang tải) */}
      {status === 'loading' && (
        <div className={`absolute inset-0 z-10 animate-pulse ${placeholderClassName} flex items-center justify-center`}>
           {/* Có thể thêm icon nhỏ nếu muốn, hoặc để trống cho sạch */}
        </div>
      )}

      {/* 2. Ảnh thật */}
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        {...props}
      />
    </div>
  );
};