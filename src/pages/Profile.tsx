import React, { useState, useEffect, useMemo } from 'react';
import { User, Question, toSlug } from '../types';
import { 
    Settings, ShieldCheck, MessageCircle, HelpCircle, Heart, Star, Briefcase, 
    Share2, UserPlus, UserCheck, ArrowLeft, Loader2, X, Save, 
    Image as ImageIcon, Camera, AtSign, Bookmark
} from 'lucide-react';

import { Link, useNavigate, useParams } from 'react-router-dom';
import { followUser, unfollowUser, sendNotification } from '../services/db';
import { db } from '../firebaseConfig';
import { doc, updateDoc, onSnapshot, query, where, getDocs, collection, limit, getDoc } from 'firebase/firestore'; 
import { uploadFile } from '../services/storage';
import { ShareModal } from '../components/ShareModal';
import { ExpertPromoBox } from '../components/ExpertPromoBox';

const CUTE_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

interface ProfileProps {
    user: User;
    questions: Question[];
    onLogout: () => Promise<void> | void; 
    onOpenAuth: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, questions, onLogout, onOpenAuth }) => {
    const navigate = useNavigate();
    const { userId } = useParams<{ userId: string }>(); 
    
    // Bổ sung tab 'saved' để xem bài viết đã lưu
    const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'saved'>('overview');
    const [profileData, setProfileData] = useState<User | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    
    const [editForm, setEditForm] = useState({ name: '', bio: '', avatar: '', username: '', coverUrl: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // 1. Logic xử lý link và redirect
    useEffect(() => {
        if (!userId) {
            if (user && !user.isGuest) {
                const slug = user.username || user.id;
                navigate(`/profile/${slug}`, { replace: true });
            } else if (user?.isGuest) {
                setLoadingProfile(false); 
            }
        }
    }, [userId, user, navigate]);

    // 2. Tải dữ liệu Profile
    useEffect(() => {
        if (!userId) return;
        let isMounted = true; 
        const fetchProfile = async () => {
            setLoadingProfile(true);
            try {
                let targetUserData: User | null = null;
                if (user && (user.id === userId || user.username === userId)) {
                    targetUserData = { ...user };
                    if (isMounted) setProfileData(targetUserData);
                }

                const docRef = doc(db, 'users', userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    targetUserData = { ...(targetUserData || { id: docSnap.id }), ...docSnap.data() } as User;
                } else {
                    const q = query(collection(db, 'users'), where('username', '==', userId.toLowerCase()), limit(1));
                    const querySnap = await getDocs(q);
                    if (!querySnap.empty) {
                        const d = querySnap.docs[0];
                        targetUserData = { id: d.id, ...d.data() } as User;
                    }
                }

                if (isMounted) {
                    if (targetUserData) setProfileData(targetUserData);
                    else setProfileData(null);
                }
            } catch (err) {
                console.error("Lỗi tải profile:", err);
            } finally {
                if (isMounted) setLoadingProfile(false);
            }
        };
        fetchProfile();
        return () => { isMounted = false; };
    }, [userId, user]);

    const isViewingSelf = user && profileData && user.id === profileData.id;

    // 3. Lắng nghe trạng thái theo dõi
    useEffect(() => {
        if (user && !user.isGuest && profileData && user.id !== profileData.id) {
            const unsub = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const followingList = Array.isArray(userData.following) ? userData.following : [];
                    setIsFollowing(followingList.includes(profileData.id));
                }
            });
            return () => unsub();
        }
    }, [user.id, profileData?.id]);

    // 4. Lọc danh sách câu hỏi
    const userQuestions = useMemo(() => questions.filter(q => q.author.id === profileData?.id), [questions, profileData?.id]);
    
    const savedQuestionsList = useMemo(() => {
        if (!isViewingSelf || !user.savedQuestions) return [];
        return questions.filter(q => user.savedQuestions?.includes(q.id));
    }, [questions, user.savedQuestions, isViewingSelf]);

    // Actions
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

    const handleSaveProfile = async () => {
        if (!profileData) return;
        setIsSaving(true);
        try {
            const finalUsername = editForm.username.trim().toLowerCase();
            await updateDoc(doc(db, 'users', profileData.id), {
                name: editForm.name, bio: editForm.bio, avatar: editForm.avatar,
                username: finalUsername || null, coverUrl: editForm.coverUrl || null
            });
            setShowEditModal(false);
        } catch (error) { alert("Lỗi khi lưu hồ sơ."); }
        finally { setIsSaving(false); }
    };

    if (user.isGuest && (!userId || userId === user.id)) {
        return (
            <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center animate-fade-in pt-safe-top pb-24">
                <div className="w-28 h-28 mb-6 relative"><div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-xl opacity-60"></div><img src={CUTE_AVATAR} className="w-full h-full rounded-full shadow-lg border-4 border-white dark:border-dark-bg object-cover relative z-10" alt="Guest" /></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chào mẹ mới! 👋</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Đăng nhập để lưu hồ sơ và tham gia cộng đồng.</p>
                <button onClick={onOpenAuth} className="px-8 py-3 bg-primary text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all">Đăng nhập ngay</button>
            </div>
        );
    }

    if (loadingProfile) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (!profileData) return <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center"><h2 className="font-bold mb-2">Không tìm thấy người dùng</h2><button onClick={() => navigate('/')} className="text-primary font-bold">Về trang chủ</button></div>;

    return (
        <div className="pb-24 bg-white dark:bg-dark-bg min-h-screen animate-fade-in transition-colors duration-300">
            {/* Banner */}
            <div className={`h-48 md:h-64 relative bg-cover bg-center ${!profileData.coverUrl ? 'bg-gradient-to-r from-blue-400 to-cyan-300 dark:from-blue-900 dark:to-cyan-800' : ''}`} style={profileData.coverUrl ? { backgroundImage: `url(${profileData.coverUrl})` } : {}}>
                {!isViewingSelf && <button onClick={() => navigate(-1)} className="absolute top-safe-top left-4 p-2 bg-black/20 text-white rounded-full backdrop-blur-md z-10"><ArrowLeft size={20} /></button>}
                <button onClick={() => setShowShareModal(true)} className="absolute top-safe-top right-4 p-2 bg-black/20 text-white rounded-full backdrop-blur-md z-10"><Share2 size={20} /></button>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative -mt-16 sm:-mt-20 mb-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                    <div className="p-1.5 bg-white dark:bg-dark-bg rounded-full shadow-lg">
                        <img src={profileData.avatar || CUTE_AVATAR} onError={(e) => { e.currentTarget.src = CUTE_AVATAR; }} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white dark:border-dark-bg bg-gray-100" alt="Avatar" />
                    </div>
                    <div className="flex-1 text-center sm:text-left w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">{profileData.name} {profileData.isAdmin && <Badge text="Admin" color="red" />}</h1>
                                <div className="flex gap-3 mt-1 items-center justify-center sm:justify-start text-gray-500 text-sm">
                                    {profileData.username && <span className="flex items-center"><AtSign size={14}/>{profileData.username}</span>}
                                    {profileData.specialty && <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1"><Briefcase size={14} /> {profileData.specialty}</span>}
                                </div>
                            </div>
                            <div className="flex gap-3 justify-center">
                                {isViewingSelf ? (
                                    <>
                                        <button onClick={() => { setEditForm({...profileData} as any); setShowEditModal(true); }} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 font-bold rounded-xl text-sm flex items-center gap-2"><Settings size={16} /> Sửa hồ sơ</button>
                                        <button onClick={onLogout} className="px-4 py-2 border border-gray-300 dark:border-slate-600 font-bold rounded-xl text-sm">Đăng xuất</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleFollowToggle} className={`px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${isFollowing ? 'bg-gray-100 text-gray-700' : 'bg-blue-600 text-white'}`}>{isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />} {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}</button>
                                        <button onClick={() => navigate(`/messages/${profileData.id}`)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 font-bold rounded-xl text-sm flex items-center gap-2"><MessageCircle size={18} /> Nhắn tin</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {!user?.isExpert && <div className="mb-8"><ExpertPromoBox /></div>}

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-slate-700 mb-6 flex gap-8">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Tổng quan" />
                    <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} label="Bài viết" count={userQuestions.length} />
                    {isViewingSelf && <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} label="Đã lưu" count={savedQuestionsList.length} />}
                </div>

                <div className="min-h-[300px]">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                            <StatCard icon={<Star className="text-yellow-500" />} label="Uy tín" value={profileData.points || 0} />
                            <StatCard icon={<Heart className="text-red-500" />} label="Yêu thích" value={userQuestions.reduce((a,b)=>a+(Array.isArray(b.likes)?b.likes.length:0),0)} />
                            <StatCard icon={<HelpCircle className="text-blue-500" />} label="Câu hỏi" value={userQuestions.length} />
                            <StatCard icon={<MessageCircle className="text-green-500" />} label="Góp ý" value={0} />
                        </div>
                    )}

                    {(activeTab === 'questions' || activeTab === 'saved') && (
                        <div className="space-y-4 animate-fade-in">
                            {(activeTab === 'questions' ? userQuestions : savedQuestionsList).length > 0 ? (
                                (activeTab === 'questions' ? userQuestions : savedQuestionsList).map(q => (
                                    <Link to={`/question/${toSlug(q.title, q.id)}`} key={q.id} className="block bg-white dark:bg-dark-card p-5 rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-primary bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-lg uppercase">{q.category}</span>
                                            {activeTab === 'saved' && <Bookmark size={14} className="text-orange-500 fill-current" />}
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{q.title}</h3>
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <span className="flex items-center gap-1"><Heart size={14} className="text-red-400"/> {Array.isArray(q.likes)?q.likes.length:0}</span>
                                            <span className="flex items-center gap-1"><MessageCircle size={14} className="text-blue-400"/> {q.answers?.length || 0} thảo luận</span>
                                        </div>
                                    </Link>
                                ))
                            ) : <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">Mẹ chưa có bài viết nào ở đây.</div>}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Edit Profile */}
            {showEditModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-2xl animate-pop-in overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h3 className="font-bold text-gray-800 dark:text-white">Chỉnh sửa hồ sơ</h3>
                            <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                            <div className="flex justify-center mb-4">
                                <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20">
                                    <img src={editForm.avatar || CUTE_AVATAR} className="w-full h-full object-cover" alt="preview" />
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <Camera size={20} className="text-white"/>
                                        <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, 'avatar')} />
                                    </label>
                                </div>
                            </div>
                            <InputField label="Tên hiển thị" value={editForm.name} onChange={v => setEditForm({...editForm, name: v})} />
                            <InputField label="Tên định danh (username)" value={editForm.username} onChange={v => setEditForm({...editForm, username: v.toLowerCase().replace(/[^a-z0-9._]/g, '')})} placeholder="nguyenvan.me" />
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Giới thiệu bản thân</label><textarea rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl resize-none outline-none focus:ring-2 focus:ring-primary/20 text-sm" /></div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 dark:bg-slate-800">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Hủy</button>
                            <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg disabled:opacity-50">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Lưu ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} url={window.location.href} title={`Profile của ${profileData.name}`} />
        </div>
    );
};

// Sub-components
const TabButton = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) => (
    <button onClick={onClick} className={`pb-3 text-sm font-bold transition-all relative ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-800'}`}>
        {label} {count !== undefined && <span className="ml-1 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-[10px]">{count}</span>}
        {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
    </button>
);

const StatCard = ({ icon, value, label }: { icon: React.ReactNode, value: number, label: string }) => (
    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border text-center flex flex-col items-center">
        <div className="mb-2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">{icon}</div>
        <span className="text-xl font-black text-gray-900 dark:text-white">{value}</span>
        <span className="text-[10px] text-gray-400 uppercase font-bold">{label}</span>
    </div>
);

const Badge = ({ text, color }: { text: string, color: 'blue' | 'red' }) => (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{text}</span>
);

const InputField = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
    <div>
        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" />
    </div>
);
