import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Volume2, Star, Trophy, Sparkles, Play, Loader2, RotateCcw, Home, X } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- IMPORT TYPES & SERVICES ---
// Đảm bảo đường dẫn import đúng với cấu trúc dự án của bạn
import { Game, GameLevel, GameCategory, CategoryDef, GameAsset } from '../types';
import { fetchAllGames, fetchCategories } from '../services/game';
import { generateStory } from '../services/gemini';

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

// --- GAME SCREENS ---

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
    <div className="fixed inset-0 z-[70] bg-[#FFF9C4] flex flex-col items-center justify-center animate-fade-in">
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

// --- CORE GAME ENGINE ---

const UniversalGameEngine: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Sound Effects (Placeholder links - should be replaced with local assets or configured URLs)
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
        // Correct
        playCorrect && playCorrect();
        speak("Đúng rồi! Bé giỏi quá!");
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setScore(s => s + 1);
        
        setTimeout(() => {
          if (currentLevelIdx < levels.length - 1) {
            setCurrentLevelIdx(i => i + 1);
          } else {
            playWin && playWin();
            setGameFinished(true);
          }
        }, 1500);
      } else {
        // Wrong
        playWrong && playWrong();
        speak("Sai rồi, bé thử lại nhé!");
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 500);
      }
    } else if (game.gameType === 'flashcard') {
      // Flashcard logic
      if(asset.audioUrl) new Audio(asset.audioUrl).play().catch(() => {});
      else speak(asset.text || "");
    }
  };

  if (gameFinished) return <VictoryScreen onBack={onBack} score={score} total={levels.length} />;
  if (!currentLevel) return <div className="p-10 text-center text-gray-500 font-bold">Đang tải màn chơi...</div>;

  return (
    <div className="fixed inset-0 z-[60] bg-[#E0F7FA] flex flex-col h-[100dvh] overflow-hidden">
      <div className="p-4 flex items-center justify-between pt-safe-top">
        <BouncyButton onClick={onBack} className="bg-white p-3 rounded-full shadow-md text-gray-600"><ArrowLeft /></BouncyButton>
        
        <div className="flex-1 mx-4 h-6 bg-white rounded-full p-1 shadow-inner relative">
            <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${((currentLevelIdx + 1) / levels.length) * 100}%` }}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-lg border-2 border-green-500">
                    🐸
                </div>
            </div>
        </div>

        <div className="bg-white px-4 py-2 rounded-full shadow-md font-black text-orange-500 flex items-center gap-1 text-lg">
            <Star fill="currentColor" className="text-yellow-400" /> {score}
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center p-4 relative transition-transform duration-100 ${isWrong ? 'translate-x-[-10px]' : ''}`}>
        <div onClick={() => speak(currentLevel.instruction.text)} className="mb-6 cursor-pointer transform hover:scale-105 transition-transform">
           {currentLevel.instruction.imageUrl ? (
               <div className="p-4 bg-white rounded-3xl shadow-xl rotate-1">
                   <img src={currentLevel.instruction.imageUrl} className="h-48 object-contain rounded-xl" alt="Instruction" />
               </div>
           ) : (
               <h2 className="text-3xl md:text-5xl font-black text-center text-blue-600 drop-shadow-sm bg-white/80 backdrop-blur px-8 py-4 rounded-3xl shadow-lg border-b-8 border-blue-200">
                   {currentLevel.instruction.text} <Volume2 className="inline ml-2 text-blue-400" />
               </h2>
           )}
        </div>

        <div className={`grid gap-4 w-full max-w-4xl ${currentLevel.items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {currentLevel.items.map((item, idx) => (
                <BouncyButton
                    key={idx}
                    onClick={() => handleAssetClick(item)}
                    className="aspect-square bg-white rounded-[2rem] shadow-[0_8px_0_rgb(0,0,0,0.1)] border-4 border-white flex flex-col items-center justify-center p-4 hover:bg-blue-50 hover:scale-[1.02] transition-all group relative overflow-hidden active:shadow-none active:translate-y-[8px]"
                >
                    {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-contain pointer-events-none group-hover:rotate-6 transition-transform duration-300" alt="Option" />
                    ) : (
                        <span className="text-4xl md:text-6xl font-black text-slate-700 group-hover:text-blue-600">{item.text}</span>
                    )}
                </BouncyButton>
            ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-32 bg-[url('https://i.imgur.com/Kx6vFqg.png')] bg-contain bg-repeat-x opacity-30 pointer-events-none"></div>
    </div>
  );
};

// --- STORY & HTML5 HELPERS ---

const StoryReader: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const toggleRead = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const u = new SpeechSynthesisUtterance(game.storyContent || "");
      u.lang = 'vi-VN'; u.rate = 0.9;
      u.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(u);
      setIsPlaying(true);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF8E1] flex flex-col h-[100dvh]">
      <div className="px-4 py-3 flex justify-between bg-white/50 backdrop-blur-md pt-safe-top">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <h2 className="font-bold text-lg">{game.title}</h2>
        <div className="w-6"></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-2xl mx-auto prose prose-lg">
        {game.storyContent ? game.storyContent.split('\n').map((p, i) => <p key={i}>{p}</p>) : <p>Chưa có nội dung.</p>}
      </div>
      <div className="p-6 flex justify-center">
        <button onClick={toggleRead} className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold flex gap-2">
          {isPlaying ? <Volume2 className="animate-pulse" /> : <Play />} {isPlaying ? 'Dừng' : 'Đọc truyện'}
        </button>
      </div>
    </div>
  );
};

const Html5Player: React.FC<{ game: Game; onBack: () => void }> = ({ game, onBack }) => {
  if (!game.gameUrl) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col h-[100dvh]">
      <RotateDeviceOverlay orientation={(game as any).orientation} />
      <div className="h-10 bg-gray-900 flex items-center px-4">
        <button onClick={onBack} className="text-white flex items-center gap-2 font-bold bg-white/10 px-3 py-1 rounded-full"><ArrowLeft size={16} /> Thoát</button>
      </div>
      <iframe src={game.gameUrl} className="flex-1 w-full h-full border-none" allowFullScreen title={game.title} />
    </div>
  );
};

// --- AI STORY GENERATOR ---

const AiStoryTeller: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [char, setChar] = useState('');
  const [lesson, setLesson] = useState('');
  const [story, setStory] = useState<{ title: string, content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateStory(char, lesson);
      setStory(res);
      setStep(3);
    } catch (e) { alert("Lỗi kết nối AI"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-b from-indigo-900 to-purple-900 text-white flex flex-col h-[100dvh]">
      <div className="p-4 pt-safe-top"><button onClick={onBack}><ArrowLeft /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        {step === 1 && (
          <>
            <h3 className="text-2xl font-bold mb-6">Bé chọn nhân vật nhé?</h3>
            <div className="grid grid-cols-2 gap-4">
              {['Thỏ con', 'Gấu Pooh', 'Khủng long', 'Công chúa'].map(c => (
                <button key={c} onClick={() => { setChar(c); setStep(2); }} className="bg-white/10 p-6 rounded-2xl font-bold hover:bg-white/20">{c}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && !loading && (
          <>
            <h3 className="text-2xl font-bold mb-6">Câu chuyện về bài học gì?</h3>
            <div className="grid grid-cols-1 gap-3 w-full">
              {['Lòng dũng cảm', 'Sự thật thà', 'Tình bạn'].map(l => (
                <button key={l} onClick={() => { setLesson(l); handleGenerate(); }} className="bg-white/10 p-4 rounded-xl font-bold hover:bg-white/20">{l}</button>
              ))}
            </div>
          </>
        )}
        {loading && <Loader2 className="animate-spin" size={40} />}
        {step === 3 && story && (
          <StoryReader
            game={{ id: 'temp', title: story.title, storyContent: story.content, gameType: 'story', icon: '🤖', color: '', minAge: 0, maxAge: 0, isActive: true, config: {}, levels: [], totalPlays: 0, createdAt: '', updatedAt: '', order: 0, slug: '', category: 'story' } as any}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
//  MAIN COMPONENT: GAME ZONE
// =============================================================================

export const GameZone: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [activeCategory, setActiveCategory] = useState<GameCategory | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [aiStoryMode, setAiStoryMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [gamesData, catsData] = await Promise.all([
        fetchAllGames(true),
        fetchCategories()
      ]);
      setGames(gamesData);
      setCategories(catsData);
      setLoading(false);
    };
    load();
  }, []);

  // --- RENDER GAME MODES ---
  if (aiStoryMode) return <AiStoryTeller onBack={() => setAiStoryMode(false)} />;
  if (activeGame) {
    if (activeGame.gameType === 'html5') return <Html5Player game={activeGame} onBack={() => setActiveGame(null)} />;
    if (activeGame.gameType === 'story') return <StoryReader game={activeGame} onBack={() => setActiveGame(null)} />;
    return <UniversalGameEngine game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  // --- FILTER & DISPLAY ---
  const filteredGames = games.filter(g => activeCategory ? (g.category === activeCategory || (activeCategory === 'general' && !(g as any).category)) : true);
  const visibleGames = filteredGames.slice(0, visibleCount);
  const PAGE_SIZE = 12;

  return (
    <div className="min-h-screen pb-24 bg-[#E0F7FA] dark:bg-slate-950 flex flex-col overflow-x-hidden transition-colors">
      
      {/* 1. KHOẢNG TRỐNG CHO HEADER APP (Quan trọng) */}
      <div className="h-20"></div>

      {/* 2. TIÊU ĐỀ GỌN GÀNG (Thay thế khối màu vàng) */}
      <div className="px-6 mb-4 flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <span className="animate-bounce">🎡</span> Góc Bé Chơi
            </h1>
            <p className="text-sm text-gray-500 font-bold ml-1">Vui học mỗi ngày</p>
         </div>
         {activeCategory && (
            <BouncyButton onClick={() => setActiveCategory(null)} className="bg-white p-2 rounded-full shadow-sm text-gray-500 border">
                <ArrowLeft size={20} />
            </BouncyButton>
         )}
      </div>

      {/* 3. LOADING STATE */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : !activeCategory ? (
        // --- MÀN HÌNH CHÍNH (Chưa chọn danh mục) ---
        <div className="px-4 py-2 w-full max-w-5xl mx-auto pb-32">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* AI STORY CARD */}
            <button onClick={() => setAiStoryMode(true)} className="col-span-2 bg-gradient-to-r from-pink-400 to-purple-500 p-6 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between group relative overflow-hidden min-h-[160px]">
              <div className="relative z-10 text-left">
                <div className="bg-white/20 backdrop-blur-md inline-flex px-3 py-1 rounded-lg text-xs font-bold mb-2">Mới nhất</div>
                <h3 className="text-3xl font-black mb-1">AI Kể Chuyện</h3>
                <p className="text-white/90 text-sm font-bold">Bé chọn nhân vật, AI kể chuyện!</p>
              </div>
              <span className="text-7xl group-hover:scale-110 transition-transform">🧚‍♀️</span>
            </button>

            {/* CATEGORY CARDS */}
            {categories.map(cat => (
              <BouncyButton key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-lg ${cat.color} text-white border-b-8 border-black/10`}>
                <span className="text-5xl drop-shadow-md">{cat.icon}</span>
                <span className="font-bold text-xl">{cat.label}</span>
              </BouncyButton>
            ))}
          </div>
        </div>
      ) : (
        // --- MÀN HÌNH DANH SÁCH GAME (Đã chọn danh mục) ---
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
