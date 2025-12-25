import React, { memo } from 'react';
import { LayoutGrid, HelpCircle, BookOpen, FileText, User as UserIcon } from 'lucide-react';

interface SearchTabsProps {
    activeTab: string;
    onChange: (tab: string) => void;
    counts: {
        questions: number;
        blogs: number;
        docs: number;
        users: number;
    }
}

export const SearchTabs = memo(({ activeTab, onChange, counts }: SearchTabsProps) => {
  const tabs = [
    { id: 'all', label: 'Tất cả', icon: LayoutGrid },
    { id: 'questions', label: 'Câu hỏi', icon: HelpCircle, count: counts.questions },
    { id: 'blogs', label: 'Bài viết', icon: BookOpen, count: counts.blogs },
    { id: 'docs', label: 'Tài liệu', icon: FileText, count: counts.docs },
    { id: 'users', label: 'Mọi người', icon: UserIcon, count: counts.users },
  ];
  
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-0 mb-4 border-b border-gray-100 dark:border-dark-border pb-2">
      {tabs.map(tab => (
        <button 
            key={tab.id} 
            onClick={() => onChange(tab.id)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-black dark:bg-primary text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-500 dark:text-dark-muted border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700'}`}
        >
          <tab.icon size={14} /> 
          {tab.label} 
          {(tab.count || 0) > 0 && <span className="ml-1 opacity-80 text-[10px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
});