import React, { useEffect, useState } from 'react';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { AdCampaign } from '../../types';
import { getRandomAd } from '../../utils/adUtils';

export const FeedAd = () => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    getRandomAd('home').then(setAd);
  }, []);

  if (!ad) return null;

  return (
    <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block group mb-4">
      <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-dark-border hover:border-yellow-400 transition-all relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-[10px] font-bold text-yellow-700">Ad</div>
                <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{ad.sponsorName}<span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded ml-1 text-[9px]">Sponsored</span></p>
                    <p className="text-[10px] text-gray-400">Gợi ý cho bạn</p>
                </div>
            </div>
            <MoreHorizontal size={16} className="text-gray-300"/>
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{ad.title}</h3>
        {ad.imageUrl && <img src={ad.imageUrl} className="w-full h-48 object-cover rounded-xl mb-3 bg-gray-50" loading="lazy" alt={ad.title} />}
        <button className="w-full bg-blue-50 text-blue-600 font-bold py-2 rounded-xl text-xs flex justify-center items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-all">
            {ad.ctaText || 'Xem ngay'} <ExternalLink size={12}/>
        </button>
      </div>
    </a>
  );
};