import React, { useEffect, useState, useCallback } from 'react';
import { Question, Category, toSlug } from '../../types';
import { 
  fetchQuestionsAdminPaginated, 
  bulkUpdateQuestions, 
  bulkDeleteQuestions,
  fetchCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory,
  syncCategoriesFromCode 
} from '../../services/admin';
import { 
  Search, Eye, EyeOff, Trash2, Filter, Plus, X, Edit2, List, Save, RefreshCw, Loader2, ChevronDown,
  Baby, Heart, Utensils, Brain, BookOpen, Users, Stethoscope, Smile, Tag, Star, Music, Sun, Cloud
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const ICON_LIST = [
  { id: 'Baby', component: Baby }, { id: 'Heart', component: Heart }, { id: 'Utensils', component: Utensils },
  { id: 'Brain', component: Brain }, { id: 'BookOpen', component: BookOpen }, { id: 'Users', component: Users },
  { id: 'Stethoscope', component: Stethoscope }, { id: 'Smile', component: Smile }, { id: 'Tag', component: Tag }
];

const COLOR_PRESETS = [
  { name: 'Hồng', color: 'text-pink-600', bg: 'bg-pink-50' },
  { name: 'Xanh lá', color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Xanh dương', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Tím', color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Cam', color: 'text-orange-600', bg: 'bg-orange-50' },
];

/* =======================
   MODAL: QUẢN LÝ DANH MỤC
   ======================= */
const CategoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { const data = await fetchCategories(); setCategories(data); };

  const handleSave = async () => {
    if (!catName.trim()) return;
    setLoading(true);
    const style = { icon: selectedIcon, color: COLOR_PRESETS[selectedColorIdx].color, bg: COLOR_PRESETS[selectedColorIdx].bg };
    editingId ? await updateCategory(editingId, catName, style) : await addCategory(catName, style);
    setCatName(''); setEditingId(null); await loadData(); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa danh mục này?')) { setLoading(true); await deleteCategory(id); await loadData(); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-pop-in flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><List size={20}/> Quản lý Danh mục</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-xl border mb-6">
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Tên danh mục..." className="w-full border p-2 rounded-lg mb-4 outline-none" />
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
               {ICON_LIST.map(item => (
                 <button key={item.id} onClick={() => setSelectedIcon(item.id)} className={`p-2 rounded-lg border ${selectedIcon === item.id ? 'bg-blue-100 border-blue-500' : 'bg-white'}`}><item.component size={20}/></button>
               ))}
            </div>
            <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Lưu danh mục</button>
          </div>
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-3 border rounded-xl">
                <span className="font-bold text-sm">{cat.name}</span>
                <div className="flex gap-2">
                   <button onClick={() => { setEditingId(cat.id); setCatName(cat.name); }} className="text-blue-500"><Edit2 size={16}/></button>
                   <button onClick={() => handleDelete(cat.id)} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =======================
   MAIN COMPONENT
   ======================= */
export const QuestionManagement: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Hàm load dữ liệu có hỗ trợ searchTerm
  const loadInitialData = useCallback(async (search: string = '') => {
    setLoading(true);
    // Truyền search term vào service
    const { questions: data, lastDoc: nextDoc, hasMore: more } = 
        await fetchQuestionsAdminPaginated(null, 15, { searchTerm: search });
    
    setQuestions(data); 
    setLastDoc(nextDoc); 
    setHasMore(more);
    setLoading(false);
  }, []);

  // Effect xử lý tìm kiếm với cơ chế Debounce (đợi 500ms sau khi ngừng gõ mới gọi API)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadInitialData(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, loadInitialData]);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const { questions: newData, lastDoc: nextDoc, hasMore: more } = 
        await fetchQuestionsAdminPaginated(lastDoc, 15, { searchTerm });
        
    setQuestions(prev => [...prev, ...newData]); 
    setLastDoc(nextDoc); 
    setHasMore(more);
    setLoadingMore(false);
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: 'hide' | 'show' | 'delete') => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xác nhận thực hiện trên ${selectedIds.size} mục?`)) return;
    
    if (action === 'hide') await bulkUpdateQuestions(Array.from(selectedIds), { isHidden: true });
    else if (action === 'show') await bulkUpdateQuestions(Array.from(selectedIds), { isHidden: false });
    else await bulkDeleteQuestions(Array.from(selectedIds));
    
    setSelectedIds(new Set()); 
    loadInitialData(searchTerm);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
          <input 
            type="text" 
            placeholder="Tìm theo tiêu đề câu hỏi..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100" 
          />
          {loading && searchTerm && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="animate-spin text-blue-500" size={16} />
            </div>
          )}
        </div>
        <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold flex items-center gap-2"><List size={18}/> QL Danh mục</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    onChange={e => setSelectedIds(e.target.checked ? new Set(questions.map(q=>q.id)) : new Set())}
                    checked={selectedIds.size > 0 && selectedIds.size === questions.length}
                  />
                </th>
                <th className="px-6 py-4">Nội dung câu hỏi</th>
                <th className="px-6 py-4">Tác giả</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading && questions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-gray-400"><Loader2 className="animate-spin inline mr-2"/> Đang tải dữ liệu...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-gray-400">Không tìm thấy kết quả phù hợp.</td></tr>
              ) : (
                questions.map(q => (
                  <tr key={q.id} className={`hover:bg-gray-50 ${selectedIds.has(q.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => handleSelect(q.id)}/></td>
                    <td className="px-6 py-4">
                      <Link to={`/question/${toSlug(q.title)}`} target="_blank" className="font-bold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
                        {q.title}
                      </Link>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{q.category}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{q.author?.name || 'Ẩn danh'}</td>
                    <td className="px-6 py-4 text-center">
                      {q.isHidden ? 
                        <span className="inline-flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-1 rounded-full text-[10px] uppercase">
                          <EyeOff size={10} /> Ẩn
                        </span> : 
                        <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full text-[10px] uppercase">
                          <Eye size={10} /> Hiện
                        </span>
                      }
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && !loading && (
           <div className="p-4 border-t text-center bg-gray-50">
              <button onClick={handleLoadMore} disabled={loadingMore} className="px-6 py-2 bg-white border rounded-full text-sm font-bold shadow-sm flex items-center gap-2 mx-auto hover:bg-gray-100 transition-all">
                {loadingMore ? <Loader2 className="animate-spin" size={16}/> : <ChevronDown size={16}/>}
                Xem thêm câu hỏi
              </button>
           </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-pop-in">
           <span className="font-bold text-sm">{selectedIds.size} mục đã chọn</span>
           <div className="flex gap-3 border-l border-gray-700 pl-6">
              <button onClick={() => handleBulkAction('hide')} className="text-sm font-medium hover:text-blue-400 flex items-center gap-1 transition-colors"><EyeOff size={16}/> Ẩn</button>
              <button onClick={() => handleBulkAction('show')} className="text-sm font-medium hover:text-green-400 flex items-center gap-1 transition-colors"><Eye size={16}/> Hiện</button>
              <button onClick={() => handleBulkAction('delete')} className="text-sm font-bold text-red-400 flex items-center gap-1 transition-colors"><Trash2 size={16}/> Xóa</button>
           </div>
           <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16}/></button>
        </div>
      )}

      {showCategoryModal && <CategoryModal onClose={() => setShowCategoryModal(false)} />}
    </div>
  );
};
