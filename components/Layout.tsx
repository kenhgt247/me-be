import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Plus,
  Gamepad2,
  User as UserIcon,
  Bell,
  MessageCircle,
  Bot,
  Heart,
  MapPin,
  ShieldCheck,
  Facebook,
  Instagram,
  Youtube
} from 'lucide-react';

// Import services and config
import { subscribeToNotifications, updateUserStatus } from '../services/db';
import { subscribeUnreadCount } from '../services/chat';
import { auth } from '../firebaseConfig';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(
    'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
  );

  /* ================= AUTH + REALTIME ================= */
  useEffect(() => {
    let unsubNotif: (() => void) | null = null;
    let unsubUnread: (() => void) | null = null;
    let presenceInterval: any = null;

    const cleanUpSubscriptions = () => {
      if (unsubNotif) { unsubNotif(); unsubNotif = null; }
      if (unsubUnread) { unsubUnread(); unsubUnread = null; }
      if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      cleanUpSubscriptions();

      if (user) {
        // --- 1. SET USER INFO ---
        setCurrentUserAvatar(
          user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
        );

        // --- 2. PRESENCE (ONLINE STATUS) ---
        updateUserStatus(user.uid, true);
        presenceInterval = setInterval(() => {
          updateUserStatus(user.uid, true);
        }, 2 * 60 * 1000);

        const handleUnload = () => {
          updateUserStatus(user.uid, false);
        };
        window.addEventListener('beforeunload', handleUnload);

        // --- 3. NOTIFICATIONS ---
        unsubNotif = subscribeToNotifications(user.uid, notifs => {
          const unread = notifs?.filter(n => !n.isRead).length || 0;
          setUnreadNotifCount(unread);
        });

        // --- 4. CHAT UNREAD COUNT ---
        unsubUnread = subscribeUnreadCount(user.uid, count => {
          setUnreadMsgCount(count);
        });

        return () => {
           window.removeEventListener('beforeunload', handleUnload);
        };
      } else {
        setUnreadNotifCount(0);
        setUnreadMsgCount(0);
        setCurrentUserAvatar(
          'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
        );
      }
    });

    return () => {
      cleanUpSubscriptions();
      updateUserStatus(auth.currentUser?.uid || '', false);
      unsubscribeAuth();
    };
  }, []);

  /* ================= ROUTE FLAGS ================= */
  const isQuestionDetail = path.startsWith('/question/');
  const isChatDetail = path.startsWith('/messages/');
  const isGameZone = path === '/games';
  const isAskPage = path === '/ask';
  const isNotificationPage = path === '/notifications';
  const isExpertReg = path === '/expert-register';
  const isAiChat = path === '/ai-chat';

  const hideTopBar = isChatDetail || isAiChat || isQuestionDetail;
  const hideBottomBar = isAskPage || isChatDetail || isAiChat;

  return (
    <div className="min-h-screen font-sans text-textDark dark:text-dark-text bg-[#F7F7F5] dark:bg-dark-bg flex flex-col overflow-x-hidden transition-colors duration-300">

      {/* ================= DESKTOP HEADER ================= */}
      <header className="hidden md:block bg-white/90 dark:bg-dark-card/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 dark:border-dark-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-2">
            <span className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-xl text-white">👶</span>
            Asking.vn
          </Link>

          <nav className="flex items-center gap-1 text-[15px] font-medium">
            <NavLink to="/" label="Trang chủ" active={path === '/'} />
            <NavLink to="/games" label="Góc Bé Chơi" active={path === '/games'} />
            <NavLink to="/messages" label="Tin nhắn" active={path.startsWith('/messages')} />

            <Link to="/ai-chat" className="mx-2 bg-gradient-to-tr from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold shadow hover:shadow-md transition-shadow">
              <Bot size={18} /> Trợ lý AI
            </Link>

            {/* Dark Mode Toggle */}
            <div className="px-1"><ThemeToggle /></div>

            <Link to="/notifications" className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </Link>

            <NavLink to="/profile" label="Tài khoản" active={path === '/profile'} />

            <Link to="/ask" className="ml-4 bg-primary text-white px-5 py-2 rounded-full font-bold flex items-center gap-2 shadow hover:shadow-lg transition-all active:scale-95">
              <Plus size={18} /> Đặt câu hỏi
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= MOBILE TOP BAR ================= */}
      {!hideTopBar && !isAskPage && !isGameZone && !isNotificationPage && !isExpertReg && (
        <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-gray-100 dark:border-dark-border px-4 py-2 flex justify-between items-center shadow-sm">
          <Link to="/" className="text-xl font-black text-primary">Asking.vn</Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 dark:text-gray-200">
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-dark-card">
                  {unreadNotifCount > 9 ? '!' : unreadNotifCount}
                </span>
              )}
            </Link>
            <Link to="/ai-chat" className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white shadow">
              <Bot size={20} />
            </Link>
          </div>
        </header>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main className={`flex-1 w-full max-w-6xl mx-auto md:px-4 ${(!hideTopBar && !isAskPage) ? 'pt-20 md:pt-6' : 'pt-0 md:pt-6'} pb-24 md:pb-8 transition-all`}>
        {children}
      </main>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      {!hideBottomBar && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border-t border-gray-100 dark:border-dark-border px-6 py-2 z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end">
            <MobileNavItem to="/" icon={<Home size={24} />} label="Trang chủ" active={path === '/'} />
            <MobileNavItem to="/games" icon={<Gamepad2 size={24} />} label="Bé chơi" active={path === '/games'} />

            <div className="relative -top-6">
              <Link to="/ask" className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-primary to-[#26A69A] rounded-full text-white shadow-xl ring-4 ring-white dark:ring-dark-bg active:scale-95 transition-transform">
                <Plus size={28} />
              </Link>
            </div>

            <MobileNavItem
              to="/messages"
              icon={
                <div className="relative">
                  <MessageCircle size={24} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-card"></span>
                  )}
                </div>
              }
              label="Tin nhắn"
              active={path.startsWith('/messages')}
            />

            <MobileNavItem to="/profile" icon={<UserIcon size={24} />} label="Cá nhân" active={path === '/profile'} />
          </div>
        </div>
      )}

      {/* ================= DESKTOP FOOTER ================= */}
      {!hideBottomBar && !isNotificationPage && !isExpertReg && !isAiChat && !isQuestionDetail && !isGameZone && (
        <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border pt-16 pb-8 text-sm hidden md:block mt-10 transition-colors">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

              {/* Cột 1 */}
              <div className="space-y-4">
                <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-2">
                  <span className="bg-gradient-to-tr from-primary to-secondary p-1.5 rounded-xl text-white shadow-sm text-lg">👶</span>
                  Asking.vn
                </Link>
                <p className="text-gray-500 leading-relaxed text-sm">
                  Cộng đồng Mẹ & Bé văn minh, hiện đại. Nơi kết nối hàng triệu bà mẹ Việt Nam cùng đội ngũ chuyên gia  hàng đầu.
                </p>
                <div className="space-y-3 text-gray-500 pt-2 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>107. Bạch Năng Thi, P. Tân Hưng, Tp.Hải Phòng</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-primary" />
                    <span>0912.434.666</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-primary" />
                    <span>hotro@asking.vn</span>
                  </div>
                </div>
              </div>

              {/* Cột 2 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-5">Về Asking.vn</h4>
                <ul className="space-y-3 text-gray-500 dark:text-gray-400">
                  <li><Link to="/about" className="hover:text-primary transition-colors">Giới thiệu chung</Link></li>
                  <li><Link to="/expert-register" className="hover:text-primary transition-colors flex items-center gap-1">Đăng ký Chuyên gia <ShieldCheck size={14} className="text-blue-500"/></Link></li>
                  <li><Link to="/blog" className="hover:text-primary transition-colors">Góc chuyên gia</Link></li>
                </ul>
              </div>

              {/* Cột 3 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-5">Hỗ trợ & Chính sách</h4>
                <ul className="space-y-3 text-gray-500 dark:text-gray-400">
                  <li><Link to="/terms" className="hover:text-primary transition-colors">Điều khoản sử dụng</Link></li>
                  <li><Link to="/privacy" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
                  <li><Link to="/contact" className="hover:text-primary transition-colors">Liên hệ báo cáo</Link></li>
                  <li><a href="/faq" className="hover:text-primary transition-colors">Câu hỏi thường gặp</a></li>
                </ul>
              </div>

              {/* Cột 4 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-5">Kết nối với chúng tôi</h4>
                <div className="flex gap-3 mb-8">
                  <SocialIcon color="text-blue-600 bg-blue-50 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-slate-600" icon={<Facebook size={18} />} />
                  <SocialIcon color="text-pink-600 bg-pink-50 dark:bg-slate-700 hover:bg-pink-100 dark:hover:bg-slate-600" icon={<Instagram size={18} />} />
                  <SocialIcon color="text-red-600 bg-red-50 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-slate-600" icon={<Youtube size={18} />} />
                </div>

                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3">Phiên bản</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-3 shadow-sm">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                      </span>
                      <span className="font-bold text-yellow-800 dark:text-yellow-500 text-xs uppercase tracking-wide">Beta Testing</span>
                   </div>
                   <p className="text-[11px] text-yellow-800/80 dark:text-yellow-500/80 leading-relaxed">
                      Mạng xã hội đang hoạt động thử nghiệm và chờ giấy phép chính thức.
                   </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-dark-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
              <p>© 2024 Asking.vn - Bản quyền thuộc về Asking Việt Nam.</p>
              <div className="flex items-center gap-1">
                Made with <Heart size={12} className="text-red-500 fill-red-500" /> by Asking Team
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

/* ================= HELPER COMPONENTS ================= */

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link 
    to={to} 
    className={`px-4 py-2 rounded-full transition-all ${active ? 'bg-primary/10 text-primary font-bold' : 'text-textGray dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-700'}`}
  >
    {label}
  </Link>
);

const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className="flex flex-col items-center gap-1 min-w-[60px] active:scale-95 transition-transform group">
    <div className={`p-1.5 rounded-xl transition-colors ${active ? 'text-primary' : 'text-gray-400 group-hover:text-textDark dark:group-hover:text-white'}`}>
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
  <a href="#" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${color}`}>
    {icon}
  </a>
);
