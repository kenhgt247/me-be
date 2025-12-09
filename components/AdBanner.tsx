
import React, { useEffect, useState, useRef } from 'react';
import { AdConfig } from '../types';
import { subscribeToAdConfig } from '../services/ads';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
  debugLabel?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slot, format = 'auto', className = '', debugLabel = 'Quảng cáo' }) => {
  const [config, setConfig] = useState<AdConfig | null>(null);
  const adRef = useRef<HTMLDivElement>(null);
  // Dùng ref để đảm bảo chỉ push 1 lần cho mỗi lần mount component
  const pushedRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeToAdConfig(setConfig);
    return () => unsub();
  }, []);

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    // Logic kích hoạt AdSense
    if (config?.isEnabled && config.provider === 'adsense' && !isDev) {
        // Chỉ push nếu ref tồn tại (đã render thẻ ins) và chưa push lần nào
        if (adRef.current && !pushedRef.current) {
            try {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                pushedRef.current = true;
            } catch (e) {
                console.error("AdSense Push Error:", e);
            }
        }
    }
  }, [config, isDev]);

  // Nếu chưa có config hoặc đã tắt quảng cáo -> không hiện gì
  if (!config || !config.isEnabled) return null;

  // --- TRƯỜNG HỢP 1: BANNER TÙY CHỈNH ---
  if (config.provider === 'custom' && config.customBannerUrl) {
      return (
          <div className={`my-4 overflow-hidden rounded-xl shadow-sm border border-gray-100 ${className}`}>
              <a href={config.customTargetUrl || '#'} target="_blank" rel="noopener noreferrer" className="block relative group">
                  <img src={config.customBannerUrl} className="w-full h-auto object-cover" alt="Advertisement" />
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Ad</span>
              </a>
          </div>
      );
  }

  // --- TRƯỜNG HỢP 2: GOOGLE ADSENSE ---
  if (config.provider === 'adsense') {
      // Nếu đang ở localhost hoặc chưa nhập Publisher ID -> Hiện Placeholder
      if (isDev || !config.adsenseClientId) {
          return (
              <div className={`my-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-6 text-gray-400 font-bold text-sm ${className} min-h-[100px]`}>
                  {debugLabel} (AdSense Placeholder - Mode Dev)
                  <br/>
                  <span className="text-xs font-normal mt-1">Slot: {slot || config.adsenseSlotId || 'Chưa cấu hình'}</span>
              </div>
          );
      }

      // Render thẻ quảng cáo thật
      return (
        <div className={`my-4 overflow-hidden text-center ${className}`}>
             <div ref={adRef}>
                 <ins className="adsbygoogle"
                      style={{ display: 'block' }}
                      data-ad-client={config.adsenseClientId}
                      data-ad-slot={slot || config.adsenseSlotId}
                      data-ad-format={format}
                      data-full-width-responsive="true"></ins>
             </div>
        </div>
      );
  }

  return null;
};
