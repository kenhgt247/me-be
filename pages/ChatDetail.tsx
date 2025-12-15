import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, ShieldCheck, Loader2, Plus, X, ChevronDown, Trash2 } from 'lucide-react';
import { sendMessage, getMessages, deleteConversation } from '../services/chat'; 
import { subscribeToUser } from '../services/db'; 
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';
import { User, Message } from '../types';

interface ChatDetailProps {
  currentUser: User;
  onOpenAuth: () => void;
}

// --- CẬP NHẬT: DANH SÁCH CẢM XÚC PHONG PHÚ HƠN ---
const STICKER_PACKS = {
  "Phổ biến": ["😀", "😂", "🥰", "😎", "😭", "👍", "🙏", "❤️", "🎉", "🔥", "💯", "🥺"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌", "💕", "💞", "💓", "💗", "💘", "🫶"],
  "Mẹ & Bé": ["👶", "👧", "🧒", "🤰", "🤱", "🍼", "🧸", "🎈", "🎂", "💊", "🛁", "🛌", "👚", "👟", "🏫", "🎨"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸", "🐵", "🐔", "🦄", "🐝", "🐞", "🦋"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪", "🍩", "🍫", "🍿", "🥤", "🧋", "☕"],
  "Cảm xúc": ["😡", "😱", "🥳", "😴", "🤔", "🙄", "🤐", "😪", "🤢", "🤧", "🤕", "🤠", "😇", "🤪", "🤫", "🤥"],
  "Hoạt động": ["🏃", "🧘", "🏋️", "🚴", "🏊", "🤸", "🧗", "⛹️", "🎮", "🎳", "🎤", "🎧", "🎬", "🎨", "🧶", "📚"],
  "Thiên nhiên": ["🌸", "🌹", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🍀", "🍁", "🍄", "🐚", "🌞", "🌈"],
  "Đồ vật": ["💻", "📱", "📷", "⌚", "💡", "📚", "✏️", "🎁", "🎈", "📫", "📅", "💼", "👓", "💍", "💄", "💅"],
  "Biểu tượng": ["✨", "🌟", "💫", "💥", "💢", "💦", "💤", "🎵", "🎶", "🚫", "✅", "🆗", "🆘", "🆙", "🆒", "🆕"]
};

const getTimeStatus = (lastActiveAt?: string) => {
    if (!lastActiveAt) return 'Không hoạt động';
    const diff = Date.now() - new Date(lastActiveAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return 'Đang hoạt động'; 
    if (minutes < 60) return `Hoạt động ${minutes} phút trước`;
    if (minutes < 1440) return `Hoạt động ${Math.floor(minutes / 60)} giờ trước`;
    return 'Không hoạt động';
};

export const ChatDetail: React.FC<ChatDetailProps> = ({ currentUser, onOpenAuth }) => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [targetUser, setTargetUser] = useState<User | null>(null);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<Message[]>([]); 

    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);

    // --- State cho Menu Xóa ---
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Xử lý đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToUser(userId, (user) => {
            if (user) setTargetUser(user);
        });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        let isMounted = true;
        const loadMessages = async () => {
            if (!currentUser || !userId) return;
            try {
                const fetchedMsgs = await getMessages(currentUser.id, userId);
                if (!isMounted) return;

                if (fetchedMsgs.length > messagesRef.current.length || 
                    (fetchedMsgs.length > 0 && fetchedMsgs[fetchedMsgs.length - 1].id !== messagesRef.current[messagesRef.current.length - 1]?.id)) {
                    
                    setMessages(fetchedMsgs);
                    
                    if (messagesContainerRef.current) {
                        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                        if (isNearBottom) {
                            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }
                    }
                }
            } catch (error) {
                console.error("Lỗi tải tin nhắn:", error);
            }
        };
        
        loadMessages();
        const interval = setInterval(loadMessages, 2000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [currentUser.id, userId]);

    useLayoutEffect(() => {
        if (messages.length > 0) {
             scrollRef.current?.scrollIntoView({ behavior: 'auto' });
        }
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
        
        const tempId = `temp_${Date.now()}`;
        const tempMsg: Message = {
            id: tempId,
            senderId: currentUser.id,
            receiverId: userId, 
            content: content,
            type: type,
            createdAt: new Date().toISOString(),
            isRead: false
        };

        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        try {
            const user = await ensureAuth();
            await sendMessage(user.id, userId, content, type);
        } catch (error) {
            console.error("Gửi lỗi:", error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Gửi tin nhắn thất bại. Vui lòng thử lại.");
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

    const handleSendSticker = async (sticker: string) => {
        setShowStickers(false);
        await handleSend(sticker, 'text');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSubmit();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const user = await ensureAuth(); 
            const downloadUrl = await uploadFile(file, `chat_images/${user.id}_${userId}`);
            await handleSend(downloadUrl, 'image');
        } catch (error) {
            console.error("Image upload failed", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileUpload = () => { fileInputRef.current?.click(); };

    const isStickerMessage = (content: string, type: string) => {
        if (type !== 'text') return false;
        const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
        return emojiRegex.test(content) && [...content].length <= 3;
    };

    const handleDeleteChat = async (e: React.MouseEvent) => {
        // Ngăn sự kiện click lan ra ngoài gây đóng menu sai cách
        e.stopPropagation(); 
        
        console.log("Đã bấm nút xóa"); // Kiểm tra xem click có ăn không

        if (!userId || !currentUser) return;
        if (currentUser.isGuest) {
            alert("Vui lòng đăng nhập để thực hiện chức năng này.");
            return;
        }

        const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này không? Hành động này không thể hoàn tác.");
        
        if (confirmDelete) {
            try {
                setIsDeleting(true);
                setShowMenu(false);
                
                // OPTIMISTIC UPDATE: Xóa tin nhắn ngay lập tức trên UI
                setMessages([]); 

                console.log("Đang xóa chat...");
                await deleteConversation(currentUser.id, userId);
                console.log("Xóa thành công, chuyển trang...");
                navigate('/messages');
            } catch (error) {
                console.error("Xóa thất bại", error);
                alert("Có lỗi xảy ra khi xóa tin nhắn.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (!targetUser) return <div className="p-10 text-center flex items-center justify-center h-screen bg-white dark:bg-dark-bg"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const isOnline = targetUser.isOnline;
    const statusText = isOnline ? 'Đang hoạt động' : getTimeStatus(targetUser.lastActiveAt);
    const dotColor = isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-500';

    return (
        <div className="flex flex-col h-[100dvh] bg-[#E5DDD5] dark:bg-slate-900 fixed inset-0 z-50 overflow-hidden transition-colors duration-300">
            <div className="absolute inset-0 opacity-10 dark:opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
            
            {/* Header */}
            {/* Z-INDEX ĐÃ ĐƯỢC TĂNG LÊN z-40 ĐỂ MENU NẰM TRÊN */}
            <div className="bg-white dark:bg-dark-card px-4 py-2.5 flex items-center justify-between border-b border-gray-200 dark:border-dark-border shadow-sm pt-safe-top shrink-0 relative z-40 transition-colors">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="text-primary hover:bg-gray-50 dark:hover:bg-slate-700 p-2 rounded-full -ml-2 active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
                    <div className="relative"><img src={targetUser.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-slate-600" />{targetUser.isExpert && <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-dark-card"><ShieldCheck size={12} /></div>}</div>
                    <div className="ml-1"><h2 className="font-bold text-textDark dark:text-white text-[16px] leading-tight flex items-center gap-1">{targetUser.name}</h2><span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 transition-colors ${isOnline ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>{statusText}</span></div>
                </div>
                
                {/* MENU BUTTON */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)} 
                        className={`p-2 rounded-full text-primary active:scale-95 transition-colors ${showMenu ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                    >
                        {isDeleting ? <Loader2 size={22} className="animate-spin" /> : <MoreVertical size={22} />}
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1 overflow-hidden animate-fade-in z-50">
                            <button 
                                onClick={(e) => handleDeleteChat(e)}
                                disabled={isDeleting}
                                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors active:bg-red-100 dark:active:bg-red-900/20"
                            >
                                <Trash2 size={18} />
                                <span className="font-medium">Xóa cuộc trò chuyện</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 w-full relative z-10 scroll-smooth" onClick={() => setShowStickers(false)}>
                {(messages.length === 0 && currentUser.isGuest) && (<div className="text-center py-12 px-6"><div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm inline-block"><p className="text-sm font-bold text-primary mb-1">Chế độ Khách 🕵️</p><p className="text-xs text-textGray dark:text-gray-400">Tin nhắn của bạn sẽ được gửi ẩn danh.</p></div></div>)}
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const prevMsg = messages[idx - 1];
                    const nextMsg = messages[idx + 1];
                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                    const isSticker = isStickerMessage(msg.content, msg.type);
                    const isStoryReply = msg.type === 'story_reply';
                    const radiusClass = isMe ? `${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl` : `${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl`;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-0.5 animate-slide-up`}>
                            {!isMe && (<div className="w-8 mr-2 flex flex-col justify-end">{isLastInGroup ? (<img src={targetUser.avatar} className="w-8 h-8 rounded-full shadow-sm bg-white dark:bg-slate-700" />) : <div className="w-8" />}</div>)}
                            <div className={`max-w-[75%] shadow-sm relative ${radiusClass} ${msg.type === 'image' || isSticker ? 'p-1 bg-transparent shadow-none' : (isMe ? 'bg-primary text-white' : 'bg-white dark:bg-dark-card text-textDark dark:text-white')}`}>
                                {isStoryReply && msg.storySnapshotUrl && (<div className="mb-2 rounded-lg overflow-hidden relative cursor-pointer opacity-90 hover:opacity-100 transition-opacity border-l-4 border-white/50 pl-2"><div className="text-[10px] font-bold opacity-70 mb-1">Đã trả lời tin của bạn</div><img src={msg.storySnapshotUrl} className="w-16 h-24 object-cover rounded-md" /></div>)}
                                {msg.type === 'image' ? (<img src={msg.content} className={`w-full rounded-2xl max-w-[200px] border ${isMe ? 'border-primary/30' : 'border-white dark:border-slate-700'}`} loading="lazy" onClick={() => window.open(msg.content, '_blank')} />) : isSticker ? (<div className="text-5xl md:text-6xl p-1 animate-pop-in leading-none cursor-default select-none">{msg.content}</div>) : (<div className="px-3.5 py-2"><p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.content}</p></div>)}
                                {(isLastInGroup || msg.type === 'image' || isSticker) && (<span className={`text-[9px] font-medium absolute bottom-1 ${isMe ? 'right-2 text-white/80' : 'left-2 text-gray-400 dark:text-gray-500'} ${(msg.type === 'image' || isSticker) ? 'hidden' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>)}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-1" />
            </div>
            {showScrollDown && (<button onClick={scrollToBottom} className="absolute bottom-20 right-4 z-30 bg-white/90 dark:bg-slate-700/90 backdrop-blur text-primary p-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-600 animate-bounce-small"><ChevronDown size={24} /></button>)}
            <div className="bg-white dark:bg-dark-card px-3 py-2 border-t border-gray-200 dark:border-dark-border shrink-0 w-full relative z-20 pb-safe-bottom flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-colors">
                <form onSubmit={handleTextSubmit} className="flex items-end gap-2">
                    <div className="flex items-center gap-1 pb-2">
                        <button type="button" onClick={() => setShowStickers(!showStickers)} className={`p-2 rounded-full transition-colors active:scale-95 ${showStickers ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' : 'text-primary hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{showStickers ? <X size={24} /> : <Plus size={24} />}</button>
                        <button type="button" onClick={triggerFileUpload} className="text-primary p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors active:scale-95">{isUploading ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}</button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-[1.5rem] px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white dark:focus-within:bg-slate-900 border border-transparent focus-within:border-primary/30 transition-all"><textarea ref={textareaRef} value={newMessage} onChange={e => { setNewMessage(e.target.value); setShowStickers(false); }} onKeyDown={handleKeyDown} onClick={() => setShowStickers(false)} placeholder="Nhắn tin..." className="w-full bg-transparent border-none outline-none text-[15px] text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none max-h-[120px] py-1" rows={1} /></div>
                    <button type="submit" disabled={!newMessage.trim()} className="mb-1 text-white bg-primary p-3 rounded-full shadow-lg shadow-primary/30 active:scale-90 disabled:opacity-50 disabled:shadow-none transition-all"><Send size={20} className={newMessage.trim() ? "ml-0.5" : ""} /></button>
                </form>
                {showStickers && (<div className="h-64 overflow-y-auto bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 p-4 animate-slide-up rounded-t-2xl mt-2 select-none transition-colors">{Object.entries(STICKER_PACKS).map(([category, emojis]) => (<div key={category} className="mb-4"><h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider sticky top-0 bg-gray-50 dark:bg-slate-800 py-1 z-10">{category}</h4><div className="grid grid-cols-5 md:grid-cols-8 gap-4">{emojis.map(emoji => (<button key={emoji} onClick={() => handleSendSticker(emoji)} className="text-3xl hover:scale-125 transition-transform active:scale-90 p-2 cursor-pointer">{emoji}</button>))}</div></div>))}</div>)}
            </div>
        </div>
    );
};
