import React, { useEffect, useState, useMemo } from 'react';
import { 
  Shield, ShieldOff, Ban, CheckCircle, Search, Filter, 
  MoreVertical, ShieldCheck, Edit, X, Save, Loader2, ChevronDown 
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

  useEffect(() => {
    loadInitialUsers();
  }, []);

  const loadInitialUsers = async () => {
    setLoading(true);
    try {
      // Tăng số lượng tải ban đầu lên 50 để bộ lọc local hoạt động tốt hơn
      const { users: data, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(null, 50);
      setUsers(data);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error("Lỗi tải users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: newData, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(lastDoc, 30);
      setUsers(prev => [...prev, ...newData]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error("Lỗi tải thêm:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleAdmin = async (user: UserType) => {
    const newStatus = !user.isAdmin;
    if (!confirm(`Bạn có chắc muốn ${newStatus ? 'cấp' : 'gỡ'} quyền Admin cho ${user.name}?`)) return;
    try {
      await updateUserRole(user.id, { isAdmin: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: newStatus } : u));
    } catch (e) { alert("Lỗi cập nhật quyền!"); }
  };

  const handleToggleBan = async (user: UserType) => {
    const newStatus = !user.isBanned;
    if (!confirm(`Bạn có chắc muốn ${newStatus ? 'khóa' : 'mở khóa'} tài khoản ${user.name}?`)) return;
    try {
      await updateUserRole(user.id, { isBanned: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: newStatus } : u));
    } catch (e) { alert("Lỗi cập nhật trạng thái!"); }
  };

  const handleEditClick = (user: UserType) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', bio: user.bio || '', specialty: user.specialty || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
        await updateUserInfo(editingUser.id, editForm);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
        setEditingUser(null);
    } catch (error) {
        alert("Lỗi lưu thông tin!");
    } finally {
        setIsSaving(false);
    }
  };

  // ✅ LOGIC BỘ LỌC ĐÃ ĐƯỢC SỬA LẠI CHÍNH XÁC 100%
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // 1. Kiểm tra Search (Tên hoặc Email)
      const searchLower = searchTerm.toLowerCase().trim();
      const nameMatch = (u.name || "").toLowerCase().includes(searchLower);
      const emailMatch = (u.email || "").toLowerCase().includes(searchLower);
      const matchesSearch = searchTerm === "" || nameMatch || emailMatch;

      if (!matchesSearch) return false;

      // 2. Kiểm tra Vai trò (Filter Tab)
      // Lưu ý: Firebase lưu boolean nên phải kiểm tra chính xác giá trị true
      if (filter === 'expert') return u.isExpert === true;
      if (filter === 'admin') return u.isAdmin === true;
      if (filter === 'banned') return u.isBanned === true;
      
      return true; // Trường hợp 'all'
    });
  }, [users, searchTerm, filter]);

  return (
    <div className="space-y-6 relative pb-20 animate-fade-in">
       {/* Actions Bar */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20">
          <div className="relative w-full md:w-96 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
             <input 
               type="text" 
               placeholder="Tìm theo tên hoặc email..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
             />
          </div>
          <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar p-1 bg-gray-50 rounded-xl">
             {(['all', 'expert', 'admin', 'banned'] as const).map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    filter === f 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 {f === 'all' ? 'Tất cả' : f === 'expert' ? 'Chuyên gia' : f === 'admin' ? 'Quản trị' : 'Bị khóa'}
               </button>
             ))}
          </div>
       </div>

       {/* Table Section */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-black tracking-[0.1em]">
                   <th className="px-6 py-4">Thành viên</th>
                   <th className="px-6 py-4">Vai trò hệ thống</th>
                   <th className="px-6 py-4">Trạng thái</th>
                   <th className="px-6 py-4">Ngày tham gia</th>
                   <th className="px-6 py-4 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {loading ? (
                   <tr><td colSpan={5} className="text-center py-20"><Loader2 className="animate-spin inline text-blue-500 mb-2" /><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Đang tải dữ liệu...</p></td></tr>
                 ) : filteredUsers.length === 0 ? (
                   <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-medium italic">Không tìm thấy người dùng phù hợp trong dữ liệu đã tải. <br/> <span className="text-[10px] not-italic">Mẹ hãy thử bấm "Tải thêm" ở dưới cùng nhé.</span></td></tr>
                 ) : (
                    filteredUsers.map(user => (
                       <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'} className="w-10 h-10 rounded-full bg-gray-100 object-cover border-2 border-white shadow-sm" />
                                    {user.isAdmin && <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full p-0.5 border border-white"><ShieldCheck size={10} /></div>}
                                </div>
                                <div>
                                   <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{user.name}</p>
                                   <p className="text-[11px] text-gray-400 font-medium">{user.email || 'Hệ thống Google'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex gap-1.5 flex-wrap">
                                {user.isAdmin && <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-50 text-purple-600 border border-purple-100">Admin</span>}
                                {user.isExpert && <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">Expert</span>}
                                {!user.isAdmin && !user.isExpert && <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-gray-50 text-gray-400">User</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             {user.isBanned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                                   <Ban size={10} /> Banned
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-600 border border-green-100">
                                   <CheckCircle size={10} /> Active
                                </span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                             {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : '--'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditClick(user)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Chỉnh sửa"><Edit size={16} /></button>
                                <button onClick={() => handleToggleAdmin(user)} className={`p-2 rounded-lg transition-all ${user.isAdmin ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-600 hover:bg-purple-50'}`} title="Quyền Admin">{user.isAdmin ? <ShieldCheck size={16} /> : <Shield size={16} />}</button>
                                <button onClick={() => handleToggleBan(user)} className={`p-2 rounded-lg transition-all ${user.isBanned ? 'text-red-600 bg-red-50' : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`} title="Khóa/Mở">{user.isBanned ? <CheckCircle size={16} /> : <Ban size={16} />}</button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
            </table>
          </div>

          {/* Footer - Tải thêm dữ liệu */}
          {hasMore && !searchTerm && (
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 text-center">
              <button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="px-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all disabled:opacity-50 flex items-center gap-3 mx-auto"
              >
                {loadingMore ? <Loader2 className="animate-spin" size={14} /> : <ChevronDown size={14} />}
                Tải thêm thành viên hệ thống
              </button>
            </div>
          )}
       </div>

       {/* Modal Chỉnh sửa thông tin */}
       {editingUser && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-pop-in">
               <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-black text-xl text-gray-900 tracking-tight">Cập nhật thông tin</h3>
                  <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
               </div>
               <div className="p-8 space-y-5">
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                     <input 
                        type="text" 
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-gray-800"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiểu sử ngắn</label>
                     <textarea 
                        rows={3}
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none font-medium text-sm leading-relaxed"
                        placeholder="Giới thiệu về thành viên..."
                     />
                  </div>
                  {editingUser.isExpert && (
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 text-xs">Chức danh Chuyên gia</label>
                        <input 
                           type="text" 
                           value={editForm.specialty}
                           onChange={e => setEditForm({...editForm, specialty: e.target.value})}
                           placeholder="VD: Bác sĩ, Chuyên gia tâm lý..."
                           className="w-full px-4 py-3 bg-blue-50/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-blue-600"
                        />
                     </div>
                  )}
               </div>
               <div className="px-8 py-6 bg-gray-50/80 flex justify-end gap-3 border-t border-gray-100">
                  <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Hủy bỏ</button>
                  <button 
                     onClick={handleSaveEdit}
                     disabled={isSaving}
                     className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95 transition-all"
                  >
                     {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Lưu thay đổi
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
