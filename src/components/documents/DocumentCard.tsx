import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Star, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { Document } from '../../types';

interface DocumentCardProps {
  doc: Document;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => {
  return (
    <Link to={`/documents/${doc.slug}`} className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none hover:shadow-xl transition-all flex gap-4 items-start group active:scale-[0.98] hover:-translate-y-1 h-full">
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform shadow-inner ${doc.isExternal ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-green-50 dark:bg-green-900/20'}`}>
        {doc.isExternal ? <LinkIcon /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'docx' ? '📝' : '📄')}
      </div>
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors leading-snug">{doc.title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-3">{doc.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-auto uppercase tracking-wide">
          <span className="flex items-center gap-1"><Download size={12}/> {doc.downloads}</span>
          <span className="flex items-center gap-1 text-yellow-500"><Star size={12} className="fill-yellow-500"/> {doc.rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="self-center p-1 text-gray-300 dark:text-slate-600 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors"><ChevronRight size={20} /></div>
    </Link>
  );
};