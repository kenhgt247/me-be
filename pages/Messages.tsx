
import React, { useState, useEffect } from 'react';
import { subscribeToChats } from '../services/db';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { ChatSession } from '../types';
import { auth } from '../firebaseConfig';
import { MessageCircle, ShieldCheck, Search, Plus, Loader2 } from 'lucide-react';

export const Messages: React.FC = () => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const currentUser = auth.currentUser;
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const unsubscribe = subscribeToChats(currentUser.uid, (data) => {
            setChats(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const getOtherParticipant = (chat: ChatSession) => {
        if (!currentUser) return null;
        const otherId = chat.participants.find(id => id !== currentUser.uid);
        if (!otherId || !chat.participantData) return null;
        return { id: otherId, ...chat.participantData[otherId] };
    };

    if (!currentUser) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in pt-safe-top">
             <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                <MessageCircle size={40} />
             </div>
             <h2 className="text-2xl font-bold text-textDark mb-3">Tin nhắn</h2>
             <p className="text-textGray mb-6">Vui lòng đăng nhập để xem tin nhắn.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 pt-safe-top">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="text-2xl font-bold text-textDark">Tin nhắn</h1>
                    <button className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20">
                        <Plus size={20} />
                    </button>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm cuộc trò chuyện..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                    />
                </div>
            </div>

            <div className="p-2 space-y-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <span className="text-sm">Đang tải tin nhắn...</span>
                    </div>
                ) : chats.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="font-bold text-textDark text-lg">Chưa có tin nhắn</h3>
                        <p className="text-textGray text-sm mb-6 max-w-xs">Kết nối với các chuyên gia hoặc mẹ khác để trao đổi kinh nghiệm.</p>
                        <Link to="/" className="text-primary font-bold hover:underline">Khám phá cộng đồng</Link>
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
                                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-transparent hover:border-gray-100 active:scale-[0.99] transition-all"
                            >
                                <div className="relative shrink-0">
                                    <img src={other.avatar} alt={other.name} className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                                    {isExpert && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white"><ShieldCheck size={10} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4 className="font-bold text-textDark truncate pr-2">{other.name}</h4>
                                        <span className="text-[11px] text-gray-400 shrink-0">{time}</span>
                                    </div>
                                    <p className={`text-sm truncate ${chat.unreadCount && chat.unreadCount[currentUser.uid] > 0 ? 'font-bold text-textDark' : 'text-textGray'}`}>
                                        {chat.lastMessage}
                                    </p>
                                </div>
                                {chat.unreadCount && chat.unreadCount[currentUser.uid] > 0 && (
                                    <div className="w-3 h-3 bg-red-500 rounded-full shrink-0"></div>
                                )}
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};
