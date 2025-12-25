import React, { useEffect, useState, useCallback } from 'react';
import { 
  Shield, ShieldOff, Ban, CheckCircle, Search, Filter, 
  MoreVertical, ShieldCheck, Edit, X, Save, Loader2, ChevronDown, RefreshCw 
} from 'lucide-react';
import { 
  fetchUsersAdminPaginated, 
  updateUserRole, 
  updateUserInfo 
} from '../../services/admin';
import { User as UserType } from '../../types';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'expert' | 'admin' | 'banned'>('all');
  
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', bio: '', specialty: '' });
  const [isSaving, setIsSaving] = useState(false);

  // ✅ HÀM TẢI LẠI TOÀN BỘ (Dùng khi muốn thấy người đăng ký mới nhất)
  const loadInitialUsers = async () => {
    setLoading(true);
    setUsers([]); // Xóa danh sách cũ để đảm bảo không bị lẫn dữ liệu ảo
    try {
      const { users: data, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(null, 30);
      setUsers(data);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialUsers();
  }, []);

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: newData, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(lastDoc, 30);
      setUsers(prev => [...prev, ...newData]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
        await updateUserInfo(editingUser.id, editForm);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
        setEditingUser(null);
    } catch (error) { alert("Lỗi!"); }
    finally { setIsSaving(false); }
  };

  const handleToggleAdmin = async (user: UserType) => {
    if (!confirm(`Cấp/Gỡ quyền Admin cho ${user.name}?`)) return;
    await updateUserRole(user.id, { isAdmin: !user.isAdmin });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u));
  };

  // ✅ LOGIC TÌM KIẾM CHUẨN: Ưu tiên quét dữ liệu thật
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return users.filter(u => {
      const matchesSearch = term === "" || 
                           (u.name || "").toLowerCase().includes(term) || 
                           (u.email || "").toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (filter === 'expert') return u.isExpert === true;
      if (filter === 'admin') return u.isAdmin === true;
      if (filter === 'banned') return u.isBanned === true;
      return true;
    });
  }, [users, searchTerm, filter]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       {/* Actions Bar */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={loadInitialUsers} 
                className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                title="Làm mới danh sách (Load người dùng mới nhất)"
             >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
             <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoặc email người dùng thật..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm"
                />
             </div>
          </div>
          
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl">
             {(['all', 'expert', 'admin', 'banned'] as const).map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
               >
                 {f === 'all' ? 'Tất cả' : f === 'expert' ? 'Chuyên gia' : f === 'admin' ? 'Quản trị' : 'Bị khóa'}
               </button>
             ))}
          </div>
       </div>

       {/* Table */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                   <th className="px-6 py-4">Thành viên</th>
                   <th className="px-6 py-4">Vai trò</th>
                   <th className="px-6 py-4 text-center">Trạng thái</th>
                   <th className="px-6 py-4 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                   <tr><td colSpan={4} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest animate-pulse">Đang quét Database...</td></tr>
                ) : filteredUsers.length === 0 ? (
                   <tr><td colSpan={4} className="text-center py-20 text-gray-400 italic">Không tìm thấy người dùng này. Mẹ hãy bấm "Tải thêm" hoặc nút "Làm mới" nhé.</td></tr>
                ) : (
                    filteredUsers.map(user => (
                       <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                                <img src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'} className="w-10 h-10 rounded-full bg-gray-100 object-cover border-2 border-white shadow-sm" alt="" />
                                <div className="min-w-0">
                                   <p className="font-bold text-gray-900 truncate">{user.name}</p>
                                   <p className="text-[11px] text-gray-400 truncate">{user.email || 'Email ẩn'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex gap-1 flex-wrap">
                                {user.isAdmin && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-600">Admin</span>}
                                {user.isExpert && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-600">Expert</span>}
                                {!user.isAdmin && !user.isExpert && <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Member</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             {user.isBanned ? <span className="text-red-500 font-black text-[10px] uppercase bg-red-50 px-2 py-1 rounded-full">Banned</span> : <span className="text-green-600 font-black text-[10px] uppercase bg-green-50 px-2 py-1 rounded-full">Active</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingUser(user); setEditForm({ name: user.name || '', bio: user.bio || '', specialty: user.specialty || '' }); }} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><Edit size={16} /></button>
                                <button onClick={() => handleToggleAdmin(user)} className={`p-2 transition-all ${user.isAdmin ? 'text-purple-600' : 'text-gray-300 hover:text-purple-600'}`} title="Admin Toggle"><ShieldCheck size={16} /></button>
                                <button onClick={() => { if(confirm("Khóa người này?")) updateUserRole(user.id, { isBanned: !user.isBanned }).then(loadInitialUsers) }} className={`p-2 transition-all ${user.isBanned ? 'text-red-600' : 'text-gray-300 hover:text-red-600'}`} title="Ban Toggle"><Ban size={16} /></button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="p-6 bg-gray-50/50 border-t text-center">
              <button onClick={handleLoadMore} disabled={loadingMore} className="px-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-500 shadow-sm hover:bg-gray-50 flex items-center gap-3 mx-auto transition-all disabled:opacity-50">
                {loadingMore ? <Loader2 className="animate-spin" size={14} /> : <ChevronDown size={14} />}
                Tải thêm danh sách (Tìm người dùng cũ hơn)
              </button>
            </div>
          )}
       </div>

       {/* Modal Chỉnh sửa rút gọn */}
       {editingUser && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-pop-in">
               <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-black text-xl text-gray-900 tracking-tight">Sửa thông tin thật</h3>
                  <button onClick={() => setEditingUser(null)}><X size={20} /></button>
               </div>
               <div className="p-8 space-y-4">
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none" placeholder="Tên thành viên" />
                  <textarea rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm font-medium" placeholder="Tiểu sử" />
               </div>
               <div className="px-8 py-6 bg-gray-50/80 flex justify-end gap-3 border-t">
                  <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 font-black text-xs text-gray-400 uppercase">Hủy</button>
                  <button onClick={handleSaveEdit} disabled={isSaving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50">
                     {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Cập nhật ngay
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
