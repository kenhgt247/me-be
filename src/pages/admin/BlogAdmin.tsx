import React, { useEffect, useState, useMemo } from 'react';
import { BlogPost, BlogCategory } from '../../types';
import { toSlug } from '../../types'; 
import { 
  fetchBlogCategories, createBlogCategory, updateBlogCategory, deleteBlogCategory,
  createBlogPost, updateBlogPost, deleteBlogPost, fetchPostsPaginated
} from '../../services/blog';
import { generateBlogPost, generateBlogTitle } from '../../services/gemini';
import { subscribeToAuthChanges } from '../../services/auth';
import { 
  Plus, Trash2, Edit2, X, Image as ImageIcon, Video, Link as LinkIcon, 
  BookOpen, Layers, Sparkles, Loader2, RefreshCw, FileText, CheckCircle, 
  AlertCircle, Eye, ChevronDown, Search 
} from 'lucide-react';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// --- IMPORT REACT QUILL ---
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const PAGE_SIZE = 10;

export const BlogAdmin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts');
  
  // Data State
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Phân trang state
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals & Search
  const [showCatModal, setShowCatModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiLoading, setAiLoading] = useState({ title: false, content: false });

  // Form States
  const [editingCat, setEditingCat] = useState<BlogCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', iconEmoji: '📝', order: 1, isActive: true });
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postForm, setPostForm] = useState({
    title: '', slug: '', excerpt: '', content: '', coverImageUrl: '',
    iconEmoji: '📰', youtubeUrl: '', sourceUrl: '', sourceLabel: '',
    categoryId: '', status: 'draft' as 'draft' | 'published'
  });

  // Editor Config
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  const quillFormats = ['header', 'bold', 'italic', 'underline', 'strike', 'blockquote', 'list', 'link', 'image', 'video'];

  useEffect(() => {
    const unsub = subscribeToAuthChanges(user => {
      setCurrentUser(user);
      if (user) loadInitialData(user);
    });
    return () => unsub();
  }, [activeTab]);

  const loadInitialData = async (user: any) => {
    setLoading(true);
    try {
        const cats = await fetchBlogCategories();
        setCategories(cats);

        if (activeTab === 'posts') {
            const authorFilter = user.isAdmin ? 'all' : user.id;
            const { posts: initialPosts, lastDoc: nextDoc, hasMore: more } = await fetchPostsPaginated(authorFilter, null, PAGE_SIZE);
            setPosts(initialPosts);
            setLastDoc(nextDoc);
            setHasMore(more);
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
        const authorFilter = currentUser.isAdmin ? 'all' : currentUser.id;
        const { posts: newPosts, lastDoc: nextDoc, hasMore: more } = await fetchPostsPaginated(authorFilter, lastDoc, PAGE_SIZE);
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(nextDoc);
        setHasMore(more);
    } finally {
        setLoadingMore(false);
    }
  };

  // ✅ Sử dụng filteredPosts để tránh lỗi ReferenceError: visiblePosts is not defined
  const filteredPosts = useMemo(() => {
    return posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [posts, searchTerm]);

  // Category Handlers
  const handleSaveCat = async () => {
    if (!catForm.name) return;
    const slug = toSlug(catForm.name);
    try {
      if (editingCat) await updateBlogCategory(editingCat.id, { ...catForm, slug });
      else await createBlogCategory({ ...catForm, slug });
      setShowCatModal(false);
      loadInitialData(currentUser);
    } catch (e) { alert("Lỗi lưu danh mục"); }
  };

  // Post Handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setPostForm(prev => ({ 
      ...prev, 
      title: newTitle, 
      slug: !editingPost ? toSlug(newTitle) : prev.slug 
    }));
  };

  const handleRegenerateSlug = () => {
    if (postForm.title) setPostForm(prev => ({ ...prev, slug: toSlug(prev.title) }));
  };

  const handleSavePost = async () => {
    if (!postForm.title || !currentUser) return;
    const slug = postForm.slug || toSlug(postForm.title);
    const postData = { 
      ...postForm, 
      slug, 
      authorId: currentUser.id, 
      authorName: currentUser.name, 
      authorAvatar: currentUser.avatar,
      authorIsExpert: currentUser.isExpert
    };
    
    try {
      if (editingPost) await updateBlogPost(editingPost.id, postData);
      else await createBlogPost(postData);
      setShowPostModal(false);
      loadInitialData(currentUser);
    } catch (e) { alert("Lỗi lưu bài viết"); }
  };

  const handleAiTitle = async () => {
      const topic = postForm.title || prompt("Nhập chủ đề:");
      if (!topic) return;
      setAiLoading(p => ({ ...p, title: true }));
      const newTitle = await generateBlogTitle(topic);
      if (newTitle) setPostForm(p => ({ ...p, title: newTitle, slug: toSlug(newTitle) }));
      setAiLoading(p => ({ ...p, title: false }));
  };

  const handleAiContent = async () => {
      if (!postForm.title) return alert("Vui lòng nhập tiêu đề trước!");
      setAiLoading(p => ({ ...p, content: true }));
      const content = await generateBlogPost(postForm.title);
      if (content) setPostForm(p => ({ ...p, content }));
      setAiLoading(p => ({ ...p, content: false }));
  };

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) {
    return <div className="p-10 text-center">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6 pb-20 p-6 bg-gray-50 min-h-screen animate-fade-in">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                <BookOpen className="text-blue-600" /> Quản trị Blog
            </h1>
            <p className="text-gray-500 text-sm font-medium">{currentUser.isAdmin ? 'Toàn quyền hệ thống' : 'Quản lý kiến thức của bạn'}</p>
         </div>
         <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {currentUser.isAdmin && (
                <button onClick={() => setActiveTab('categories')} className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                    Danh mục
                </button>
            )}
            <button onClick={() => setActiveTab('posts')} className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'posts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                Bài viết
            </button>
         </div>
      </div>

      {/* Tab Nội dung */}
      {activeTab === 'categories' ? (
          <div className="space-y-4">
              <div className="flex justify-end">
                  <button onClick={() => { setEditingCat(null); setCatForm({ name: '', iconEmoji: '📝', order: categories.length + 1, isActive: true }); setShowCatModal(true); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 shadow-lg active:scale-95 transition-all">
                      <Plus size={20} /> Thêm Danh mục
                  </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                          <tr>
                              <th className="px-6 py-4">Danh mục</th>
                              <th className="px-6 py-4 text-center">Thứ tự</th>
                              <th className="px-6 py-4 text-right">Tác vụ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {categories.map(cat => (
                              <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-6 py-4 flex items-center gap-3">
                                      <span className="text-2xl">{cat.iconEmoji}</span>
                                      <span className="font-bold text-gray-900">{cat.name}</span>
                                  </td>
                                  <td className="px-6 py-4 text-center font-bold text-gray-500">{cat.order}</td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingCat(cat); setCatForm(cat as any); setShowCatModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                                          <button onClick={() => { if(confirm("Xóa?")) deleteBlogCategory(cat.id).then(() => loadInitialData(currentUser)) }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Tìm kiếm bài viết..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <button onClick={() => { setEditingPost(null); setPostForm({ title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', iconEmoji: '📰', youtubeUrl: '', sourceUrl: '', sourceLabel: '', categoryId: categories[0]?.id || '', status: 'draft' }); setShowPostModal(true); }} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 shadow-lg hover:bg-green-700 active:scale-95 transition-all"><Plus /> Viết bài mới</button>
            </div>

            <div className="grid gap-3">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-blue-500 inline" size={32} /></div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed text-gray-400 font-medium italic">Không tìm thấy bài viết nào</div>
                ) : filteredPosts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-2xl overflow-hidden border border-gray-100 shrink-0">
                                {post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" /> : post.iconEmoji}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${post.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{post.status}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingPost(post); setPostForm(post as any); setShowPostModal(true); }} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                            <button onClick={() => { if(confirm("Xóa bài viết này?")) deleteBlogPost(post.id).then(() => loadInitialData(currentUser)) }} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            {hasMore && !searchTerm && (
                <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-4 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-gray-400 hover:text-blue-500 transition-all shadow-sm">
                    {loadingMore ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />} 
                    Tải thêm kiến thức hệ thống
                </button>
            )}
        </div>
      )}

      {/* Modal Chuyên mục */}
      {showCatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-pop-in">
                  <h3 className="text-xl font-black mb-6 text-gray-900 tracking-tight">{editingCat ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h3>
                  <div className="space-y-4">
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Tên danh mục..." className="w-full p-3.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 font-bold" />
                      <div className="grid grid-cols-2 gap-4">
                          <input value={catForm.iconEmoji} onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl text-center text-xl" />
                          <input type="number" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold" />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setShowCatModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">Hủy</button>
                      <button onClick={handleSaveCat} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all">Lưu thay đổi</button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Bài viết */}
      {showPostModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl animate-pop-in flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                      <h3 className="font-black text-xl tracking-tight">{editingPost ? 'Cập nhật nội dung' : 'Sáng tạo bài viết mới'}</h3>
                      <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-4">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề</label>
                                  <div className="relative">
                                    <input value={postForm.title} onChange={handleTitleChange} placeholder="Nhập tiêu đề..." className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black text-xl focus:ring-2 focus:ring-blue-100 outline-none" />
                                    <button onClick={handleAiTitle} disabled={aiLoading.title} className="absolute right-2 top-2 p-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg active:scale-95 disabled:opacity-50">
                                        {aiLoading.title ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>} AI
                                    </button>
                                  </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                  <input value={postForm.slug} onChange={e => setPostForm({...postForm, slug: e.target.value})} placeholder="Slug..." className="flex-1 p-2 bg-gray-50 border-none rounded-xl text-xs font-mono text-gray-500" />
                                  <button onClick={handleRegenerateSlug} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw size={14}/></button>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                                  <div className="flex justify-end mb-2">
                                      <button onClick={handleAiContent} disabled={aiLoading.content} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all">
                                          {aiLoading.content ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />} Viết bài bằng Gemini
                                      </button>
                                  </div>
                                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                    <ReactQuill theme="snow" value={postForm.content} onChange={v => setPostForm({...postForm, content: v})} modules={quillModules} formats={quillFormats} className="h-96 mb-12" />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-5">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Danh mục</label>
                                  <select value={postForm.categoryId} onChange={e => setPostForm({...postForm, categoryId: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100">
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ảnh bìa (Link)</label>
                                  <input value={postForm.coverImageUrl} onChange={e => setPostForm({...postForm, coverImageUrl: e.target.value})} placeholder="https://..." className="w-full p-4 bg-gray-50 border-none rounded-xl text-xs font-mono" />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mô tả ngắn</label>
                                  <textarea value={postForm.excerpt} onChange={e => setPostForm({...postForm, excerpt: e.target.value})} rows={4} className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm font-medium leading-relaxed resize-none focus:ring-2 focus:ring-blue-100" placeholder="Tóm tắt nội dung..." />
                              </div>
                              <div className="p-4 bg-blue-50 rounded-2xl space-y-3">
                                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Xuất bản</label>
                                  <div className="flex gap-4 font-bold text-sm text-gray-600">
                                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" checked={postForm.status === 'draft'} onChange={() => setPostForm({...postForm, status: 'draft'})} /> Nháp</label>
                                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" checked={postForm.status === 'published'} onChange={() => setPostForm({...postForm, status: 'published'})} /> Công khai</label>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 sticky bottom-0 z-10">
                      <button onClick={() => setShowPostModal(false)} className="px-8 py-3 text-gray-400 font-black text-xs uppercase tracking-widest">Hủy bỏ</button>
                      <button onClick={handleSavePost} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Lưu bài viết</button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .ql-toolbar.ql-snow { border: none !important; background: #f9fafb; border-bottom: 1px solid #f1f5f9 !important; padding: 12px !important; }
        .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 15px; }
        .ql-editor { min-height: 300px; padding: 20px !important; line-height: 1.8; color: #334155; }
      `}</style>
    </div>
  );
};
