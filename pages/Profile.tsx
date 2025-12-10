import React, { useState, useEffect } from 'react';
import { User, Question, toSlug } from '../types';
import { Settings, ShieldCheck, MessageCircle, HelpCircle, Heart, Star, Briefcase, Share2, Users, UserPlus, UserCheck, ArrowLeft, Loader2, LogIn, UserPlus as RegisterIcon } from 'lucide-react';
// @ts-ignore
import { Link, useNavigate, useParams } from 'react-router-dom';
import { followUser, unfollowUser, sendNotification } from '../services/db';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface ProfileProps {
  user: User;
  questions: Question[];
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, questions, onLogout, onOpenAuth }) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const isViewingSelf = !userId || userId === user.id;
  const profileUser = isViewingSelf ? user : (viewedUser || user); 
  const isFollowing = (user.following || []).includes(profileUser.id);
  const [followingState, setFollowingState] = useState(isFollowing);

  // --- GUEST VIEW HANDLER ---
  if (user.isGuest && isViewingSelf) {
      return (
          <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center animate-fade-in pt-safe-top pb-24">
              <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 max-w-sm w-full">
                  <div className="w-24 h-24 bg-gradient-to-tr from-primary to-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                      <LogIn size={40} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-textDark mb-2">Chào bạn mới! 👋</h1>
                  <p className="text-textGray mb-8 text-sm leading-relaxed">
                      Đăng nhập để tham gia cộng đồng, theo dõi chuyên gia và lưu lại những kiến thức bổ ích nhé.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={onOpenAuth}
                          className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-[#25A99C] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          <LogIn size={20} /> Đăng nhập / Đăng ký
                      </button>
                      <button 
                          onClick={() => navigate('/')}
                          className="w-full bg-gray-50 text-textGray font-bold py-3.5 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
                      >
                          Về trang chủ
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- REGULAR PROFILE LOGIC ---
  useEffect(() => {
    const fetchUser = async () => {
        if (userId && userId !== user.id) {
            setLoadingProfile(true);
            try {
                const docRef = doc(db, 'users', userId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    // @ts-ignore
                    setViewedUser({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoadingProfile(false);
            }
        }
    };
    fetchUser();
  }, [userId, user.id]);

  useEffect(() => {
    setFollowingState((user.following || []).includes(profileUser.id));
  }, [user.following, profileUser.id]);

  const userQuestions = questions.filter(q => q.author.id === profileUser.id);
  const userAnswersCount = questions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === profileUser.id).length, 0);
  const bestAnswersCount = questions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === profileUser.id && a.isBestAnswer).length, 0);
  const reputationPoints = profileUser.points || (userQuestions.length * 10) + (userAnswersCount * 20) + (bestAnswersCount * 50);

  const handleAuthAction = () => {
    if (user.isGuest) onOpenAuth();
    else onLogout();
  };

  const handleFollowToggle = async () => {
    if (user.isGuest) {
        onOpenAuth();
        return;
    }
    const newState = !followingState;
    setFollowingState(newState);

    if (followingState) {
        await unfollowUser(user.id, profileUser.id);
    } else {
        await followUser(user.id, profileUser);
        await sendNotification(profileUser.id, user, 'FOLLOW', 'đã bắt đầu theo dõi bạn.', `/profile/${user.id}`);
    }
  };

  const handleMessage = () => {
      if (user.isGuest) {
          onOpenAuth();
          return;
      }
      navigate(`/messages/${profileUser.id}`);
  };

  if (loadingProfile) {
      return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="pb-24 md:pb-10 animate-fade-in bg-[#F7F7F5] min-h-screen">
      <div className="relative">
        <div className="h-40 md:h-56 bg-gradient-to-r from-[#2EC4B6] to-[#3B82F6] relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] rounded-full bg-white/10 blur-3xl"></div>
           <div className="absolute bottom-[-50%] right-[-10%] w-[200px] h-[200px] rounded-full bg-yellow-300/20 blur-3xl"></div>
           <div className="absolute top-safe-top left-4 md:hidden">
              {!isViewingSelf && (
                  <button onClick={() => navigate(-1)} className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors">
                      <ArrowLeft size={20} />
                  </button>
              )}
           </div>
           <div className="absolute top-safe-top right-4 flex gap-2">
             <button className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors active:scale-95">
                <Share2 size={20} />
             </button>
             {isViewingSelf && (
                <button className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors active:scale-95">
                    <Settings size={20} />
                </button>
             )}
           </div>
        </div>

        <div className="px-4 -mt-16 mb-4 relative z-10">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-6 flex flex-col items-center md:flex-row md:items-end gap-4 border border-white/50">
            <div className="relative -mt-16 md:-mt-12 group">
              <div className="p-1.5 bg-white rounded-full shadow-sm">
                <img src={profileUser.avatar} alt={profileUser.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-gray-50 bg-gray-100"/>
              </div>
              {profileUser.isExpert && <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm"><ShieldCheck size={16} /></div>}
            </div>
            <div className="text-center md:text-left flex-1 space-y-2">
               <div>
                    <h1 className="text-2xl font-bold text-textDark flex items-center justify-center md:justify-start gap-2">
                        {profileUser.name}
                        {profileUser.isExpert && <Badge text="Chuyên gia" color="blue" />}
                        {profileUser.isAdmin && <Badge text="Admin" color="red" />}
                    </h1>
                    {profileUser.specialty && <div className="flex items-center justify-center md:justify-start gap-1.5 mt-1 text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg inline-flex"><Briefcase size={12} /> {profileUser.specialty}</div>}
               </div>
               <p className="text-textGray text-sm max-w-md mx-auto md:mx-0 leading-relaxed">{profileUser.bio || "Thành viên tích cực của cộng đồng Asking.vn"}</p>
               <div className="flex items-center justify-center md:justify-start gap-4 text-sm">
                  <div className="flex items-center gap-1 font-medium text-textDark"><strong className="text-lg">{profileUser.followers?.length || 0}</strong> <span className="text-gray-400">Người theo dõi</span></div>
                  <div className="flex items-center gap-1 font-medium text-textDark"><strong className="text-lg">{profileUser.following?.length || 0}</strong> <span className="text-gray-400">Đang theo dõi</span></div>
               </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                {isViewingSelf ? (
                    <button onClick={handleAuthAction} className={`flex-1 md:flex-none px-6 py-2.5 font-bold rounded-xl transition-all active:scale-95 text-sm ${user.isGuest ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:bg-[#25A99C]' : 'bg-gray-100 hover:bg-gray-200 text-textDark'}`}>{user.isGuest ? 'Đăng nhập ngay' : 'Đăng xuất'}</button>
                ) : (
                    <>
                        <button onClick={handleFollowToggle} className={`flex-1 md:flex-none px-5 py-2.5 font-bold rounded-xl transition-all active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg ${followingState ? 'bg-white border border-gray-200 text-textDark' : 'bg-blue-600 text-white shadow-blue-200'}`}>{followingState ? <UserCheck size={18} /> : <UserPlus size={18} />}{followingState ? 'Đang theo dõi' : 'Theo dõi'}</button>
                        <button onClick={handleMessage} className="flex-1 md:flex-none px-5 py-2.5 bg-gray-100 text-textDark font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"><MessageCircle size={18} />Nhắn tin</button>
                    </>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-5xl mx-auto space-y-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x">
          <StatCard icon={<Star className="text-yellow-500" size={20} />} value={reputationPoints} label="Điểm uy tín" bg="bg-yellow-50" />
          <StatCard icon={<HelpCircle className="text-blue-500" size={20} />} value={userQuestions.length} label="Câu hỏi" bg="bg-blue-50" />
          <StatCard icon={<MessageCircle className="text-green-500" size={20} />} value={userAnswersCount} label="Trả lời" bg="bg-green-50" />
          <StatCard icon={<Users className="text-purple-500" size={20} />} value={profileUser.followers?.length || 0} label="Followers" bg="bg-purple-50" />
        </div>

        <div className="sticky top-[60px] md:top-0 z-20 bg-[#F7F7F5]/95 backdrop-blur-sm -mx-4 px-4 pt-2 pb-2">
           <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex">
             <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Tổng quan" />
             <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} label="Bài viết" />
           </div>
        </div>

        <div className="min-h-[300px]">
           {activeTab === 'overview' && (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-textDark mb-4 flex items-center gap-2 text-lg"><Heart size={20} className="text-red-500" fill="currentColor" /> Chủ đề quan tâm</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Dinh dưỡng', 'Giáo dục sớm', '0-1 tuổi', 'Ăn dặm'].map(tag => (
                      <span key={tag} className="px-4 py-2 bg-gray-50 text-textDark font-medium rounded-xl text-sm border border-transparent hover:border-gray-200 transition-all">{tag}</span>
                    ))}
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'questions' && (
             <div className="space-y-4 animate-fade-in">
               {userQuestions.length > 0 ? (
                 userQuestions.map(q => (
                   <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 active:scale-[0.99] transition-transform">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-primary bg-secondary/20 px-2 py-1 rounded-md uppercase tracking-wide">{q.category}</span>
                        <span className="text-[10px] text-textGray">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
                     </div>
                     <h3 className="font-bold text-textDark text-[16px] mb-3 leading-snug line-clamp-2">{q.title}</h3>
                     <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1"><Heart size={14} /> {q.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={14} /> {q.answers.length}</span>
                     </div>
                   </Link>
                 ))
               ) : (
                 <div className="py-16 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300"><HelpCircle size={32} /></div>
                    <p className="text-textGray font-medium">Chưa có bài viết nào.</p>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ text: string; color: 'blue' | 'red' }> = ({ text, color }) => (
  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md align-middle ${color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{text}</span>
);

const StatCard: React.FC<{ icon: React.ReactNode; value: number; label: string; bg: string }> = ({ icon, value, label, bg }) => (
  <div className={`min-w-[100px] md:min-w-0 flex-1 p-4 rounded-2xl bg-white border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm snap-start`}>
    <div className={`mb-2 p-2 rounded-full ${bg}`}>{icon}</div>
    <span className="text-lg font-bold text-textDark">{value}</span>
    <span className="text-xs text-textGray font-medium">{label}</span>
  </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-white shadow-sm text-textDark ring-1 ring-black/5' : 'text-textGray hover:text-textDark'}`}>{label}</button>
);
