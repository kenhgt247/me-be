import React, { useEffect, useState } from 'react';
import { AdConfig } from '../types';
import { subscribeToAdConfig } from '../services/ads';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
  debugLabel?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  slot, 
  format = 'auto', 
  className = '', 
  debugLabel = 'Quảng cáo' 
}) => {
  const [config, setConfig] = useState<AdConfig | null>(null);
  
  // 1. Lắng nghe cấu hình từ Firebase Realtime
  useEffect(() => {
    const unsub = subscribeToAdConfig(setConfig);
    return () => unsub();
  }, []);

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Xác định Slot ID: Ưu tiên props truyền vào, nếu không có thì lấy từ config chung
  const activeSlotId = slot || config?.adsenseSlotId;
  const activeClientId = config?.adsenseClientId;

  // 2. Logic kích hoạt AdSense (Push Script)
  useEffect(() => {
    // Chỉ chạy lệnh push khi:
    // - Đã có config và đang bật
    // - Provider là 'adsense'
    // - Không phải môi trường Dev
    // - Có đầy đủ Client ID và Slot ID
    if (config?.isEnabled && config.provider === 'adsense' && !isDev && activeClientId && activeSlotId) {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Push Error:", e);
        }
    }
  }, [config, isDev, activeClientId, activeSlotId]); 

  // Nếu chưa có config hoặc tính năng quảng cáo bị tắt -> Không hiển thị gì
  if (!config || !config.isEnabled) return null;

  // --- TRƯỜNG HỢP 1: BANNER TÙY CHỈNH (CUSTOM IMAGE) ---
  if (config.provider === 'custom' && config.customBannerUrl) {
      return (
          <div className={`my-4 w-full overflow-hidden rounded-xl shadow-sm border border-gray-100 ${className}`}>
              <a 
                href={config.customTargetUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block relative group"
              >
                  <img 
                    src={config.customBannerUrl} 
                    className="w-full h-auto object-cover max-h-[300px]" 
                    alt="Advertisement" 
                  />
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold backdrop-blur-sm">
                    Ad
                  </span>
              </a>
          </div>
      );
  }

  // --- TRƯỜNG HỢP 2: GOOGLE ADSENSE ---
  if (config.provider === 'adsense') {
      // Chế độ Dev hoặc chưa cấu hình ID -> Hiển thị khung giả lập (Placeholder)
      if (isDev || !activeClientId || !activeSlotId) {
          return (
              <div className={`my-4 w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4 text-gray-400 text-center ${className}`} style={{ minHeight: '120px' }}>
                  <span className="font-bold text-sm uppercase mb-1">{debugLabel}</span>
                  <span className="text-xs">(Placeholder Mode - Localhost)</span>
                  <div className="mt-2 text-[10px] bg-gray-200 px-2 py-1 rounded text-gray-600 font-mono">
                    Client: {activeClientId || 'Missing'}<br/>
                    Slot: {activeSlotId || 'Missing'}
                  </div>
              </div>
          );
      }

      // Render Quảng cáo thật
      // Lưu ý: key={activeSlotId} giúp React reset component khi đổi slot, đảm bảo quảng cáo mới được load.
      return (
        <div className={`my-4 w-full overflow-hidden text-center flex justify-center ${className}`} style={{ minHeight: '250px' }}>
             <ins 
                  key={activeSlotId} 
                  className="adsbygoogle"
                  style={{ display: 'block', minWidth: '300px', width: '100%' }}
                  data-ad-client={activeClientId}
                  data-ad-slot={activeSlotId}
                  data-ad-format={format}
                  data-full-width-responsive="true"
             ></ins>
        </div>
      );
  }

  return null;
};
