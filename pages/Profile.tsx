import React, { useState, useEffect } from 'react';
import { User, Question, toSlug } from '../types';
import { 
  Settings, ShieldCheck, MessageCircle, HelpCircle, Heart, Star, Briefcase, 
  Share2, Users, UserPlus, UserCheck, ArrowLeft, Loader2, LogIn, X, Save, 
  Image as ImageIcon, Camera, AtSign 
} from 'lucide-react';
// @ts-ignore
import { Link, useNavigate, useParams } from 'react-router-dom';
import { followUser, unfollowUser, sendNotification } from '../services/db';
import { db } from '../firebaseConfig';
import { doc, updateDoc, onSnapshot, query, where, getDocs, collection, limit, getDoc } from 'firebase/firestore'; 
import { uploadFile } from '../services/storage';
import { ShareModal } from '../components/ShareModal';

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
  const [profileData, setProfileData] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', avatar: '', username: '', coverUrl: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // --- 1. TỰ ĐỘNG CHUYỂN HƯỚNG NẾU LINK TRỐNG ---
  useEffect(() => {
    // Nếu vào /profile mà không có ID
    if (!userId) {
        if (user && !user.isGuest) {
            // Tự động chuyển sang Username hoặc ID của mình
            const slug = user.username || user.id;
            navigate(`/profile/${slug}`, { replace: true });
        } else if (user?.isGuest) {
            // Nếu là khách -> Dừng loading để hiện màn hình chào mừng
            setLoadingProfile(false);
        }
    }
  }, [userId, user, navigate]);

  // --- 2. TẢI DỮ LIỆU PROFILE (HỖ TRỢ ID & USERNAME) ---
  useEffect(() => {
    if (!userId) return; // Đợi redirect
    
    let unsubscribe: () => void;
    
    const fetchProfile = async () => {
        setLoadingProfile(true);
        let foundId = '';

        // A. Thử tìm theo ID (Nếu chuỗi giống ID Firebase - dài > 20 ký tự)
        if (userId.length > 20) { 
            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) foundId = docSnap.id;
        }

        // B. Nếu chưa thấy, tìm theo Username (Chuyển về chữ thường để so sánh)
        if (!foundId) {
            const q = query(
                collection(db, 'users'), 
                where('username', '==', userId.toLowerCase()), 
                limit(1)
            );
            const querySnap = await getDocs(q);
            if (!querySnap.empty) foundId = querySnap.docs[0].id;
        }

        // C. Lắng nghe dữ liệu Realtime
        if (foundId) {
            unsubscribe = onSnapshot(doc(db, 'users', foundId), (docSnap) => {
                if (docSnap.exists()) {
                    // @ts-ignore
                    setProfileData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setProfileData(null);
                }
                setLoadingProfile(false);
            });
        } else {
            setProfileData(null);
            setLoadingProfile(false);
        }
    };

    fetchProfile();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [userId]);

  // --- 3. LẮNG NGHE TRẠNG THÁI THEO DÕI ---
  useEffect(() => {
    if (user && !user.isGuest && profileData && user.id !== profileData.id) {
        const unsub = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                setIsFollowing((userData.following || []).includes(profileData.id));
            }
        });
        return () => unsub();
    } else {
        setIsFollowing(false);
    }
  }, [user.id, profileData?.id]);

  const isViewingSelf = user && profileData && user.id === profileData.id;

  // --- ACTIONS ---
  const handleFollowToggle = async () => {
    if (user.isGuest) return onOpenAuth();
    if (!profileData) return;
    try {
        if (isFollowing) await unfollowUser(user.id, profileData.id);
        else {
            await followUser(user.id, profileData);
            await sendNotification(profileData.id, user, 'FOLLOW', 'đã theo dõi bạn.', `/profile/${user.id}`);
        }
    } catch (e) { alert("Lỗi kết nối."); }
  };

  const openEditModal = () => {
    if (!profileData) return;
    setEditForm({ 
        name: profileData.name, 
        bio: profileData.bio || '', 
        avatar: profileData.avatar || '',
        username: profileData.username || '',
        coverUrl: profileData.coverUrl || ''
    });
    setShowEditModal(true);
  };

  // HÀM UPLOAD ẢNH (Avatar & Bìa)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'coverUrl') => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return alert("Ảnh quá lớn (Max 5MB)");

      setIsUploading(true);
      try {
          // Upload lên thư mục users/ID/avatar hoặc users/ID/cover
          const url = await uploadFile(file, `users/${user.id}/${field}_${Date.now()}`);
          setEditForm(prev => ({ ...prev, [field]: url }));
      } catch (error) {
          alert("Lỗi tải ảnh. Vui lòng thử lại.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;
    setIsSaving(true);

    try {
        let finalUsername = editForm.username.trim().toLowerCase(); 
        
        // Validate Username
        if (finalUsername && !/^[a-z0-9._]+$/.test(finalUsername)) {
            alert("Tên định danh chỉ được chứa chữ thường, số, dấu chấm (.) và gạch dưới (_)");
            setIsSaving(false);
            return;
        }

        // Check trùng username (nếu có thay đổi)
        if (finalUsername && finalUsername !== profileData.username) {
            const q = query(collection(db, 'users'), where('username', '==', finalUsername));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                alert(`Tên "${finalUsername}" đã có người dùng.`);
                setIsSaving(false);
                return;
            }
        }

        await updateDoc(doc(db, 'users', profileData.id), {
            name: editForm.name,
            bio: editForm.bio,
            avatar: editForm.avatar,
            username: finalUsername || null,
            coverUrl: editForm.coverUrl || null
        });

        // Đổi xong thì chuyển hướng URL luôn cho đẹp
        if (finalUsername && finalUsername !== userId && finalUsername !== profileData.username) {
            navigate(`/profile/${finalUsername}`, { replace: true });
        }
        
        setShowEditModal(false);
    } catch (error) {
        alert("Lỗi khi lưu hồ sơ.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAuthAction = () => {
    if (user.isGuest) onOpenAuth();
    else { onLogout(); navigate('/'); }
  };

  const handleMessage = () => {
      if (user.isGuest) return onOpenAuth();
      if (profileData) navigate(`/messages/${profileData.id}`);
  };

  // --- GUEST VIEW (KHẮC PHỤC LỖI KHÔNG HIỆN CHO KHÁCH) ---
  if (user.isGuest && (!userId || userId === user.id)) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in pt-safe-top pb-24">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LogIn size={40} className="text-blue-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Chào bạn mới! 👋</h1>
              <p className="text-gray-500 mb-8 text-sm">Đăng nhập để lưu hồ sơ và tham gia cộng đồng.</p>
              <button onClick={onOpenAuth} className="px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-[#25A99C]">Đăng nhập / Đăng ký</button>
          </div>
      );
  }

  // --- LOADING / NOT FOUND ---
  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!profileData) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F5] p-4 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy người dùng</h2>
          <p className="text-gray-500 mb-6">Đường dẫn có thể bị sai hoặc tài khoản đã bị xóa.</p>
          <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Về trang chủ</button>
      </div>
  );

  // Stats
  const userQuestions = questions.filter(q => q.author.id === profileData.id);
  const userAnswersCount = questions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === profileData.id).length, 0);
  const reputationPoints = profileData.points || (userQuestions.length * 10) + (userAnswersCount * 20);

  const hasCover = !!profileData.coverUrl;
  const bannerStyle = hasCover ? { backgroundImage: `url(${profileData.coverUrl})` } : undefined;
  const bannerClasses = hasCover 
    ? "h-48 md:h-64 relative bg-cover bg-center transition-all duration-500" 
    : "h-48 md:h-64 bg-gradient-to-r from-blue-400 to-cyan-300 relative overflow-hidden transition-all duration-500";

  return (
    <div className="pb-24 bg-white min-h-screen animate-fade-in">
      
      {/* 1. COVER PHOTO (ẢNH BÌA) */}
      <div className={bannerClasses} style={bannerStyle}>
         {hasCover && <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>}
         {!hasCover && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>}
         
         {!isViewingSelf && (
             <button onClick={() => navigate(-1)} className="absolute top-safe-top left-4 p-2 bg-black/20 text-white rounded-full backdrop-blur-md md:hidden z-10 hover:bg-black/30 transition-colors"><ArrowLeft size={20} /></button>
         )}
         <button onClick={() => setShowShareModal(true)} className="absolute top-safe-top right-4 p-2 bg-black/20 text-white rounded-full backdrop-blur-md z-10 hover:bg-black/30 transition-colors"><Share2 size={20} /></button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 mb-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
            
            {/* 2. AVATAR */}
            <div className="relative group z-20">
                <div className="p-1.5 bg-white rounded-full shadow-lg">
                    <img src={profileData.avatar} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white bg-gray-100" />
                </div>
                {profileData.isExpert && <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm"><ShieldCheck size={20} /></div>}
            </div>

            {/* 3. USER INFO */}
            <div className="flex-1 text-center sm:text-left mb-2 w-full z-10 mt-2 sm:mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                            {profileData.name}
                            {profileData.isAdmin && <Badge text="Admin" color="red" />}
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1 items-center sm:items-start justify-center sm:justify-start">
                            {profileData.username && (
                                <span className="text-gray-500 text-sm font-medium flex items-center"><AtSign size={14} className="inline mr-0.5"/>{profileData.username}</span>
                            )}
                            {profileData.specialty && (
                                <span className="text-blue-600 font-medium text-sm flex items-center gap-1"><Briefcase size={14} /> {profileData.specialty}</span>
                            )}
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 text-sm text-gray-600">
                            <div className="flex gap-1"><strong className="text-gray-900">{profileData.followers?.length || 0}</strong> người theo dõi</div>
                            <div className="flex gap-1"><strong className="text-gray-900">{profileData.following?.length || 0}</strong> đang theo dõi</div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center sm:justify-start w-full sm:w-auto pt-2 sm:pt-0">
                        {isViewingSelf ? (
                            <>
                                <button onClick={openEditModal} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm">
                                    <Settings size={16} /> Sửa hồ sơ
                                </button>
                                <button onClick={handleAuthAction} className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={handleFollowToggle} 
                                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${isFollowing ? 'bg-white border border-gray-300 text-gray-700' : 'bg-primary text-white hover:bg-teal-600 shadow-teal-200'}`}
                                >
                                    {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                                    {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                                </button>
                                <button onClick={handleMessage} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2">
                                    <MessageCircle size={18} /> Nhắn tin
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {profileData.bio && (
            <div className="mb-8">
                <p className="text-gray-600 text-sm leading-relaxed max-w-2xl bg-gray-50 p-4 rounded-xl border border-gray-200/60 shadow-sm">"{profileData.bio}"</p>
            </div>
        )}

        <div className="border-b border-gray-200 mb-6 flex gap-8">
            <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-primary' : 'text-gray-500 hover:text-gray-800'}`}>
                Tổng quan {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('questions')} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'questions' ? 'text-primary' : 'text-gray-500 hover:text-gray-800'}`}>
                Bài viết <span className="ml-1 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-[10px]">{userQuestions.length}</span>
                {activeTab === 'questions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
            </button>
        </div>

        <div className="min-h-[300px]">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                    <StatCard icon={<Star className="text-yellow-500" />} label="Điểm uy tín" value={reputationPoints} />
                    <StatCard icon={<Heart className="text-red-500" />} label="Được yêu thích" value={questions.reduce((acc, q) => acc + (q.author.id === profileData.id ? q.likes : 0), 0)} />
                    <StatCard icon={<HelpCircle className="text-blue-500" />} label="Câu hỏi" value={userQuestions.length} />
                    <StatCard icon={<MessageCircle className="text-green-500" />} label="Câu trả lời" value={userAnswersCount} />
                </div>
            )}

            {activeTab === 'questions' && (
                <div className="space-y-4 animate-fade-in">
                    {userQuestions.length > 0 ? (
                        userQuestions.map(q => (
                            <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-primary bg-teal-50 px-2 py-1 rounded-lg uppercase tracking-wide">{q.category}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{q.title}</h3>
                                <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                    <span className="flex items-center gap-1"><Heart size={14} className="text-red-400"/> {q.likes} yêu thích</span>
                                    <span className="flex items-center gap-1"><MessageCircle size={14} className="text-blue-400"/> {q.answers.length} thảo luận</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl"><p className="text-gray-400 font-medium">Chưa có bài viết nào.</p></div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* EDIT MODAL - CÓ UPLOAD ẢNH */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-scrollbar overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-pop-in relative flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-lg text-gray-800">Chỉnh sửa hồ sơ</h3>
                    <button onClick={() => setShowEditModal(false)} className="hover:bg-gray-200 p-1 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    
                    {/* ẢNH BÌA UPLOAD */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><ImageIcon size={14}/> Ảnh bìa</label>
                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 h-28 bg-gray-50 cursor-pointer">
                            {editForm.coverUrl ? (
                                <img src={editForm.coverUrl} className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={32}/></div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold flex items-center gap-1"><Camera size={14}/> Thay đổi</span>
                            </div>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'coverUrl')} />
                        </div>
                    </div>

                    {/* AVATAR UPLOAD */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">Ảnh đại diện</label>
                        <div className="flex gap-4 items-center">
                            <div className="relative group w-16 h-16 rounded-full overflow-hidden border border-gray-200 shrink-0 cursor-pointer">
                                <img src={editForm.avatar || 'https://via.placeholder.com/100'} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={16} className="text-white"/>
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'avatar')} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">Nhấp vào ảnh để tải lên (Max 5MB)</p>
                                {isUploading && <span className="text-xs text-primary font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Đang tải...</span>}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    {/* USERNAME & NAME */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên hiển thị</label>
                        <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-gray-800" />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên định danh (Username)</label>
                        <div className="flex items-center relative">
                            <span className="absolute left-4 text-gray-400 font-bold"><AtSign size={16}/></span>
                            <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')})} placeholder="nguyenvanan.99" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium text-sm text-gray-700" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giới thiệu</label>
                        <textarea rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Chia sẻ đôi chút về bạn..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>
                    <button onClick={handleSaveProfile} disabled={isSaving || isUploading} className="px-5 py-2.5 text-sm bg-primary text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-70 transition-all active:scale-95">
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
      )}

      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={`Trang cá nhân của ${profileData.name}`}
      />
    </div>
  );
};

const Badge: React.FC<{ text: string; color: 'blue' | 'red' }> = ({ text, color }) => (
  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md align-middle ml-2 ${color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{text}</span>
);

const StatCard: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center">
    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">{icon}</div>
    <span className="text-xl font-black text-gray-900">{value}</span>
    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
  </div>
);
