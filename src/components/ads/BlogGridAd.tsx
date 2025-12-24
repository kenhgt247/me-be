import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AdCampaign } from '../../types';
import { getRandomAd } from '../../utils/adUtils';

export const BlogGridAd = () => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    getRandomAd('blog').then(setAd);
  }, []);

  if (!ad) return null;

  return (
    <a href={ad.link} target="_blank" rel="noopener noreferrer" 
       className="group bg-white dark:bg-dark-card rounded-[1.5rem] overflow-hidden border border-yellow-200 dark:border-yellow-900/50 shadow-md dark:shadow-none hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col h-full relative">
       
      <div className="aspect-video bg-gray-100 dark:bg-slate-700 relative overflow-hidden shrink-0">
        {ad.imageUrl ? (
            <img src={ad.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="advertisement" />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-yellow-50 text-4xl">📢</div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm border border-yellow-300">
            Quảng cáo
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 bg-yellow-50/10 dark:bg-yellow-900/10">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {ad.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 font-normal flex-1">
          {ad.description}
        </p>
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">📢</div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{ad.sponsorName || 'Tài trợ'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-900/30">
            {ad.ctaText || 'Xem ngay'} <ExternalLink size={10} />
          </div>
        </div>
      </div>
    </a>
  );
};