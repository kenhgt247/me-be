import React, { useEffect, useState } from 'react';
import { Megaphone, MousePointerClick, Sparkles } from 'lucide-react';
import { AdCampaign } from '../../types';
import { getRandomAd } from '../../utils/adUtils';

interface Props {
  variant?: 'gradient' | 'minimal';
}

export const SidebarAd = ({ variant = 'gradient' }: Props) => {
  const [ad, setAd] = useState<AdCampaign | null>(null);

  useEffect(() => {
    getRandomAd('sidebar').then(setAd);
  }, []);

  if (!ad) return null;

  // Style Gradient (Cho Blog)
  if (variant === 'gradient') {
    return (
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${ad.gradient || 'from-indigo-500 to-purple-600'} p-6 text-white shadow-lg text-center animate-fade-in`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col items-center">
          <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-3 border border-white/20">Quảng cáo</span>
          <Megaphone size={32} className="mb-3 animate-bounce" />
          <h4 className="font-bold text-lg mb-1">{ad.title}</h4>
          <p className="text-xs text-white/90 mb-4 px-2 line-clamp-2">{ad.description}</p>
          <a href={ad.link} target="_blank" rel="noopener noreferrer" className="bg-white text-gray-900 px-6 py-2 rounded-full text-xs font-bold hover:bg-opacity-90 transition-colors w-full shadow-sm block">
            {ad.ctaText || 'Xem ngay'}
          </a>
        </div>
      </div>
    );
  }

  // Style Minimal (Cho Document)
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm dark:shadow-none p-5 animate-fade-in relative overflow-hidden group hover:shadow-md transition-all">
       <div className="absolute top-0 right-0 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-bl-lg font-bold tracking-wider">AD</div>
       <a href={ad.link} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-4">
         <div className="flex gap-4 items-start">
           <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-slate-800 shrink-0 overflow-hidden border border-gray-100 dark:border-slate-700 flex items-center justify-center">
             {ad.imageUrl ? <img src={ad.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="ad" /> : <span className="text-3xl">🎁</span>}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-0.5 flex items-center gap-1"><Sparkles size={10} /> {ad.sponsorName}</p>
             <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{ad.title}</h4>
             <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-snug">{ad.description}</p>
           </div>
         </div>
         <button className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
            {ad.ctaText || 'Xem ngay'} <MousePointerClick size={14}/>
         </button>
       </a>
    </div>
  );
};