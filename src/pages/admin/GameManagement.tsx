import React, { useEffect, useState } from 'react';
import { Game, GameCategory, GameType, GameOrientation, CategoryDef } from '../../types';
// ĐÃ SỬA DÒNG NÀY: import từ '../services/game' (KHÔNG CÓ 'S')
import { fetchAllGames, createGame, deleteGame, updateGame, fetchCategories, addCategory, deleteCategory } from '../../services/game';
import { Plus, Trash2, ToggleRight, ToggleLeft, Loader2, ArrowRight, X, RefreshCw, Palette, Smile, Eye, List, Smartphone, Monitor, Edit2, Check } from 'lucide-react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

const EMOJI_OPTIONS = [
  '🎮', '🧩', '🎨', '📚', '🔢', '🅰️', '🧠', '👀',
  '🐶', '🐱', '🦁', '🐻', '🐼', '🐸', '🦄', '🦖',
  '🍎', '🍌', '🍇', '🍓', '🥕', '🍕', '🍦', '🍪',
  '🚗', '🚀', '✈️', '🚂', '⚽', '🏀', '🎵', '🌟',
  '🏠', '🏫', '🌈', '☀️', '🌙', '💧', '🔥', '⛄',
  '👑', '🎈', '🎁', '🧸', '🥁', '🎷', '🎸', '🎺',
  '📖', '🤖', '👾', '🌍', '🏰', '👸', '🤴', '🧚'
];

const COLOR_OPTIONS = [
  'bg-blue-400', 'bg-red-400', 'bg-green-400', 'bg-yellow-400', 
  'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400',
  'bg-indigo-400', 'bg-rose-400', 'bg-cyan-400', 'bg-lime-400',
  'bg-slate-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-sky-500'
];

export const GameManagement: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const navigate = useNavigate();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [color, setColor] = useState('bg-blue-400');
  const [category, setCategory] = useState<GameCategory>('general');
  const [gameType, setGameType] = useState<GameType>('quiz');
  const [orientation, setOrientation] = useState<GameOrientation>('auto');
  const [minAge, setMinAge] = useState(2);
  const [maxAge, setMaxAge] = useState(6);
  const [order, setOrder] = useState(1);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎮');
  const [newCatColor, setNewCatColor] = useState('bg-blue-400');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [gData, cData] = await Promise.all([fetchAllGames(), fetchCategories()]);
    setGames(gData);
    setCategories(cData);
    setLoading(false);
  };

  const handleEdit = (game: Game) => {
      setEditingId(game.id);
      setTitle(game.title);
      setIcon(game.icon);
      setColor(game.color);
      setCategory(game.category);
      setGameType(game.gameType);
      setOrientation(game.orientation || 'auto');
      setMinAge(game.minAge);
      setMaxAge(game.maxAge);
      setOrder(game.order);
      setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const gameData: any = {
      title, slug, icon, color, category, gameType, orientation, minAge, maxAge, order,
      config: { bgMusicUrl: '', correctSoundUrl: '', wrongSoundUrl: '', successConfetti: true, mascotGuide: true }
    };

    if (editingId) await updateGame(editingId, gameData);
    else await createGame({ ...gameData, isActive: true, levels: [], totalPlays: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    setShowModal(false);
    loadData();
    resetForm();
  };

  const handleAddCategory = async () => {
      if (!newCatName) return;
      const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await addCategory({ id, label: newCatName, icon: newCatIcon, color: newCatColor, isDefault: false });
      setNewCatName('');
      loadData();
  };

  const handleDeleteCategory = async (id: string) => {
      if (!confirm("Xóa danh mục này?")) return;
      await deleteCategory(id);
      loadData();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setIcon('🎮'); setColor('bg-blue-400'); setCategory('general'); setGameType('quiz'); setOrientation('auto'); setOrder(games.length + 1);
  };

  const handleToggleActive = async (game: Game) => { await updateGame(game.id, { isActive: !game.isActive }); loadData(); };
  const handleDelete = async (id: string) => { if (!confirm("Xóa game này?")) return; await deleteGame(id); loadData(); };

  const filteredGames = games.filter(g => filterCategory === 'all' || g.category === filterCategory);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div><h1 className="text-2xl font-bold text-gray-900">Quản lý Trò chơi</h1><p className="text-gray-500 text-sm mt-1">Quiz, Kéo thả, Truyện kể...</p></div>
        <div className="flex gap-2">
            <button onClick={loadData} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={() => setShowCategoryModal(true)} className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-100"><List size={20} /> Danh mục</button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"><Plus size={20} /> Thêm Game</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterCategory === 'all' ? 'bg-gray-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600'}`}>Tất cả</button>
          {categories.map(cat => (
              <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${filterCategory === cat.id ? `${cat.color} text-white shadow-md` : 'bg-white border border-gray-200 text-gray-600'}`}><span>{cat.icon}</span> {cat.label}</button>
          ))}
      </div>

      {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredGames.length === 0 && <div className="col-span-full text-center py-10 text-gray-400 italic">Trống.</div>}
           {filteredGames.map(game => (
             <div key={game.id} className={`bg-white rounded-[1.5rem] shadow-sm border p-5 flex flex-col relative overflow-hidden hover:shadow-lg transition-all ${!game.isActive ? 'opacity-70 grayscale bg-gray-50' : ''}`}>
                <div className="absolute top-0 right-0 flex">
                    <div className="bg-gray-100 px-3 py-1 text-[10px] font-bold text-gray-500 uppercase rounded-bl-xl">{game.gameType}</div>
                    <div className={`px-3 py-1 text-white font-bold text-xs ${game.color} shadow-sm rounded-bl-xl`}>{game.minAge}-{game.maxAge}t</div>
                </div>
                <div className="flex items-center gap-4 mb-5 mt-2">
                   <div className={`w-16 h-16 rounded-2xl ${game.color} flex items-center justify-center text-4xl shadow-lg text-white`}>{game.icon}</div>
                   <div>
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{game.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">{categories.find(c => c.id === game.category)?.label}</span>
                      </div>
                   </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 gap-2">
                    <div className="flex gap-1">
                        <button onClick={() => handleDelete(game.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                        <button onClick={() => handleEdit(game)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                        <button onClick={() => handleToggleActive(game)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">{game.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}</button>
                    </div>
                    <button onClick={() => navigate(`/admin/games/${game.id}`)} className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm flex items-center justify-center gap-1">Chi tiết <ArrowRight size={16} /></button>
                </div>
             </div>
           ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-5xl animate-pop-in shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[95vh]">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 z-20 text-gray-400 bg-white rounded-full p-2 border"><X size={24} /></button>
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingId ? 'Cập nhật' : 'Thêm mới'}</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                     <div><label className="block text-sm font-bold text-gray-700 mb-2">Tên hiển thị</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3.5 rounded-xl font-medium" required /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Loại hình</label><select value={gameType} onChange={e => setGameType(e.target.value as GameType)} className="w-full border p-3 rounded-xl bg-white"><option value="quiz">Quiz</option><option value="flashcard">Flashcard</option><option value="html5">HTML5</option><option value="story">Story</option></select></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Màn hình</label><div className="flex gap-2"><button type="button" onClick={() => setOrientation('auto')} className={`flex-1 p-2 border-2 rounded-xl text-xs font-bold ${orientation === 'auto' ? 'border-indigo-500 bg-indigo-50' : ''}`}><Smartphone size={16}/> Auto</button><button type="button" onClick={() => setOrientation('landscape')} className={`flex-1 p-2 border-2 rounded-xl text-xs font-bold ${orientation === 'landscape' ? 'border-indigo-500 bg-indigo-50' : ''}`}><Monitor size={16}/> Ngang</button></div></div>
                     </div>
                     <div><label className="block text-sm font-bold text-gray-700 mb-2">Chủ đề</label><div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">{categories.map(cat => (<button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left ${category === cat.id ? 'border-indigo-500 bg-indigo-50' : ''}`}><span className={`w-6 h-6 rounded flex items-center justify-center ${cat.color} text-white`}>{cat.icon}</span><span className="text-sm font-bold">{cat.label}</span></button>))}</div></div>
                     <div><label className="block text-sm font-bold text-gray-700 mb-2">Biểu tượng</label><div className="grid grid-cols-8 gap-2 border p-4 rounded-xl max-h-32 overflow-y-auto bg-gray-50">{EMOJI_OPTIONS.map(e => (<button key={e} type="button" onClick={() => setIcon(e)} className={`text-xl p-2 rounded-xl ${icon === e ? 'bg-white shadow-md ring-2 ring-indigo-500' : ''}`}>{e}</button>))}</div></div>
                     <div><label className="block text-sm font-bold text-gray-700 mb-2">Màu chủ đạo</label><div className="flex gap-3 overflow-x-auto pb-2">{COLOR_OPTIONS.map(c => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-10 h-10 rounded-full flex-shrink-0 ${c} border-2 ${color === c ? 'border-gray-500 scale-110' : 'border-transparent'}`}></button>))}</div></div>
                     <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl">{editingId ? 'Lưu thay đổi' : 'Tạo Game'}</button>
                  </form>
              </div>
           </div>
        </div>
      )}

      {showCategoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-lg animate-pop-in shadow-2xl relative">
                  <div className="p-6 border-b flex justify-between items-center bg-purple-50"><h2 className="text-xl font-bold text-purple-800">Quản lý Danh mục</h2><button onClick={() => setShowCategoryModal(false)}><X/></button></div>
                  <div className="p-6 space-y-6">
                      <div className="bg-gray-50 p-4 rounded-2xl border"><input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Tên danh mục..." className="w-full p-3 rounded-xl border mb-3"/><button onClick={handleAddCategory} disabled={!newCatName} className="w-full py-2 bg-purple-600 text-white font-bold rounded-xl">Thêm ngay</button></div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">{categories.map(cat => (<div key={cat.id} className="flex justify-between p-3 border rounded-xl"><div className="flex gap-3"><span className={`w-6 h-6 rounded flex justify-center items-center ${cat.color} text-white`}>{cat.icon}</span><span className="font-bold">{cat.label}</span></div>{!cat.isDefault && <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-400"><Trash2 size={16}/></button>}</div>))}</div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
