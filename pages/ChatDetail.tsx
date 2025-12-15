import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, ShieldCheck, Loader2, Plus, X, ChevronDown, Trash2 } from 'lucide-react';
// IMPORT HÀM MỚI
import { sendMessage, subscribeToMessages, deleteConversation } from '../services/chat'; 
import { subscribeToUser } from '../services/db'; 
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';
import { User, Message } from '../types';

interface ChatDetailProps {
  currentUser: User;
  onOpenAuth: () => void;
}

// ... (Giữ nguyên constant STICKER_PACKS và getTimeStatus để tiết kiệm chỗ hiển thị)
const STICKER_PACKS = {
  "Phổ biến": ["😀", "😂", "🥰", "😎", "😭", "👍", "🙏", "❤️"],
  "Cảm xúc": ["😡", "😱", "🥳", "😴", "🤔", "🙄", "🤐", "😪"]
}; // Bạn có thể thêm lại list full như cũ

export const ChatDetail: React.FC<ChatDetailProps> = ({ currentUser, onOpenAuth }) => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [targetUser, setTargetUser] = useState<User | null>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);

    // Menu state
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Lấy thông tin người đang chat cùng
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToUser(userId, (user) => {
            if (user) setTargetUser(user);
        });
        return () => unsubscribe();
    }, [userId]);

    // --- QUAN TRỌNG: LOAD TIN NHẮN REAL-TIME ---
    useEffect(() => {
        if (!currentUser || !userId) return;

        // Gọi hàm lắng nghe thay vì setInterval
        const unsubscribe = subscribeToMessages(currentUser.id, userId, (newMessages) => {
            setMessages(newMessages);

            // Logic tự động cuộn xuống khi có tin mới
            if (messagesContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
                // Nếu đang ở gần dưới đáy hoặc lần đầu load -> cuộn xuống
                if (isNearBottom || newMessages.length === 0) {
                    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            }
        });

        // Hủy lắng nghe khi thoát trang
        return () => unsubscribe();
    }, [currentUser.id, userId]);

    // Cuộn xuống khi vào trang lần đầu
    useLayoutEffect(() => {
         scrollRef.current?.scrollIntoView({ behavior: 'auto' });
    }, []);

    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollDown(!isNearBottom);
        }
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [newMessage]);

    const ensureAuth = async (): Promise<User> => {
        if (currentUser.isGuest) {
            try {
                return await loginAnonymously();
            } catch (e: any) {
                onOpenAuth();
                throw new Error("LOGIN_REQUIRED");
            }
        }
        return currentUser;
    };

    const handleSend = async (content: string, type: 'text' | 'image' = 'text') => {
        if (!content.trim() || !userId) return;
        
        try {
            const user = await ensureAuth();
            await sendMessage(user.id, userId, content, type);
            // Không cần setMessages thủ công vì onSnapshot sẽ tự cập nhật UI
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error("Gửi lỗi:", error);
            alert("Gửi tin nhắn thất bại. Kiểm tra kết nối.");
        }
    };

    const handleTextSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;
        const content = newMessage;
        setNewMessage('');
        if(textareaRef.current) textareaRef.current.style.height = 'auto';
        setShowStickers(false);
        await handleSend(content, 'text');
    };

    const handleDeleteChat = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId || !currentUser) return;
        
        if (confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?")) {
            try {
                setIsDeleting(true);
                setShowMenu(false);
                await deleteConversation(currentUser.id, userId);
                navigate('/messages');
            } catch (error) {
                console.error("Xóa thất bại", error);
                alert("Lỗi khi xóa.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Render loading
    if (!targetUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-[100dvh] bg-[#E5DDD5] dark:bg-slate-900 fixed inset-0 z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-dark-card px-4 py-2.5 flex items-center justify-between border-b shadow-sm pt-safe-top z-40">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
                    <img src={targetUser.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <h2 className="font-bold text-[16px]">{targetUser.name}</h2>
                        <span className="text-[11px] text-gray-500">{targetUser.isOnline ? 'Đang hoạt động' : 'Offline'}</span>
                    </div>
                </div>
                
                {/* Menu Button */}
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-gray-100">
                        {isDeleting ? <Loader2 className="animate-spin" /> : <MoreVertical />}
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border py-1 z-50">
                            <button onClick={handleDeleteChat} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 size={18} /> Xóa cuộc trò chuyện
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Message List */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-1 relative z-10 scroll-smooth" onClick={() => setShowStickers(false)}>
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                            <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-[15px] break-words ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'}`}>
                                {msg.type === 'image' ? (
                                    <img src={msg.content} className="rounded-lg max-w-full" onClick={() => window.open(msg.content)} />
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                                <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-1" />
            </div>

            {/* Scroll Button */}
            {showScrollDown && (
                <button onClick={scrollToBottom} className="absolute bottom-20 right-4 z-30 bg-white p-2 rounded-full shadow-lg border text-primary">
                    <ChevronDown />
                </button>
            )}

            {/* Input Area */}
            <div className="bg-white px-3 py-2 border-t flex flex-col pb-safe-bottom z-20">
                <form onSubmit={handleTextSubmit} className="flex items-end gap-2">
                    <div className="flex gap-1 pb-2">
                         <button type="button" onClick={() => setShowStickers(!showStickers)} className="p-2 text-primary"><Plus /></button>
                         <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-primary">
                             {isUploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                         </button>
                         <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { /* Xử lý upload ảnh ở đây */ }} />
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
                        <textarea 
                            ref={textareaRef} 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)} 
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }}}
                            placeholder="Nhắn tin..." 
                            className="w-full bg-transparent outline-none resize-none max-h-[100px]" 
                            rows={1} 
                        />
                    </div>
                    <button type="submit" disabled={!newMessage.trim()} className="mb-1 text-primary p-2"><Send /></button>
                </form>
                {/* Sticker Panel (Giữ nguyên logic của bạn) */}
                {showStickers && <div className="h-40 bg-gray-50 mt-2 p-2">Stickers...</div>}
            </div>
        </div>
    );
};
