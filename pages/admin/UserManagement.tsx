
import React, { useEffect, useState } from 'react';
import { User, Shield, ShieldOff, Ban, CheckCircle, Search, Filter, MoreVertical, ShieldCheck } from 'lucide-react';
import { fetchAllUsers, updateUserRole } from '../../services/admin';
import { User as UserType } from '../../types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'expert' | 'admin' | 'banned'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleToggleAdmin = async (user: UserType) => {
    if (!confirm(`Bạn có chắc muốn ${user.isAdmin ? 'gỡ' : 'cấp'} quyền Admin cho ${user.name}?`)) return;
    await updateUserRole(user.id, { isAdmin: !user.isAdmin });
    loadUsers();
  };

  const handleToggleBan = async (user: UserType) => {
    if (!confirm(`Bạn có chắc muốn ${user.isBanned ? 'mở khóa' : 'khóa'} tài khoản ${user.name}?`)) return;
    await updateUserRole(user.id, { isBanned: !user.isBanned });
    loadUsers();
  };

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'expert') return u.isExpert;
    if (filter === 'admin') return u.isAdmin;
    if (filter === 'banned') return u.isBanned;
    return true;
  });

  return (
    <div className="space-y-6">
       {/* Actions Bar */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Tìm kiếm theo tên, email..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
             />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             {['all', 'expert', 'admin', 'banned'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f as any)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                   <th className="px-6 py-4">Người dùng</th>
                   <th className="px-6 py-4">Vai trò</th>
                   <th className="px-6 py-4">Trạng thái</th>
                   <th className="px-6 py-4">Ngày tham gia</th>
                   <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {loading ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">Đang tải...</td></tr>
                 ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-500">Không tìm thấy người dùng</td></tr>
                 ) : (
                    filteredUsers.map(user => (
                       <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <img src={user.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                                <div>
                                   <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                   <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex gap-1 flex-wrap">
                                {user.isAdmin && <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">Admin</span>}
                                {user.isExpert && <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">Chuyên gia</span>}
                                {!user.isAdmin && !user.isExpert && <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">User</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             {user.isBanned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                                   <Ban size={12} /> Banned
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-600">
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
                                  onClick={() => handleToggleAdmin(user)}
                                  className={`p-2 rounded-lg transition-colors ${user.isAdmin ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-gray-400 hover:text-purple-600 hover:bg-gray-100'}`}
                                  title={user.isAdmin ? "Gỡ quyền Admin" : "Cấp quyền Admin"}
                                >
                                   {user.isAdmin ? <ShieldCheck size={18} /> : <Shield size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleToggleBan(user)}
                                  className={`p-2 rounded-lg transition-colors ${user.isBanned ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'}`}
                                  title={user.isBanned ? "Mở khóa" : "Khóa tài khoản"}
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
       </div>
    </div>
  );
};
