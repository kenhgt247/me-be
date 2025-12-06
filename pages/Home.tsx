
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MessageCircle, Heart, ChevronDown, ChevronUp, HelpCircle, Clock, Flame, MessageSquareOff, ShieldCheck, ChevronRight } from 'lucide-react';
import { Question } from '../types';

interface HomeProps {
  questions: Question[];
  categories: string[];
}

export const Home: React.FC<HomeProps> = ({ questions, categories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');

  // Filter & Sort Logic
  let displayQuestions = activeCategory === 'Tất cả' 
    ? [...questions] 
    : questions.filter(q => q.category === activeCategory);

  switch (viewFilter) {
    case 'newest':
      displayQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'active':
      displayQuestions.sort((a, b) => {
        const scoreA = a.answers.length * 2 + a.likes;
        const scoreB = b.answers.length * 2 + b.likes;
        return scoreB - scoreA;
      });
      break;
    case 'unanswered':
      displayQuestions = displayQuestions.filter(q => q.answers.length === 0);
      displayQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  const CATEGORY_LIMIT = 5;
  const visibleCategories = showAllCategories ? categories : categories.slice(0, CATEGORY_LIMIT);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero / Search Section - Full Bleed on Mobile */}
      <div className="bg-gradient-to-br from-primary to-[#26A69A] rounded-b-[2.5rem] md:rounded-3xl p-6 md:p-10 text-white shadow-lg shadow-primary/20 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-400 opacity-10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Mẹ đang thắc mắc điều gì?</h1>
              <p className="opacity-90 text-sm md:text-base font-medium">Cùng hơn 10,000 mẹ bỉm sữa chia sẻ kinh nghiệm.</p>
            </div>
            
            {/* Integrated Expert Registration Button & Text */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <Link 
                to="/expert-register"
                className="group flex items-center gap-2 bg-white/10 hover:bg-white backdrop-blur-md border border-white/30 hover:border-white px-4 py-2.5 rounded-full transition-all shadow-sm w-fit"
              >
                <div className="bg-white/20 group-hover:bg-blue-100 p-1 rounded-full transition-colors">
                  <ShieldCheck size={16} className="text-white group-hover:text-blue-600" />
                </div>
                <span className="text-xs md:text-sm font-bold text-white group-hover:text-blue-600">Đăng ký Chuyên gia</span>
              </Link>
              <p className="text-[10px] md:text-xs text-blue-50/90 font-medium max-w-[240px] md:text-right leading-snug">
                Xây dựng thương hiệu & Lan tỏa giá trị cộng đồng
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Tìm kiếm câu hỏi (vd: bé ăn dặm)..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-textDark bg-white/95 backdrop-blur shadow-lg shadow-teal-900/10 focus:outline-none focus:ring-4 focus:ring-white/30 placeholder-gray-400 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 md:px-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg text-textDark">Chủ đề quan tâm</h2>
          
          {/* Desktop Toggle Button */}
          <div className="hidden md:block">
            {categories.length > CATEGORY_LIMIT && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-xs font-semibold text-primary flex items-center gap-1 active:opacity-60"
              >
                {showAllCategories ? 'Thu gọn' : 'Xem thêm'}
                {showAllCategories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile: Horizontal Scroll View (Premium App Feel) */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2.5 pb-2 after:content-[''] after:w-4 after:shrink-0">
          <button 
            onClick={() => setActiveCategory('Tất cả')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${activeCategory === 'Tất cả' ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-white text-textGray border border-gray-100'}`}
          >
            Tất cả
          </button>
          
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${activeCategory === cat ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-white text-textGray border border-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Desktop: Wrapped View */}
        <div className="hidden md:flex flex-wrap gap-2.5">
          <button 
            onClick={() => setActiveCategory('Tất cả')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${activeCategory === 'Tất cả' ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-white text-textGray border border-gray-100 hover:bg-gray-50'}`}
          >
            Tất cả
          </button>
          
          {visibleCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${activeCategory === cat ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-white text-textGray border border-gray-100 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Question Feed */}
      <div className="px-4 md:px-0">
        {/* Scrollable Tabs Container - Edge to Edge Scroll with Padding */}
        <div className="-mx-4 px-4 overflow-x-auto no-scrollbar mb-4 after:content-[''] after:w-4 after:shrink-0">
          <div className="flex items-center gap-2 md:gap-6 min-w-max">
            <button 
              onClick={() => setViewFilter('newest')}
              className={`flex items-center gap-2 whitespace-nowrap text-sm md:text-base font-bold px-4 py-2 rounded-full transition-all border ${
                viewFilter === 'newest' 
                ? 'bg-textDark text-white border-textDark shadow-md' 
                : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <Clock size={16} />
              Mới nhất
            </button>

            <button 
              onClick={() => setViewFilter('active')}
              className={`flex items-center gap-2 whitespace-nowrap text-sm md:text-base font-bold px-4 py-2 rounded-full transition-all border ${
                viewFilter === 'active' 
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200' 
                : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <Flame size={16} />
              Sôi nổi
            </button>
            
            <button 
              onClick={() => setViewFilter('unanswered')}
              className={`flex items-center gap-2 whitespace-nowrap text-sm md:text-base font-bold px-4 py-2 rounded-full transition-all border ${
                viewFilter === 'unanswered' 
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              <MessageSquareOff size={16} />
              Chưa trả lời
            </button>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {displayQuestions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 mx-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                <HelpCircle size={32} />
              </div>
              <p className="text-textGray font-medium">Chưa có câu hỏi nào trong mục này.</p>
            </div>
          )}

          {displayQuestions.map(q => (
            <Link to={`/question/${q.id}`} key={q.id} className="block group">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/50 hover:border-secondary hover:shadow-lg transition-all active:scale-[0.99]">
                <div className="flex items-start justify-between mb-3">
                  <span className="bg-secondary/20 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">{q.category}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <h3 className="text-[17px] font-bold text-textDark mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">{q.title}</h3>
                <p className="text-textGray text-sm line-clamp-2 mb-4 font-normal leading-relaxed">{q.content}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden ring-2 ring-white shadow-sm">
                      <img src={q.author.avatar} alt={q.author.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold text-textGray/80">{q.author.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><Heart size={15} /> {q.likes}</span>
                    <span className={`flex items-center gap-1.5 ${q.answers.length === 0 ? 'text-accent font-bold' : ''}`}>
                      <MessageCircle size={15} /> 
                      {q.answers.length === 0 ? 'Giúp mẹ ấy' : `${q.answers.length}`}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
