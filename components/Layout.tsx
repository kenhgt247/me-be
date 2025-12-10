import React, { useState, useEffect } from 'react';
// @ts-ignore
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Gamepad2, Facebook, Instagram, Youtube, User as UserIcon, Bell, MessageCircle, Bot } from 'lucide-react';
import { subscribeToNotifications, subscribeToChats, updateUserStatus } from '../services/db';
import { auth } from '../firebaseConfig';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [currentUserAvatar, setCurrentUserAvatar] = useState("https://cdn-icons-png.flaticon.com/512/3177/3177440.png");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (user) {
            // @ts-ignore
            setCurrentUserAvatar(user.photoURL || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png");
            
            // --- PRESENCE SYSTEM (HEARTBEAT) ---
            // Set online immediately
            updateUserStatus(user.uid, true);
            
            // Pulse every 2 minutes to keep status active
            const presenceInterval = setInterval(() => {
                updateUserStatus(user.uid, true);
            }, 2 * 60 * 1000);

            // Set offline on window close
            const handleUnload = () => {
                updateUserStatus(user.uid, false);
            };
            window.addEventListener('beforeunload', handleUnload);

            // Subscribe Notifications (Safe call)
            const unsubNotif = subscribeToNotifications(user.uid, (notifs) => {
                if (notifs) {
                    const unread = notifs.filter(n => !n.isRead).length;
                    setUnreadNotifCount(unread);
                }
            });

            // Subscribe Chats for Badge (Safe call)
            const unsubChats = subscribeToChats(user.uid, (chats) => {
                let count = 0;
                if (chats) {
                    chats.forEach(c => {
                       // @ts-ignore
                       if (c.unreadCount && c.unreadCount[user.uid]) {
                           // @ts-ignore
                           count += c.unreadCount[user.uid];
                       }
                    });
                }
                setUnreadMsgCount(count);
            });

            return () => {
                if (unsubNotif) unsubNotif();
                if (unsubChats) unsubChats();
                clearInterval(presenceInterval);
                window.removeEventListener('beforeunload', handleUnload);
                // Try to set offline on cleanup (might not fire on sudden close, but good practice)
                updateUserStatus(user.uid, false);
            }
        } else {
            setUnreadNotifCount(0);
            setUnreadMsgCount(0);
            setCurrentUserAvatar("https://cdn-icons-png.flaticon.com/512/3177/3177440.png");
        }
    });
    return () => unsubscribeAuth();
  }, []);
  
  const isQuestionDetail = path.startsWith('/question/');
  const isChatDetail = path.startsWith('/messages/');
  const isGameZone = path === '/games';
  const isAskPage = path === '/ask';
  const isNotificationPage = path === '/notifications';
  const isExpertReg = path === '/expert-register';
  const isAiChat = path === '/ai-chat';
  
  // Hide Top Bar on Chat Detail/AI/Question Detail to allow custom headers
  const hideTopBar = isChatDetail || isAiChat || isQuestionDetail; 
  
  const hideBottomBar = isAskPage || isChatDetail || isAiChat;

  return (
    <div className="min-h-screen font-sans text-textDark bg-[#F7F7F5] flex flex-col overflow-x-hidden selection:bg-primary/20">
      
      {/* --- DESKTOP HEADER (Hidden on Mobile) --- */}
      <header className="hidden md:block bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 transition-all">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-2 select-none hover:scale-105 transition-transform">
            <span className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-xl text-white shadow-sm text-lg">👶</span>
            Asking.vn
          </Link>
          
          <nav className="flex items-center gap-1 font-medium text-[15px]">
            <NavLink to="/" label="Trang chủ" active={path === '/'} />
            <NavLink to="/games" label="Góc Bé Chơi" active={path === '/games'} />
            <NavLink to="/messages" label="Tin nhắn" active={path === '/messages'} />
            
            <Link to="/ai-chat" className="bg-gradient-to-tr from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all mx-2">
                <Bot size={18} /> Trợ lý AI
            </Link>

            <Link to="/notifications" className="relative p-2 mx-1 text-gray-500 hover:text-primary transition-colors">
                 <Bell size={20} />
                 {unreadNotifCount > 0 && (
                     <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-small shadow-sm ring-1 ring-white">
                         {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                     </span>
                 )}
            </Link>

            <NavLink to="/profile" label="Tài khoản" active={path === '/profile'} />
            
            <Link to="/ask" className="ml-4 bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 select-none font-bold text-sm flex items-center gap-2">
              <Plus size={18} strokeWidth={3} /> Đặt câu hỏi
            </Link>
          </nav>
        </div>
      </header>

      {/* --- MOBILE TOP BAR --- */}
      {!hideTopBar && !isAskPage && !isGameZone && !isNotificationPage && !isExpertReg && (
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 pt-safe-top pb-2 px-4 flex justify-between items-center transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <Link to="/" className="text-xl font-black text-primary flex items-center gap-2 tracking-tight">
             Asking.vn
          </Link>
          <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <Link to="/notifications" className="relative w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-textDark active:bg-gray-200 transition-colors">
                <Bell size={20} />
                {unreadNotifCount > 0 && (
                     <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                         {unreadNotifCount > 9 ? '!' : unreadNotifCount}
                     </span>
                 )}
             </Link>
             
             {/* AI Chat Button (Replacing Profile Avatar on Header) */}
             <Link to="/ai-chat" className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-md active:scale-90 transition-transform">
                <Bot size={20} />
             </Link>
          </div>
        </header>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className={`flex-1 w-full max-w-5xl mx-auto md:px-4 ${(!hideTopBar && !isAskPage && !isGameZone && !isNotificationPage && !isExpertReg) ? 'pt-20 md:pt-6' : 'pt-0 md:pt-6'} pb-24 md:pb-8 transition-all duration-300`}>
        {children}
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      {!hideBottomBar && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 pb-safe-bottom pt-2 px-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] rounded-t-[1.5rem]">
          <div className="flex justify-between items-end">
            <MobileNavItem to="/" icon={<Home size={24} />} label="Trang chủ" active={path === '/'} />
            <MobileNavItem to="/games" icon={<Gamepad2 size={24} />} label="Bé chơi" active={path === '/games'} />
            
            {/* Floating Action Button (Center) */}
            <div className="relative -top-6 group">
              <Link to="/ask" className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-primary to-[#26A69A] rounded-full text-white shadow-xl shadow-primary/40 active:scale-90 transition-transform ring-4 ring-white group-hover:shadow-2xl">
                <Plus size={28} strokeWidth={2.5} />
              </Link>
            </div>

            <MobileNavItem to="/messages" icon={
                <div className="relative">
                    <MessageCircle size={24} />
                    {unreadMsgCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
            } label="Tin nhắn" active={path.startsWith('/messages')} />
            
            <MobileNavItem to="/profile" icon={<UserIcon size={24} />} label="Cá nhân" active={path === '/profile'} />
          </div>
        </div>
      )}

      {/* --- DESKTOP FOOTER --- */}
      {!hideBottomBar && !isNotificationPage && !isExpertReg && !isAiChat && !isQuestionDetail && !isGameZone && (
        <footer className={`bg-white border-t border-gray-100 py-10 px-4 md:px-0 mt-auto hidden md:block`}>
          <div className="max-w-5xl mx-auto">
             <div className="flex flex-col items-center justify-center text-center">
                <h3 className="text-primary font-bold text-xl mb-2">Asking.vn</h3>
                <p className="text-textGray text-sm mb-4">Cộng đồng Mẹ & Bé văn minh, hiện đại.</p>
                <div className="flex gap-4 mb-8">
                  <SocialIcon color="text-blue-600 bg-blue-50" icon={<Facebook size={16} />} />
                  <SocialIcon color="text-pink-600 bg-pink-50" icon={<Instagram size={16} />} />
                  <SocialIcon color="text-red-600 bg-red-50" icon={<Youtube size={16} />} />
                </div>
                <p className="text-xs text-gray-400">© 2024 Asking.vn. All rights reserved.</p>
             </div>
          </div>
        </footer>
      )}
    </div>
  );
};

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link 
    to={to} 
    className={`px-4 py-2 rounded-full transition-all ${active ? 'bg-primary/10 text-primary font-bold' : 'text-textGray hover:text-primary hover:bg-gray-50'}`}
  >
    {label}
  </Link>
);

const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className="flex flex-col items-center gap-1 min-w-[60px] active:scale-95 transition-transform group">
    <div className={`p-1.5 rounded-xl transition-colors ${active ? 'text-primary' : 'text-gray-400 group-hover:text-textDark'}`}>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { 
        fill: active ? "currentColor" : "none", 
        strokeWidth: active ? 2.5 : 2 
      }) : icon}
    </div>
    <span className={`text-[10px] font-bold ${active ? 'text-primary' : 'text-gray-400'}`}>
      {label}
    </span>
  </Link>
);

const SocialIcon: React.FC<{ color: string; icon: React.ReactNode }> = ({ color, icon }) => (
  <a href="#" className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${color}`}>
    {icon}
  </a>
);
