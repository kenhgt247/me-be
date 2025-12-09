
import React, { useEffect, useState } from 'react';
import { Game } from '../../types';
import { fetchAllGames, createGame, deleteGame, updateGame } from '../../services/game';
import { Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Gamepad2, Loader2, ArrowRight, X } from 'lucide-react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';

const EMOJI_OPTIONS = [
  '🎮', '🧩', '🎨', '📚', '🔢', '🅰️', '🧠', '👀',
  '🐶', '🐱', '🦁', '🐻', '🐼', '🐸', '🦄', '🦖',
  '🍎', '🍌', '🍇', '🍓', '🥕', '🍕', '🍦', '🍪',
  '🚗', '🚀', '✈️', '🚂', '⚽', '🏀', '🎵', '🌟',
  '🏠', '🏫', '🌈', '☀️', '🌙', '💧', '🔥', '⛄'
];

export const GameManagement: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [color, setColor] = useState('bg-blue-400');
  const [minAge, setMinAge] = useState(2);
  const [maxAge, setMaxAge] = useState(6);
  const [order, setOrder] = useState(1);

  const colors = [
    'bg-blue-400', 'bg-red-400', 'bg-green-400', 'bg-yellow-400', 
    'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400'
  ];

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    const data = await fetchAllGames();
    setGames(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await createGame({
      title,
      icon,
      color,
      gameType: 'quiz',
      minAge,
      maxAge,
      order,
      isActive: true,
      createdAt: new Date().toISOString()
    });

    setShowModal(false);
    loadGames();
    // Reset form
    setTitle('');
    setIcon('🎮');
  };

  const handleToggleActive = async (game: Game) => {
    await updateGame(game.id, { isActive: !game.isActive });
    loadGames();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa game này? Tất cả câu hỏi trong game sẽ mất kết nối.")) return;
    await deleteGame(id);
    loadGames();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Quản lý Trò chơi</h1>
           <p className="text-gray-500">Tạo và quản lý các trò chơi cho bé</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
        >
          <Plus size={20} /> Thêm Game mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {games.map(game => (
             <div key={game.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col relative overflow-hidden transition-all hover:shadow-md ${!game.isActive ? 'opacity-60 grayscale border-gray-200' : 'border-gray-200'}`}>
                <div className={`absolute top-0 right-0 p-2 rounded-bl-2xl text-white font-bold text-xs ${game.color}`}>
                   {game.minAge}-{game.maxAge} tuổi
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                   <div className={`w-14 h-14 rounded-2xl ${game.color} flex items-center justify-center text-3xl shadow-md transform -rotate-6`}>
                      {game.icon}
                   </div>
                   <div>
                      <h3 className="font-bold text-lg text-gray-900">{game.title}</h3>
                      <p className="text-xs text-gray-500 font-mono">Thứ tự: {game.order}</p>
                   </div>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex gap-2">
                       <button onClick={() => handleDelete(game.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Xóa game">
                          <Trash2 size={18} />
                       </button>
                       <button onClick={() => handleToggleActive(game)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors" title={game.isActive ? "Tắt game" : "Bật game"}>
                          {game.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                       </button>
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/admin/games/${game.id}`)}
                      className="px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm flex items-center gap-1 transition-colors"
                    >
                       Chi tiết <ArrowRight size={16} />
                    </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-lg p-6 animate-pop-in shadow-2xl relative">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold mb-1 text-gray-900">Thêm trò chơi mới</h2>
              <p className="text-sm text-gray-500 mb-6">Thiết lập thông tin cơ bản cho trò chơi.</p>
              
              <form onSubmit={handleCreate} className="space-y-5">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tên trò chơi</label>
                    <input 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all" 
                        placeholder="Ví dụ: Đố vui hoa quả"
                        required 
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Chọn Biểu tượng</label>
                    <div className="grid grid-cols-8 gap-2 border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-200">
                        {EMOJI_OPTIONS.map(emoji => (
                           <button
                             key={emoji}
                             type="button"
                             onClick={() => setIcon(emoji)}
                             className={`text-2xl p-2 rounded-lg transition-all active:scale-90 flex items-center justify-center aspect-square ${
                                icon === emoji
                                ? 'bg-white shadow-md ring-2 ring-indigo-500 scale-110 z-10'
                                : 'hover:bg-gray-200 hover:scale-105'
                             }`}
                           >
                             {emoji}
                           </button>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Màu chủ đạo</label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {colors.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${c} ${color === c ? 'ring-4 ring-offset-2 ring-gray-200 scale-110' : 'hover:scale-110'}`}
                            ></button>
                        ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tuổi Min</label>
                        <input type="number" value={minAge} onChange={e => setMinAge(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2 text-center font-bold" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tuổi Max</label>
                        <input type="number" value={maxAge} onChange={e => setMaxAge(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2 text-center font-bold" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Thứ tự</label>
                        <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2 text-center font-bold" />
                    </div>
                 </div>

                 <div className="pt-2">
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all">
                        Tạo trò chơi mới
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
