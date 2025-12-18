import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Sparkles, ArrowLeft, Loader2, Sparkles as SparklesIcon } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export const AiChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Chat with Welcome Message
  useEffect(() => {
    setMessages([
      {
        role: 'model',
        text: 'Chào mẹ! Mình là Trợ lý AI của Asking.vn. Mẹ đang lo lắng hay thắc mắc điều gì về bé yêu hay sức khỏe gia đình không? Hãy chia sẻ với mình nhé! 💖'
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    scrollToBottom();

    try {
      // @ts-ignore
      const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      
      let text = "Hệ thống đang bận, mẹ vui lòng thử lại sau nhé! 😓";

      if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const model = "gemini-2.5-flash";

          const prompt = `
            Bạn là Trợ lý AI thông thái và tận tâm của nền tảng Asking.vn (Cộng đồng Mẹ & Bé).
            Hãy trả lời câu hỏi sau đây của người dùng với giọng điệu thân thiện, đồng cảm, chuyên nghiệp nhưng gần gũi (xưng hô Mình - Mẹ/Bạn).
            Sử dụng Emoji phù hợp để cuộc trò chuyện sinh động.
            
            Câu hỏi: ${userMsg}
          `;

          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          
          text = response.text || text;
      } else {
          text = "Chức năng AI chưa được cấu hình (Thiếu API Key).";
      }

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Hệ thống đang bận, mẹ vui lòng thử lại sau nhé! 😓" }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    // THAY ĐỔI: bg-[#F0F2F5] -> dark:bg-dark-bg
    <div className="flex flex-col h-[100dvh] bg-[#F0F2F5] dark:bg-dark-bg fixed inset-0 z-[60] transition-colors duration-300">
      
      {/* Header */}
      <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-3 pt-safe-top shadow-sm z-10 shrink-0 transition-colors">
        <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all text-textDark dark:text-white"
        >
            <ArrowLeft size={22} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200 dark:shadow-none">
            <Bot size={22} />
        </div>
        <div>
            <h1 className="font-bold text-lg text-textDark dark:text-dark-text flex items-center gap-1">
                Trợ lý AI
                <SparklesIcon size={14} className="text-yellow-500 fill-yellow-500" />
            </h1>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Sẵn sàng hỗ trợ
            </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            return (
                <div key={idx} className={`flex items-start gap-3 ${isModel ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm 
                        ${isModel ? 'bg-white dark:bg-dark-card' : 'bg-gray-200 dark:bg-slate-700'}`}>
                        {isModel ? <Bot size={18} className="text-purple-600 dark:text-purple-400" /> : <User size={18} className="text-gray-600 dark:text-gray-300" />}
                    </div>
                    <div className={`
                        max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm whitespace-pre-line
                        ${isModel 
                            ? 'bg-white dark:bg-dark-card text-textDark dark:text-dark-text rounded-tl-none border border-gray-100 dark:border-dark-border' 
                            : 'bg-gradient-to-br from-primary to-[#26A69A] text-white rounded-tr-none'}
                    `}>
                        {msg.text}
                    </div>
                </div>
            )
        })}
        {isLoading && (
            <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-card flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={18} className="text-purple-600 dark:text-purple-400 animate-spin" />
                 </div>
                 <div className="bg-white dark:bg-dark-card px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-dark-border flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Đang suy nghĩ...</span>
                 </div>
            </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-dark-card p-3 border-t border-gray-100 dark:border-dark-border pb-safe-bottom shrink-0 transition-colors">
        <form onSubmit={handleSend} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-[1.5rem] p-1.5 border border-gray-200 dark:border-slate-700 focus-within:border-purple-300 dark:focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-50 dark:focus-within:ring-purple-900/20 transition-all">
            <input 
                ref={inputRef}
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi gì đó (Ví dụ: Bé bị sốt nên làm gì?)..." 
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm text-textDark dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none active:scale-90 transition-all"
            >
                <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
            </button>
        </form>
      </div>
    </div>
  );
};
