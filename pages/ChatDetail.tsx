
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, ShieldCheck, Loader2, Plus, X, ChevronDown } from 'lucide-react';
import { db } from '../firebaseConfig';
import { sendMessage, subscribeToMessages, getChatId, subscribeToUser } from '../services/db';
import { loginAnonymously } from '../services/auth';
import { uploadFile } from '../services/storage';
import { User, Message } from '../types';

interface ChatDetailProps {
  currentUser: User;
  onOpenAuth: () => void;
}

// Sticker Packs Data
const STICKER_PACKS = {
  "Cảm xúc": ["😀", "😂", "🥰", "😎", "😭", "😡", "😱", "🥳", "😴", "🤔"],
  "Yêu thương": ["❤️", "🧡", "💛", "💚", "💙", "💜", "💖", "💝", "💋", "💌"],
  "Mẹ & Bé": ["👶", "👧", "🧒", "🤰", "🤱", "🍼", "🧸", "🎈", "🎂", "💊"],
  "Động vật": ["🐶", "🐱", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐷", "🐸"],
  "Đồ ăn": ["🍎", "🍌", "🍉", "🍓", "🥕", "🌽", "🍕", "🍔", "🍦", "🍪"]
};

// Helper to calculate "Active X minutes ago"
const getTimeStatus = (lastActiveAt?: string) => {
    if (!lastActiveAt) return 'Không hoạt động';
    const diff = Date.now() - new Date(lastActiveAt).getTime();
    const minutes = Math.floor(diff / 60000);
    
    // Allow a buffer of 5 minutes before showing offline/time
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
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to Target User (Realtime Status)
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToUser(userId, (user) => {
            if (user) {
                setTargetUser(user);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    // Subscribe to Messages
    useEffect(() => {
        if (!currentUser || !userId || !targetUser) return;
        
        const chatId = getChatId(currentUser.id, userId);
        const unsubscribe = subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            // Only auto-scroll if user is already near bottom or it's the first load
            if (messagesContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                if (isNearBottom || msgs.length === 0) {
                     setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            } else {
                 setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        });
        return () => unsubscribe();
    }, [currentUser.id, userId, targetUser]);

    // Handle Scroll to show/hide "Scroll Down" button
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

    // Auto resize textarea
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
                console.error("Guest auth failed:", e);
                onOpenAuth();
                throw new Error("LOGIN_REQUIRED");
            }
        }
        return currentUser;
    };

    const handleSend = async (content: string, type: 'text' | 'image' = 'text') => {
        if (!content.trim() || !targetUser) return;
        
        try {
            const user = await ensureAuth();
            await sendMessage(user, targetUser, content, type);
            scrollToBottom();
        } catch (error) {
            console.error(error);
        }
    };

    const handleTextSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;
        
        const content = newMessage;
        setNewMessage('');
        if(textareaRef.current) textareaRef.current.style.height = 'auto'; // Reset height
        setShowStickers(false);
        
        await handleSend(content, 'text');
    };

    const handleSendSticker = async (sticker: string) => {
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
            const downloadUrl = await uploadFile(file, `chat_images/${getChatId(user.id, userId!)}`);
            await handleSend(downloadUrl, 'image');
        } catch (error) {
            console.error("Image upload failed", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    // Helper to detect if message is just stickers/emojis
    const isStickerMessage = (content: string, type: string) => {
        if (type !== 'text') return false;
        try {
            // Regex detects Emoji characters.
            const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
            return emojiRegex.test(content) && [...content].length <= 3;
        } catch (e) {
            // Fallback for browsers not supporting unicode property escapes
            return false; 
        }
    };

    if (!targetUser) return <div className="p-10 text-center flex items-center justify-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const isOnline = targetUser.isOnline;
    const statusText = isOnline ? 'Đang hoạt động' : getTimeStatus(targetUser.lastActiveAt);
    const dotColor = isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300';

    return (
        <div className="flex flex-col h-[100dvh] bg-[#E5DDD5] fixed inset-0 z-50 overflow-hidden">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" 
            }}></div>

            {/* Header */}
            <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-200 shadow-sm pt-safe-top shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="text-primary hover:bg-gray-50 p-2 rounded-full -ml-2 active:scale-95 transition-transform">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="relative">
                        <img src={targetUser.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                        {targetUser.isExpert && <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white"><ShieldCheck size={12} /></div>}
                    </div>
                    <div className="ml-1">
                        <h2 className="font-bold text-textDark text-[16px] leading-tight flex items-center gap-1">
                            {targetUser.name}
                        </h2>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 transition-colors ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                            {statusText}
                        </span>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full text-primary active:scale-95">
                    <MoreVertical size={22} />
                </button>
            </div>

            {/* Messages Area */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 w-full relative z-10 scroll-smooth"
                onClick={() => setShowStickers(false)} // Click outside closes stickers
            >
                {(messages.length === 0 && currentUser.isGuest) && (
                     <div className="text-center py-12 px-6">
                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm inline-block">
                            <p className="text-sm font-bold text-primary mb-1">Chế độ Khách 🕵️</p>
                            <p className="text-xs text-textGray">Tin nhắn của bạn sẽ được gửi ẩn danh.</p>
                        </div>
                    </div>
                )}
                
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const prevMsg = messages[idx - 1];
                    const nextMsg = messages[idx + 1];
                    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                    const isSticker = isStickerMessage(msg.content, msg.type);

                    const radiusClass = isMe 
                        ? `${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl`
                        : `${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl`;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-0.5 animate-slide-up`}>
                            {!isMe && (
                                <div className="w-8 mr-2 flex flex-col justify-end">
                                    {isLastInGroup ? (
                                        <img src={targetUser.avatar} className="w-8 h-8 rounded-full shadow-sm bg-white" />
                                    ) : <div className="w-8" />}
                                </div>
                            )}

                            <div className={`max-w-[75%] shadow-sm relative ${radiusClass} 
                                ${msg.type === 'image' || isSticker 
                                    ? 'p-1 bg-transparent shadow-none' 
                                    : (isMe ? 'bg-primary text-white' : 'bg-white text-textDark')}
                            `}>
                                {msg.type === 'image' ? (
                                    <img src={msg.content} className={`w-full rounded-2xl max-w-[200px] border ${isMe ? 'border-primary/30' : 'border-white'}`} loading="lazy" onClick={() => window.open(msg.content, '_blank')} />
                                ) : isSticker ? (
                                    <div className="text-5xl md:text-6xl p-1 animate-pop-in leading-none cursor-default select-none">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="px-3.5 py-2">
                                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.content}</p>
                                    </div>
                                )}
                                
                                {(isLastInGroup || msg.type === 'image' || isSticker) && (
                                    <span className={`text-[9px] font-medium absolute bottom-1 ${isMe ? 'right-2 text-white/80' : 'left-2 text-gray-400'} 
                                        ${(msg.type === 'image' || isSticker) ? 'hidden' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Scroll Down Button */}
            {showScrollDown && (
                <button 
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-4 z-30 bg-white/90 backdrop-blur text-primary p-2 rounded-full shadow-lg border border-gray-100 animate-bounce-small"
                >
                    <ChevronDown size={24} />
                </button>
            )}

            {/* Input Area */}
            <div className="bg-white px-3 py-2 border-t border-gray-200 shrink-0 w-full relative z-20 pb-safe-bottom flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <form onSubmit={handleTextSubmit} className="flex items-end gap-2">
                    <div className="flex items-center gap-1 pb-2">
                        <button 
                            type="button" 
                            onClick={() => setShowStickers(!showStickers)} 
                            className={`p-2 rounded-full transition-colors active:scale-95 ${showStickers ? 'bg-orange-100 text-orange-500' : 'text-primary hover:bg-gray-100'}`}
                        >
                            {showStickers ? <X size={24} /> : <Plus size={24} />}
                        </button>
                        
                        <button type="button" onClick={triggerFileUpload} className="text-primary p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                            {isUploading ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                        </button>

                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                            disabled={isUploading}
                        />
                    </div>

                    <div className="flex-1 bg-gray-100 rounded-[1.5rem] px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white border border-transparent focus-within:border-primary/30 transition-all">
                        <textarea 
                            ref={textareaRef}
                            value={newMessage}
                            onChange={e => {
                                setNewMessage(e.target.value);
                                setShowStickers(false);
                            }}
                            onKeyDown={handleKeyDown}
                            onClick={() => setShowStickers(false)}
                            placeholder="Nhắn tin..." 
                            className="w-full bg-transparent border-none outline-none text-[15px] text-textDark placeholder-gray-400 resize-none max-h-[120px] py-1"
                            rows={1}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()} 
                        className="mb-1 text-white bg-primary p-3 rounded-full shadow-lg shadow-primary/30 active:scale-90 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        <Send size={20} className={newMessage.trim() ? "ml-0.5" : ""} />
                    </button>
                </form>
                
                {/* Sticker Drawer */}
                {showStickers && (
                    <div className="h-64 overflow-y-auto bg-gray-50 border-t border-gray-100 p-4 animate-slide-up rounded-t-2xl mt-2 select-none">
                        {Object.entries(STICKER_PACKS).map(([category, emojis]) => (
                            <div key={category} className="mb-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider sticky top-0 bg-gray-50 py-1 z-10">{category}</h4>
                                <div className="grid grid-cols-5 md:grid-cols-8 gap-4">
                                    {emojis.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={() => handleSendSticker(emoji)}
                                            className="text-3xl hover:scale-125 transition-transform active:scale-90 p-2 cursor-pointer"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
