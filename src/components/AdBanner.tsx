import React, { useEffect, useState } from 'react';
import { AdConfig, AdCampaign, AdPlacement } from '../types';
import { subscribeToAdConfig } from '../services/ads';
import { getRandomAd } from '../utils/adUtils';
import { ExternalLink } from 'lucide-react';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
  debugLabel?: string;
  placement?: AdPlacement;
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  slot, 
  format = 'auto', 
  className = '', 
  debugLabel = 'Quảng cáo',
  placement = 'home'
}) => {
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [customAd, setCustomAd] = useState<AdCampaign | null>(null);
  
  useEffect(() => {
    const unsub = subscribeToAdConfig(setConfig);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (config?.isEnabled && config.provider === 'custom') {
      getRandomAd(placement).then(setCustomAd);
    }
  }, [config, placement]);

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const activeSlotId = slot || config?.adsenseSlotId;
  const activeClientId = config?.adsenseClientId;

  useEffect(() => {
    if (config?.isEnabled && config.provider === 'adsense' && !isDev && activeClientId && activeSlotId) {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Push Error:", e);
        }
    }
  }, [config, isDev, activeClientId, activeSlotId]); 

  if (!config || !config.isEnabled) return null;

  // --- CUSTOM BANNER (RANDOM) ---
  if (config.provider === 'custom') {
      if (!customAd) return null;
      return (
          <div className={`my-4 w-full overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white dark:bg-dark-card dark:border-dark-border relative group ${className}`}>
              <a href={customAd.link} target="_blank" rel="noopener noreferrer" className="block relative">
                  {customAd.imageUrl ? (
                    <img src={customAd.imageUrl} className="w-full h-auto object-cover max-h-[300px]" alt={customAd.title} />
                  ) : (
                    <div className="p-6 flex flex-col items-center justify-center text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 min-h-[120px]">
                       <h3 className="font-bold text-gray-900 dark:text-white text-lg">{customAd.title}</h3>
                       {customAd.description && <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{customAd.description}</p>}
                       <span className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          {customAd.ctaText || 'Xem ngay'} <ExternalLink size={12}/>
                       </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                     <span className="bg-white/90 dark:bg-black/60 text-gray-500 dark:text-gray-300 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-medium backdrop-blur-sm">{customAd.sponsorName || 'Tài trợ'}</span>
                     <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold backdrop-blur-sm">Ad</span>
                  </div>
              </a>
          </div>
      );
  }

  // --- GOOGLE ADSENSE ---
  if (config.provider === 'adsense') {
      if (isDev || !activeClientId || !activeSlotId) {
          return (
              <div className={`my-4 w-full bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-4 text-gray-400 text-center ${className}`} style={{ minHeight: '120px' }}>
                  <span className="font-bold text-sm uppercase mb-1">{debugLabel}</span>
                  <span className="text-xs">(AdSense Placeholder)</span>
              </div>
          );
      }
      return (
        <div className={`my-4 w-full overflow-hidden text-center flex justify-center ${className}`} style={{ minHeight: '250px' }}>
             <ins key={activeSlotId} className="adsbygoogle" style={{ display: 'block', minWidth: '300px', width: '100%' }} data-ad-client={activeClientId} data-ad-slot={activeSlotId} data-ad-format={format} data-full-width-responsive="true"></ins>
        </div>
      );
  }

  return null;
};