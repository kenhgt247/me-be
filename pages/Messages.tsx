import React, { useState, useEffect } from 'react';
import { subscribeToChats, getUsersByIds } from '../services/db';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { ChatSession, User } from '../types';
import { MessageCircle, ShieldCheck, Search, Plus, Loader2, X, UserPlus } from 'lucide-react';

interface MessagesProps {
    currentUser: User;
}

export const Messages: React.FC<MessagesProps> = ({ currentUser }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [followingUsers, setFollowingUsers] = useState<User[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser || currentUser.isGuest) {
            setLoading(false);
            return;
        }
        const unsubscribe = subscribeToChats(currentUser.id, (data) => {
            setChats(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Load following users when modal opens
    useEffect(() => {
        const loadFriends = async () => {
            if (showNewChatModal && currentUser?.following && currentUser.following.length > 0) {
                setLoadingFriends(true);
                const users = await getUsersByIds(currentUser.following);
                setFollowingUsers(users);
                setLoadingFriends(false);
            }
        };
        loadFriends();
    }, [showNewChatModal, currentUser]);

    const getOtherParticipant = (chat: ChatSession) => {
        if (!currentUser) return null;
        const otherId = chat.participants.find(id => id !== currentUser.id);
        if (!otherId || !chat.participantData) return null;
        return { id: otherId, ...chat.participantData[otherId] };
    };

    if (!currentUser || currentUser.isGuest) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in pt-safe-top bg-[#F7F7F5] dark:bg-dark-bg transition-colors">
             <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <MessageCircle size={40} />
             </div>
             <h2 className="text-2xl font-bold text-textDark dark:text-white mb-3">Tin nhắn</h2>
             <p className="text-textGray dark:text-gray-400 mb-6">Vui lòng đăng nhập để xem tin nhắn.</p>
        </div>
    );

    return (
        // THAY ĐỔI: bg-[#F7F7F5] -> dark:bg-dark-bg
        <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24 animate-fade-in transition-colors duration-300">
            
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-b border-gray-100 dark:border-dark-border px-4 py-3 pt-safe-top transition-colors">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="text-2xl font-bold text-textDark dark:text-white">Tin nhắn</h1>
                    <button 
                        onClick={() => setShowNewChatModal(true)}
                        className="bg-primary/10 dark:bg-primary/20 text-primary p-2 rounded-full hover:bg-primary/20 dark:hover:bg-primary/30 active:scale-95 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm cuộc trò chuyện..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-primary dark:focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                </div>
            </div>

            <div className="p-2 space-y-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <span className="text-sm">Đang tải tin nhắn...</span>
                    </div>
                ) : chats.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 text-blue-400 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="font-bold text-textDark dark:text-white text-lg">Chưa có tin nhắn</h3>
                        <p className="text-textGray dark:text-gray-400 text-sm mb-6 max-w-xs">Kết nối với các chuyên gia hoặc mẹ khác để trao đổi kinh nghiệm.</p>
                        <button onClick={() => setShowNewChatModal(true)} className="bg-primary text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-transform text-sm">
                            Bắt đầu trò chuyện
                        </button>
                     </div>
                ) : (
                    chats.map(chat => {
                        const other = getOtherParticipant(chat);
                        if (!other) return null;
                        
                        const isExpert = other.isExpert;
                        const date = new Date(chat.lastMessageTime);
                        const time = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                        return (
                            <Link 
                                to={`/messages/${other.id}`} 
                                key={chat.id}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-dark-card border border-transparent hover:border-gray-100 dark:hover:border-slate-700 active:scale-[0.99] transition-all"
                            >
                                <div className="relative shrink-0">
                                    <img src={other.avatar} alt={other.name} className="w-14 h-14 rounded-full object-cover border border-gray-100 dark:border-slate-600" />
                                    {isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white dark:border-dark-card"><ShieldCheck size={10} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4 className="font-bold text-textDark dark:text-white truncate pr-2">{other.name}</h4>
                                        <span className="text-[11px] text-gray-400 shrink-0">{time}</span>
                                    </div>
                                    <p className={`text-sm truncate ${chat.unreadCount && chat.unreadCount[currentUser.id] > 0 ? 'font-bold text-textDark dark:text-white' : 'text-textGray dark:text-gray-400'}`}>
                                        {chat.lastMessage}
                                    </p>
                                </div>
                                {chat.unreadCount && chat.unreadCount[currentUser.id] > 0 && (
                                    <div className="w-3 h-3 bg-red-500 rounded-full shrink-0"></div>
                                )}
                            </Link>
                        );
                    })
                )}
            </div>

            {/* NEW CHAT MODAL (Bottom Sheet style) */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center items-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewChatModal(false)}></div>
                    <div className="bg-white dark:bg-dark-card w-full md:w-[450px] md:rounded-2xl rounded-t-[2rem] p-5 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl max-h-[80vh] flex flex-col transition-colors">
                         <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full mx-auto mb-4 md:hidden shrink-0"></div>
                         
                         <div className="flex justify-between items-center mb-4 shrink-0">
                             <h3 className="text-lg font-bold text-textDark dark:text-white">Tin nhắn mới</h3>
                             <button onClick={() => setShowNewChatModal(false)} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600">
                                 <X size={20} />
                             </button>
                         </div>

                         <div className="overflow-y-auto min-h-[200px]">
                            {loadingFriends ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                            ) : followingUsers.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                        <UserPlus size={28} />
                                    </div>
                                    <p className="font-medium text-textDark dark:text-white mb-1">Chưa theo dõi ai</p>
                                    <p className="text-xs text-textGray dark:text-gray-400 mb-4">Hãy theo dõi các chuyên gia hoặc mẹ khác để bắt đầu trò chuyện.</p>
                                    <Link to="/" onClick={() => setShowNewChatModal(false)} className="inline-block bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold">
                                        Tìm bạn bè ngay
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-textGray dark:text-gray-500 uppercase tracking-wider mb-2">Đang theo dõi</p>
                                    {followingUsers.map(user => (
                                        <button 
                                            key={user.id}
                                            onClick={() => {
                                                setShowNewChatModal(false);
                                                navigate(`/messages/${user.id}`);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-left group"
                                        >
                                            <div className="relative">
                                                <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-slate-600 group-hover:border-primary/30 transition-colors" />
                                                {user.isExpert && <ShieldCheck size={14} className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-textDark dark:text-white text-sm">{user.name}</p>
                                                <p className="text-xs text-textGray dark:text-gray-400 truncate">{user.bio || "Thành viên Asking.vn"}</p>
                                            </div>
                                            <div className="p-2 text-primary">
                                                <MessageCircle size={20} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
