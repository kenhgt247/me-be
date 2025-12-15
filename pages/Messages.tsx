import React, { useState, useEffect } from 'react';
import { subscribeToChats, getUsersByIds } from '../services/db';
import { deleteConversation } from '../services/chat'; 
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
import { ChatSession, User } from '../types';
import { MessageCircle, ShieldCheck, Search, Plus, Loader2, X, UserPlus, Trash2 } from 'lucide-react';

interface MessagesProps {
    currentUser: User;
}

export const Messages: React.FC<MessagesProps> = ({ currentUser }) => {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    
    // Loading state cho từng item khi xóa
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser || currentUser.isGuest) {
            setLoading(false);
            return;
        }
        // Real-time listener cho danh sách chat
        const unsubscribe = subscribeToChats(currentUser.id, (data) => {
            setChats(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleDeleteChat = async (e: React.MouseEvent, otherUserId: string) => {
        e.preventDefault(); // Chặn chuyển trang
        e.stopPropagation();

        if (confirm("Bạn có chắc muốn xóa vĩnh viễn cuộc trò chuyện này?")) {
            try {
                setDeletingId(otherUserId);
                await deleteConversation(currentUser.id, otherUserId);
                // Không cần setChats vì subscribeToChats sẽ tự làm việc đó
            } catch (error) {
                alert("Xóa thất bại");
            } finally {
                setDeletingId(null);
            }
        }
    };

    // Helper lấy thông tin người chat cùng
    const getOtherParticipant = (chat: ChatSession) => {
        const otherId = chat.participants.find(id => id !== currentUser.id);
        if (!otherId || !chat.participantData) return null;
        return { id: otherId, ...chat.participantData[otherId] };
    };

    if (!currentUser || currentUser.isGuest) return <div className="p-10 text-center">Vui lòng đăng nhập</div>;

    return (
        <div className="min-h-screen bg-[#F7F7F5] dark:bg-dark-bg pb-24">
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 border-b pt-safe-top flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tin nhắn</h1>
                <button onClick={() => setShowNewChatModal(true)} className="bg-primary/10 text-primary p-2 rounded-full"><Plus /></button>
            </div>

            <div className="p-2 space-y-1">
                {loading ? <Loader2 className="mx-auto mt-10 animate-spin" /> : (
                    chats.map(chat => {
                        const other = getOtherParticipant(chat);
                        if (!other) return null;
                        
                        return (
                            <Link to={`/messages/${other.id}`} key={chat.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-white hover:bg-gray-50 transition-all">
                                <div className="relative shrink-0">
                                    <img src={other.avatar} className="w-14 h-14 rounded-full object-cover" />
                                    {other.isExpert && <ShieldCheck size={12} className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-0.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold truncate">{other.name}</h4>
                                        <span className="text-xs text-gray-400">{new Date(chat.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className={`text-sm truncate ${chat.unreadCount?.[currentUser.id] ? 'font-bold text-black' : 'text-gray-500'}`}>{chat.lastMessage}</p>
                                </div>

                                {/* Delete Button */}
                                <button 
                                    onClick={(e) => handleDeleteChat(e, other.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                    {deletingId === other.id ? <Loader2 size={18} className="animate-spin text-red-500" /> : <Trash2 size={18} />}
                                </button>
                            </Link>
                        );
                    })
                )}
            </div>
            
            {/* Modal tìm bạn mới (Giữ nguyên logic của bạn nếu cần) */}
            {showNewChatModal && <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowNewChatModal(false)}></div>}
        </div>
    );
};
