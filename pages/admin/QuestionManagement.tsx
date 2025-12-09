
import React, { useEffect, useState } from 'react';
import { Question } from '../../types';
import { fetchAllQuestionsAdmin, bulkUpdateQuestions, bulkDeleteQuestions } from '../../services/admin';
import { Search, Eye, EyeOff, Trash2, MoreHorizontal, Filter, AlertCircle } from 'lucide-react';
// @ts-ignore
import { Link } from 'react-router-dom';

export const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    const data = await fetchAllQuestionsAdmin();
    setQuestions(data);
    setLoading(false);
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
       setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    } else {
       setSelectedIds(new Set());
    }
  };

  const handleBulkHide = async (isHidden: boolean) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn muốn ${isHidden ? 'ẨN' : 'HIỆN'} ${selectedIds.size} câu hỏi đã chọn?`)) return;
    
    await bulkUpdateQuestions(Array.from(selectedIds), { isHidden });
    setSelectedIds(new Set());
    loadQuestions();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`CẢNH BÁO: Bạn sắp XÓA VĨNH VIỄN ${selectedIds.size} câu hỏi. Hành động này không thể hoàn tác!`)) return;
    
    await bulkDeleteQuestions(Array.from(selectedIds));
    setSelectedIds(new Set());
    loadQuestions();
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.author.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Tìm câu hỏi..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
             />
          </div>
          <div className="flex gap-2">
             <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
                <Filter size={16} /> Bộ lọc
             </button>
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                      <th className="px-6 py-4 w-10">
                         <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredQuestions.length} />
                      </th>
                      <th className="px-6 py-4 w-1/2">Nội dung</th>
                      <th className="px-6 py-4">Tác giả</th>
                      <th className="px-6 py-4 text-center">Tương tác</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4">Ngày tạo</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {loading ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-500">Đang tải...</td></tr>
                   ) : filteredQuestions.map(q => (
                      <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(q.id) ? 'bg-blue-50/50' : ''}`}>
                         <td className="px-6 py-4">
                            <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => handleSelect(q.id)} />
                         </td>
                         <td className="px-6 py-4">
                            <Link to={`/question/${q.id}`} target="_blank" className="font-bold text-gray-900 hover:text-blue-600 line-clamp-1 mb-1 block">
                               {q.title}
                            </Link>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{q.category}</span>
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-600">
                            {q.author.name}
                         </td>
                         <td className="px-6 py-4 text-center text-sm text-gray-500">
                            {q.answers.length} 💬 / {q.likes} ❤️
                         </td>
                         <td className="px-6 py-4 text-center">
                            {q.isHidden ? (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded">
                                  <EyeOff size={12} /> Đang ẩn
                               </span>
                            ) : (
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded">
                                  <Eye size={12} /> Hiển thị
                               </span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       {/* Floating Bulk Action Bar */}
       {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-pop-in">
             <span className="font-bold text-sm">{selectedIds.size} mục đã chọn</span>
             <div className="h-4 w-px bg-gray-600"></div>
             <div className="flex gap-2">
                <button onClick={() => handleBulkHide(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium">
                   <EyeOff size={16} /> Ẩn
                </button>
                <button onClick={() => handleBulkHide(false)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium">
                   <Eye size={16} /> Hiện
                </button>
                <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium">
                   <Trash2 size={16} /> Xóa
                </button>
             </div>
          </div>
       )}
    </div>
  );
};
