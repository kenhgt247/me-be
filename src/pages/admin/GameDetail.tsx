import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { Game, GameLevel, CategoryDef, GameAsset, GameConfig } from '../../types';
import { getGameById, updateGame, addLevelToGame, updateLevelInGame, deleteLevelFromGame, importLevelsBatch, fetchCategories } from '../../services/game';
import { generateGameContent, generateStory } from '../../services/gemini';
import { ArrowLeft, Sparkles, Trash2, Save, Loader2, Bot, X, Link as LinkIcon, BookOpen, ImageIcon, Volume2, Code } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const GameDetail: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryDef[]>([]);

  // LEVEL STATE
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [isEditingLevel, setIsEditingLevel] = useState<string | null>(null);

  // FORM STATE
  const [formLevel, setFormLevel] = useState<GameLevel>({
      id: '',
      instruction: { id: 'inst', text: '', imageUrl: '', audioUrl: '' },
      items: [],
      correctAnswerId: '',
      order: 0
  });

  // Config & Legacy State
  const [gameConfig, setGameConfig] = useState<GameConfig>({});
  const [gameUrl, setGameUrl] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLevels, setGeneratedLevels] = useState<GameLevel[]>([]);

  useEffect(() => {
    if (gameId) loadData();
  }, [gameId]);

  const loadData = async () => {
    if (!gameId) return;
    setLoading(true);
    const cats = await fetchCategories();
    setCategories(cats);

    const g = await getGameById(gameId);
    setGame(g);
    if (g) {
        setGameUrl(g.gameUrl || '');
        setStoryContent(g.storyContent || '');
        setGameConfig(g.config || {});
        if (g.levels) setLevels(g.levels.sort((a, b) => a.order - b.order));
        else setLevels([]);
    }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
      if (!gameId) return;
      setSavingSettings(true);
      await updateGame(gameId, { gameUrl, storyContent, config: gameConfig });
      setSavingSettings(false);
      alert("Đã lưu cấu hình!");
  };

  const resetForm = () => {
      setFormLevel({
          id: generateId(),
          instruction: { id: generateId(), text: '', imageUrl: '', audioUrl: '' },
          items: [{ id: generateId(), text: '' }, { id: generateId(), text: '' }],
          correctAnswerId: '',
          order: levels.length + 1
      });
      setIsEditingLevel(null);
  };

  const handleEditLevel = (lvl: GameLevel) => {
      setFormLevel(JSON.parse(JSON.stringify(lvl)));
      setIsEditingLevel(lvl.id);
  };

  const handleSaveLevel = async () => {
      if (!gameId) return;
      if (!formLevel.instruction.text && !formLevel.instruction.imageUrl && !formLevel.instruction.audioUrl) {
          alert("Vui lòng nhập đề bài");
          return;
      }
      if (isEditingLevel) await updateLevelInGame(gameId, formLevel);
      else await addLevelToGame(gameId, { ...formLevel, id: generateId() });
      
      resetForm();
      loadData();
  };

  const handleDeleteLevel = async (lvlId: string) => {
      if (!gameId || !confirm("Xóa màn chơi này?")) return;
      await deleteLevelFromGame(gameId, lvlId);
      loadData();
  };

  const updateFormItem = (idx: number, field: keyof GameAsset, value: string) => {
      const newItems = [...formLevel.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setFormLevel({ ...formLevel, items: newItems });
  };

  const addFormItem = () => {
      setFormLevel({ ...formLevel, items: [...formLevel.items, { id: generateId(), text: '' }] });
  };

  const removeFormItem = (idx: number) => {
      const newItems = [...formLevel.items];
      newItems.splice(idx, 1);
      setFormLevel({ ...formLevel, items: newItems });
  };

  const handleAiGenerate = async () => {
    if (!game) return;
    setIsGenerating(true);
    try {
        if (game.gameType === 'story') {
            const story = await generateStory(aiTopic || game.title, "Bài học bổ ích");
            setStoryContent(story.content);
            alert("AI đã viết xong truyện!");
        } else {
            const rawData = await generateGameContent(
                aiTopic || game.title,
                `${game.minAge}-${game.maxAge} tuổi`,
                aiCount,
                'emoji'
            );
            const convertedLevels: GameLevel[] = rawData.map((q: any, idx: number) => {
                const correctId = generateId();
                const items = q.opts.map((opt: string) => ({
                    id: opt === q.a ? correctId : generateId(),
                    text: opt
                }));
                return {
                    id: generateId(),
                    instruction: { id: generateId(), text: q.q, audioUrl: '' },
                    items: items,
                    correctAnswerId: correctId,
                    order: levels.length + idx + 1
                };
            });
            setGeneratedLevels(convertedLevels);
        }
    } catch (e) { alert("Lỗi sinh dữ liệu: " + e); } 
    finally { setIsGenerating(false); if(game.gameType==='story') setShowAiModal(false); }
  };

  const saveGeneratedLevels = async () => {
      if (!gameId) return;
      await importLevelsBatch(gameId, generatedLevels);
      setShowAiModal(false);
      setGeneratedLevels([]);
      loadData();
  };

  if (loading || !game) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/admin/games')} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-gray-600"><ArrowLeft size={22} /></button>
             <div>
                <div className="flex items-center gap-3">
                    <span className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${game.color} text-white shadow-sm`}>{game.icon}</span>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{game.title}</h1>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold uppercase">{game.gameType}</span>
                    {(game.gameType !== 'html5' && game.gameType !== 'story') && <span className="text-gray-500 font-medium text-xs self-center">({levels.length} màn chơi)</span>}
                </div>
             </div>
          </div>
          <button onClick={() => { setShowAiModal(true); setAiTopic(game.title); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all">
             <Sparkles size={20} /> AI {game.gameType === 'story' ? 'Viết truyện' : 'Tạo màn chơi'}
          </button>
       </div>

       {game.gameType === 'html5' && (
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg"><LinkIcon className="text-indigo-500"/> Cấu hình Game HTML5</h3>
               <div className="space-y-4">
                   <label className="block text-sm font-bold text-gray-700 mb-2">Đường dẫn Game (URL)</label>
                   <input value={gameUrl} onChange={e => setGameUrl(e.target.value)} className="w-full border p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100" placeholder="https://..." />
                   <button onClick={handleSaveConfig} disabled={savingSettings} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                       {savingSettings ? <Loader2 className="animate-spin" /> : <Save />} Lưu cấu hình
                   </button>
               </div>
           </div>
       )}

       {game.gameType === 'story' && (
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg"><BookOpen className="text-pink-500"/> Nội dung Truyện</h3>
               <textarea value={storyContent} onChange={e => setStoryContent(e.target.value)} className="w-full border p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 min-h-[300px]" placeholder="Ngày xửa ngày xưa..." />
               <button onClick={handleSaveConfig} disabled={savingSettings} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                   {savingSettings ? <Loader2 className="animate-spin" /> : <Save />} Lưu nội dung
               </button>
           </div>
       )}

       {(game.gameType !== 'html5' && game.gameType !== 'story') && (
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">{isEditingLevel ? '✏️ Chỉnh sửa Màn chơi' : '➕ Thêm Màn chơi mới'}</h3>
                        {isEditingLevel && <button onClick={resetForm} className="text-sm text-red-500 hover:underline">Hủy sửa</button>}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Đề bài</label>
                        <div className="grid grid-cols-1 gap-2">
                            <input value={formLevel.instruction.text || ''} onChange={e => setFormLevel({...formLevel, instruction: {...formLevel.instruction, text: e.target.value}})} placeholder="Nhập câu hỏi..." className="border p-3 rounded-xl w-full" />
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <ImageIcon size={18} className="absolute top-3.5 left-3 text-gray-400" />
                                    <input value={formLevel.instruction.imageUrl || ''} onChange={e => setFormLevel({...formLevel, instruction: {...formLevel.instruction, imageUrl: e.target.value}})} placeholder="URL Hình ảnh" className="border p-3 pl-10 rounded-xl w-full text-sm" />
                                </div>
                                <div className="relative flex-1">
                                    <Volume2 size={18} className="absolute top-3.5 left-3 text-gray-400" />
                                    <input value={formLevel.instruction.audioUrl || ''} onChange={e => setFormLevel({...formLevel, instruction: {...formLevel.instruction, audioUrl: e.target.value}})} placeholder="URL Âm thanh" className="border p-3 pl-10 rounded-xl w-full text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Các lựa chọn</label>
                            <button onClick={addFormItem} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">+ Thêm lựa chọn</button>
                        </div>
                        <div className="space-y-3">
                            {formLevel.items.map((item, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-2 transition-colors ${formLevel.correctAnswerId === item.id ? 'border-green-500 bg-green-50/50' : 'border-gray-100 bg-gray-50'}`}>
                                    <div className="flex gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-gray-500 shadow-sm">{idx + 1}</div>
                                        <input value={item.text || ''} onChange={e => updateFormItem(idx, 'text', e.target.value)} placeholder={`Lựa chọn ${idx+1}`} className="flex-1 border-b bg-transparent outline-none focus:border-blue-500 px-2" />
                                        <button onClick={() => removeFormItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pl-11">
                                        <input value={item.imageUrl || ''} onChange={e => updateFormItem(idx, 'imageUrl', e.target.value)} placeholder="URL Hình ảnh" className="bg-white border p-2 rounded text-xs" />
                                        <div className="flex items-center gap-2">
                                            <input type="radio" checked={formLevel.correctAnswerId === item.id} onChange={() => setFormLevel({...formLevel, correctAnswerId: item.id})} className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-gray-600">Là đáp án đúng</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleSaveLevel} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-300">
                        <Save size={20} /> {isEditingLevel ? 'Cập nhật' : 'Lưu Màn chơi mới'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-h-[80vh] overflow-y-auto">
                    <h3 className="font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 border-b z-10">Danh sách Màn chơi ({levels.length})</h3>
                    <div className="space-y-2">
                        {levels.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">Chưa có màn chơi nào.</p> : levels.map((lvl, idx) => (
                            <div key={lvl.id} className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group relative">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <span className="bg-gray-200 text-gray-600 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm line-clamp-1">{lvl.instruction.text || '(Hình ảnh)'}</p>
                                            <p className="text-xs text-gray-500">{lvl.items.length} lựa chọn</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditLevel(lvl)} className="p-1.5 hover:bg-white rounded text-blue-500"><Code size={16}/></button>
                                        <button onClick={() => handleDeleteLevel(lvl.id)} className="p-1.5 hover:bg-white rounded text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
       )}

       {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-pop-in shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700"><Bot size={28} /> AI Level Generator</h2>
                   <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                   {generatedLevels.length > 0 ? (
                      <div className="space-y-6">
                         <div className="flex justify-between items-center">
                            <p className="text-green-600 font-bold flex items-center gap-2 text-lg"><Sparkles size={20}/> AI đã tạo {generatedLevels.length} màn chơi:</p>
                            <button onClick={() => setGeneratedLevels([])} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Làm lại</button>
                         </div>
                         <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200 max-h-[300px] overflow-y-auto scrollbar-thin">
                            {generatedLevels.map((lvl, i) => (
                               <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                  <span className="font-bold text-gray-800 block mb-1">{lvl.instruction.text}</span>
                                  <div className="text-xs text-gray-500">{lvl.items.length} lựa chọn. Đáp án đúng ID: {lvl.correctAnswerId?.substr(0,5)}...</div>
                               </div>
                            ))}
                         </div>
                         <button onClick={saveGeneratedLevels} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                            <Save size={20} /> Lưu tất cả vào Game
                         </button>
                      </div>
                   ) : (
                      <div className="space-y-6">
                         <div><label className="block text-sm font-bold text-gray-700 mb-2">Chủ đề</label><input value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full border p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                         {game.gameType !== 'story' && (<div><label className="block text-sm font-bold text-gray-700 mb-2">Số lượng màn chơi</label><input type="number" value={aiCount} onChange={e => setAiCount(Number(e.target.value))} className="w-full border p-4 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100" /></div>)}
                         <button onClick={handleAiGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95">
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} {isGenerating ? 'Đang suy nghĩ...' : 'Tạo ngay'}
                         </button>
                      </div>
                   )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};
