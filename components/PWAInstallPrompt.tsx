
import React, { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Handle Android/Desktop Install Prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a small delay for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    };

    // Handle App Installed Event
    const installedHandler = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // Show iOS prompt logic (if not standalone)
    if (isIosDevice) {
       // Check if we've shown it recently to avoid annoyance
       const hasShown = localStorage.getItem('iosInstallPromptShown');
       const lastShownTime = hasShown ? parseInt(hasShown, 10) : 0;
       const now = Date.now();
       
       // Show again after 24 hours if dismissed
       if (!hasShown || (now - lastShownTime > 24 * 60 * 60 * 1000)) {
         setTimeout(() => setShowPrompt(true), 3000);
       }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
        localStorage.setItem('iosInstallPromptShown', Date.now().toString());
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-safe-bottom animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-5 md:max-w-md md:mx-auto md:mb-4 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/20 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
        
        <button 
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full transition-colors"
        >
            <X size={18} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-[#26A69A] flex items-center justify-center text-white shadow-lg shrink-0 border border-white/20">
             <Smartphone size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-textDark text-lg leading-tight mb-1">Cài đặt Ứng dụng</h3>
            <p className="text-sm text-textGray leading-snug mb-3">
              Thêm <strong>Asking.vn</strong> vào màn hình chính để truy cập nhanh và mượt mà hơn.
            </p>
            
            {isIOS ? (
              <div className="text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="flex items-center gap-2 mb-2 text-textDark font-medium">
                  1. Nhấn nút <Share size={16} className="text-blue-500" /> bên dưới
                </p>
                <p className="flex items-center gap-2 text-textDark font-medium">
                  2. Chọn <span className="inline-flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-700 font-bold"><PlusSquare size={14} /> Thêm vào MH chính</span>
                </p>
              </div>
            ) : (
              <button 
                onClick={handleInstallClick}
                className="w-full bg-textDark hover:bg-black text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
