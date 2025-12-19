import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Volume2,
  Star,
  Trophy,
  Play,
  Loader2,
  RotateCcw,
  Moon,
  Sun,
  Bell,
  Bot,
  Gamepad2,
  BookOpen,
  MonitorPlay
} from 'lucide-react';
import { Game, GameLevel, GameCategory, CategoryDef, GameAsset } from '../types';
import { fetchAllGames, fetchCategories } from '../services/game';
import { generateStory } from '../services/gemini';
import confetti from 'canvas-confetti';

// =============================================================================
//  UTILS & UI COMPONENTS
// =============================================================================

const BouncyButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  onClick,
  className,
  ...props
}) => (
  <button
    onClick={(e) => {
      const btn = e.currentTarget;
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => (btn.style.transform = 'scale(1)'), 150);
      onClick && onClick(e);
    }}
    className={`transition-transform duration-200 ease-out active:scale-90 select-none ${className}`}
    {...props}
  >
    {children}
  </button>
);

const RotateDeviceOverlay: React.FC<{ orientation?: 'portrait' | 'landscape' | 'auto' }> = ({
  orientation,
}) => {
  if (!orientation || orientation === 'auto') return null;
  return (
    <div
      className={`fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center text-white p-6 text-center 
      ${orientation === 'landscape' ? 'md:hidden landscape:hidden' : 'portrait:hidden'}`}
    >
      <RotateCcw size={64} className="mb-6 animate-spin-slow text-yellow-400" />
      <h2 className="text-2xl font-bold mb-2">Vui lòng xoay thiết bị</h2>
      <p className="text-gray-300">Bé hãy xoay màn hình để chơi tốt nhất nhé!</p>
    </div>
  );
};

// --- EMOJI & TEXT UTILS ---

const getTwemojiUrl = (emoji: string) => {
  try {
    const codePoints = Array.from(emoji)
      .map(char => char.codePointAt(0)?.toString(16))
      .filter(Boolean)
      .join('-');
    return codePoints ? `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints}.png` : '';
  } catch {
    return '';
  }
};

const splitLeadingEmoji = (text?: string) => {
  const t = String(text ?? '').trim();
  if (!t) return { emoji: '', rest: '' };
  
  // Regex bắt emoji phổ biến
  const regex = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u;
  const match = t.match(regex);

  if (match) {
    return { emoji: match[1], rest: match[2].trim() };
  }
  return { emoji: '', rest: t };
};

const EmojiIcon: React.FC<{ emoji: string; className?: string }> = ({ emoji, className }) => {
  const url = useMemo(() => getTwemojiUrl(emoji), [emoji]);
  if (!url) return <span className="text-4xl">{emoji}</span>;
  return (
    <img
      src={url}
      alt={emoji}
      className={`${className || 'w-12 h-12'} object-contain pointer-events-none select-none`}
      loading="lazy"
    />
  );
};

// --- AUDIO HOOKS ---

const useAudio = (url?: string, opts?: { volume?: number; loop?: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = opts?.volume ?? 1;
    audio.loop = opts?.loop ?? false;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url, opts?.volume, opts?.loop]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const start = () => audioRef.current?.play().catch(() => {});

  return { play, stop, start };
};

const useSafeSpeech = (lang: 'vi-VN' | 'en-US') => {
  const speak = (text?: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => window.speechSynthesis.cancel(), []);
  return speak;
};

// =============================================================================
//  GAME ENGINE (FIXED #300 ERROR)
// =============================================================================

const PRAISE_VI = ['Đúng rồi! Bé giỏi quá!', 'Xuất sắc!', 'Tuyệt vời!', 'Bé thông minh lắm!'];
const PRAISE_EN = ['Great job!', 'Awesome!', 'You did it!', 'Fantastic!'];

const UniversalGameEngine: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const levels = useMemo(() => Array.isArray(game.levels) ? game.levels : [], [game.levels]);
  const currentLevel = levels[currentLevelIdx];
  const lang = (game as any).category === 'english' ? 'en-US' : 'vi-VN';
  
  // --- ✅ FIX: GỌI HOOKS TRƯỚC KHI RETURN ---
  const speak = useSafeSpeech(lang);
  
  const correctSound = (game as any).config?.correctSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-3.mp3';
  const wrongSound = (game as any).config?.wrongSoundUrl || 'https://www.soundjay.com/buttons/sounds/button-10.mp3';
  const winSound = 'https://www.soundjay.com/misc/sounds/magic-chime-01.mp3';

  const { play: playCorrect } = useAudio(correctSound, { volume: 0.8 });
  const { play: playWrong } = useAudio(wrongSound, { volume: 0.8 });
  const { play: playWin } = useAudio(winSound, { volume: 0.8 });
  
  const bgMusicUrl = (game as any).config?.bgMusicUrl;
  const { start: startBg, stop: stopBg } = useAudio(bgMusicUrl, { volume: 0.15, loop: true });

  // Tự động phát âm thanh hướng dẫn khi đổi level
  useEffect(() => {
    if (!currentLevel) return;
    
    // Auto start BG music on first interaction usually, but here we try on level load
    startBg();

    const timer = setTimeout(() => {
      if (currentLevel.instruction?.audioUrl) {
        new Audio(currentLevel.instruction.audioUrl).play().catch(() => {});
      } else {
        speak(currentLevel.instruction?.text);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentLevelIdx, currentLevel]); // eslint-disable-line

  useEffect(() => {
    return () => stopBg();
  }, []); // eslint-disable-line

  // --- LOGIC GAME ---

  const handleCorrect = () => {
    playCorrect();
    const praise = lang === 'en-US' 
      ? PRAISE_EN[Math.floor(Math.random() * PRAISE_EN.length)] 
      : PRAISE_VI[Math.floor(Math.random() * PRAISE_VI.length)];
    speak(praise);

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 999 });
    setShowSuccessModal(true);
    setScore(s => s + 1);

    setTimeout(() => {
      setShowSuccessModal(false);
      if (currentLevelIdx < levels.length - 1) {
        setCurrentLevelIdx(i => i + 1);
      } else {
        setGameFinished(true);
        playWin();
        speak(lang === 'en-US' ? 'Congratulations!' : 'Chúc mừng bé đã hoàn thành!');
      }
    }, 1200);
  };

  const handleWrong = () => {
    playWrong();
    speak(lang === 'en-US' ? 'Try again' : 'Sai rồi, thử lại nhé');
    setIsWrong(true);
    setTimeout(() => setIsWrong(false), 500);
  };

  const handleAssetClick = (asset: GameAsset) => {
    if (!currentLevel) return;

    if (game.gameType === 'flashcard') {
      // Flashcard Logic
      if (asset.audioUrl) new Audio(asset.audioUrl).play().catch(() => {});
      else speak(asset.text);
      
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      setScore(s => s + 1);
      
      setTimeout(() => {
        if (currentLevelIdx < levels.length - 1) setCurrentLevelIdx(i => i + 1);
        else {
          setGameFinished(true);
          playWin();
        }
      }, 800);
    } else {
      // Quiz Logic
      if (asset.id === currentLevel.correctAnswerId) handleCorrect();
      else handleWrong();
    }
  };

  // --- RENDER STATES (Safe Return) ---

  if (!levels || levels.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-blue-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🧩</div>
        <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Game này chưa có màn chơi</h2>
        <BouncyButton onClick={onBack} className="bg-blue-600 text-white px-6 py-2 rounded-full mt-4">
          Quay lại
        </BouncyButton>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="fixed inset-0 z-[100] bg-yellow-50 dark:bg-slate-900 flex flex-col items-center justify-center animate-fade-in p-6">
        <Trophy size={100} className="text-yellow-500 mb-6 animate-bounce" />
        <h2 className="text-3xl md:text-4xl font-black text-orange-600 dark:text-orange-400 mb-4 text-center">
          Hoan hô! Bé thắng rồi!
        </h2>
        <div className="flex gap-4">
          <BouncyButton onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-bold">
            Thoát
          </BouncyButton>
          <BouncyButton 
            onClick={() => {
              setGameFinished(false);
              setCurrentLevelIdx(0);
              setScore(0);
            }} 
            className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg"
          >
            Chơi lại
          </BouncyButton>
        </div>
      </div>
    );
  }

  const progressPct = ((currentLevelIdx + 1) / levels.length) * 100;
  const instSplit = splitLeadingEmoji(currentLevel?.instruction?.text);

  return (
    <div className="fixed inset-0 z-[100] bg-blue-50 dark:bg-slate-950 flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-md shadow-sm z-10 pt-safe-top">
        <BouncyButton onClick={onBack} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm text-gray-700 dark:text-white">
          <ArrowLeft size={24} />
        </BouncyButton>

        <div className="flex-1 mx-4 h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden border border-gray-100 dark:border-slate-600">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out rounded-full" 
            style={{ width: `${progressPct}%` }} 
          />
        </div>

        <div className="bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm font-black text-yellow-500 flex items-center gap-1.5 border border-yellow-100 dark:border-slate-600">
          <Star fill="currentColor" size={18} />
          <span>{score}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto ${isWrong ? 'animate-shake' : ''}`}>
        
        {/* Instruction */}
        <div 
          onClick={() => {
            if (currentLevel.instruction?.audioUrl) new Audio(currentLevel.instruction.audioUrl).play().catch(()=>{});
            else speak(currentLevel.instruction?.text);
          }}
          className="mb-8 cursor-pointer select-none transition-transform active:scale-95"
        >
          {currentLevel.instruction?.imageUrl ? (
            <img 
              src={currentLevel.instruction.imageUrl} 
              className="h-40 md:h-56 object-contain rounded-2xl shadow-xl bg-white dark:bg-slate-800 p-2" 
              alt="instruction"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {instSplit.emoji && <EmojiIcon emoji={instSplit.emoji} className="w-20 h-20 drop-shadow-lg" />}
              <h2 className="text-2xl md:text-4xl font-black text-blue-600 dark:text-blue-300 text-center drop-shadow-sm px-4">
                {instSplit.rest}
              </h2>
            </div>
          )}
        </div>

        {/* Answers Grid */}
        <div className={`grid gap-4 w-full max-w-4xl ${
          currentLevel.items.length <= 2 ? 'grid-cols-2' : 
          currentLevel.items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        }`}>
          {currentLevel.items.map((item, idx) => {
            const itemSplit = splitLeadingEmoji(item.text);
            return (
              <BouncyButton
                key={item.id || idx}
                onClick={() => handleAssetClick(item)}
                className="aspect-square bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-[0_8px_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-[4px] border-2 border-transparent hover:border-blue-200 dark:hover:border-slate-600 flex flex-col items-center justify-center p-3 transition-all"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.text} />
                ) : (
                  <>
                    {itemSplit.emoji && <EmojiIcon emoji={itemSplit.emoji} className="w-14 h-14 md:w-16 md:h-16 mb-2" />}
                    {itemSplit.rest && (
                      <span className="text-lg md:text-2xl font-bold text-slate-700 dark:text-slate-200 text-center leading-tight">
                        {itemSplit.rest}
                      </span>
                    )}
                  </>
                )}
              </BouncyButton>
            );
          })}
        </div>
      </div>

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-8 py-4 rounded-3xl shadow-2xl animate-bounce-in">
            <span className="text-4xl md:text-5xl font-black text-green-500 flex items-center gap-3">
              <Star fill="currentColor" className="animate-spin-slow text-yellow-400" /> 
              Giỏi quá!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  HTML5 PLAYER (SAFE)
// =============================================================================

const Html5Player: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const url = (game.gameUrl || '').trim();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh]">
      <RotateDeviceOverlay orientation={(game as any).orientation} />
      
      {/* Minimal Header */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={onBack}
          className="bg-black/50 backdrop-blur text-white/80 hover:text-white hover:bg-black/70 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={18} /> Thoát
        </button>
      </div>

      {!url ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white gap-4">
          <div className="text-6xl">⚠️</div>
          <p className="text-xl">Chưa có link game.</p>
          <button onClick={onBack} className="text-blue-400 hover:underline">Quay lại</button>
        </div>
      ) : (
        <iframe 
          src={url} 
          className="w-full h-full border-none bg-black" 
          allow="autoplay; fullscreen; accelerometer; gyroscope"
          title={game.title}
        />
      )}
    </div>
  );
};

// =============================================================================
//  STORY READER
// =============================================================================

const StoryReader: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const speak = useSafeSpeech('vi-VN');

  const handleRead = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const u = new SpeechSynthesisUtterance(game.storyContent || 'Chưa có nội dung');
      u.lang = 'vi-VN';
      u.rate = 0.9;
      u.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#FFF8E1] dark:bg-slate-900 flex flex-col h-[100dvh]">
      <div className="px-4 py-3 flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm pt-safe-top sticky top-0 z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:text-white">
          <ArrowLeft />
        </button>
        <h2 className="font-bold text-lg dark:text-white truncate max-w-[200px]">{game.title}</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full">
        <div className="prose prose-lg prose-slate dark:prose-invert md:prose-xl mx-auto font-medium leading-relaxed">
          {game.storyContent ? (
            game.storyContent.split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)
          ) : (
            <p className="text-center text-gray-500 italic">Câu chuyện chưa có nội dung.</p>
          )}
        </div>
      </div>

      <div className="p-6 bg-gradient-to-t from-[#FFF8E1] to-transparent dark:from-slate-900 flex justify-center sticky bottom-0">
        <BouncyButton 
          onClick={handleRead} 
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-colors ${
            isPlaying ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
          }`}
        >
          {isPlaying ? <Volume2 className="animate-pulse" /> : <Play fill="currentColor" />}
          {isPlaying ? 'Dừng đọc' : 'Đọc cho bé nghe'}
        </BouncyButton>
      </div>
    </div>
  );
};

// =============================================================================
//  MAIN HUB (GAME ZONE)
// =============================================================================

const PAGE_SIZE = 12;

export const GameZone: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [g, c] = await Promise.all([fetchAllGames(true), fetchCategories()]);
        setGames(g);
        setCategories(c);
      } finally {
        setLoading(false);
      }
    };
    load();
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

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

  // Filter Logic
  const filteredGames = useMemo(() => {
    return games.filter(g => 
      !activeCategory || 
      g.category === activeCategory || 
      (activeCategory === 'general' && !g.category)
    );
  }, [games, activeCategory]);

  const visibleGames = filteredGames.slice(0, visibleCount);

  // --- RENDER ---

  if (activeGame) {
    if (activeGame.gameType === 'html5') return <Html5Player game={activeGame} onBack={() => setActiveGame(null)} />;
    if (activeGame.gameType === 'story') return <StoryReader game={activeGame} onBack={() => setActiveGame(null)} />;
    return <UniversalGameEngine game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
      
      {/* Mobile Header */}
      <header className="sticky top-0 inset-x-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
           {activeCategory ? (
             <button onClick={() => setActiveCategory(null)} className="p-1 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
               <ArrowLeft className="text-gray-600 dark:text-gray-300" />
             </button>
           ) : (
             <span className="text-2xl animate-bounce">🎡</span>
           )}
           <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
             {activeCategory ? categories.find(c => c.id === activeCategory)?.label : 'Góc Bé Chơi'}
           </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-600 dark:text-yellow-400 transition-all">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-gray-500 font-medium">Đang tải trò chơi...</p>
          </div>
        ) : !activeCategory ? (
          /* CATEGORY VIEW */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in-up">
            
            {/* Special AI Card */}
            <div className="col-span-2 relative group overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl cursor-pointer min-h-[160px] md:min-h-[200px]"
                 onClick={() => alert("Tính năng AI Kể chuyện đang bảo trì, vui lòng quay lại sau!")}>
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <Bot size={120} color="white" />
              </div>
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white z-10">
                <div className="bg-white/20 backdrop-blur w-fit px-3 py-1 rounded-lg text-xs font-bold mb-2">HOT</div>
                <h3 className="text-2xl md:text-3xl font-black mb-1">AI Kể Chuyện</h3>
                <p className="text-white/80 font-medium text-sm">Bé chọn nhân vật, AI sẽ kể!</p>
              </div>
            </div>

            {/* Category Cards */}
            {categories.map((cat) => (
              <BouncyButton
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setVisibleCount(PAGE_SIZE);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-lg relative overflow-hidden group border-b-8 border-black/5 hover:border-black/10 transition-all ${cat.color} text-white`}
              >
                <div className="absolute top-2 right-2 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform">
                  <Gamepad2 size={60} />
                </div>
                <span className="text-5xl md:text-6xl drop-shadow-md z-10">{cat.icon}</span>
                <span className="font-bold text-lg md:text-xl z-10">{cat.label}</span>
              </BouncyButton>
            ))}
          </div>
        ) : (
          /* GAME LIST VIEW */
          <div className="animate-fade-in-right">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {visibleGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => setActiveGame(game)}
                  className="group cursor-pointer bg-white dark:bg-slate-800 p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500/30 transition-all flex items-center gap-4 relative overflow-hidden"
                >
                  <div className={`w-20 h-20 rounded-2xl ${game.color} flex items-center justify-center text-4xl shadow-inner text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    {game.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0 z-10">
                    <h3 className="font-black text-gray-800 dark:text-white text-lg truncate mb-1">
                      {game.title}
                    </h3>
                    <div className="flex gap-2">
                      <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-md uppercase">
                        {game.gameType}
                      </span>
                      {game.gameType === 'html5' && <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded-md">Online</span>}
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-500 dark:text-blue-300 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                    {game.gameType === 'story' ? <BookOpen size={20} /> : <Play size={20} fill="currentColor" />}
                  </div>
                </div>
              ))}
            </div>

            {visibleGames.length === 0 && (
               <div className="text-center py-20">
                 <div className="text-6xl mb-4 grayscale opacity-50">📂</div>
                 <p className="text-gray-500">Chưa có trò chơi nào trong mục này.</p>
               </div>
            )}

            {visibleCount < filteredGames.length && (
              <div className="flex justify-center mt-12">
                <BouncyButton
                  onClick={() => setVisibleCount(p => p + PAGE_SIZE)}
                  className="bg-white dark:bg-slate-800 px-8 py-3 rounded-full font-bold text-blue-600 dark:text-blue-400 shadow-lg border border-gray-100 dark:border-slate-700"
                >
                  Xem thêm
                </BouncyButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameZone;
