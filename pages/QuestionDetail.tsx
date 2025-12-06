
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, BadgeCheck, Bot, ShieldCheck, PenLine, Sparkles, Loader2, Send, MoreVertical, Trash2, Edit2, EyeOff, Eye, Save, X } from 'lucide-react';
import { Question, Answer, User } from '../types';
import { getAiAnswer, generateDraftAnswer } from '../services/gemini';

interface DetailProps {
  questions: Question[];
  currentUser: User;
  onAddAnswer: (questionId: string, answer: Answer) => void;
  onMarkBestAnswer: (questionId: string, answerId: string) => void;
  onVerifyAnswer: (questionId: string, answerId: string) => void;
  
  // CRUD Actions
  onEditQuestion: (id: string, title: string, content: string) => void;
  onDeleteQuestion: (id: string) => void;
  onHideQuestion: (id: string) => void;
  onEditAnswer: (qId: string, aId: string, content: string) => void;
  onDeleteAnswer: (qId: string, aId: string) => void;
  onHideAnswer: (qId: string, aId: string) => void;
}

export const QuestionDetail: React.FC<DetailProps> = ({ 
  questions, 
  currentUser, 
  onAddAnswer, 
  onMarkBestAnswer, 
  onVerifyAnswer,
  onEditQuestion,
  onDeleteQuestion,
  onHideQuestion,
  onEditAnswer,
  onDeleteAnswer,
  onHideAnswer
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const question = questions.find(q => q.id === id);
  
  const [newAnswer, setNewAnswer] = useState('');
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  
  // AI Draft State
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [usedAiAssistance, setUsedAiAssistance] = useState(false);

  // UI State for Editing/Menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQTitle, setEditQTitle] = useState('');
  const [editQContent, setEditQContent] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAContent, setEditAContent] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Edit State
  useEffect(() => {
    if (question) {
      setEditQTitle(question.title);
      setEditQContent(question.content);
    }
  }, [question]);

  // Handle Question Not Found (e.g., Deleted)
  useEffect(() => {
    if (!question) {
       // Optional: Add a small delay or toast
    }
  }, [question]);

  // Auto-generate AI answer if none exist
  useEffect(() => {
    if (question && question.answers.length === 0 && !isAiAnswering && !question.isHidden) {
      const fetchAi = async () => {
        setIsAiAnswering(true);
        // Simulate a slight delay for realism
        setTimeout(async () => {
          const aiContent = await getAiAnswer(question.title, question.content);
          const aiAnswer: Answer = {
            id: 'ai-' + Date.now(),
            questionId: question.id,
            author: { id: 'ai', name: 'Trợ lý Asking AI', avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png', isExpert: true },
            content: aiContent,
            likes: 0,
            isBestAnswer: false,
            createdAt: new Date().toISOString(),
            isAi: true
          };
          onAddAnswer(question.id, aiAnswer);
          setIsAiAnswering(false);
        }, 2000);
      };
      fetchAi();
    }
  }, [question, isAiAnswering, onAddAnswer]);

  if (!question) return <div className="p-12 text-center text-textGray text-lg">Câu hỏi không tồn tại hoặc đã bị xóa. <button onClick={()=>navigate('/')} className="text-primary font-bold hover:underline">Về trang chủ</button></div>;

  // --- Handlers ---

  const handleGenerateDraft = async () => {
    if (isGeneratingDraft) return;
    setIsGeneratingDraft(true);
    
    // Call the draft specific service
    const draft = await generateDraftAnswer(question.title, question.content);
    
    if (draft) {
        setNewAnswer(draft);
        setUsedAiAssistance(true);
    }
    setIsGeneratingDraft(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    const isAi = usedAiAssistance;

    const answer: Answer = {
      id: Date.now().toString(),
      questionId: question.id,
      author: currentUser,
      content: newAnswer,
      likes: 0,
      isBestAnswer: false,
      isExpertVerified: false,
      createdAt: new Date().toISOString(),
      isAi: isAi 
    };
    onAddAnswer(question.id, answer);
    setNewAnswer('');
    setUsedAiAssistance(false);
  };

  const handleSaveQuestionEdit = () => {
    if (editQTitle.trim() && editQContent.trim()) {
      onEditQuestion(question.id, editQTitle, editQContent);
      setIsEditingQuestion(false);
    }
  };

  const handleSaveAnswerEdit = (aId: string) => {
    if (editAContent.trim()) {
      onEditAnswer(question.id, aId, editAContent);
      setEditingAnswerId(null);
    }
  };

  const handleDeleteQWrapper = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này không?')) {
      onDeleteQuestion(question.id);
      navigate('/');
    }
  };

  // --- Render Helpers ---

  // Check Permissions
  const canModifyQuestion = currentUser.id === question.author.id || currentUser.isAdmin;
  
  // Visibility Logic for Question
  if (question.isHidden && !canModifyQuestion) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
         <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-textGray hover:text-primary transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Quay lại
        </button>
        <div className="bg-gray-50 rounded-2xl p-10 text-center border border-gray-100">
           <EyeOff size={48} className="mx-auto text-gray-300 mb-4" />
           <h2 className="text-xl font-bold text-textDark mb-2">Nội dung đã bị ẩn</h2>
           <p className="text-textGray">Câu hỏi này đã bị ẩn do vi phạm quy tắc cộng đồng hoặc theo yêu cầu của người đăng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 md:pb-20 animate-fade-in relative min-h-screen bg-cream md:bg-transparent">
      {/* Mobile Header for Detail - Fixed Top */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm px-4 py-3 md:hidden flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-textDark hover:bg-gray-100 rounded-full active:bg-gray-200 transition-colors">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-textDark truncate">{question.title}</h1>
          <p className="text-xs text-textGray truncate">{question.answers.length} câu trả lời</p>
        </div>
      </div>

      {/* Desktop Back Button */}
      <div className="hidden md:block px-4 pt-4">
         <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-textGray hover:text-primary transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Quay lại
        </button>
      </div>

      <div className="px-4 mt-4 md:mt-0">
        {/* Question Card */}
        <div className={`bg-white p-6 rounded-[2rem] shadow-sm mb-6 border transition-all relative ${question.isHidden ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100/60'}`}>
          {/* Hidden Badge for Admins/Authors */}
          {question.isHidden && (
            <div className="absolute top-0 left-0 right-0 bg-orange-100 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-t-[2rem] flex items-center justify-center gap-2">
               <EyeOff size={14} /> CÂU HỎI ĐANG BỊ ẨN
            </div>
          )}
          
          <div className={`flex items-start justify-between mb-4 ${question.isHidden ? 'mt-6' : ''}`}>
            <div className="flex items-center gap-3">
              <img src={question.author.avatar} alt={question.author.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50" />
              <div>
                <h3 className="font-bold text-textDark text-lg">{question.author.name}</h3>
                <p className="text-xs text-textGray font-medium flex items-center gap-1">
                   {new Date(question.createdAt).toLocaleDateString('vi-VN')} 
                   <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                   <span className="text-primary">{question.category}</span>
                </p>
              </div>
            </div>

            {/* Question Actions Menu */}
            {canModifyQuestion && !isEditingQuestion && (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setActiveMenuId(activeMenuId === 'q-menu' ? null : 'q-menu')}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
                {activeMenuId === 'q-menu' && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-pop-in">
                    <button 
                      onClick={() => { setIsEditingQuestion(true); setActiveMenuId(null); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-textDark"
                    >
                      <Edit2 size={16} /> Chỉnh sửa
                    </button>
                    {currentUser.isAdmin && (
                      <button 
                        onClick={() => { onHideQuestion(question.id); setActiveMenuId(null); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-orange-500"
                      >
                        {question.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {question.isHidden ? 'Hiện câu hỏi' : 'Ẩn câu hỏi'}
                      </button>
                    )}
                    <button 
                      onClick={() => { handleDeleteQWrapper(); setActiveMenuId(null); }}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-sm font-medium text-red-500"
                    >
                      <Trash2 size={16} /> Xóa câu hỏi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditingQuestion ? (
            <div className="space-y-4 animate-fade-in">
              <input 
                type="text" 
                value={editQTitle}
                onChange={(e) => setEditQTitle(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <textarea 
                value={editQContent}
                onChange={(e) => setEditQContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl min-h-[150px] focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditingQuestion(false)}
                  className="px-4 py-2 text-textGray font-bold hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <X size={18} /> Hủy
                </button>
                <button 
                  onClick={handleSaveQuestionEdit}
                  className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 flex items-center gap-1"
                >
                  <Save size={18} /> Lưu
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-bold text-textDark mb-3 leading-snug">{question.title}</h2>
              <p className="text-textDark/80 leading-relaxed whitespace-pre-wrap text-[15px]">{question.content}</p>
              
              {/* Attached Images */}
              {question.images && question.images.length > 0 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {question.images.map((img, idx) => (
                    <div key={idx} className="relative group shrink-0">
                      <img 
                        src={img} 
                        alt={`Ảnh đính kèm ${idx + 1}`} 
                        className="h-32 md:h-48 w-auto rounded-xl border border-gray-100 object-cover" 
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex gap-6 mt-6 pt-4 border-t border-gray-50">
            <button className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors font-medium text-sm">
              <Heart size={20} /> <span className="text-textGray">{question.likes} quan tâm</span>
            </button>
          </div>
        </div>

        {/* Answers List */}
        <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-textDark">Câu trả lời</h2>
            <span className="bg-secondary/30 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{question.answers.length}</span>
        </div>
        
        <div className="space-y-4 mb-8">
          {question.answers.length === 0 && isAiAnswering && (
            <div className="bg-white p-5 rounded-2xl flex items-center gap-4 animate-pulse border border-primary/10 shadow-sm">
              <div className="bg-secondary/20 p-2.5 rounded-full text-primary">
                <Bot size={24} />
              </div>
              <div>
                 <p className="text-sm font-bold text-textDark mb-1">Asking AI</p>
                 <span className="text-xs text-textGray">Đang soạn câu trả lời cho mẹ...</span>
              </div>
            </div>
          )}

          {question.answers.map(ans => {
            const canModifyAnswer = currentUser.id === ans.author.id || currentUser.isAdmin;
            const isEditingThis = editingAnswerId === ans.id;
            
            // Hide Logic for Answer
            if (ans.isHidden && !canModifyAnswer) return null; // Completely hide for normal users

            return (
              <div key={ans.id} className={`relative p-5 md:p-6 rounded-[1.5rem] shadow-sm transition-all ${
                  ans.isHidden 
                  ? 'bg-gray-50 border border-gray-200 opacity-75'
                  : ans.isBestAnswer 
                  ? 'bg-green-50 border border-green-200 shadow-green-100' 
                  : ans.isExpertVerified
                    ? 'bg-blue-50 border border-blue-100 shadow-blue-100'
                    : ans.isAi 
                      ? 'bg-white border-2 border-transparent bg-gradient-to-r from-purple-50/50 to-white' 
                      : 'bg-white border border-gray-100'
                }`}>
                
                {/* Hidden Badge for Answer */}
                {ans.isHidden && (
                  <div className="absolute top-2 right-12 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <EyeOff size={10} /> ĐÃ ẨN
                  </div>
                )}

                {/* Badges */}
                {(ans.isBestAnswer || ans.isExpertVerified) && (
                  <div className="absolute -top-3 left-6 flex gap-2">
                    {ans.isBestAnswer && (
                      <div className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <BadgeCheck size={12} /> HAY NHẤT
                      </div>
                    )}
                    {ans.isExpertVerified && (
                      <div className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <ShieldCheck size={12} /> CHUYÊN GIA
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className="flex items-center gap-2.5">
                    <img src={ans.author.avatar} className="w-9 h-9 rounded-full bg-white object-cover border border-gray-100" alt="Avatar"/>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-sm ${ans.isAi ? 'text-purple-600' : 'text-textDark'}`}>{ans.author.name}</span>
                        {ans.author.isExpert && <BadgeCheck size={14} className="text-blue-500" fill="currentColor" color="white" />}
                      </div>
                      {ans.isAi && (
                        <span className="text-[10px] text-purple-500 flex items-center gap-0.5 font-medium bg-purple-50 px-1.5 py-0.5 rounded-md self-start inline-flex">
                            <Sparkles size={8} /> Trợ lý AI
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                     {/* Verify Button (Admin Only) */}
                    {currentUser.isAdmin && ans.author.isExpert && !ans.isExpertVerified && !ans.isHidden && (
                        <button 
                          onClick={() => onVerifyAnswer(question.id, ans.id)}
                          className="text-gray-300 hover:text-blue-500 transition-colors p-2"
                          title="Xác thực chuyên gia"
                        >
                          <ShieldCheck size={20} />
                        </button>
                    )}
                    {currentUser.isAdmin && ans.author.isExpert && ans.isExpertVerified && !ans.isHidden && (
                        <button 
                          onClick={() => onVerifyAnswer(question.id, ans.id)}
                          className="text-blue-500 p-2"
                          title="Đã xác thực"
                        >
                          <ShieldCheck size={20} />
                        </button>
                    )}

                    {/* Answer Actions Menu */}
                    {canModifyAnswer && !isEditingThis && (
                       <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === `a-${ans.id}` ? null : `a-${ans.id}`); }}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {activeMenuId === `a-${ans.id}` && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-pop-in">
                            <button 
                              onClick={() => { setEditingAnswerId(ans.id); setEditAContent(ans.content); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-textDark"
                            >
                              <Edit2 size={14} /> Chỉnh sửa
                            </button>
                            {currentUser.isAdmin && (
                              <button 
                                onClick={() => { onHideAnswer(question.id, ans.id); setActiveMenuId(null); }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-orange-500"
                              >
                                {ans.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                {ans.isHidden ? 'Hiện câu trả lời' : 'Ẩn câu trả lời'}
                              </button>
                            )}
                            <button 
                              onClick={() => { 
                                if(window.confirm('Xóa câu trả lời này?')) onDeleteAnswer(question.id, ans.id); 
                                setActiveMenuId(null); 
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-xs font-bold text-red-500"
                            >
                              <Trash2 size={14} /> Xóa
                            </button>
                          </div>
                        )}
                       </div>
                    )}
                  </div>
                </div>
                
                {isEditingThis ? (
                  <div className="mt-2 space-y-3">
                     <textarea 
                        value={editAContent}
                        onChange={(e) => setEditAContent(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingAnswerId(null)}
                          className="px-3 py-1.5 text-textGray text-xs font-bold hover:bg-gray-100 rounded-lg"
                        >
                          Hủy
                        </button>
                        <button 
                          onClick={() => handleSaveAnswerEdit(ans.id)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
                        >
                          Lưu
                        </button>
                      </div>
                  </div>
                ) : (
                  <div className={`text-textDark text-[15px] leading-relaxed whitespace-pre-wrap ${ans.isHidden ? 'blur-[1px] select-none opacity-50' : ''}`}>
                     {ans.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Answer Input Area - Sticky Bottom with Premium Mobile Style */}
      {!question.isHidden && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/60 md:relative md:border-none md:bg-transparent z-50 px-4 pt-3 pb-8 md:pb-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none">
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3 relative items-end">
              <div className="flex-1 relative bg-gray-100 rounded-3xl transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white focus-within:shadow-sm">
                <textarea
                    value={newAnswer}
                    onChange={(e) => {
                        setNewAnswer(e.target.value);
                        if (e.target.value === '') setUsedAiAssistance(false);
                    }}
                    disabled={isGeneratingDraft}
                    placeholder={isGeneratingDraft ? "Đang viết câu trả lời..." : "Viết câu trả lời của mẹ..."}
                    className="w-full bg-transparent border-none pl-4 pr-12 py-3.5 focus:ring-0 resize-none max-h-32 min-h-[52px] text-[15px] text-textDark placeholder-gray-400 disabled:opacity-50"
                    rows={1}
                    style={{height: 'auto'}} 
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                />
                {/* AI Pen Button */}
                <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={isGeneratingDraft || newAnswer.length > 20}
                    className={`absolute right-2 bottom-1.5 p-2 rounded-full transition-all active:scale-90 ${
                        isGeneratingDraft 
                        ? 'text-primary' 
                        : 'text-purple-500 hover:bg-purple-50'
                    }`}
                >
                    {isGeneratingDraft ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <div className="relative">
                            <PenLine size={20} />
                            <Sparkles size={10} className="absolute -top-1 -right-1 text-accent animate-pulse" />
                        </div>
                    )}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={!newAnswer.trim() || isGeneratingDraft}
                className="bg-primary disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-primary/30 transition-all active:scale-95 hover:bg-[#25A99C] flex-shrink-0 mb-0.5"
              >
                <Send size={20} className={newAnswer.trim() ? "ml-0.5" : ""} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
