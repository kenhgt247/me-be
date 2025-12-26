// src/pages/admin/UserManagement.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Ban,
  Search,
  ShieldCheck,
  Edit,
  X,
  Save,
  Loader2,
  ChevronDown,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

import {
  fetchUsersAdminPaginated,
  updateUserRole,
  updateUserInfo,
  createUserByAdmin,
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

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 1) Load initial users
  const loadInitialUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { users: data, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(null, 50);
      setUsers(data);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error('Lỗi tải users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialUsers();
  }, [loadInitialUsers]);

  // 2) Load more (pagination)
  const handleLoadMore = async () => {
    if (!hasMore || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: newData, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(lastDoc, 30);
      setUsers((prev) => [...prev, ...newData]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error('Lỗi tải thêm users:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // 3) Filter + search
  const displayUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return users.filter((u) => {
      const matchesSearch =
        term === '' ||
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (filter === 'expert') return (u as any).isExpert === true;
      if (filter === 'admin') return (u as any).isAdmin === true;
      if (filter === 'banned') return (u as any).isBanned === true;

      return true;
    });
  }, [users, searchTerm, filter]);

  // ===== Edit =====
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateUserInfo(editingUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...editForm } : u)));
      setEditingUser(null);
    } catch (error) {
      console.error(error);
      alert('Lỗi cập nhật!');
    } finally {
      setIsSaving(false);
    }
  };

  // ===== Toggle Admin =====
  const handleToggleAdmin = async (user: UserType) => {
    const newStatus = !(user as any).isAdmin;
    const ok = window.confirm(
      `${newStatus ? 'CẤP' : 'GỠ'} quyền Admin cho ${user.name || 'người dùng'}?`
    );
    if (!ok) return;

    try {
      await updateUserRole(user.id, { isAdmin: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isAdmin: newStatus } : u)));
    } catch (e) {
      console.error(e);
      alert('Không cập nhật được quyền Admin (rules/permission?)');
    }
  };

  // ===== Toggle Ban =====
  const handleToggleBan = async (user: UserType) => {
    const newStatus = !(user as any).isBanned;
    const ok = window.confirm(`${newStatus ? 'KHÓA' : 'MỞ KHÓA'} ${user.name || 'người dùng'}?`);
    if (!ok) return;

    try {
      await updateUserRole(user.id, { isBanned: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBanned: newStatus } : u)));
    } catch (e) {
      console.error(e);
      alert('Không cập nhật được trạng thái khóa (rules/permission?)');
    }
  };

  // ===== Create User =====
  const openCreateModal = () => {
    setCreateError('');
    setCreateForm({ email: '', password: '', name: '' });
    setShowCreateModal(true);
  };

  const handleCreateUser = async () => {
    setCreateError('');
    const email = createForm.email.trim();
    const password = createForm.password;
    const name = createForm.name.trim() || 'Người dùng';

    if (!email || !email.includes('@')) {
      setCreateError('Email không hợp lệ.');
      return;
    }
    if (!password || password.length < 6) {
      setCreateError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    setCreating(true);
    try {
      // ✅ FIX: gọi đúng signature createUserByAdmin(email, password, name, extra?)
      await createUserByAdmin(email, password, name);
      setShowCreateModal(false);
      await loadInitialUsers();
    } catch (e: any) {
      const msg = e?.message || 'Không tạo được người dùng.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={loadInitialUsers}
            className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
            title="Làm mới"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="relative flex-1 md:w-80 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500"
              size={20}
            />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl">
            {(['all', 'expert', 'admin', 'banned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                  filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f === 'all' ? 'Tất cả' : f === 'expert' ? 'Chuyên gia' : f === 'admin' ? 'Quản trị' : 'Bị khóa'}
              </button>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <UserPlus size={16} />
            Thêm người dùng
          </button>
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
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                    Đang quét Database...
                  </td>
                </tr>
              ) : displayUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400 italic">
                    Không tìm thấy ai trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                displayUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png'}
                          className="w-10 h-10 rounded-full bg-gray-100 object-cover border-2 border-white shadow-sm"
                          alt=""
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{user.name || 'Thành viên'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{(user as any).email || 'Email ẩn'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {(user as any).isAdmin && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-600">
                            Admin
                          </span>
                        )}
                        {(user as any).isExpert && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-600">
                            Expert
                          </span>
                        )}
                        {!(user as any).isAdmin && !(user as any).isExpert && (
                          <span className="text-[9px] font-bold text-gray-300 uppercase">Member</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {(user as any).isBanned ? (
                        <span className="text-red-500 font-black text-[10px] uppercase bg-red-50 px-2 py-1 rounded-full">
                          Banned
                        </span>
                      ) : (
                        <span className="text-green-600 font-black text-[10px] uppercase bg-green-50 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm({
                              name: user.name || '',
                              bio: (user as any).bio || '',
                              specialty: (user as any).specialty || '',
                            });
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-all"
                          title="Sửa"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleAdmin(user)}
                          className={`p-2 transition-all ${(user as any).isAdmin ? 'text-purple-600' : 'text-gray-300'}`}
                          title="Toggle Admin"
                        >
                          <ShieldCheck size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleBan(user)}
                          className={`p-2 transition-all ${(user as any).isBanned ? 'text-red-600' : 'text-gray-300'}`}
                          title="Ban/Unban"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && !searchTerm && (
          <div className="p-6 bg-gray-50/50 border-t text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase text-gray-500 shadow-sm hover:bg-gray-50 flex items-center gap-3 mx-auto transition-all disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="animate-spin" size={14} /> : <ChevronDown size={14} />}
              Tải thêm
            </button>
          </div>
        )}
      </div>

      {/* Modal Edit */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-pop-in border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-xl text-gray-900 tracking-tight">Cập nhật hồ sơ</h3>
              <button onClick={() => setEditingUser(null)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Tên thành viên
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Chuyên môn (specialty)
                </label>
                <input
                  type="text"
                  value={editForm.specialty}
                  onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Tiểu sử
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="px-8 py-6 bg-gray-50/80 flex justify-end gap-3 border-t">
              <button
                onClick={() => setEditingUser(null)}
                className="px-6 py-2.5 font-black text-xs text-gray-400 uppercase"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Lưu ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-pop-in border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-xl text-gray-900 tracking-tight">Thêm người dùng thủ công</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Tên hiển thị (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold outline-none"
                />
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm font-bold text-red-700">
                  {createError}
                </div>
              )}

              <p className="text-xs text-gray-400 leading-relaxed">
                * Tạo user bằng cơ chế <b>secondary auth</b> để <b>không làm admin bị đăng xuất</b>.
              </p>
            </div>

            <div className="px-8 py-6 bg-gray-50/80 flex justify-end gap-3 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 font-black text-xs text-gray-400 uppercase"
                disabled={creating}
              >
                Hủy
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all"
              >
                {creating ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                Tạo người dùng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
