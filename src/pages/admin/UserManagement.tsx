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
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import {
  fetchUsersAdminPaginated,
  updateUserRole,
  updateUserInfo,
  createUserByAdmin,
} from '../../services/admin';

import { User as UserType } from '../../types';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

interface ExtendedUser extends UserType {
  isAdmin?: boolean;
  isExpert?: boolean;
  isBanned?: boolean;
  bio?: string;
  specialty?: string;
}

export const UserManagement: React.FC = () => {
  // --- State: Data & Pagination ---
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // --- State: Filter & Search ---
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expert' | 'admin' | 'banned'>('all');

  // --- State: Edit User ---
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', bio: '', specialty: '' });
  const [isSaving, setIsSaving] = useState(false);

  // --- State: Create User ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // --- Effect: Debounce Search ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- 1) Load Initial Users ---
  const loadInitialUsers = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setLastDoc(null);
    try {
      const { users: data, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(null, 50);
      setUsers(data as ExtendedUser[]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialUsers();
  }, [loadInitialUsers]);

  // --- 2) Load More ---
  const handleLoadMore = async () => {
    if (!hasMore || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { users: newData, lastDoc: nextDoc, hasMore: more } = await fetchUsersAdminPaginated(lastDoc, 30);
      setUsers((prev) => [...prev, ...newData as ExtendedUser[]]);
      setLastDoc(nextDoc);
      setHasMore(more);
    } catch (error) {
      console.error('Error loading more users:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // --- 3) Filter Logic ---
  const displayUsers = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();

    return users.filter((u) => {
      const matchesSearch =
        term === '' ||
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (filter === 'expert') return u.isExpert === true;
      if (filter === 'admin') return u.isAdmin === true;
      if (filter === 'banned') return u.isBanned === true;

      return true;
    });
  }, [users, debouncedSearch, filter]);

  // --- Action: Toggle Role/Status ---
  const handleToggleStatus = async (user: ExtendedUser, field: 'isAdmin' | 'isBanned') => {
    const currentValue = !!user[field];
    const actionName = field === 'isAdmin' ? 'Admin' : 'Lock Account';
    
    const confirmMsg = field === 'isAdmin' 
      ? `Are you sure you want to ${currentValue ? 'REMOVE' : 'GRANT'} Admin rights for ${user.name}?`
      : `Are you sure you want to ${currentValue ? 'UNLOCK' : 'LOCK'} account ${user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateUserRole(user.id, { [field]: !currentValue });
      setUsers((prev) => 
        prev.map((u) => (u.id === user.id ? { ...u, [field]: !currentValue } : u))
      );
    } catch (e) {
      console.error(e);
      alert(`Could not update ${actionName} status.`);
    }
  };

  // --- Action: Edit User ---
  const handleEditClick = (user: ExtendedUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      bio: user.bio || '',
      specialty: user.specialty || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateUserInfo(editingUser.id, editForm);
      setUsers((prev) => 
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...editForm } : u))
      );
      setEditingUser(null);
    } catch (error) {
      console.error(error);
      alert('Error updating user info!');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Action: Create User ---
  const handleCreateUser = async () => {
    setCreateError('');
    const email = createForm.email.trim();
    const password = createForm.password;
    const name = createForm.name.trim() || 'User';

    if (!email || !email.includes('@')) return setCreateError('Invalid email.');
    if (!password || password.length < 6) return setCreateError('Password must be at least 6 characters.');

    setCreating(true);
    try {
      const result = await createUserByAdmin({ email, password, name });
      
      if (result && result.uid) {
        setShowCreateModal(false);
        setCreateForm({ email: '', password: '', name: '' }); 
        
        // Refresh the list after a short delay to allow Firestore to index
        setTimeout(() => {
            loadInitialUsers(); 
        }, 1000);
      }
    } catch (e: any) {
      // The error message from API is thrown here
      console.error("Create User Error:", e);
      setCreateError(e.message || 'Failed to create user. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={loadInitialUsers}
            disabled={loading}
            className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end overflow-x-auto">
          <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl whitespace-nowrap">
            {([
              { key: 'all', label: 'All' },
              { key: 'expert', label: 'Expert' },
              { key: 'admin', label: 'Admin' },
              { key: 'banned', label: 'Banned' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  filter === f.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setCreateError(''); setShowCreateModal(true); }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add New</span>
          </button>
        </div>
      </div>

      {/* --- TABLE CONTENT --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                    <Loader2 className="animate-spin inline mr-2" /> Loading data...
                  </td>
                </tr>
              ) : displayUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400 italic">
                    No users found.
                  </td>
                </tr>
              ) : (
                displayUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png' }}
                          className="w-10 h-10 rounded-full bg-gray-100 object-cover border-2 border-white shadow-sm"
                          alt="avatar"
                        />
                        <div className="min-w-0 max-w-[150px] sm:max-w-xs">
                          <p className="font-bold text-gray-900 truncate">{user.name || 'Member'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email || 'Hidden Email'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {user.isAdmin && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-600 border border-purple-200">
                            Admin
                          </span>
                        )}
                        {user.isExpert && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-600 border border-blue-200">
                            Expert
                          </span>
                        )}
                        {!user.isAdmin && !user.isExpert && (
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Member</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded-full border border-red-100">
                          <Ban size={10} /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-2 py-1 rounded-full border border-green-100">
                          <CheckCircle size={10} /> Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <ActionButton 
                          onClick={() => handleEditClick(user)} 
                          icon={<Edit size={16} />} 
                          tooltip="Edit" 
                          variant="default"
                        />
                        <ActionButton 
                          onClick={() => handleToggleStatus(user, 'isAdmin')} 
                          icon={<ShieldCheck size={16} />} 
                          tooltip="Toggle Admin" 
                          active={user.isAdmin}
                          variant="purple"
                        />
                        <ActionButton 
                          onClick={() => handleToggleStatus(user, 'isBanned')} 
                          icon={<Ban size={16} />} 
                          tooltip="Ban/Unban" 
                          active={user.isBanned}
                          variant="red"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && !searchTerm && (
          <div className="p-4 bg-gray-50 border-t text-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-600 shadow-sm hover:bg-gray-100 hover:text-blue-600 flex items-center gap-2 mx-auto transition-all disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="animate-spin" size={14} /> : <ChevronDown size={14} />}
              Load More
            </button>
          </div>
        )}
      </div>

      {/* --- MODAL: EDIT USER --- */}
      {editingUser && (
        <ModalWrapper onClose={() => setEditingUser(null)} title="Update Profile">
          <div className="p-6 space-y-4">
            <InputGroup label="Display Name" value={editForm.name} onChange={(v: string) => setEditForm({...editForm, name: v})} />
            <InputGroup label="Specialty" value={editForm.specialty} onChange={(v: string) => setEditForm({...editForm, specialty: v})} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio</label>
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none resize-none text-sm font-medium"
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
            <button onClick={() => setEditingUser(null)} className="px-4 py-2 font-bold text-xs text-gray-400 uppercase hover:text-gray-600">Cancel</button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Changes
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* --- MODAL: CREATE USER --- */}
      {showCreateModal && (
        <ModalWrapper onClose={() => setShowCreateModal(false)} title="Add New User">
          <div className="p-6 space-y-4">
            <InputGroup label="Email" type="email" placeholder="user@example.com" value={createForm.email} onChange={(v: string) => setCreateForm({...createForm, email: v})} />
            <InputGroup label="Password" type="password" placeholder="Min 6 characters" value={createForm.password} onChange={(v: string) => setCreateForm({...createForm, password: v})} />
            <InputGroup label="Display Name" placeholder="John Doe" value={createForm.name} onChange={(v: string) => setCreateForm({...createForm, name: v})} />

            {createError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs font-bold text-red-600">
                <AlertCircle size={14} /> {createError}
              </div>
            )}
            
            <p className="text-[10px] text-gray-400 italic">
              * Note: User is created via Admin SDK to avoid logging out the current admin.
            </p>
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 font-bold text-xs text-gray-400 uppercase hover:text-gray-600" disabled={creating}>Cancel</button>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />} Create
            </button>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

// --- Sub-components ---

const ActionButton = ({ onClick, icon, tooltip, active, variant }: any) => {
  const baseClass = "p-2 rounded-lg transition-all duration-200";
  const variants: any = {
    default: "text-gray-400 hover:text-blue-600 hover:bg-blue-50",
    purple: active ? "text-purple-600 bg-purple-50" : "text-gray-300 hover:text-purple-600 hover:bg-purple-50",
    red: active ? "text-red-600 bg-red-50" : "text-gray-300 hover:text-red-600 hover:bg-red-50",
  };
  
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]}`} title={tooltip}>
      {icon}
    </button>
  );
};

const ModalWrapper = ({ children, onClose, title }: any) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-pop-in border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const InputGroup = ({ label, type = "text", value, onChange, placeholder }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-gray-50 border-gray-100 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium text-sm outline-none transition-all"
    />
  </div>
);
