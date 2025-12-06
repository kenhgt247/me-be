import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Gamepad2, Heart, Facebook, Instagram, Youtube, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isQuestionDetail = location.pathname.startsWith('/question/');
  const isGameZone = location.pathname === '/games';
  const isStaticPage = ['/about', '/terms', '/privacy', '/contact'].includes(location.pathname);

  const isActive = (path: string) => location.pathname === path ? 'text-primary' : 'text-textGray';

  return (
    <div className="min-h-screen font-sans text-textDark bg-cream flex flex-col pt-safe-top">
      {/* Desktop Header */}
      <header className="hidden md:block bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary flex items-center gap-2 select-none">
            <span className="bg-secondary p-2 rounded-xl">👶</span>
            Asking.vn
          </Link>
          
          <nav className="flex items-center gap-8 font-medium text-lg">
            <Link to="/" className={`hover:text-primary transition-colors ${isActive('/')}`}>Trang chủ</Link>
            <Link to="/games" className={`hover:text-primary transition-colors ${isActive('/games')}`}>Góc Bé Chơi</Link>
            <Link to="/ask" className="bg-primary text-white px-6 py-2 rounded-full hover:bg-opacity-90 transition-all shadow-md active:scale-95 select-none">
              Đặt câu hỏi
            </Link>
            <Link to="/profile" className={`hover:text-primary transition-colors ${isActive('/profile')}`}>Tài khoản</Link>
          </nav>
        </div>
      </header>

      {/* Mobile Header (Logo only) */}
      {!isQuestionDetail && !isGameZone && !isStaticPage && (
        <header className="md:hidden bg-white/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-sm flex justify-between items-center select-none">
          <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="bg-secondary p-1.5 rounded-lg text-sm">👶</span>
            Asking.vn
          </Link>
          <Link to="/profile" className="w-8 h-8 rounded-full bg-secondary overflow-hidden border border-gray-100">
            <img src="https://picsum.photos/100/100" alt="Avatar" className="w-full h-full object-cover" />
          </Link>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full max-w-5xl mx-auto md:px-4 py-0 md:py-4 ${isQuestionDetail ? 'mb-0' : 'mb-24'} md:mb-0`}>
        {children}
      </main>

      {/* Footer */}
      {!isQuestionDetail && (
        <footer className={`bg-white border-t border-gray-100 py-10 px-4 md:px-0 mt-auto ${isGameZone ? 'hidden md:block' : ''} mb-20 md:mb-0`}>
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2 mb-4 select-none">
                  <span className="bg-secondary p-1.5 rounded-lg text-sm">👶</span>
                  Asking.vn
                </Link>
                <p className="text-sm text-textGray leading-relaxed max-w-xs mb-4">
                  Cộng đồng hỏi đáp uy tín dành cho mẹ và bé. Nơi chia sẻ kinh nghiệm, kiến thức nuôi dạy con khoa học và an toàn.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-textGray hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <Facebook size={16} />
                  </a>
                  <a href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-textGray hover:bg-pink-100 hover:text-pink-600 transition-colors">
                    <Instagram size={16} />
                  </a>
                  <a href="#" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-textGray hover:bg-red-100 hover:text-red-600 transition-colors">
                    <Youtube size={16} />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-textDark mb-4">Về chúng tôi</h3>
                <ul className="space-y-2 text-sm text-textGray">
                  <li><Link to="/about" className="hover:text-primary transition-colors">Giới thiệu</Link></li>
                  <li><Link to="/contact" className="hover:text-primary transition-colors">Liên hệ</Link></li>
                  <li><Link to="/expert-register" className="hover:text-primary transition-colors">Đăng ký chuyên gia</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-textDark mb-4">Chính sách</h3>
                <ul className="space-y-2 text-sm text-textGray">
                  <li><Link to="/terms" className="hover:text-primary transition-colors">Điều khoản sử dụng</Link></li>
                  <li><Link to="/privacy" className="hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
                  <li><Link to="/rules" className="hover:text-primary transition-colors">Quy tắc cộng đồng</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-textGray/60">
              <p>© 2024 Asking.vn - Bản quyền thuộc về Mẹ & Bé.</p>
              <p className="flex items-center gap-1">
                Made with <Heart size={12} className="text-red-400 fill-current" /> for Vietnam Families
              </p>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Bottom Navigation - Glassmorphism - Hidden on Question Detail */}
      {!isQuestionDetail && (
        <>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/60 pb-safe-bottom pt-2 px-6 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[calc(60px+env(safe-area-inset-bottom))] select-none">
            <Link to="/" className={`flex flex-col items-center gap-1 w-16 active:scale-95 transition-transform ${isActive('/')}`}>
              <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Trang chủ</span>
            </Link>
            
            <Link to="/ask" className="group relative -top-6 active:scale-95 transition-transform">
              <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-40"></div>
              <div className="relative bg-gradient-to-tr from-primary to-[#26A69A] text-white p-4 rounded-full shadow-xl shadow-primary/30">
                <PlusCircle size={32} />
              </div>
            </Link>
            
            <Link to="/games" className={`flex flex-col items-center gap-1 w-16 active:scale-95 transition-transform ${isActive('/games')}`}>
              <Gamepad2 size={24} strokeWidth={isActive('/games') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Bé Chơi</span>
            </Link>

            <Link to="/profile" className={`flex flex-col items-center gap-1 w-16 active:scale-95 transition-transform ${isActive('/profile')}`}>
              <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Tài khoản</span>
            </Link>
          </nav>
        </>
      )}
    </div>
  );
};