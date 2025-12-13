import React, { useEffect, useState } from 'react';
import { Question, Category, toSlug } from '../../types'; // Nhớ import Category
// Import các hàm từ service
import { 
  fetchAllQuestionsAdmin, 
  bulkUpdateQuestions, 
  bulkDeleteQuestions,
  fetchCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  syncCategoriesFromCode // <-- Hàm đồng bộ mới
} from '../../services/admin';
import { Search, Eye, EyeOff, Trash2, Filter, Plus, X, Edit2, List, Save, RefreshCw } from 'lucide-react';
// @ts-ignore
import { Link } from 'react-router-dom';

// --- COMPONENT CON: Modal Quản lý Danh mục ---
const CategoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await fetchCategories();
    setCategories(data);
  };

  // Hàm đồng bộ danh mục từ code cũ
  const handleSync = async () => {
      setLoading(true);
      try {
          const count = await syncCategoriesFromCode();
          alert(`Đã đồng bộ thành công ${count} danh mục từ file code cũ!`);
          await loadData();
      } catch (e) {
          alert("Lỗi đồng bộ: " + e);
      } finally {
          setLoading(false);
      }
  };

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    await addCategory(newCatName);
    setNewCatName('');
    await loadData();
    setLoading(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    await updateCategory(id, editName);
    setEditingId(null);
    await loadData();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa danh mục này? Lưu ý: Các câu hỏi thuộc danh mục này sẽ không bị xóa nhưng có thể mất nhãn.')) return;
    setLoading(true);
    await deleteCategory(id);
    await loadData();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-pop-in">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><List size={20}/> Quản lý Danh mục</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500"/></button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          
          {/* NÚT ĐỒNG BỘ (MỚI THÊM) */}
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
             <span className="text-xs text-blue-800 font-medium">Bạn có danh mục cũ trong code?</span>
             <button onClick={handleSync} disabled={loading} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors disabled:opacity-50">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Đồng bộ ngay
             </button>
          </div>

          {/* Form thêm mới */}
          <div className="flex gap-2 mb-4">
            <input 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Tên danh mục mới..." 
              className="flex-1 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <button onClick={handleAdd} disabled={loading || !newCatName} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors">Thêm</button>
          </div>

          {/* Danh sách */}
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                {editingId === cat.id ? (
                  <div className="flex gap-2 flex-1">
                    <input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="flex-1 border p-1 rounded text-sm outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={18}/></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-200 p-1 rounded"><X size={18}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="text-blue-500 hover:bg-white p-1 rounded transition-colors"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:bg-white p-1 rounded transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <p className="text-center text-gray-400 text-sm">Chưa có danh mục nào.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // State cho Modal danh mục
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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
    <div className="space-y-6 pb-20 animate-fade-in">
       {/* Toolbar */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input type="text" placeholder="Tìm câu hỏi..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-2">
             {/* Nút mở Modal Danh mục */}
             <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-100 transition-colors">
                <List size={18} /> QL Danh mục
             </button>
             <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
                <Filter size={16} /> Bộ lọc
             </button>
          </div>
       </div>

       {/* Table */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                      <th className="px-6 py-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredQuestions.length} /></th>
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
                         <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => handleSelect(q.id)} /></td>
                         <td className="px-6 py-4">
                            <Link to={`/question/${toSlug(q.title, q.id)}`} target="_blank" className="font-bold text-gray-900 hover:text-blue-600 line-clamp-1 mb-1 block">{q.title}</Link>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{q.category}</span>
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-600">{q.author.name}</td>
                         <td className="px-6 py-4 text-center text-sm text-gray-500">{q.answers.length} 💬 / {q.likes} ❤️</td>
                         <td className="px-6 py-4 text-center">
                            {q.isHidden ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded"><EyeOff size={12} /> Đang ẩn</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded"><Eye size={12} /> Hiển thị</span>}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(q.createdAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       {/* Bulk Actions Bar */}
       {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-pop-in">
             <span className="font-bold text-sm">{selectedIds.size} mục đã chọn</span>
             <div className="h-4 w-px bg-gray-600"></div>
             <div className="flex gap-2">
                <button onClick={() => handleBulkHide(true)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"><EyeOff size={16} /> Ẩn</button>
                <button onClick={() => handleBulkHide(false)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"><Eye size={16} /> Hiện</button>
                <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"><Trash2 size={16} /> Xóa</button>
             </div>
          </div>
       )}

       {/* Render Modal */}
       {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
    </div>
  );
};
