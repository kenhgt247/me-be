import React, { useEffect, useState } from 'react';
import { Question, Category, toSlug } from '../../types';
import { 
  fetchAllQuestionsAdmin, 
  bulkUpdateQuestions, 
  bulkDeleteQuestions,
  fetchCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory,
  syncCategoriesFromCode 
} from '../../services/admin';
import { 
  Search, Eye, EyeOff, Trash2, Filter, Plus, X, Edit2, List, Save, RefreshCw,
  // Import các icon mẫu để làm bộ chọn
  Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Tag, Star, Music, Sun, Cloud
} from 'lucide-react';
// @ts-ignore
import { Link } from 'react-router-dom';

// --- CẤU HÌNH ICON & MÀU SẮC CHO ADMIN CHỌN ---
const ICON_LIST = [
  { id: 'Baby', component: Baby },
  { id: 'Heart', component: Heart },
  { id: 'Utensils', component: Utensils },
  { id: 'Brain', component: Brain },
  { id: 'BookOpen', component: BookOpen },
  { id: 'Users', component: Users },
  { id: 'Stethoscope', component: Stethoscope },
  { id: 'Smile', component: Smile },
  { id: 'Tag', component: Tag },
  { id: 'Star', component: Star },
  { id: 'Music', component: Music },
  { id: 'Sun', component: Sun },
  { id: 'Cloud', component: Cloud },
];

const COLOR_PRESETS = [
  { name: 'Hồng', color: 'text-pink-600', bg: 'bg-pink-50' },
  { name: 'Xanh lá', color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Xanh dương', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Tím', color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Vàng', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { name: 'Cam', color: 'text-orange-600', bg: 'bg-orange-50' },
  { name: 'Đỏ', color: 'text-red-600', bg: 'bg-red-50' },
  { name: 'Xám', color: 'text-gray-600', bg: 'bg-gray-50' },
];

// --- COMPONENT CON: Modal Quản lý Danh mục ---
const CategoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [catName, setCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0); // Mặc định màu hồng (index 0)
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await fetchCategories();
    setCategories(data);
  };

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

  const resetForm = () => {
    setCatName('');
    setSelectedIcon('Tag');
    setSelectedColorIdx(0);
    setEditingId(null);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setCatName(cat.name);
    setSelectedIcon(cat.icon || 'Tag');
    // Tìm lại index màu dựa trên class text
    const idx = COLOR_PRESETS.findIndex(c => c.color === cat.color);
    setSelectedColorIdx(idx >= 0 ? idx : 7); // Nếu ko tìm thấy thì về màu xám (7)
  };

  const handleSave = async () => {
    if (!catName.trim()) return;
    setLoading(true);
    
    // Lấy thông tin style từ state
    const styleData = {
        icon: selectedIcon,
        color: COLOR_PRESETS[selectedColorIdx].color,
        bg: COLOR_PRESETS[selectedColorIdx].bg
    };

    if (editingId) {
        // Gọi hàm update (đã cập nhật bên service)
        await updateCategory(editingId, catName, styleData);
    } else {
        // Gọi hàm add (đã cập nhật bên service)
        await addCategory(catName, styleData);
    }
    
    resetForm();
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><List size={20}/> Quản lý Danh mục</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* KHU VỰC NHẬP LIỆU (Thêm/Sửa) - ĐÃ THÊM ICON PICKER & COLOR PICKER */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 transition-all">
             <h4 className="text-sm font-bold text-gray-700 mb-3 flex justify-between items-center">
                {editingId ? '✏️ Chỉnh sửa danh mục' : '➕ Thêm danh mục mới'}
                {editingId && <button onClick={resetForm} className="text-xs text-red-500 font-normal hover:underline">Hủy bỏ</button>}
             </h4>
             
             {/* Tên danh mục */}
             <div className="mb-4">
                <input 
                  value={catName} 
                  onChange={e => setCatName(e.target.value)}
                  placeholder="Nhập tên danh mục (VD: Đồ chơi)..." 
                  className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium"
                />
             </div>

             {/* Chọn Icon (MỚI) */}
             <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Chọn biểu tượng</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {ICON_LIST.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setSelectedIcon(item.id)}
                            className={`p-2 rounded-lg border flex items-center justify-center transition-all min-w-[40px] ${selectedIcon === item.id ? 'bg-blue-100 border-blue-500 text-blue-600 shadow-sm ring-2 ring-blue-200' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100'}`}
                            title={item.id}
                        >
                            <item.component size={20} />
                        </button>
                    ))}
                </div>
             </div>

             {/* Chọn Màu (MỚI) */}
             <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase">Chọn màu sắc</label>
                <div className="flex gap-3 flex-wrap">
                    {COLOR_PRESETS.map((preset, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setSelectedColorIdx(idx)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${selectedColorIdx === idx ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                            title={preset.name}
                        >
                            <div className={`w-full h-full rounded-full ${preset.bg.replace('/20', '')} border border-black/5`}></div>
                            {selectedColorIdx === idx && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full shadow-sm"></div></div>}
                        </button>
                    ))}
                </div>
             </div>

             {/* Nút Lưu */}
             <button 
                onClick={handleSave} 
                disabled={loading || !catName} 
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
             >
                {editingId ? <Save size={16}/> : <Plus size={16}/>}
                {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
             </button>
          </div>

          {/* Header Danh sách */}
          <div className="flex justify-between items-center mb-3 px-1">
             <span className="text-sm font-bold text-gray-500">Danh sách hiện có ({categories.length})</span>
             <button onClick={handleSync} disabled={loading} className="text-xs text-blue-600 flex items-center gap-1 hover:underline bg-blue-50 px-2 py-1 rounded">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Đồng bộ Code cũ
             </button>
          </div>

          {/* DANH SÁCH (Đã cập nhật hiển thị Icon động) */}
          <div className="space-y-2 pb-4">
            {categories.map(cat => {
               // Render Icon động dựa trên ID lưu trong DB
               const IconComp = ICON_LIST.find(i => i.id === cat.icon)?.component || Tag;
               // Màu mặc định nếu thiếu
               const colorClass = cat.color || 'text-gray-600';
               const bgClass = cat.bg || 'bg-gray-100';

               return (
                  <div key={cat.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${editingId === cat.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${bgClass} ${colorClass}`}>
                            <IconComp size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-sm">{cat.name}</span>
                            <span className="text-[10px] text-gray-400">/{cat.slug}</span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(cat)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Sửa"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Xóa"><Trash2 size={16}/></button>
                    </div>
                  </div>
               )
            })}
            {categories.length === 0 && <p className="text-center text-gray-400 text-sm py-8 italic border-2 border-dashed border-gray-100 rounded-xl">Chưa có danh mục nào.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH (Giữ nguyên logic cũ) ---
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
