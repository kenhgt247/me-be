import React, { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra nếu đã ở chế độ App (Standalone) thì không hiện nữa
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 2. Kiểm tra nếu người dùng đã tắt prompt trong vòng 24h qua
    const dismissedAt = localStorage.getItem('pwaPromptDismissed');
    if (dismissedAt) {
      const isRecentlyDismissed = Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000;
      if (isRecentlyDismissed) return;
    }

    // 3. Xử lý logic cho Android & Desktop (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Hiển thị sau 5 giây để người dùng kịp nhìn qua nội dung trang web
      setTimeout(() => setShowPrompt(true), 5000);
    };

    // 4. Xử lý logic cho iOS (Safari không hỗ trợ beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Tự động ẩn khi đã cài đặt thành công
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    // Lưu thời điểm tắt để 24h sau mới hiện lại
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe-bottom animate-in fade-in slide-in-from-bottom duration-500">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-800 p-5 md:max-w-md md:mx-auto relative overflow-hidden">
        
        {/* Nút đóng */}
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-4">
          {/* App Icon Mockup */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#26A69A] to-[#4DB6AC] flex items-center justify-center text-white shadow-lg shrink-0 border border-white/20">
            <Smartphone size={28} />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1">
              Cài đặt Asking.vn
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug mb-4">
              Trải nghiệm mượt mà, truy cập nhanh từ màn hình chính và tiết kiệm dữ liệu.
            </p>
            
            {isIOS ? (
              /* Hướng dẫn riêng cho iOS */
              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <p className="flex items-center gap-2 mb-2 text-blue-900 dark:text-blue-200 font-medium">
                  1. Nhấn nút <Share size={16} className="text-blue-500" /> ở thanh menu Safari
                </p>
                <p className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-medium">
                  2. Chọn <span className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-[11px] font-bold">
                    <PlusSquare size={12} /> Thêm vào MH chính
                  </span>
                </p>
              </div>
            ) : (
              /* Nút cài đặt cho Android/PC */
              <button 
                onClick={handleInstallClick}
                className="w-full bg-[#26A69A] hover:bg-[#1f8c82] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Cài đặt ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
