
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const unsub = subscribeToAdConfig(setConfig);
    return () => unsub();
  }, []);

  if (!config || !config.isEnabled) return null;

  // DEV MODE PREVIEW
  const isDev = window.location.hostname === 'localhost';

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

  if (config.provider === 'adsense') {
      if (isDev || !config.adsenseClientId) {
          return (
              <div className={`my-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-6 text-gray-400 font-bold text-sm ${className} min-h-[100px]`}>
                  {debugLabel} (AdSense Placeholder)
              </div>
          );
      }

      // In a real implementation, you would use a useEffect to push to adsbygoogle here
      // This is a simplified version
      return (
        <div className={`my-4 overflow-hidden ${className}`}>
             <div className="bg-gray-50 border border-gray-100 p-2 text-center text-xs text-gray-400">
                 Google AdSense Space ({slot || config.adsenseSlotId})
             </div>
        </div>
      );
  }

  return null;
};
