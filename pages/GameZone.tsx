
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Star, Trophy, Sparkles, Grid, Play } from 'lucide-react';
import { GameType } from '../types';

// Mock Data - Massive Expansion
const GAME_DATA = {
  [GameType.NUMBERS]: [
    { q: "Số 1 ở đâu?", a: "1", opts: ["1", "5", "3"], color: "bg-blue-400" },
    { q: "Tìm số 5 nào?", a: "5", opts: ["2", "5", "8"], color: "bg-blue-500" },
    { q: "Số 10 màu gì?", a: "10", opts: ["10", "4", "6"], color: "bg-blue-600" },
    { q: "Số 2 giống con vịt?", a: "2", opts: ["1", "2", "7"], color: "bg-blue-400" },
    { q: "Số 0 tròn trĩnh?", a: "0", opts: ["0", "8", "9"], color: "bg-blue-500" },
  ],
  [GameType.COLORS]: [
    { q: "Màu Đỏ đâu nhỉ?", a: "#EF4444", opts: ["#EF4444", "#3B82F6", "#10B981"], type: 'color' },
    { q: "Màu Xanh Dương?", a: "#3B82F6", opts: ["#F59E0B", "#3B82F6", "#8B5CF6"], type: 'color' },
    { q: "Màu Vàng tươi?", a: "#FCD34D", opts: ["#FCD34D", "#EF4444", "#000000"], type: 'color' },
    { q: "Màu Tím mộng mơ?", a: "#8B5CF6", opts: ["#EF4444", "#8B5CF6", "#10B981"], type: 'color' },
    { q: "Màu Hồng nữ tính?", a: "#EC4899", opts: ["#EC4899", "#000000", "#FCD34D"], type: 'color' },
  ],
  [GameType.ANIMALS]: [
    { q: "Con Mèo kêu meo meo?", a: "🐱", opts: ["🐱", "🐶", "🐮"], type: 'emoji' },
    { q: "Con Chó sủa gâu gâu?", a: "🐶", opts: ["🐷", "🐶", "🐸"], type: 'emoji' },
    { q: "Hổ dũng mãnh?", a: "🐯", opts: ["🐯", "🐰", "🐼"], type: 'emoji' },
    { q: "Con Lợn ủn ỉn?", a: "🐷", opts: ["🐵", "🐷", "🐔"], type: 'emoji' },
    { q: "Con Gà trống gáy?", a: "🐓", opts: ["🐓", "🦆", "🦉"], type: 'emoji' },
  ],
  [GameType.ALPHABET]: [
    { q: "Chữ A cái ca?", a: "A", opts: ["A", "B", "C"], color: "bg-pink-400" },
    { q: "Chữ B con bò?", a: "B", opts: ["A", "B", "D"], color: "bg-pink-500" },
    { q: "Chữ C con cá?", a: "C", opts: ["E", "F", "C"], color: "bg-pink-400" },
    { q: "Chữ O tròn vo?", a: "O", opts: ["O", "Ô", "Ơ"], color: "bg-pink-500" },
    { q: "Chữ E em bé?", a: "E", opts: ["Ê", "E", "A"], color: "bg-pink-600" },
  ],
  [GameType.SHAPES]: [
    { q: "Hình Tròn?", a: "🔴", opts: ["🔴", "🟥", "🔺"], type: 'emoji' },
    { q: "Hình Vuông?", a: "🟥", opts: ["🔴", "🟥", "⭐"], type: 'emoji' },
    { q: "Hình Tam Giác?", a: "🔺", opts: ["🔺", "🟥", "🔷"], type: 'emoji' },
    { q: "Ngôi Sao lấp lánh?", a: "⭐", opts: ["⭐", "🌙", "☀️"], type: 'emoji' },
    { q: "Trái Tim yêu thương?", a: "❤️", opts: ["❤️", "🔷", "⚫"], type: 'emoji' },
  ],
  [GameType.FRUITS]: [
    { q: "Quả Táo đỏ?", a: "🍎", opts: ["🍎", "🍌", "🍇"], type: 'emoji' },
    { q: "Quả Chuối vàng?", a: "🍌", opts: ["🍉", "🍌", "🍓"], type: 'emoji' },
    { q: "Chùm Nho tím?", a: "🍇", opts: ["🍇", "🍊", "🍍"], type: 'emoji' },
    { q: "Quả Dưa Hấu?", a: "🍉", opts: ["🍉", "🥝", "🍑"], type: 'emoji' },
    { q: "Quả Cam?", a: "🍊", opts: ["🍊", "🍎", "🍐"], type: 'emoji' },
  ],
  [GameType.VEHICLES]: [
    { q: "Xe Ô tô?", a: "🚗", opts: ["🚗", "🚌", "🚲"], type: 'emoji' },
    { q: "Máy Bay bay cao?", a: "✈️", opts: ["✈️", "🚀", "🚁"], type: 'emoji' },
    { q: "Xe Cứu Hỏa?", a: "🚒", opts: ["🚒", "🚑", "🚓"], type: 'emoji' },
    { q: "Tàu Hỏa xình xịch?", a: "🚂", opts: ["🚂", "🚢", "🛵"], type: 'emoji' },
    { q: "Xe Cảnh Sát?", a: "🚓", opts: ["🚓", "🚕", "🚛"], type: 'emoji' },
  ],
  [GameType.BODY]: [
    { q: "Đôi Mắt để nhìn?", a: "👀", opts: ["👀", "👃", "👂"], type: 'emoji' },
    { q: "Cái Mũi để ngửi?", a: "👃", opts: ["👃", "👄", "👋"], type: 'emoji' },
    { q: "Cái Miệng để ăn?", a: "👄", opts: ["👄", "👀", "👣"], type: 'emoji' },
    { q: "Cái Tai để nghe?", a: "👂", opts: ["👂", "👃", "💪"], type: 'emoji' },
    { q: "Bàn Tay cầm nắm?", a: "👋", opts: ["👋", "🦶", "🧠"], type: 'emoji' },
  ],
  [GameType.FAMILY]: [
    { q: "Em Bé đáng yêu?", a: "👶", opts: ["👶", "👨", "👵"], type: 'emoji' },
    { q: "Ông Nội/Ngoại?", a: "👴", opts: ["👴", "👩", "👧"], type: 'emoji' },
    { q: "Bà Nội/Ngoại?", a: "👵", opts: ["👵", "👨", "👦"], type: 'emoji' },
    { q: "Bố/Ba?", a: "👨", opts: ["👨", "👩", "👶"], type: 'emoji' },
    { q: "Mẹ/Má?", a: "👩", opts: ["👩", "👨", "👴"], type: 'emoji' },
  ],
  [GameType.VEGETABLES]: [
    { q: "Củ Cà Rốt?", a: "🥕", opts: ["🥕", "🌽", "🥦"], type: 'emoji' },
    { q: "Bắp Ngô?", a: "🌽", opts: ["🌽", "🍆", "🍅"], type: 'emoji' },
    { q: "Quả Cà Chua?", a: "🍅", opts: ["🍅", "🥔", "🥒"], type: 'emoji' },
    { q: "Súp Lơ Xanh?", a: "🥦", opts: ["🥦", "🍄", "🧅"], type: 'emoji' },
    { q: "Quả Ớt cay?", a: "🌶️", opts: ["🌶️", "🧄", "🥬"], type: 'emoji' },
  ],
  [GameType.CLOTHES]: [
    { q: "Cái Áo phông?", a: "👕", opts: ["👕", "👖", "👗"], type: 'emoji' },
    { q: "Cái Váy đẹp?", a: "👗", opts: ["👗", "👚", "👙"], type: 'emoji' },
    { q: "Đôi Giày?", a: "👟", opts: ["👟", "👒", "👓"], type: 'emoji' },
    { q: "Cái Mũ?", a: "🧢", opts: ["🧢", "🧣", "🧤"], type: 'emoji' },
    { q: "Cái Quần?", a: "👖", opts: ["👖", "🧦", "🧥"], type: 'emoji' },
  ],
  [GameType.SCHOOL]: [
    { q: "Quyển Sách?", a: "📖", opts: ["📖", "✏️", "🎒"], type: 'emoji' },
    { q: "Cái Bút chì?", a: "✏️", opts: ["✏️", "✂️", "📏"], type: 'emoji' },
    { q: "Cái Cặp sách?", a: "🎒", opts: ["🎒", "🎓", "🖌️"], type: 'emoji' },
    { q: "Cái Kéo?", a: "✂️", opts: ["✂️", "📎", "📌"], type: 'emoji' },
    { q: "Cây Thước kẻ?", a: "📏", opts: ["📏", "📖", "🖍️"], type: 'emoji' },
  ],
  [GameType.NATURE]: [
    { q: "Ông Mặt Trời?", a: "☀️", opts: ["☀️", "🌙", "☁️"], type: 'emoji' },
    { q: "Mặt Trăng?", a: "🌙", opts: ["🌙", "⭐", "⛈️"], type: 'emoji' },
    { q: "Đám Mây?", a: "☁️", opts: ["☁️", "❄️", "🌈"], type: 'emoji' },
    { q: "Cầu Vồng?", a: "🌈", opts: ["🌈", "🌪️", "🌊"], type: 'emoji' },
    { q: "Bông Hoa?", a: "🌺", opts: ["🌺", "🌲", "🌵"], type: 'emoji' },
  ],
  [GameType.JOBS]: [
    { q: "Chú Cảnh Sát?", a: "👮", opts: ["👮", "👨‍⚕️", "👨‍🚒"], type: 'emoji' },
    { q: "Bác Sĩ?", a: "👨‍⚕️", opts: ["👨‍⚕️", "👩‍🏫", "👨‍🍳"], type: 'emoji' },
    { q: "Lính Cứu Hỏa?", a: "👨‍🚒", opts: ["👨‍🚒", "👷", "👨‍✈️"], type: 'emoji' },
    { q: "Đầu Bếp?", a: "👨‍🍳", opts: ["👨‍🍳", "👨‍🎨", "🕵️"], type: 'emoji' },
    { q: "Cô Giáo?", a: "👩‍🏫", opts: ["👩‍🏫", "👩‍🎤", "👨‍🔧"], type: 'emoji' },
  ],
  [GameType.MUSIC]: [
    { q: "Đàn Guitar?", a: "🎸", opts: ["🎸", "🎹", "🥁"], type: 'emoji' },
    { q: "Đàn Piano?", a: "🎹", opts: ["🎹", "🎻", "🎺"], type: 'emoji' },
    { q: "Cái Trống?", a: "🥁", opts: ["🥁", "🎷", "🎤"], type: 'emoji' },
    { q: "Micro hát?", a: "🎤", opts: ["🎤", "🎧", "🎼"], type: 'emoji' },
    { q: "Tai Nghe?", a: "🎧", opts: ["🎧", "🎷", "🪕"], type: 'emoji' },
  ],
  [GameType.SPORTS]: [
    { q: "Quả Bóng Đá?", a: "⚽", opts: ["⚽", "🏀", "🎾"], type: 'emoji' },
    { q: "Bóng Rổ?", a: "🏀", opts: ["🏀", "🏐", "🏈"], type: 'emoji' },
    { q: "Bơi Lội?", a: "🏊", opts: ["🏊", "🚴", "🏋️"], type: 'emoji' },
    { q: "Xe Đạp?", a: "🚲", opts: ["🚲", "🛹", "🛴"], type: 'emoji' },
    { q: "Huy Chương Vàng?", a: "🥇", opts: ["🥇", "🏆", "🎫"], type: 'emoji' },
  ],
  [GameType.HOUSE]: [
    { q: "Cái Giường ngủ?", a: "🛏️", opts: ["🛏️", "🪑", "🛋️"], type: 'emoji' },
    { q: "Cái Ghế?", a: "🪑", opts: ["🪑", "🚪", "🚽"], type: 'emoji' },
    { q: "Cái Tivi?", a: "📺", opts: ["📺", "💻", "📱"], type: 'emoji' },
    { q: "Cái Đèn?", a: "💡", opts: ["💡", "🕯️", "🔦"], type: 'emoji' },
    { q: "Cửa Ra Vào?", a: "🚪", opts: ["🚪", "🪟", "🔑"], type: 'emoji' },
  ],
  [GameType.FOOD]: [
    { q: "Bánh Mì?", a: "🥖", opts: ["🥖", "🥐", "🥯"], type: 'emoji' },
    { q: "Cơm nắm?", a: "🍙", opts: ["🍙", "🍚", "🍛"], type: 'emoji' },
    { q: "Mì Ý?", a: "🍝", opts: ["🍝", "🍜", "🍲"], type: 'emoji' },
    { q: "Bánh Kem?", a: "🎂", opts: ["🎂", "🍰", "🧁"], type: 'emoji' },
    { q: "Kẹo Mút?", a: "🍭", opts: ["🍭", "🍫", "🍩"], type: 'emoji' },
  ]
};

export const GameZone: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  if (activeGame) {
    return <GameEngine type={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-screen pb-24 px-4 bg-[#FFF9C4] flex flex-col pt-safe-top">
      <div className="py-6 text-center">
        <h1 className="text-3xl font-black text-orange-500 mb-1 flex items-center justify-center gap-2 drop-shadow-sm">
          <span className="animate-bounce-small">🎮</span> Góc Bé Chơi
        </h1>
        <p className="text-orange-800 text-sm font-medium opacity-80">18 trò chơi phát triển trí tuệ cho bé!</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto pb-10">
        <GameCard type={GameType.NUMBERS} title="Đếm Số" icon="123" color="bg-blue-400" setActive={setActiveGame} />
        <GameCard type={GameType.ALPHABET} title="Chữ Cái" icon="ABC" color="bg-pink-400" setActive={setActiveGame} />
        <GameCard type={GameType.COLORS} title="Màu Sắc" icon="🎨" color="bg-purple-400" setActive={setActiveGame} />
        <GameCard type={GameType.SHAPES} title="Hình Khối" icon="🔶" color="bg-indigo-400" setActive={setActiveGame} />
        <GameCard type={GameType.ANIMALS} title="Con Vật" icon="🦁" color="bg-green-400" setActive={setActiveGame} />
        <GameCard type={GameType.FRUITS} title="Trái Cây" icon="🍎" color="bg-red-400" setActive={setActiveGame} />
        <GameCard type={GameType.VEGETABLES} title="Rau Củ" icon="🥦" color="bg-emerald-500" setActive={setActiveGame} />
        <GameCard type={GameType.VEHICLES} title="Xe Cộ" icon="🚗" color="bg-orange-400" setActive={setActiveGame} />
        <GameCard type={GameType.BODY} title="Cơ Thể" icon="👂" color="bg-rose-400" setActive={setActiveGame} />
        <GameCard type={GameType.FAMILY} title="Gia Đình" icon="👨‍👩‍👧" color="bg-teal-400" setActive={setActiveGame} />
        <GameCard type={GameType.CLOTHES} title="Quần Áo" icon="👗" color="bg-violet-400" setActive={setActiveGame} />
        <GameCard type={GameType.SCHOOL} title="Trường Lớp" icon="🎒" color="bg-cyan-500" setActive={setActiveGame} />
        <GameCard type={GameType.NATURE} title="Thiên Nhiên" icon="🌈" color="bg-sky-400" setActive={setActiveGame} />
        <GameCard type={GameType.JOBS} title="Nghề Nghiệp" icon="👮" color="bg-slate-500" setActive={setActiveGame} />
        <GameCard type={GameType.MUSIC} title="Âm Nhạc" icon="🎸" color="bg-fuchsia-400" setActive={setActiveGame} />
        <GameCard type={GameType.SPORTS} title="Thể Thao" icon="⚽" color="bg-lime-500" setActive={setActiveGame} />
        <GameCard type={GameType.HOUSE} title="Đồ Vật" icon="🪑" color="bg-amber-500" setActive={setActiveGame} />
        <GameCard type={GameType.FOOD} title="Đồ Ăn" icon="🍰" color="bg-yellow-500" setActive={setActiveGame} />
      </div>
    </div>
  );
};

const GameCard: React.FC<{ type: GameType; title: string; icon: string; color: string; setActive: (t: GameType) => void }> = ({ type, title, icon, color, setActive }) => (
  <button 
    onClick={() => setActive(type)}
    className={`relative overflow-hidden rounded-[1.5rem] p-4 text-white text-left transition-all active:scale-95 ${color} shadow-lg border-b-4 border-black/10 flex flex-col items-center justify-center gap-2 aspect-[4/3]`}
  >
    <div className="text-4xl drop-shadow-md">{icon}</div>
    <h3 className="text-lg font-black drop-shadow-sm text-center leading-tight">{title}</h3>
    <div className="absolute top-0 right-0 p-2 opacity-20"><Sparkles size={20} /></div>
  </button>
);

const GameEngine: React.FC<{ type: GameType; onBack: () => void }> = ({ type, onBack }) => {
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // New state to unlock audio context

  // @ts-ignore
  const questions: any[] = GAME_DATA[type] || [];
  const currentQ = questions[level];

  const playSound = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN'; 
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initial Sound Play - ONLY if started
  useEffect(() => {
    if (hasStarted && currentQ) {
        // Small delay to ensure render
        const timer = setTimeout(() => playSound(currentQ.q), 500);
        return () => clearTimeout(timer);
    }
  }, [hasStarted, currentQ]);

  const handleStart = () => {
    // Play a silent sound or short sound to unlock AudioContext on iOS
    playSound("Bắt đầu nào");
    setHasStarted(true);
  };

  const handleAnswer = (opt: string) => {
    if (opt === currentQ.a) {
      playSound("Đúng rồi! Bé giỏi quá!");
      setShowCelebration(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setShowCelebration(false);
        if (level < questions.length - 1) setLevel(l => l + 1);
        else playSound("Chúc mừng bé đã chiến thắng!");
      }, 1500);
    } else {
      playSound("Chưa đúng rồi, thử lại nhé!");
      const btn = document.getElementById(`btn-${opt}`);
      if(btn) { btn.classList.add('animate-shake'); setTimeout(() => btn.classList.remove('animate-shake'), 500); }
    }
  };

  if (!hasStarted) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-black/80 fixed inset-0 z-50 text-white p-6 text-center animate-fade-in">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Play size={48} fill="white" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Sẵn sàng chơi chưa?</h2>
            <p className="mb-8 opacity-80">Bé hãy bật âm lượng lên nhé!</p>
            <button 
                onClick={handleStart}
                className="bg-orange-500 text-white text-xl font-bold px-12 py-4 rounded-full shadow-xl hover:bg-orange-600 active:scale-95 transition-transform"
            >
                Bắt đầu
            </button>
            <button onClick={onBack} className="mt-8 text-sm opacity-60 underline">Quay lại</button>
        </div>
      );
  }

  if (level >= questions.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9C4] text-center px-6 animate-fade-in fixed inset-0 z-50">
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-50 rounded-full animate-pulse"></div>
           <Trophy size={120} className="text-yellow-500 relative z-10 drop-shadow-lg" />
        </div>
        <h2 className="text-4xl font-black text-orange-600 mb-4">Tuyệt vời!</h2>
        <p className="text-xl text-orange-800 mb-10 font-medium">Bé đã hoàn thành xuất sắc!</p>
        <button onClick={onBack} className="bg-orange-500 text-white text-xl font-bold px-12 py-4 rounded-full shadow-[0_10px_20px_rgba(249,115,22,0.4)] active:scale-95 transition-transform hover:bg-orange-600 border-b-4 border-orange-700">
          Chọn trò chơi khác
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#E0F7FA] fixed inset-0 z-50">
      {/* Game Header */}
      <div className="p-4 pt-safe-top flex justify-between items-center bg-white/50 backdrop-blur-sm">
        <button onClick={onBack} className="bg-white p-2.5 rounded-full shadow-md text-gray-700 hover:bg-gray-50 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm">
          {[...Array(questions.length)].map((_, i) => (
             <Star key={i} size={20} className={i < score ? "text-yellow-400 fill-yellow-400 drop-shadow-sm transition-all" : "text-gray-200 transition-all"} />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div 
          className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.1)] text-center mb-8 relative cursor-pointer active:scale-[0.98] transition-transform border-4 border-white"
          onClick={() => playSound(currentQ.q)}
        >
          <button className="absolute top-4 right-4 text-blue-500 bg-blue-50 p-2 rounded-full hover:bg-blue-100">
            <Volume2 size={24} />
          </button>
          <h2 className="text-3xl font-black text-textDark mt-2 leading-tight">{currentQ.q}</h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {currentQ.opts.map((opt: string, idx: number) => (
            <button
              id={`btn-${opt}`}
              key={idx}
              onClick={() => handleAnswer(opt)}
              className={`
                aspect-square rounded-[2rem] shadow-lg transition-transform active:scale-90 flex items-center justify-center text-5xl font-bold border-b-8
                ${currentQ.type === 'color' ? '' : 'bg-white border-gray-100 text-textDark'}
                ${(idx === 2 && currentQ.opts.length === 3) ? 'col-span-2 aspect-auto py-6' : ''} 
              `}
              style={currentQ.type === 'color' ? { backgroundColor: opt, borderColor: 'rgba(0,0,0,0.1)' } : {}}
            >
              {currentQ.type !== 'color' && opt}
            </button>
          ))}
        </div>
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in px-6">
           <div className="bg-white w-full max-w-xs p-8 rounded-[3rem] text-center shadow-2xl animate-pop-in border-8 border-yellow-200">
             <div className="text-7xl mb-4 animate-bounce">🎉</div>
             <h3 className="text-2xl font-black text-primary">Đúng rồi!</h3>
             <p className="text-gray-500 mt-1 font-medium text-sm">Bé giỏi quá đi thôi!</p>
           </div>
        </div>
      )}
    </div>
  );
};
