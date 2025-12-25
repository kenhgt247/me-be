import React, { useState, useEffect, memo } from 'react';
import { X, Loader2, Send, Heart } from 'lucide-react';
import { User, Story } from '../../types'; // Lùi 2 cấp để tìm types
import { markStoryViewed, toggleStoryLike } from '../../services/stories';
import { sendStoryReply } from '../../services/chat';

interface StoryViewerProps {
  story: Story;
  currentUser: User | null;
  onClose: () => void;
}

export const StoryViewer = memo(({ story, currentUser, onClose }: StoryViewerProps) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

  // --- LOGIC SỬA LỖI HIỂN THỊ TÊN/AVATAR ---
  // Ưu tiên lấy từ object author (mới), nếu không có mới lấy userName (cũ)
  const authorName = story.author?.name || story.userName || "Người dùng ẩn danh";
  const authorAvatar = story.author?.avatar || story.userAvatar || DEFAULT_AVATAR;
  // ------------------------------------------

  useEffect(() => {
    if (currentUser && story.id) { 
        markStoryViewed(story.id, currentUser.id); 
        const userHasLiked = story.likes?.includes(currentUser.id) || false;
        setIsLiked(userHasLiked);
    }
  }, [story, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(timer); onClose(); return 100; }
        return prev + 1; 
      });
    }, 50); 
    return () => clearInterval(timer);
  }, [onClose]);

  const handleToggleLike = async () => {
    if (!currentUser) return;
    setIsLiked(!isLiked);
    try { await toggleStoryLike(story.id, currentUser.id); } catch (error) { setIsLiked(!isLiked); }
  };

  const handleSendReply = async () => {
      if(!replyText.trim() || !currentUser || isSending) return;
      setIsSending(true);
      try {
        // Gửi tin nhắn cho author.id (ưu tiên) hoặc userId (cũ)
        await sendStoryReply(currentUser, story.author?.id || story.userId, replyText, { id: story.id, url: story.mediaUrl });
        setReplyText(''); alert('Đã gửi phản hồi!'); 
      } catch (error) { console.error(error); } finally { setIsSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
      <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        {/* Progress Bar */}
        <div className="absolute top-4 left-2 right-2 flex gap-1 z-20">
            <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>

        {/* Header User Info */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-2">
            <img 
                src={authorAvatar} 
                onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} 
                className="w-9 h-9 rounded-full border border-white/50 object-cover" 
                alt="" 
                decoding="async" 
            />
            <div className="flex flex-col">
                <span className="font-bold text-sm text-shadow">{authorName}</span>
                <span className="text-[10px] text-white/80">{new Date(story.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>

        {/* Main Image */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img src={story.mediaUrl} className="w-full h-full object-cover" alt="story" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>
        </div>

        {/* Footer Reply/Like */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-6 flex items-center gap-3">
          <input 
            value={replyText} 
            onChange={(e) => setReplyText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()} 
            placeholder={`Gửi tin nhắn cho ${authorName}...`} 
            className="w-full bg-transparent border border-white/60 rounded-full pl-5 pr-10 py-3 text-white placeholder-white/70 text-sm outline-none focus:border-white focus:bg-black/20 transition-all backdrop-blur-sm" 
          />
          {replyText.trim() ? (
            <button onClick={handleSendReply} disabled={isSending} className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50">{isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}</button>
          ) : (
            <button onClick={handleToggleLike} className={`p-3 rounded-full transition-all active:scale-90 ${isLiked ? 'bg-red-500/20' : 'hover:bg-white/10'}`}><Heart size={28} className={isLiked ? "text-red-500 fill-red-500 animate-bounce-custom" : "text-white"} /></button>
          )}
        </div>
      </div>
    </div>
  );
});