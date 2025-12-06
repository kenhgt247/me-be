
import React, { useState } from 'react';
import { User, Question } from '../types';
import { Settings, ShieldCheck, MapPin, Calendar, Medal, MessageCircle, HelpCircle, Heart, Star, LogOut, Clock, Briefcase, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileProps {
  user: User;
  questions: Question[];
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, questions, onLogout, onOpenAuth }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'answers'>('overview');

  // Calculate Stats
  const userQuestions = questions.filter(q => q.author.id === user.id);
  const userAnswersCount = questions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === user.id).length, 0);
  const bestAnswersCount = questions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === user.id && a.isBestAnswer).length, 0);
  
  // Mock Points Calculation if not present
  const reputationPoints = user.points || (userQuestions.length * 10) + (userAnswersCount * 20) + (bestAnswersCount * 50);

  const handleAuthAction = () => {
    if (user.isGuest) {
      onOpenAuth();
    } else {
      onLogout();
    }
  };

  return (
    <div className="pb-24 md:pb-10 animate-fade-in">
      {/* Cover Image */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-[#2EC4B6] to-[#3B82F6] relative rounded-b-[2rem] md:rounded-3xl shadow-lg shadow-blue-900/10 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors">
            <Settings size={20} />
         </button>
      </div>

      <div className="px-4 max-w-5xl mx-auto">
        {/* Profile Header Info */}
        <div className="relative -mt-12 mb-6 flex flex-col md:flex-row items-center md:items-end gap-4">
          <div className="relative group">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
            />
            {user.isExpert && (
              <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Chuyên gia">
                <ShieldCheck size={16} />
              </div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
             <h1 className="text-2xl font-bold text-textDark flex items-center justify-center md:justify-start gap-2">
               {user.name}
               {user.isExpert && <Badge text="Chuyên gia" color="blue" />}
               {user.isAdmin && <Badge text="Admin" color="red" />}
             </h1>
             
             {/* Expert Pending Status Banner */}
             {user.expertStatus === 'pending' && (
               <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full mt-2 border border-blue-100">
                  <Clock size={12} />
                  Hồ sơ chuyên gia đang chờ duyệt
               </div>
             )}

             <p className="text-textGray text-sm md:text-base mt-2 max-w-md mx-auto md:mx-0">
               {user.bio || "Mẹ bỉm sữa yêu con, thích chia sẻ và học hỏi kinh nghiệm nuôi dạy trẻ."}
             </p>
             
             {user.specialty && (
               <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-sm text-blue-600 font-medium">
                  <Briefcase size={14} /> {user.specialty} {user.workplace && `tại ${user.workplace}`}
               </div>
             )}

             <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-xs text-textGray font-medium">
               <span className="flex items-center gap-1"><MapPin size={14} /> TP. HCM</span>
               <span className="flex items-center gap-1"><Calendar size={14} /> Tham gia T10/2023</span>
             </div>
          </div>

          <button 
            onClick={handleAuthAction}
            className={`hidden md:flex items-center gap-2 px-6 py-2.5 font-bold rounded-full transition-colors ${
               user.isGuest 
               ? 'bg-primary text-white hover:bg-[#25A99C] shadow-md shadow-primary/30' 
               : 'bg-gray-100 hover:bg-gray-200 text-textDark'
            }`}
          >
             <LogOut size={18} /> {user.isGuest ? 'Đăng nhập' : 'Đăng xuất'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard 
            icon={<Star className="text-yellow-500" size={24} />} 
            value={reputationPoints} 
            label="Uy tín" 
            bg="bg-yellow-50"
          />
          <StatCard 
            icon={<HelpCircle className="text-blue-500" size={24} />} 
            value={userQuestions.length} 
            label="Câu hỏi" 
            bg="bg-blue-50"
          />
          <StatCard 
            icon={<MessageCircle className="text-green-500" size={24} />} 
            value={userAnswersCount} 
            label="Trả lời" 
            bg="bg-green-50"
          />
          <StatCard 
            icon={<Medal className="text-purple-500" size={24} />} 
            value={bestAnswersCount} 
            label="Câu hay nhất" 
            bg="bg-purple-50"
          />
        </div>

        {/* Expert Registration Invite for Non-Experts */}
        {!user.isExpert && user.expertStatus !== 'pending' && !user.isGuest && (
           <div className="mb-8 animate-pop-in">
              <Link to="/expert-register" className="block group">
                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                          <ShieldCheck size={24} />
                       </div>
                       <div>
                          <h3 className="font-bold text-textDark text-lg">Trở thành Chuyên gia</h3>
                          <p className="text-sm text-textGray">Xác thực hồ sơ để nhận tích xanh và xây dựng uy tín</p>
                       </div>
                    </div>
                    <div className="bg-white p-2 rounded-full text-blue-500 shadow-sm group-hover:translate-x-1 transition-transform">
                       <ChevronRight size={20} />
                    </div>
                 </div>
              </Link>
           </div>
        )}

        {/* Tabs - Sticky & Scrollable */}
        <div className="sticky top-0 z-30 bg-[#F7F7F5]/95 backdrop-blur-sm -mx-4 px-4 md:mx-0 md:px-0 mb-6 border-b border-gray-100 md:border-none pt-2">
           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 after:content-[''] after:w-4 after:shrink-0">
             <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Tổng quan" />
             <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} label="Câu hỏi của tôi" />
             <TabButton active={activeTab === 'answers'} onClick={() => setActiveTab('answers')} label="Đã trả lời" />
           </div>
        </div>

        {/* Content Area */}
        <div className="animate-fade-in min-h-[300px]">
           {activeTab === 'overview' && (
             <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-textDark mb-4 flex items-center gap-2">
                    <Heart size={20} className="text-red-500" fill="currentColor" /> Chủ đề quan tâm
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['Dinh dưỡng', 'Giáo dục sớm', '0-1 tuổi'].map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-gray-50 text-textGray rounded-lg text-sm font-medium border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-textDark mb-4 ml-1">Hoạt động gần đây</h3>
                  <div className="space-y-4">
                     {/* Mock Activity Feed */}
                     <ActivityItem 
                       action="đã hỏi về" 
                       target="Bé 2 tuổi biếng ăn phải làm sao?" 
                       time="2 giờ trước"
                       type="question"
                     />
                     <ActivityItem 
                       action="đã trả lời trong" 
                       target="Cách tắm nắng cho trẻ sơ sinh" 
                       time="5 giờ trước"
                       type="answer"
                     />
                     <ActivityItem 
                       action="đã thích bài viết" 
                       target="Review bỉm Merries nội địa Nhật" 
                       time="1 ngày trước"
                       type="like"
                     />
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'questions' && (
             <div className="space-y-4">
               {userQuestions.length > 0 ? (
                 userQuestions.map(q => (
                   <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-primary bg-secondary/20 px-2 py-1 rounded-md">{q.category}</span>
                        <span className="text-xs text-textGray">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
                     </div>
                     <h3 className="font-bold text-textDark text-lg mb-2">{q.title}</h3>
                     <div className="flex items-center gap-4 text-sm text-textGray">
                        <span className="flex items-center gap-1"><Heart size={14} /> {q.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={14} /> {q.answers.length}</span>
                     </div>
                   </div>
                 ))
               ) : (
                 <EmptyState message="Bạn chưa đặt câu hỏi nào." />
               )}
             </div>
           )}

           {activeTab === 'answers' && (
             <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <p className="text-textGray">Chức năng đang cập nhật...</p>
             </div>
           )}
        </div>
        
        {/* Mobile Logout Button */}
        <div className="md:hidden mt-8 mb-4">
          <button 
            onClick={handleAuthAction}
            className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
               user.isGuest 
               ? 'bg-primary text-white shadow-lg hover:bg-[#25A99C]' 
               : 'bg-red-50 text-red-500 hover:bg-red-100'
            }`}
          >
            <LogOut size={20} /> {user.isGuest ? 'Đăng nhập' : 'Đăng xuất'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-components for Profile
const Badge: React.FC<{ text: string; color: 'blue' | 'red' }> = ({ text, color }) => {
  const styles = color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600';
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md align-middle ml-2 ${styles}`}>{text}</span>;
};

const StatCard: React.FC<{ icon: React.ReactNode; value: number; label: string; bg: string }> = ({ icon, value, label, bg }) => (
  <div className={`p-4 rounded-2xl ${bg} border border-transparent hover:border-black/5 transition-all flex flex-col items-center justify-center text-center shadow-sm`}>
    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">{icon}</div>
    <span className="text-xl font-bold text-textDark">{value}</span>
    <span className="text-xs text-textGray font-medium">{label}</span>
  </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
      active 
      ? 'bg-textDark text-white shadow-md' 
      : 'bg-white text-textGray border border-gray-100 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);

const ActivityItem: React.FC<{ action: string; target: string; time: string; type: 'question' | 'answer' | 'like' }> = ({ action, target, time, type }) => {
  const icon = type === 'question' ? <HelpCircle size={16} className="text-blue-500" /> : type === 'answer' ? <MessageCircle size={16} className="text-green-500" /> : <Heart size={16} className="text-red-500" />;
  
  return (
    <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-50">
      <div className="mt-1 bg-gray-50 p-2 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-textDark">
          <span className="text-textGray">{action}</span> <span className="font-semibold">"{target}"</span>
        </p>
        <span className="text-xs text-textGray mt-1 block">{time}</span>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
      <HelpCircle size={32} />
    </div>
    <p className="text-textGray font-medium">{message}</p>
  </div>
);
