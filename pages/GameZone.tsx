import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Star, Trophy, ArrowRight } from 'lucide-react';
import { GameType } from '../types';

// Mock Data for games
const GAME_DATA = {
  [GameType.NUMBERS]: [
    { q: "Số 1 ở đâu?", a: "1", opts: ["1", "5", "3"], color: "bg-red-400" },
    { q: "Tìm số 5 nào?", a: "5", opts: ["2", "5", "8"], color: "bg-blue-400" },
    { q: "Số 10 màu gì?", a: "10", opts: ["10", "4", "6"], color: "bg-green-400" },
  ],
  [GameType.COLORS]: [
    { q: "Màu Đỏ đâu nhỉ?", a: "#EF4444", opts: ["#EF4444", "#3B82F6", "#10B981"], type: 'color' },
    { q: "Màu Xanh Dương?", a: "#3B82F6", opts: ["#F59E0B", "#3B82F6", "#8B5CF6"], type: 'color' },
    { q: "Màu Vàng tươi?", a: "#FCD34D", opts: ["#FCD34D", "#EF4444", "#000000"], type: 'color' },
  ],
  [GameType.ANIMALS]: [
    { q: "Con Mèo kêu thế nào?", a: "🐱", opts: ["🐱", "🐶", "🐮"], type: 'emoji' },
    { q: "Con Chó đâu bé ơi?", a: "🐶", opts: ["🐷", "🐶", "🐸"], type: 'emoji' },
    { q: "Con Hổ dũng mãnh?", a: "🐯", opts: ["🐯", "🐰", "🐼"], type: 'emoji' },
  ]
};

export const GameZone: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  if (activeGame) {
    return <GameEngine type={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 pb-20">
      <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
        <span className="text-4xl">🎮</span> Góc Bé Chơi
      </h1>
      <p className="text-textGray mb-8 text-center">Trò chơi phát triển trí tuệ cho bé 2-6 tuổi</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button 
          onClick={() => setActiveGame(GameType.NUMBERS)}
          className="bg-white rounded-3xl p-6 shadow-md border-b-8 border-blue-200 hover:scale-105 transition-transform flex items-center gap-4 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-4xl group-hover:rotate-12 transition-transform">
            123
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-textDark">Học Đếm Số</h3>
            <p className="text-sm text-textGray">Bé học số từ 1 đến 10</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveGame(GameType.COLORS)}
          className="bg-white rounded-3xl p-6 shadow-md border-b-8 border-pink-200 hover:scale-105 transition-transform flex items-center gap-4 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-pink-100 flex items-center justify-center text-4xl group-hover:-rotate-12 transition-transform">
            🎨
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-textDark">Màu Sắc</h3>
            <p className="text-sm text-textGray">Nhận biết màu cơ bản</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveGame(GameType.ANIMALS)}
          className="bg-white rounded-3xl p-6 shadow-md border-b-8 border-green-200 hover:scale-105 transition-transform flex items-center gap-4 group"
        >
          <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
            🦁
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-textDark">Con Vật</h3>
            <p className="text-sm text-textGray">Tên gọi các loài vật</p>
          </div>
        </button>
        
        <div className="bg-gray-100 rounded-3xl p-6 border-b-8 border-gray-200 flex items-center gap-4 opacity-70 cursor-not-allowed">
           <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-4xl grayscale">
            😊
          </div>
           <div className="text-left">
            <h3 className="text-xl font-bold text-textGray">Cảm Xúc</h3>
            <p className="text-xs text-textGray">Sắp ra mắt...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const GameEngine: React.FC<{ type: GameType; onBack: () => void }> = ({ type, onBack }) => {
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: any[] = GAME_DATA[type as keyof typeof GAME_DATA] || [];
  const currentQ = questions[level];

  const playSound = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN'; // Try Vietnamese first, fallback usually works if installed
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (currentQ) {
      // Auto speak question
      setTimeout(() => playSound(currentQ.q), 500);
    }
  }, [currentQ]);

  const handleAnswer = (opt: string) => {
    if (opt === currentQ.a) {
      playSound("Hoan hô! Đúng rồi!");
      setShowCelebration(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setShowCelebration(false);
        if (level < questions.length - 1) {
          setLevel(l => l + 1);
        } else {
          // End game
          playSound("Chúc mừng bé đã hoàn thành xuất sắc!");
        }
      }, 2000);
    } else {
      playSound("Sai rồi, thử lại nhé!");
      const btn = document.getElementById(`btn-${opt}`);
      if(btn) {
        btn.classList.add('animate-shake');
        setTimeout(() => btn.classList.remove('animate-shake'), 500);
      }
    }
  };

  if (level >= questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
        <h2 className="text-3xl font-bold text-primary mb-2">Tuyệt vời!</h2>
        <p className="text-xl text-textGray mb-8">Bé đã trả lời đúng tất cả câu hỏi.</p>
        <button 
          onClick={onBack}
          className="bg-primary text-white text-xl font-bold px-10 py-4 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          Chơi trò khác
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[90vh] pb-20 bg-[#E0F7FA]">
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center">
        <button onClick={onBack} className="bg-white p-3 rounded-full shadow-md text-textDark">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
             <Star key={i} size={24} className={i < score ? "text-yellow-400 fill-current" : "text-gray-300"} />
          ))}
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div 
          className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-xl text-center mb-8 relative"
          onClick={() => playSound(currentQ.q)}
        >
          <button className="absolute top-4 right-4 text-primary bg-primary/10 p-2 rounded-full">
            <Volume2 size={24} />
          </button>
          <h2 className="text-3xl md:text-4xl font-bold text-textDark mt-4">{currentQ.q}</h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md">
          {currentQ.opts.map((opt: string) => (
            <button
              id={`btn-${opt}`}
              key={opt}
              onClick={() => handleAnswer(opt)}
              className={`
                aspect-square rounded-2xl shadow-lg transition-transform active:scale-90 flex items-center justify-center text-4xl font-bold border-b-8
                ${currentQ.type === 'color' ? '' : 'bg-white border-gray-200 hover:border-blue-300'}
              `}
              style={currentQ.type === 'color' ? { backgroundColor: opt, borderColor: 'rgba(0,0,0,0.1)' } : {}}
            >
              {currentQ.type !== 'color' && opt}
            </button>
          ))}
        </div>
      </div>

      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white p-8 rounded-3xl text-center shadow-2xl animate-pop-in">
             <div className="text-6xl mb-4">🎉</div>
             <h3 className="text-2xl font-bold text-primary">Đúng rồi!</h3>
           </div>
        </div>
      )}
    </div>
  );
};