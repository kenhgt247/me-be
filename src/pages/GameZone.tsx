import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, Star, Trophy, Home, Moon, Bell, Bot, Search } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- IMPORT TYPES & SERVICES ---
import { Game, GameAsset, CategoryDef } from '../types';
import { fetchAllGames, fetchCategories } from '../services/game';
// import { generateStory } from '../services/gemini'; // Bỏ comment nếu dùng AI

// --- SOUND UTILS ---
const useAudio = (url?: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (url) {
        audioRef.current = new Audio(url);
        audioRef.current.load();
    }
  }, [url]);

  const play = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }
  };
  return play;
};

// --- UI COMPONENTS ---
const BouncyButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, onClick, className, ...props }) => (
  <button 
    onClick={(e) => {
      const btn = e.currentTarget;
      btn.style.transform = "scale(0.9)";
      setTimeout(() => btn.style.transform = "scale(1)", 150);
      onClick && onClick(e);
    }}
    className={`transition-transform duration-150 active:scale-90 ${className}`}
    {...props}
  >
    {children}
  </button>
);

// --- VICTORY SCREEN ---
const VictoryScreen: React.FC<{ onBack: () => void; score: number; total: number }> = ({ onBack, score, total }) => {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FF69B4', '#00BFFF'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFD700', '#FF69B4', '#00BFFF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#FFF9C4] flex flex-col items-center justify-center animate-fade-in">
      <div className="relative mb-8">
         <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-50 rounded-full animate-pulse"></div>
         <Trophy size={140} className="text-yellow-500 relative z-10 drop-shadow-2xl animate-bounce" />
         <div className="absolute -top-4 -right-4 bg-red-500 text-white font-black text-xl w-12 h-12 rounded-full flex items-center justify-center rotate-12 shadow-lg">
            {score}/{total}
         </div>
      </div>
      <h2 className="text-5xl font-black text-orange-600 mb-2 drop-shadow-sm">HOAN HÔ!</h2>
      <p className="text-xl text-gray-600 mb-10 font-bold">Bé thật là xuất sắc!</p>
      <div className="flex gap-4">
        <BouncyButton onClick={onBack} className="bg-white border-4 border-orange-200 text-orange-500 p-4 rounded-full shadow-lg">
          <Home size={32} />
        </BouncyButton>
        <BouncyButton onClick={onBack} className="bg-gradient-to-b from-orange-400 to-orange-600 text-white text-xl font-bold px-12 py-4 rounded-full shadow-xl border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all">
          CHƠI TIẾP
        </BouncyButton>
      </div>
    </div>
  );
};

// --- GAME ENGINE ---
const UniversalGameEngine: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const playCorrect = useAudio((game as any).config?.correctSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-3.mp3'); 
  const playWrong = useAudio((game as any).config?.wrongSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-10.mp3');
  const playWin = useAudio('https://www.soundjay.com/misc/sounds/magic-chime-01.mp3');

  const levels = game.levels || [];
  const currentLevel = levels[currentLevelIdx];

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; u.rate = 0.9; u.pitch = 1.1; 
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (currentLevel?.instruction) {
      setTimeout(() => {
        if(currentLevel.instruction.audioUrl) {
            new Audio(currentLevel.instruction.audioUrl).play().catch(() => {});
        } else {
            speak(currentLevel.instruction.text);
        }
      }, 600);
    }
  }, [currentLevelIdx, currentLevel]);

  const handleAssetClick = (asset: GameAsset) => {
    if (game.gameType === 'quiz') {
      if (asset.id === currentLevel.correctAnswerId) {
        playCorrect && playCorrect();
        speak("Đúng rồi! Bé giỏi quá!");
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setScore(s => s + 1);
        setTimeout(() => {
          if (currentLevelIdx < levels.length - 1) setCurrentLevelIdx(i => i + 1);
          else { playWin && playWin(); setGameFinished(true); }
        }, 1500);
      } else {
        playWrong && playWrong();
        speak("Sai rồi, bé thử lại nhé!");
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 500);
      }
    } else if (game.gameType === 'flashcard') {
      if(asset.audioUrl) new Audio(asset.audioUrl).play().catch(() => {});
      else speak(asset.text || "");
    }
  };

  if (gameFinished) return <VictoryScreen onBack={onBack} score={score} total={levels.length} />;
  if (!currentLevel) return <div className="p-10 text-center text-gray-500 font-bold">Đang tải màn chơi...</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-[#E0F7FA] flex flex-col h-[100dvh] overflow-hidden">
      <div className="p-4 flex items-center justify-between pt-safe-top">
        <BouncyButton onClick={onBack} className="bg-white p-3 rounded-full shadow-md text-gray-600"><ArrowLeft /></BouncyButton>
        <div className="flex-1 mx-4 h-6 bg-white rounded-full p-1 shadow-inner relative">
            <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700 ease-out relative" style={{ width: `${((currentLevelIdx + 1) / levels.length) * 100}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-lg border-2 border-green-500">🐸</div>
            </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-md font-black text-orange-500 flex items-center gap-1 text-lg"><Star fill="currentColor" className="text-yellow-400" /> {score}</div>
      </div>
      <div className={`flex-1 flex flex-col items-center justify-center p-4 relative transition-transform duration-100 ${isWrong ? 'translate-x-[-10px]' : ''}`}>
        <div onClick={() => speak(currentLevel.instruction.text)} className="mb-6 cursor-pointer transform hover:scale-105 transition-transform">
           {currentLevel.instruction.imageUrl ? (
               <div className="p-4 bg-white rounded-3xl shadow-xl rotate-1"><img src={currentLevel.instruction.imageUrl} className="h-48 object-contain rounded-xl" alt="Instruction" /></div>
           ) : (
               <h2 className="text-3xl md:text-5xl font-black text-center text-blue-600 drop-shadow-sm bg-white/80 backdrop-blur px-8 py-4 rounded-3xl shadow-lg border-b-8 border-blue-200">
                   {currentLevel.instruction.text} <Volume2 className="inline ml-2 text-blue-400" />
               </h2>
           )}
        </div>
        <div className={`grid gap-4 w-full max-w-4xl ${currentLevel.items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {currentLevel.items.map((item, idx) => (
                <BouncyButton key={idx} onClick={() => handleAssetClick(item)} className="aspect-square bg-white rounded-[2rem] shadow-[0_8px_0_rgb(0,0,0,0.1)] border-4 border-white flex flex-col items-center justify-center p-4 hover:bg-blue-50 hover:scale-[1.02] transition-all group relative overflow-hidden active:shadow-none active:translate-y-[8px]">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain pointer-events-none group-hover:rotate-6 transition-transform duration-300" alt="Option" /> : <span className="text-4xl md:text-6xl font-black text-slate-700 group-hover:text-blue-600">{item.text}</span>}
                </BouncyButton>
            ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-[url('https://i.imgur.com/Kx6vFqg.png')] bg-contain bg-repeat-x opacity-30 pointer-events-none"></div>
    </div>
  );
};

// --- MAIN PAGE: GAME ZONE ---

export const GameZone: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [g, c] = await Promise.all([fetchAllGames(true), fetchCategories()]);
      setGames(g); setCategories(c); setLoading(false);
    };
    load();
  }, []);

  if (activeGame) return <UniversalGameEngine game={activeGame} onBack={() => setActiveGame(null)} />;

  const filteredGames = games.filter(g => !activeCategory || activeCategory === 'all' || g.category === activeCategory);

  return (
    <div className="min-h-screen pb-24 bg-[#E0F7FA] dark:bg-slate-950 flex flex-col overflow-x-hidden transition-colors">
      
      {/* --- HEADER CHUẨN APP (GIẢ LẬP) --- */}
      {/* Đây là phần giúp Logo và Chuông hiện ra như trang Tin Nhắn */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center shadow-sm border-b border-gray-100">
         <div className="text-2xl font-bold text-teal-600 tracking-tight">Asking.vn</div>
         <div className="flex items-center gap-2 text-gray-500">
            <button className="p-2 rounded-full hover:bg-gray-100"><Moon size={22} /></button>
            <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell size={22} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-1.5 rounded-full bg-indigo-100 text-indigo-600"><Bot size={22} /></button>
         </div>
      </div>
      {/* ---------------------------------- */}

      <div className="px-6 py-6">
        {/* Tiêu đề trang */}
        <div className="mb-6 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span className="animate-bounce">🎡</span> Góc Bé Chơi
                </h1>
                <p className="text-gray-500 font-medium ml-1">Vui học mỗi ngày</p>
            </div>
            {activeCategory && (
                <BouncyButton onClick={() => setActiveCategory(null)} className="bg-white p-2 rounded-full shadow-md border text-gray-500">
                    <ArrowLeft size={20} />
                </BouncyButton>
            )}
        </div>

        {/* Loading */}
        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}

        {/* Màn hình chính */}
        {!loading && (
          <>
             {/* Danh sách danh mục */}
             <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-4 -mx-6 px-6">
                <button onClick={() => setActiveCategory('all')} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap shadow-sm border-2 transition-all ${!activeCategory || activeCategory === 'all' ? 'bg-[#FF7043] text-white border-[#FF7043]' : 'bg-white text-gray-500 border-gray-200'}`}>
                    Tất cả
                </button>
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2.5 rounded-full font-bold whitespace-nowrap shadow-sm border-2 flex items-center gap-2 transition-all ${activeCategory === cat.id ? `${cat.color.replace('bg-', 'bg-')} text-white border-transparent` : 'bg-white text-gray-500 border-gray-200'}`}>
                        <span>{cat.icon}</span> {cat.label}
                    </button>
                ))}
            </div>

            {/* Banner AI (Chỉ hiện khi ở tab Tất cả) */}
            {(!activeCategory || activeCategory === 'all') && (
                <div className="mb-8">
                    <button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-xl flex items-center justify-between group relative overflow-hidden">
                        <div className="relative z-10 text-left">
                            <div className="bg-white/20 backdrop-blur-md inline-flex px-3 py-1 rounded-lg text-xs font-bold mb-2">Mới nhất</div>
                            <h3 className="text-2xl font-black mb-1">AI Kể Chuyện</h3>
                            <p className="text-white/90 text-sm font-bold">Bé chọn nhân vật, AI kể chuyện!</p>
                        </div>
                        <span className="text-6xl group-hover:scale-110 transition-transform">🧚‍♀️</span>
                    </button>
                </div>
            )}

            {/* Danh sách Game */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {games.filter(g => !activeCategory || activeCategory === 'all' || g.category === activeCategory).map(game => (
                    <div key={game.id} onClick={() => setActiveGame(game)} className="bg-white rounded-[1.5rem] p-4 shadow-sm border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all active:scale-95 group">
                        <div className={`h-32 rounded-2xl ${game.color} flex items-center justify-center text-6xl shadow-inner mb-4 group-hover:rotate-3 transition-transform`}>
                            {game.icon}
                        </div>
                        <div className="px-1">
                            <h3 className="text-lg font-black text-gray-800 line-clamp-1">{game.title}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{game.gameType}</span>
                                <div className="flex text-yellow-400 gap-0.5">
                                    <Star size={14} fill="currentColor" />
                                    <Star size={14} fill="currentColor" />
                                    <Star size={14} fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameZone;
