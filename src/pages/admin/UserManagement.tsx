import React, { useEffect, useState, useMemo } from 'react';
import { 
  Shield, ShieldOff, Ban, CheckCircle, Search, Filter, 
  MoreVertical, ShieldCheck, Edit, X, Save, Loader2, ChevronDown 
} from 'lucide-react';
// Gọi fetchUsersAdminPaginated thay vì fetchAllUsers để chống lag
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
  
  // State phân trang (Pagination)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // State Quản lý việc sửa
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', bio: '', specialty: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialUsers();
  }, []); // Chỉ chạy 1 lần khi vào trang

  // Hàm tải dữ liệu trang đầu tiên
  const loadInitialUsers = async () => {
    setLoading(true);
    try {
      const { users: data, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(null, 20);
      setUsers(data);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error("Lỗi tải users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm tải thêm dữ liệu (Pagination)
  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: newData, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(lastDoc, 20);
      setUsers(prev => [...prev, ...newData]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error("Lỗi tải thêm:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Logic Toggle Roles (Admin, Ban)
  const handleToggleAdmin = async (user: UserType) => {
    if (!confirm(`Bạn có chắc muốn ${user.isAdmin ? 'gỡ' : 'cấp'} quyền Admin cho ${user.name}?`)) return;
    await updateUserRole(user.id, { isAdmin: !user.isAdmin });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u));
  };

  const handleToggleBan = async (user: UserType) => {
    if (!confirm(`Bạn có chắc muốn ${user.isBanned ? 'mở khóa' : 'khóa'} tài khoản ${user.name}?`)) return;
    await updateUserRole(user.id, { isBanned: !user.isBanned });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u));
  };

  // Logic Sửa thông tin
  const handleEditClick = (user: UserType) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      bio: user.bio || '',
      specialty: user.specialty || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
        await updateUserInfo(editingUser.id, {
            name: editForm.name,
            bio: editForm.bio,
            specialty: editForm.specialty
        });
        // Cập nhật state cục bộ để ko phải reload toàn bộ trang
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
        setEditingUser(null);
    } catch (error) {
        alert("Có lỗi xảy ra khi lưu!");
    } finally {
        setIsSaving(false);
    }
  };

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const nameSafe = (u.name || "").toLowerCase();
      const emailSafe = (u.email || "").toLowerCase();
      const searchSafe = searchTerm.toLowerCase();
      const matchesSearch = nameSafe.includes(searchSafe) || emailSafe.includes(searchSafe);
      
      if (!matchesSearch) return false;
      if (filter === 'expert') return u.isExpert;
      if (filter === 'admin') return u.isAdmin;
      if (filter === 'banned') return u.isBanned;
      return true;
    });
  }, [users, searchTerm, filter]);

  return (
    <div className="space-y-6 relative pb-20">
       {/* Actions Bar */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Tìm nhanh trong danh sách đã tải..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
             />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
             {['all', 'expert', 'admin', 'banned'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f as any)}
                 className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               >
                 {f === 'all' ? 'Tất cả' : f}
               </button>
             ))}
          </div>
       </div>

       {/* Table */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider">
                   <th className="px-6 py-4">Người dùng</th>
                   <th className="px-6 py-4">Vai trò</th>
                   <th className="px-6 py-4">Trạng thái</th>
                   <th className="px-6 py-4">Ngày tham gia</th>
                   <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {loading ? (
                   <tr><td colSpan={5} className="text-center py-20"><Loader2 className="animate-spin inline text-blue-500 mr-2" /> Đang tải...</td></tr>
                 ) : filteredUsers.length === 0 ? (
                   <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-medium">Không tìm thấy người dùng phù hợp</td></tr>
                 ) : (
                    filteredUsers.map(user => (
                       <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <img src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'} className="w-10 h-10 rounded-full bg-gray-100 object-cover border" />
                                <div>
                                   <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                       {user.name}
                                       {user.isAdmin && <ShieldCheck size={14} className="text-blue-500" />}
                                   </p>
                                   <p className="text-xs text-gray-400">{user.email || 'Ẩn email'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold uppercase tracking-tight">
                             <div className="flex gap-1 flex-wrap">
                                {user.isAdmin && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">Admin</span>}
                                {user.isExpert && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Expert</span>}
                                {!user.isAdmin && !user.isExpert && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500">User</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             {user.isBanned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                                   <Ban size={12} /> Banned
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                                   <CheckCircle size={12} /> Active
                                </span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                             {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : '--'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditClick(user)}
                                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Sửa thông tin"
                                >
                                   <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => handleToggleAdmin(user)}
                                  className={`p-2 rounded-lg transition-colors ${user.isAdmin ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:text-purple-600'}`}
                                  title="Admin Toggle"
                                >
                                   {user.isAdmin ? <ShieldCheck size={18} /> : <Shield size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleToggleBan(user)}
                                  className={`p-2 rounded-lg transition-colors ${user.isBanned ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}`}
                                  title="Ban Toggle"
                                >
                                   {user.isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
            </table>
          </div>

          {/* Nút Load More - Pagination */}
          {hasMore && !searchTerm && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                className="px-6 py-2 bg-white border rounded-full text-sm font-bold shadow-sm flex items-center gap-2 mx-auto hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
                Tải thêm thành viên
              </button>
            </div>
          )}
       </div>

       {/* Modal Edit User */}
       {editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-pop-in">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-800">Cập nhật thành viên</h3>
                  <button onClick={() => setEditingUser(null)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên hiển thị</label>
                     <input 
                        type="text" 
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 ring-blue-100 outline-none"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tiểu sử (Bio)</label>
                     <textarea 
                        rows={3}
                        value={editForm.bio}
                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 ring-blue-100 outline-none resize-none"
                     />
                  </div>
                  {editingUser.isExpert && (
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Chuyên môn</label>
                        <input 
                           type="text" 
                           value={editForm.specialty}
                           onChange={e => setEditForm({...editForm, specialty: e.target.value})}
                           className="w-full px-3 py-2 border rounded-xl focus:ring-2 ring-blue-100 outline-none"
                        />
                     </div>
                  )}
               </div>
               <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                  <button onClick={() => setEditingUser(null)} className="px-4 py-2 font-bold text-gray-400">Hủy</button>
                  <button 
                     onClick={handleSaveEdit}
                     disabled={isSaving}
                     className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  >
                     {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Lưu lại
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
