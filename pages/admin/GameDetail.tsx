
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate } from 'react-router-dom';
import { Game, GameQuestion } from '../../types';
import { getGameById, fetchGameQuestions, createGameQuestion, deleteGameQuestion, updateGameQuestion, importQuestionsBatch } from '../../services/game';
import { generateGameContent } from '../../services/gemini';
import { ArrowLeft, Sparkles, Plus, Trash2, Eye, EyeOff, Save, Loader2, Bot, FileJson, Copy, Check, AlertTriangle, X, Code } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
       {/* HEADER SECTION */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/admin/games')} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-gray-600">
                <ArrowLeft size={22} />
             </button>
             <div>
                <div className="flex items-center gap-3">
                    <span className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${game.color} text-white shadow-sm`}>{game.icon}</span>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{game.title}</h1>
                </div>
                <p className="text-gray-500 font-medium ml-1 mt-1">Quản lý câu hỏi ({questions.length})</p>
             </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={() => setShowJsonModal(true)}
                className="flex-1 md:flex-none bg-green-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95"
            >
                <Code size={20} /> Import JSON
            </button>
            <button 
                onClick={() => { setShowAiModal(true); setAiTopic(game.title); }}
                className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
                <Sparkles size={20} /> AI Generator
            </button>
          </div>
       </div>

       {/* MANUAL ADD FORM */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3"><Plus size={20} className="text-indigo-500"/> Thêm câu hỏi thủ công</h3>
          
          <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nội dung câu hỏi</label>
                    <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Ví dụ: Con gì kêu meo meo?" className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kiểu hiển thị</label>
                    <select value={displayType} onChange={e => setDisplayType(e.target.value as any)} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium">
                        <option value="emoji">Emoji (Biểu tượng)</option>
                        <option value="text">Text (Chữ/Số)</option>
                        <option value="color">Color (Màu sắc)</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {newOpts.map((opt, i) => (
                    <div key={i}>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Lựa chọn {i+1}</label>
                        <input value={opt} onChange={e => {
                            const no = [...newOpts]; no[i] = e.target.value; setNewOpts(no);
                        }} placeholder={`Option ${i+1}`} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-all" />
                    </div>
                 ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                 <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-green-600 uppercase mb-1 block">Đáp án đúng (Copy y hệt lựa chọn)</label>
                    <input value={newA} onChange={e => setNewA(e.target.value)} placeholder="Nhập đáp án đúng..." className="w-full border-2 border-green-100 p-3 rounded-xl outline-none focus:border-green-500 bg-green-50/30 transition-all font-bold text-green-800" />
                 </div>
                 <button 
                    onClick={handleAddQuestion} 
                    disabled={!newQ || !newA} 
                    className="w-full md:w-auto bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 shadow-md"
                 >
                    Thêm ngay
                 </button>
              </div>
          </div>
       </div>

       {/* QUESTION LIST */}
       <div className="space-y-3">
          {questions.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm">
                      <FileJson size={32} />
                  </div>
                  <p className="text-gray-500 font-medium mb-4">Chưa có câu hỏi nào trong trò chơi này.</p>
                  <button onClick={() => setShowJsonModal(true)} className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-4 py-2 rounded-lg">Import JSON mẫu ngay</button>
              </div>
          ) : (
             questions.map((q, idx) => (
                <div key={q.id} className={`bg-white p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${!q.isActive ? 'opacity-60 bg-gray-50 border-gray-200' : 'border-gray-200 shadow-sm hover:shadow-md'}`}>
                   <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs shrink-0 mt-1">
                         {idx + 1}
                      </div>
                      <div>
                         <p className="font-bold text-gray-900 text-lg">{q.q}</p>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {q.opts.map(o => (
                               <span key={o} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${o === q.a ? 'bg-green-100 border-green-200 text-green-700 font-bold ring-1 ring-green-200' : 'bg-white border-gray-200 text-gray-600'}`}>
                                  {o}
                               </span>
                            ))}
                            <span className="text-[10px] text-gray-400 self-center uppercase border border-gray-200 bg-gray-50 px-2 py-1 rounded ml-2">{q.displayType}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2 self-end md:self-center">
                      <button onClick={() => handleToggleQ(q)} className={`p-2 rounded-lg transition-colors ${q.isActive ? 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100' : 'text-gray-400 bg-gray-100'}`}>
                         {q.isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                      <button onClick={() => handleDeleteQ(q.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                         <Trash2 size={20} />
                      </button>
                   </div>
                </div>
             ))
          )}
       </div>

       {/* AI MODAL */}
       {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-pop-in shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                      <Bot size={28} /> AI Content Generator
                   </h2>
                   <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                   {generatedData.length === 0 ? (
                      <div className="space-y-6">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Chủ đề câu hỏi</label>
                            <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full border border-gray-200 rounded-xl p-4 text-lg outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all" />
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng</label>
                               <input type="number" value={aiCount} onChange={e => setAiCount(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-4 text-lg outline-none focus:border-indigo-500 transition-all" />
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-2">Kiểu hiển thị</label>
                               <select value={displayType} onChange={e => setDisplayType(e.target.value as any)} className="w-full border border-gray-200 rounded-xl p-4 text-lg outline-none focus:border-indigo-500 transition-all bg-white">
                                  <option value="emoji">Emoji</option>
                                  <option value="text">Chữ</option>
                                  <option value="color">Màu sắc</option>
                               </select>
                            </div>
                         </div>
                         
                         <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-700 text-sm">
                            <Sparkles className="shrink-0" size={20} />
                            <p>AI sẽ tự động tạo câu hỏi, đáp án và lựa chọn phù hợp với độ tuổi của trò chơi này.</p>
                         </div>

                         <button 
                            onClick={handleAiGenerate} 
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
                         >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} 
                            {isGenerating ? 'Đang suy nghĩ...' : 'Tạo câu hỏi ngay'}
                         </button>
                      </div>
                   ) : (
                      <div className="space-y-6">
                         <div className="flex justify-between items-center">
                            <p className="text-green-600 font-bold flex items-center gap-2 text-lg"><Sparkles size={20}/> AI đã tạo {generatedData.length} câu hỏi:</p>
                            <button onClick={() => setGeneratedData([])} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Làm lại</button>
                         </div>
                         
                         <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-200 max-h-[300px] overflow-y-auto scrollbar-thin">
                            {generatedData.map((item, i) => (
                               <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                  <span className="font-bold text-gray-800 block mb-1">{item.q}</span>
                                  <div className="flex gap-2 text-xs">
                                     <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">A: {item.a}</span>
                                     <span className="text-gray-500 self-center">Opts: {item.opts.join(', ')}</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                         <button 
                            onClick={saveGeneratedData}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                         >
                            <Save size={20} /> Lưu tất cả vào Database
                         </button>
                      </div>
                   )}
                </div>
             </div>
          </div>
       )}

       {/* IMPORT JSON MODAL */}
       {showJsonModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] w-full max-w-xl animate-pop-in shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                      <FileJson size={24} className="text-green-600" /> Import JSON Data
                   </h2>
                   <button onClick={() => setShowJsonModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
                </div>
                
                <div className="p-6">
                   <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-gray-700">Dán nội dung JSON vào đây:</label>
                        <button onClick={copySampleJson} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold bg-blue-50 px-2 py-1 rounded-md"><Copy size={12} /> Copy mẫu chuẩn</button>
                   </div>
                   
                   <textarea 
                      value={jsonInput}
                      onChange={e => setJsonInput(e.target.value)}
                      className="w-full h-48 border border-gray-300 rounded-xl p-4 text-xs font-mono focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none resize-none bg-gray-50 text-gray-800"
                      placeholder='[{"q": "Câu hỏi?", "opts": ["A", "B"], "a": "A", "displayType": "text"}]'
                   />
                   
                   <div className="bg-yellow-50 p-4 rounded-xl mt-4 flex gap-3 border border-yellow-100 text-yellow-800">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed">
                            <strong>Lưu ý quan trọng:</strong> Trường đáp án <code>"a"</code> phải giống y hệt (bao gồm chữ hoa/thường) với một trong các phần tử trong mảng <code>"opts"</code>.
                        </p>
                   </div>
                   
                   <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowJsonModal(false)} className="px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold">Hủy bỏ</button>
                      <button 
                        onClick={handleJsonImport}
                        disabled={importStatus === 'success' || !jsonInput.trim()}
                        className={`px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all shadow-lg ${importStatus === 'success' ? 'bg-green-500 shadow-green-200' : 'bg-gray-900 hover:bg-black shadow-gray-400'}`}
                      >
                         {importStatus === 'success' ? <Check size={20} /> : <FileJson size={20} />}
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
