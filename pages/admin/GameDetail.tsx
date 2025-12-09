
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { Game, GameQuestion } from '../../types';
import { getGameById, fetchGameQuestions, createGameQuestion, deleteGameQuestion, updateGameQuestion, importQuestionsBatch } from '../../services/game';
import { generateGameContent } from '../../services/gemini';
import { ArrowLeft, Sparkles, Plus, Trash2, Eye, EyeOff, Save, Loader2, Bot, FileJson, Copy, Check, AlertTriangle, X } from 'lucide-react';

export const GameDetail: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Form State
  const [newQ, setNewQ] = useState('');
  const [newOpts, setNewOpts] = useState(['', '', '']);
  const [newA, setNewA] = useState('');
  const [displayType, setDisplayType] = useState<'text' | 'emoji' | 'color'>('emoji');
  
  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<any[]>([]);

  // Import JSON State
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (gameId) loadData();
  }, [gameId]);

  const loadData = async () => {
    if (!gameId) return;
    setLoading(true);
    const g = await getGameById(gameId);
    setGame(g);
    const qs = await fetchGameQuestions(gameId);
    setQuestions(qs);
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!gameId || !newQ || !newA) return;
    
    await createGameQuestion(gameId, {
       q: newQ,
       opts: newOpts,
       a: newA,
       displayType,
       order: questions.length + 1,
       isActive: true,
       createdAt: new Date().toISOString()
    });

    // Reset
    setNewQ('');
    setNewOpts(['', '', '']);
    setNewA('');
    loadData();
  };

  const handleDeleteQ = async (qId: string) => {
    if (!gameId || !confirm("Xóa câu hỏi này?")) return;
    await deleteGameQuestion(gameId, qId);
    loadData();
  };

  const handleToggleQ = async (q: GameQuestion) => {
    if (!gameId) return;
    await updateGameQuestion(gameId, q.id, { isActive: !q.isActive });
    loadData();
  };

  const handleAiGenerate = async () => {
    if (!game) return;
    setIsGenerating(true);
    try {
       const data = await generateGameContent(
          aiTopic || game.title,
          `${game.minAge}-${game.maxAge} tuổi`,
          aiCount,
          displayType
       );
       setGeneratedData(data);
    } catch (e) {
       alert("Lỗi sinh dữ liệu: " + e);
    } finally {
       setIsGenerating(false);
    }
  };

  const saveGeneratedData = async () => {
     if (!gameId) return;
     let orderStart = questions.length + 1;
     
     // Save sequentially
     for (const item of generatedData) {
        await createGameQuestion(gameId, {
            ...item,
            order: orderStart++,
            isActive: true,
            createdAt: new Date().toISOString()
        });
     }
     setShowAiModal(false);
     setGeneratedData([]);
     loadData();
  };

  const handleJsonImport = async () => {
    if (!gameId || !jsonInput.trim()) return;
    try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) throw new Error("JSON phải là một mảng []");
        
        // Simple validation
        const isValid = parsed.every(item => item.q && item.opts && item.a);
        if (!isValid) throw new Error("Dữ liệu thiếu trường q, opts, hoặc a");

        await importQuestionsBatch(gameId, parsed, questions.length + 1);
        
        setImportStatus('success');
        setTimeout(() => {
            setShowJsonModal(false);
            setJsonInput('');
            setImportStatus('idle');
            loadData();
        }, 1500);

    } catch (error) {
        alert("Lỗi Import: " + error);
        setImportStatus('error');
    }
  };

  const copySampleJson = () => {
      const sample = `[
  {
    "q": "Con mèo kêu thế nào?",
    "opts": ["Gâu gâu", "Meo meo", "Chíp chíp"],
    "a": "Meo meo",
    "displayType": "text"
  },
  {
    "q": "Quả nào màu đỏ?",
    "opts": ["🍏", "🍎", "🍌"],
    "a": "🍎",
    "displayType": "emoji"
  }
]`;
      navigator.clipboard.writeText(sample);
      alert("Đã copy mẫu JSON!");
  };

  if (loading || !game) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/admin/games')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <ArrowLeft size={20} />
             </button>
             <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                   <span className="text-3xl">{game.icon}</span> {game.title}
                </h1>
                <p className="text-gray-500 text-sm">Quản lý câu hỏi ({questions.length})</p>
             </div>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={() => setShowJsonModal(true)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
            >
                <FileJson size={18} /> Import JSON
            </button>
            <button 
                onClick={() => { setShowAiModal(true); setAiTopic(game.title); }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
                <Sparkles size={18} /> AI Generator
            </button>
          </div>
       </div>

       {/* MANUAL ADD FORM */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18}/> Thêm thủ công</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
             <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Nội dung câu hỏi" className="border p-2 rounded-lg outline-none focus:border-indigo-500 transition-all" />
             <select value={displayType} onChange={e => setDisplayType(e.target.value as any)} className="border p-2 rounded-lg outline-none focus:border-indigo-500 transition-all">
                <option value="emoji">Hiển thị Emoji</option>
                <option value="text">Hiển thị Chữ</option>
                <option value="color">Hiển thị Màu</option>
             </select>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
             {newOpts.map((opt, i) => (
                <input key={i} value={opt} onChange={e => {
                    const no = [...newOpts]; no[i] = e.target.value; setNewOpts(no);
                }} placeholder={`Lựa chọn ${i+1}`} className="border p-2 rounded-lg outline-none focus:border-indigo-500 transition-all" />
             ))}
          </div>
          <div className="flex gap-4">
             <input value={newA} onChange={e => setNewA(e.target.value)} placeholder="Đáp án đúng (Copy y hệt lựa chọn)" className="border p-2 rounded-lg flex-1 outline-none focus:border-indigo-500 transition-all" />
             <button onClick={handleAddQuestion} disabled={!newQ || !newA} className="bg-gray-900 text-white px-6 rounded-lg font-bold hover:bg-black transition-colors disabled:opacity-50">Thêm</button>
          </div>
       </div>

       {/* QUESTION LIST */}
       <div className="space-y-3">
          {questions.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">Chưa có câu hỏi nào.</p>
                  <button onClick={() => setShowJsonModal(true)} className="text-indigo-600 font-bold hover:underline">Import JSON ngay</button>
              </div>
          ) : questions.map((q, idx) => (
             <div key={q.id} className={`bg-white p-4 rounded-xl border flex items-center justify-between ${!q.isActive ? 'opacity-60 bg-gray-50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-4">
                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">
                      {idx + 1}
                   </div>
                   <div>
                      <p className="font-bold text-gray-900">{q.q}</p>
                      <div className="flex gap-2 mt-1">
                         {q.opts.map(o => (
                            <span key={o} className={`text-xs px-2 py-1 rounded border ${o === q.a ? 'bg-green-100 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100'}`}>
                               {o}
                            </span>
                         ))}
                         <span className="text-[10px] text-gray-400 self-center uppercase border px-1 rounded">{q.displayType}</span>
                      </div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleToggleQ(q)} className="p-2 text-gray-400 hover:text-blue-600">
                      {q.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                   </button>
                   <button onClick={() => handleDeleteQ(q.id)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                   </button>
                </div>
             </div>
          ))}
       </div>

       {/* AI MODAL */}
       {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-pop-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                      <Bot size={24} /> AI Generator
                   </h2>
                   <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                   {generatedData.length === 0 ? (
                      <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Chủ đề câu hỏi</label>
                            <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full border rounded-lg p-3" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Số lượng</label>
                               <input type="number" value={aiCount} onChange={e => setAiCount(Number(e.target.value))} className="w-full border rounded-lg p-3" />
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-1">Kiểu hiển thị</label>
                               <select value={displayType} onChange={e => setDisplayType(e.target.value as any)} className="w-full border rounded-lg p-3">
                                  <option value="emoji">Emoji</option>
                                  <option value="text">Chữ</option>
                                  <option value="color">Màu sắc</option>
                               </select>
                            </div>
                         </div>
                         <button 
                            onClick={handleAiGenerate} 
                            disabled={isGenerating}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                         >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} 
                            {isGenerating ? 'Đang suy nghĩ...' : 'Tạo câu hỏi ngay'}
                         </button>
                      </div>
                   ) : (
                      <div className="space-y-4">
                         <p className="text-green-600 font-bold flex items-center gap-2"><Sparkles size={16}/> AI đã tạo {generatedData.length} câu hỏi:</p>
                         <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200 max-h-60 overflow-y-auto">
                            {generatedData.map((item, i) => (
                               <div key={i} className="text-sm border-b border-gray-200 pb-2 last:border-none">
                                  <span className="font-bold">{item.q}</span>
                                  <div className="text-gray-500 text-xs">A: {item.a} | Opts: {item.opts.join(', ')}</div>
                               </div>
                            ))}
                         </div>
                         <button 
                            onClick={saveGeneratedData}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                         >
                            <Save size={18} /> Lưu vào Database
                         </button>
                         <button onClick={() => setGeneratedData([])} className="w-full text-gray-500 text-sm hover:underline">Thử lại</button>
                      </div>
                   )}
                </div>
             </div>
          </div>
       )}

       {/* IMPORT JSON MODAL */}
       {showJsonModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-xl animate-pop-in shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                   <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                      <FileJson size={20} /> Import JSON
                   </h2>
                   <button onClick={() => setShowJsonModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="p-5">
                   <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">Dán nội dung JSON vào đây:</label>
                        <button onClick={copySampleJson} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Copy size={12} /> Copy mẫu</button>
                   </div>
                   
                   <textarea 
                      value={jsonInput}
                      onChange={e => setJsonInput(e.target.value)}
                      className="w-full h-48 border border-gray-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                      placeholder='[{"q": "Câu hỏi?", "opts": ["A", "B"], "a": "A", "displayType": "text"}]'
                   />
                   
                   <div className="bg-yellow-50 p-3 rounded-lg mt-3 flex gap-2 border border-yellow-100">
                        <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-700">Lưu ý: Đảm bảo đáp án đúng (a) giống hệt một trong các lựa chọn (opts).</p>
                   </div>
                   
                   <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => setShowJsonModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Hủy</button>
                      <button 
                        onClick={handleJsonImport}
                        disabled={importStatus === 'success' || !jsonInput.trim()}
                        className={`px-6 py-2 rounded-lg font-bold text-white flex items-center gap-2 transition-all ${importStatus === 'success' ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                         {importStatus === 'success' ? <Check size={18} /> : <FileJson size={18} />}
                         {importStatus === 'success' ? 'Thành công!' : 'Import ngay'}
                      </button>
                   </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};
