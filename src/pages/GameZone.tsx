import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, Star, Trophy, Sparkles, Play, Loader2, RotateCcw, ArrowDown, Moon, Sun, Bell, Bot } from 'lucide-react';
import { Game, GameLevel, GameCategory, CategoryDef, GameAsset } from '../types';
// Import từ service
import { fetchAllGames, fetchCategories } from '../services/game';
import { generateStory } from '../services/gemini';
import confetti from 'canvas-confetti';

// =============================================================================
//  UTILS UI
// =============================================================================

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

const RotateDeviceOverlay: React.FC<{ orientation?: 'portrait' | 'landscape' }> = ({ orientation }) => {
  if (!orientation || orientation === 'auto') return null;
  return (
    <div className={`fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white p-6 text-center 
            ${orientation === 'landscape' ? 'md:hidden landscape:hidden' : 'portrait:hidden'}`}>
      <RotateCcw size={64} className="mb-6 animate-bounce" />
      <h2 className="text-2xl font-bold mb-2">Vui lòng xoay thiết bị</h2>
      <p className="text-gray-300">Bé hãy xoay màn hình để chơi nhé!</p>
    </div>
  );
};

// =============================================================================
//  GAME ENGINES
// =============================================================================

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

const UniversalGameEngine: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const levels = game.levels || [];
  const currentLevel = levels[currentLevelIdx];

  const playCorrect = useAudio((game as any).config?.correctSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-3.mp3'); 
  const playWrong = useAudio((game as any).config?.wrongSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-10.mp3');
  const playWin = useAudio('https://www.soundjay.com/misc/sounds/magic-chime-01.mp3');

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (game as any).category === 'english' ? 'en-US' : 'vi-VN';
    u.rate = 0.9;
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
      }, 500);
    }
  }, [currentLevelIdx, currentLevel]);

  const handleCorrect = () => {
    playCorrect && playCorrect();
    speak("Đúng rồi! Bé giỏi quá!");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setShowSuccessModal(true);
    setScore(s => s + 1);
    setTimeout(() => {
      setShowSuccessModal(false);
      if (currentLevelIdx < levels.length - 1) setCurrentLevelIdx(i => i + 1);
      else { playWin && playWin(); setGameFinished(true); speak("Chúc mừng bé đã hoàn thành!"); }
    }, 2000);
  };

  const handleWrong = () => {
    playWrong && playWrong();
    speak("Sai rồi, thử lại nhé!");
    setIsWrong(true);
    setTimeout(() => setIsWrong(false), 500);
  };

  const handleAssetClick = (asset: GameAsset) => {
    if (game.gameType === 'quiz') {
      if (asset.id === currentLevel.correctAnswerId) handleCorrect();
      else handleWrong();
    } else if (game.gameType === 'flashcard') {
       if(asset.audioUrl) new Audio(asset.audioUrl).play().catch(() => {});
       else speak(asset.text || "");
       confetti({ particleCount: 30, spread: 55, origin: { y: 0.65 } });
       setScore(s => s + 1);
       setTimeout(() => {
         if (currentLevelIdx < levels.length - 1) setCurrentLevelIdx(i => i + 1);
         else { playWin && playWin(); setGameFinished(true); }
       }, 650);
    }
  };

  if (gameFinished) return (
    <div className="fixed inset-0 z-[100] bg-[#FFF9C4] dark:bg-slate-900 flex flex-col items-center justify-center animate-fade-in">
      <Trophy size={120} className="text-yellow-500 mb-4 animate-bounce" />
      <h2 className="text-4xl font-black text-orange-600 dark:text-orange-400 mb-4">Hoan hô!</h2>
      <BouncyButton onClick={onBack} className="bg-orange-500 text-white text-xl font-bold px-12 py-4 rounded-full shadow-xl">Chơi trò khác</BouncyButton>
    </div>
  );

  if (!currentLevel) return <div className="p-10 text-center dark:text-white">Đang tải...</div>;

  const progressPct = levels.length > 0 ? ((currentLevelIdx + 1) / levels.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#E0F7FA] dark:bg-slate-950 flex flex-col h-[100dvh]">
      <div className="p-4 flex justify-between items-center pt-safe-top">
        <BouncyButton onClick={onBack} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-md dark:text-white"><ArrowLeft /></BouncyButton>
        <div className="flex-1 mx-4 h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} /></div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm font-black text-yellow-500 flex items-center gap-2"><Star fill="currentColor" /> {score}</div>
      </div>
      <div className={`flex-1 flex flex-col items-center justify-center p-4 ${isWrong ? 'animate-shake' : ''}`}>
        <div onClick={() => speak(currentLevel.instruction.text)} className="mb-8 cursor-pointer">
           {currentLevel.instruction.imageUrl ? <img src={currentLevel.instruction.imageUrl} className="h-48 object-contain rounded-xl shadow-lg" /> : <h2 className="text-4xl font-black text-blue-600 dark:text-blue-400 text-center">{currentLevel.instruction.text}</h2>}
        </div>
        <div className={`grid gap-4 w-full max-w-4xl ${currentLevel.items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {currentLevel.items.map((item, idx) => (
                <BouncyButton key={idx} onClick={() => handleAssetClick(item)} className="aspect-square bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg flex flex-col items-center justify-center p-4 dark:border dark:border-slate-700">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain" /> : <span className="text-4xl font-bold text-slate-700 dark:text-white">{item.text}</span>}
                </BouncyButton>
            ))}
        </div>
        {showSuccessModal && <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm pointer-events-none"><div className="text-4xl font-black text-green-600 animate-bounce">Đúng rồi! 🎉</div></div>}
      </div>
    </div>
  );
};

const StoryReader: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const toggleRead = () => {
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); }
    else { const u = new SpeechSynthesisUtterance(game.storyContent || ""); u.lang = 'vi-VN'; u.onend = () => setIsPlaying(false); window.speechSynthesis.speak(u); setIsPlaying(true); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-[#FFF8E1] dark:bg-slate-900 flex flex-col h-[100dvh]">
      <div className="px-4 py-3 flex justify-between bg-white/50 dark:bg-slate-800/50 backdrop-blur-md pt-safe-top"><button onClick={onBack} className="dark:text-white"><ArrowLeft /></button><h2 className="font-bold text-lg dark:text-white">{game.title}</h2><div className="w-6"></div></div>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 prose prose-lg dark:prose-invert max-w-none">{game.storyContent ? game.storyContent.split('\n').map((p, i) => <p key={i} className="dark:text-gray-300">{p}</p>) : <p>Chưa có nội dung.</p>}</div>
      <div className="p-6 flex justify-center"><button onClick={toggleRead} className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold flex gap-2">{isPlaying ? <Volume2 className="animate-pulse" /> : <Play />} {isPlaying ? 'Dừng' : 'Đọc truyện'}</button></div>
    </div>
  );
};

const Html5Player: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  if (!game.gameUrl) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
      <RotateDeviceOverlay orientation={(game as any).orientation} />
      <div className="h-10 bg-gray-900 flex items-center px-4"><button onClick={onBack} className="text-white flex items-center gap-2 font-bold bg-white/10 px-3 py-1 rounded-full"><ArrowLeft size={16} /> Thoát</button></div>
      <iframe src={game.gameUrl} className="flex-1 w-full h-full border-none" allowFullScreen />
    </div>
  );
};

const AiStoryTeller: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [char, setChar] = useState('');
  const [lesson, setLesson] = useState('');
  const [story, setStory] = useState<{ title: string, content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const handleGenerate = async () => {
    setLoading(true);
    try { const res = await generateStory(char, lesson); setStory(res); setStep(3); } 
    catch (e) { alert("Lỗi kết nối AI"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-indigo-900 to-purple-900 text-white flex flex-col h-[100dvh]">
      <div className="p-4 pt-safe-top"><button onClick={onBack}><ArrowLeft /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        {step === 1 && <><h3 className="text-2xl font-bold mb-6">Bé chọn nhân vật nhé?</h3><div className="grid grid-cols-2 gap-4">{['Thỏ con', 'Gấu Pooh', 'Khủng long', 'Công chúa'].map(c => (<button key={c} onClick={() => { setChar(c); setStep(2); }} className="bg-white/10 p-6 rounded-2xl font-bold">{c}</button>))}</div></>}
        {step === 2 && !loading && <><h3 className="text-2xl font-bold mb-6">Câu chuyện về bài học gì?</h3><div className="grid grid-cols-1 gap-3 w-full">{['Lòng dũng cảm', 'Sự thật thà', 'Tình bạn'].map(l => (<button key={l} onClick={() => { setLesson(l); handleGenerate(); }} className="bg-white/10 p-4 rounded-xl font-bold">{l}</button>))}</div></>}
        {loading && <Loader2 className="animate-spin" size={40} />}
        {step === 3 && story && <StoryReader game={{ id: 'temp', title: story.title, storyContent: story.content, gameType: 'story', icon: '🤖', color: '', minAge: 0, maxAge: 0, isActive: true, config: {}, levels: [], totalPlays: 0, createdAt: '', updatedAt: '', order: 0, slug: '', category: 'story' } as any} onBack={onBack} />}
      </div>
    </div>
  );
};

// =============================================================================
//  MAIN HUB - GAME ZONE
// =============================================================================

const PAGE_SIZE = 12;

export const GameZone: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [activeCategory, setActiveCategory] = useState<GameCategory | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [aiStoryMode, setAiStoryMode] = useState(false);
  
  // STATE CHO DARK MODE
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra theme hiện tại
    if (document.documentElement.classList.contains('dark')) {
        setIsDarkMode(true);
    }

    // 2. Load Data
    const load = async () => {
      setLoading(true);
      const [gamesData, catsData] = await Promise.all([fetchAllGames(true), fetchCategories()]);
      setGames(gamesData);
      setCategories(catsData);
      setLoading(false);
    };
    load();
  }, []);

  // --- HÀM TOGGLE THEME (SỬA LỖI SÁNG TỐI) ---
  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDarkMode(false);
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDarkMode(true);
    }
  };

  if (aiStoryMode) return <AiStoryTeller onBack={() => setAiStoryMode(false)} />;
  if (activeGame) {
    if (activeGame.gameType === 'html5') return <Html5Player game={activeGame} onBack={() => setActiveGame(null)} />;
    if (activeGame.gameType === 'story') return <StoryReader game={activeGame} onBack={() => setActiveGame(null)} />;
    return <UniversalGameEngine game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  const filteredGames = games.filter(g => activeCategory ? (g.category === activeCategory || (activeCategory === 'general' && !(g as any).category)) : true);
  const visibleGames = filteredGames.slice(0, visibleCount);

  return (
    <div className="min-h-screen pb-24 bg-[#E0F7FA] dark:bg-slate-950 flex flex-col pt-16 overflow-x-hidden transition-colors">
      
      {/* ================================================== */}
      {/* 🟢 HEADER CHUẨN APP (Đã thêm Logic Toggle Theme) */}
      {/* ================================================== */}
      <header className="md:hidden fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 px-4 py-2 flex justify-between items-center shadow-sm">
        <a className="text-xl font-black text-blue-600 dark:text-blue-400" href="/" data-discover="true">Asking.vn</a>
        <div className="flex items-center gap-3">
            {/* 👇 NÚT NÀY ĐÃ ĐƯỢC GẮN HÀM TOGGLE 👇 */}
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full transition-all duration-300 bg-orange-50 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-yellow-400 dark:hover:bg-slate-600 shadow-sm border border-gray-200 dark:border-slate-600" 
                aria-label="Chuyển chế độ tối/sáng" 
                title="Bật chế độ sáng"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <a className="relative w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 dark:text-gray-200" href="/notifications" data-discover="true">
                <Bell size={20} />
            </a>
            <a className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white shadow" href="/ai-chat" data-discover="true">
                <Bot size={20} />
            </a>
        </div>
      </header>
      {/* ================================================== */}

      <div className="pt-4 pb-6 px-4 text-center relative bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm mb-4 mt-2">
        <h1 className="text-4xl md:text-5xl font-black text-blue-600 dark:text-blue-400 mb-2 drop-shadow-sm flex items-center justify-center gap-3">
          <span className="animate-bounce">🎡</span> Góc Bé Chơi
        </h1>
        {activeCategory && (
          <BouncyButton onClick={() => setActiveCategory(null)} className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-lg">
            <ArrowLeft size={24} className="text-gray-500" />
          </BouncyButton>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : !activeCategory ? (
        <div className="px-4 py-2 w-full max-w-5xl mx-auto pb-32">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <button onClick={() => setAiStoryMode(true)} className="col-span-2 bg-gradient-to-r from-pink-400 to-purple-500 p-6 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between group relative overflow-hidden min-h-[160px]">
              <div className="relative z-10 text-left">
                <div className="bg-white/20 backdrop-blur-md inline-flex px-3 py-1 rounded-lg text-xs font-bold mb-2">Mới nhất</div>
                <h3 className="text-3xl font-black mb-1">AI Kể Chuyện</h3>
                <p className="text-white/90 text-sm font-bold">Bé chọn nhân vật, AI kể chuyện!</p>
              </div>
              <span className="text-7xl group-hover:scale-110 transition-transform">🧚‍♀️</span>
            </button>

            {categories.map(cat => (
              <BouncyButton key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-lg ${cat.color} text-white border-b-8 border-black/10`}>
                <span className="text-5xl drop-shadow-md">{cat.icon}</span>
                <span className="font-bold text-xl">{cat.label}</span>
              </BouncyButton>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 pb-32 w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6 px-2 justify-center md:justify-start">
            <span className="text-4xl">{categories.find(c => c.id === activeCategory)?.icon}</span>
            <h2 className="text-3xl font-black text-blue-800 dark:text-blue-300">{categories.find(c => c.id === activeCategory)?.label}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleGames.map(game => (
              <div key={game.id} onClick={() => setActiveGame(game)} className="cursor-pointer bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] shadow-sm border-2 border-blue-50 dark:border-slate-700 flex items-center gap-5 hover:shadow-xl hover:border-blue-300 transition-all group">
                <div className={`w-20 h-20 rounded-2xl ${(game as any).color} flex items-center justify-center text-4xl shadow-inner group-hover:rotate-12 transition-transform`}>
                  {(game as any).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-800 dark:text-white text-xl truncate group-hover:text-blue-600 transition-colors">{game.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="bg-gray-100 dark:bg-slate-700 text-xs font-bold px-2 py-1 rounded text-gray-500 uppercase">{(game as any).gameType}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Play fill="currentColor" />
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filteredGames.length && (
            <div className="flex justify-center mt-10">
              <button onClick={() => setVisibleCount(p => p + PAGE_SIZE)} className="bg-white px-6 py-3 rounded-full font-bold text-blue-600 shadow-md">Xem thêm</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameZone;
