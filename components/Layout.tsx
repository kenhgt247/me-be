import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Bỏ @ts-ignore nếu đã cài @types
import {
  Home,
  Plus,
  Gamepad2,
  User as UserIcon,
  Bell,
  MessageCircle,
  Bot,
  Heart
} from 'lucide-react';

// Import đúng từ các file service đã sửa
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
    // Khai báo biến cleanup để quản lý listener
    let unsubNotif: (() => void) | null = null;
    let unsubUnread: (() => void) | null = null;
    let presenceInterval: any = null;

    // Hàm dọn dẹp chung
    const cleanUpSubscriptions = () => {
      if (unsubNotif) { unsubNotif(); unsubNotif = null; }
      if (unsubUnread) { unsubUnread(); unsubUnread = null; }
      if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      // Luôn dọn dẹp listener cũ mỗi khi trạng thái auth thay đổi
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
        }, 2 * 60 * 1000); // 2 phút update 1 lần

        // Xử lý khi tắt tab
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

        // Cleanup riêng cho sự kiện window
        return () => {
           window.removeEventListener('beforeunload', handleUnload);
        };
      } else {
        // --- LOGOUT ---
        // Đã gọi cleanUpSubscriptions() ở đầu hàm nên không lo leak memory
        setUnreadNotifCount(0);
        setUnreadMsgCount(0);
        setCurrentUserAvatar(
          'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'
        );
      }
    });

    // Cleanup khi component unmount
    return () => {
      cleanUpSubscriptions();
      updateUserStatus(auth.currentUser?.uid || '', false); // Cố gắng set offline nếu có thể
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

            <Link to="/ai-chat" className="mx-2 bg-gradient-to-tr from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold shadow">
              <Bot size={18} /> Trợ lý AI
            </Link>

            {/* Dark Mode Toggle */}
            <div className="px-1"><ThemeToggle /></div>

            <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-primary transition-colors">
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
        <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b dark:border-dark-border px-4 py-2 flex justify-between items-center shadow-sm">
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
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border-t dark:border-dark-border px-6 py-2 z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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

      {/* ================= FOOTER (DESKTOP) ================= */}
      {!hideBottomBar && !isNotificationPage && !isExpertReg && !isAiChat && !isQuestionDetail && !isGameZone && (
        <footer className="hidden md:block bg-white dark:bg-dark-card border-t dark:border-dark-border pt-16 pb-8 mt-10 text-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="border-t border-gray-100 dark:border-dark-border pt-8 flex justify-between items-center text-xs text-gray-400">
              <p>© 2024 Asking.vn</p>
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

/* ================= HELPERS ================= */

const NavLink: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    className={`px-4 py-2 rounded-full transition-all ${
      active
        ? 'bg-primary/10 text-primary font-bold'
        : 'text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800'
    }`}
  >
    {label}
  </Link>
);

const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className="flex flex-col items-center gap-1 min-w-[60px] active:scale-95 transition-transform">
    <div className={`p-1.5 rounded-xl ${active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
      {/* Clone element để truyền props màu sắc nếu cần, hoặc để nguyên */}
      {icon}
    </div>
    <span className={`text-[10px] font-bold ${active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
      {label}
    </span>
  </Link>
);
