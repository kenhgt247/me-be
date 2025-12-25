import React, { useEffect, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, ShieldCheck, Bell, Check, Loader2, Info } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead } from '../services/db';
import { Notification, User } from '../types';

interface NotificationsProps {
  currentUser: User;
  onOpenAuth: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ currentUser, onOpenAuth }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser.isGuest) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNotifications(currentUser.id, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleRead = async (notif: Notification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    navigate(notif.link);
  };

  const getIcon = (type: Notification['type']) => {
    switch(type) {
      case 'LIKE': return <Heart size={12} className="text-white fill-white" />;
      case 'ANSWER': return <MessageCircle size={12} className="text-white fill-white" />;
      case 'VERIFY': return <ShieldCheck size={12} className="text-white" />;
      case 'BEST_ANSWER': return <ShieldCheck size={12} className="text-white" />;
      default: return <Bell size={12} className="text-white" />;
    }
  };

  const getIconContainerColor = (type: Notification['type']) => {
    // Thêm dark:border-slate-800 để icon hòa vào nền tối
    const baseBorder = "border-white dark:border-slate-800"; 
    switch(type) {
        case 'LIKE': return `bg-red-500 ${baseBorder}`;
        case 'ANSWER': return `bg-blue-500 ${baseBorder}`;
        case 'VERIFY': return `bg-green-500 ${baseBorder}`;
        case 'BEST_ANSWER': return `bg-yellow-500 ${baseBorder}`;
        default: return `bg-gray-400 ${baseBorder}`;
    }
  };

  if (currentUser.isGuest) {
    return (
      // THAY ĐỔI: bg-white -> dark:bg-dark-bg
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in pt-safe-top bg-[#F7F7F5] dark:bg-dark-bg transition-colors">
        <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-6 text-primary animate-bounce-small">
           <Bell size={40} />
        </div>
        <h2 className="text-2xl font-bold text-textDark dark:text-white mb-3">Thông báo</h2>
        <p className="text-textGray dark:text-gray-400 mb-8 max-w-xs mx-auto">Đăng nhập để nhận thông báo ngay khi có người trả lời câu hỏi của mẹ nhé!</p>
        <button onClick={onOpenAuth} className="bg-primary text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl active:scale-95 transition-all">
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    // THAY ĐỔI: bg-[#F7F7F5] -> dark:bg-dark-bg
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 animate-fade-in transition-colors duration-300">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-b border-gray-100 dark:border-dark-border px-4 py-3 flex items-center justify-between pt-safe-top shadow-sm transition-colors">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all text-textDark dark:text-white">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-textDark dark:text-white">Thông báo</h1>
        </div>
      </div>

      <div className="p-2 space-y-2">
        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : notifications.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
               <div className="w-20 h-20 bg-white dark:bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300 dark:text-gray-600">
                 <Bell size={32} />
               </div>
               <p className="text-textDark dark:text-white font-bold mb-1">Chưa có thông báo</p>
               <p className="text-textGray dark:text-gray-400 text-sm">Khi có hoạt động mới, chúng sẽ xuất hiện ở đây.</p>
            </div>
        ) : (
            notifications.map(notif => (
                <div 
                    key={notif.id}
                    onClick={() => handleRead(notif)}
                    className={`
                        relative p-4 rounded-2xl flex gap-4 items-start active:scale-[0.98] transition-all cursor-pointer border
                        ${notif.isRead 
                            ? 'bg-white dark:bg-dark-card border-transparent' 
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm'}
                    `}
                >
                    <div className="relative shrink-0 mt-0.5">
                        <img src={notif.sender.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800" />
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-sm ${getIconContainerColor(notif.type)}`}>
                            {getIcon(notif.type)}
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-textDark dark:text-gray-100 leading-snug">
                            <span className="font-bold text-black dark:text-white">{notif.sender.name}</span> {notif.content}
                        </p>
                        <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500 mt-1.5 block">
                             {getRelativeTime(notif.createdAt)}
                        </span>
                    </div>

                    {!notif.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 self-center shadow-sm"></div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
};

// Helper for human-readable time
function getRelativeTime(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    
    return "Vừa xong";
}
