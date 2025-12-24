import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AdCampaign } from '../../types';
import { getRandomAd } from '../../utils/adUtils';

export const DocumentGridAd = () => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    getRandomAd('document').then(setAd);
  }, []);

  if (!ad) return null;

  return (
    <a href={ad.link} target="_blank" rel="noopener noreferrer"
       className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-yellow-200 dark:border-yellow-900/50 shadow-md dark:shadow-none hover:shadow-xl transition-all flex gap-4 items-start group active:scale-[0.98] hover:-translate-y-1 h-full relative overflow-hidden">
       
       <div className="absolute top-0 right-0 bg-yellow-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg z-10 shadow-sm">ADS</div>
       
       <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-sm bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
         {ad.imageUrl ? (
           <img src={ad.imageUrl} className="w-full h-full object-cover" alt="ad" />
         ) : (
           <div className="text-2xl">🎁</div>
         )}
       </div>
       
       <div className="flex-1 min-w-0 flex flex-col h-full">
         <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors leading-snug">
           {ad.title}
         </h3>
         <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
           {ad.description}
         </p>
         <div className="flex items-center justify-between mt-auto">
           <span className="text-[10px] font-bold text-gray-400 uppercase">{ad.sponsorName || 'Tài trợ'}</span>
           <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full flex items-center gap-1 border border-blue-100 dark:border-blue-900/30">
             {ad.ctaText || 'Xem'} <ExternalLink size={10}/>
           </span>
         </div>
       </div>
    </a>
  );
};