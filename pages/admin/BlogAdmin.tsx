import React, { useEffect, useState, useMemo } from 'react'; // Thêm useMemo
import { BlogPost, BlogCategory } from '../../types';
import { toSlug } from '../../types'; 
import { 
  fetchBlogCategories, createBlogCategory, updateBlogCategory, deleteBlogCategory,
  createBlogPost, updateBlogPost, deleteBlogPost, fetchAllPostsAdmin
} from '../../services/blog';
import { generateBlogPost, generateBlogTitle } from '../../services/gemini';
import { subscribeToAuthChanges } from '../../services/auth';
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Video, Link as LinkIcon, BookOpen, Layers, Sparkles, Loader2, RefreshCw, FileText, CheckCircle, AlertCircle, Eye } from 'lucide-react';

// --- IMPORT REACT QUILL ---
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';// Import style mặc định

export const BlogAdmin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts');
  
  // Data State
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  // AI State
  const [aiLoading, setAiLoading] = useState({ title: false, content: false });

  // Form State - Category
  const [editingCat, setEditingCat] = useState<BlogCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', iconEmoji: '📝', order: 1, isActive: true });

  // Form State - Post
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImageUrl: '',
    iconEmoji: '📰',
    youtubeUrl: '',
    sourceUrl: '',
    sourceLabel: '',
    categoryId: '',
    status: 'draft' as 'draft' | 'published'
  });

 // --- CẤU HÌNH TOOLBAR CHO EDITOR ---
  // Phần modules (thanh công cụ) giữ nguyên, không cần sửa
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}], // Ở đây giữ nguyên để hiện 2 nút
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  // Phần formats (định dạng cho phép) -> CẦN SỬA Ở ĐÂY
  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', // Chỉ cần để 'list' là đủ (nó bao gồm cả số và chấm tròn)
    // Xóa chữ 'bullet' ở đây đi
    'link', 'image', 'video'
  ];

  useEffect(() => {
    const unsub = subscribeToAuthChanges(user => {
      setCurrentUser(user);
      if (user) loadData(user);
    });
    return () => unsub();
  }, []);

  const loadData = async (user: any) => {
    setLoading(true);
    try {
        const authorFilter = user.isAdmin ? undefined : user.id;
        const [cats, allPosts] = await Promise.all([
            fetchBlogCategories(),
            fetchAllPostsAdmin(authorFilter)
        ]);
        setCategories(cats);
        setPosts(allPosts);
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    } finally {
        setLoading(false);
    }
  };

  // --- CATEGORY HANDLERS (Giữ nguyên) ---
  const handleEditCat = (cat: BlogCategory) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, iconEmoji: cat.iconEmoji, order: cat.order, isActive: cat.isActive });
    setShowCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name) return;
    const slug = toSlug(catForm.name);
    try {
        if (editingCat) {
            await updateBlogCategory(editingCat.id, { ...catForm, slug });
        } else {
            await createBlogCategory({ ...catForm, slug });
        }
        setShowCatModal(false);
        setEditingCat(null);
        setCatForm({ name: '', iconEmoji: '📝', order: categories.length + 1, isActive: true });
        loadData(currentUser);
    } catch (e) {
        alert("Lỗi khi lưu danh mục: " + e);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return;
    await deleteBlogCategory(id);
    loadData(currentUser);
  };

  // --- POST HANDLERS (Giữ nguyên logic) ---
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setPostForm(prev => ({
          ...prev,
          title: newTitle,
          slug: (!editingPost || !prev.slug) ? toSlug(newTitle) : prev.slug
      }));
  };

  const handleRegenerateSlug = () => {
      if (postForm.title) {
          setPostForm(prev => ({ ...prev, slug: toSlug(prev.title) }));
      }
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl || '',
      iconEmoji: post.iconEmoji || '📰',
      youtubeUrl: post.youtubeUrl || '',
      sourceUrl: post.sourceUrl || '',
      sourceLabel: post.sourceLabel || '',
      categoryId: post.categoryId || '',
      status: post.status
    });
    setShowPostModal(true);
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    setPostForm({
      title: '', slug: '', excerpt: '', content: '', coverImageUrl: '',
      iconEmoji: '📰', youtubeUrl: '', sourceUrl: '', sourceLabel: '',
      categoryId: categories[0]?.id || '', status: 'draft'
    });
    setShowPostModal(true);
  };

  // --- AI HANDLERS ---
  const handleAiTitle = async () => {
      const topic = postForm.title || prompt("Nhập chủ đề bạn muốn viết:");
      if (!topic) return;

      setAiLoading(prev => ({ ...prev, title: true }));
      try {
          const newTitle = await generateBlogTitle(topic);
          if (newTitle) {
              setPostForm(prev => ({ 
                  ...prev, 
                  title: newTitle,
                  slug: toSlug(newTitle)
              }));
          }
      } catch (e) {
          alert("Lỗi AI: " + e);
      } finally {
          setAiLoading(prev => ({ ...prev, title: false }));
      }
  };

  const handleAiContent = async () => {
      if (!postForm.title) {
          alert("Vui lòng nhập tiêu đề bài viết trước để AI hiểu chủ đề.");
          return;
      }
      if (postForm.content && !confirm("Nội dung hiện tại sẽ bị ghi đè. Bạn có chắc muốn tiếp tục?")) {
          return;
      }

      setAiLoading(prev => ({ ...prev, content: true }));
      try {
          const content = await generateBlogPost(postForm.title);
          if (content) setPostForm(prev => ({ ...prev, content }));
      } catch (e) {
          alert("Lỗi AI: " + e);
      } finally {
          setAiLoading(prev => ({ ...prev, content: false }));
      }
  };

  const handleSavePost = async () => {
    if (!postForm.title || !currentUser) return;
    
    let slug = postForm.slug;
    if (!slug) {
        slug = toSlug(postForm.title);
    }

    const postData: any = {
      ...postForm,
      slug,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorIsExpert: currentUser.isExpert
    };

    if (editingPost) {
      await updateBlogPost(editingPost.id, postData);
    } else {
      await createBlogPost(postData);
    }
    setShowPostModal(false);
    loadData(currentUser);
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Xóa bài viết này?")) return;
    await deleteBlogPost(id);
    loadData(currentUser);
  };

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) {
      return <div className="p-10 text-center">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER COMPONENT (Giữ nguyên) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <BookOpen className="text-blue-600" /> Quản trị Blog
            </h1>
            <p className="text-gray-500 text-sm">
                {currentUser.isAdmin ? 'Quản lý toàn bộ bài viết hệ thống.' : 'Quản lý các bài viết chuyên môn của bạn.'}
            </p>
         </div>
         <div className="flex gap-2">
            {currentUser.isAdmin && (
                <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    <Layers size={18} /> Danh mục
                </button>
            )}
            <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                <FileText size={18} /> Bài viết
            </button>
         </div>
      </div>

      {/* --- CATEGORIES TAB (Giữ nguyên) --- */}
      {activeTab === 'categories' && currentUser.isAdmin && (
          <div className="space-y-4">
              <div className="flex justify-end">
                  <button onClick={() => { setEditingCat(null); setCatForm({ name: '', iconEmoji: '📝', order: categories.length + 1, isActive: true }); setShowCatModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
                      <Plus size={18} /> Thêm Danh mục
                  </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">
                          <tr>
                              <th className="px-6 py-4">Tên danh mục</th>
                              <th className="px-6 py-4">Emoji</th>
                              <th className="px-6 py-4">Slug</th>
                              <th className="px-6 py-4">Thứ tự</th>
                              <th className="px-6 py-4 text-right">Hành động</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {categories.map(cat => (
                              <tr key={cat.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold">{cat.name}</td>
                                  <td className="px-6 py-4 text-xl">{cat.iconEmoji}</td>
                                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                  <td className="px-6 py-4">{cat.order}</td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                                      <button onClick={() => handleEditCat(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                      <button onClick={() => handleDeleteCat(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- POSTS TAB (Giữ nguyên) --- */}
      {activeTab === 'posts' && (
          <div className="space-y-4">
              <div className="flex justify-end">
                  <button onClick={handleCreatePost} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 transition-colors">
                      <Plus size={18} /> Viết bài mới
                  </button>
              </div>
              
              {loading ? (
                  <div className="flex justify-center py-20 text-gray-400 gap-2 items-center">
                      <Loader2 className="animate-spin" /> Đang tải bài viết...
                  </div>
              ) : posts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">📭</div>
                      <h3 className="font-bold text-gray-800">Chưa có bài viết nào</h3>
                      <p className="text-sm text-gray-500 mb-4">Hãy chia sẻ kiến thức chuyên môn của bạn ngay bây giờ!</p>
                      <button onClick={handleCreatePost} className="text-blue-600 font-bold hover:underline">Bắt đầu viết ngay</button>
                  </div>
              ) : (
                  <div className="grid gap-4 animate-fade-in">
                      {posts.map(post => (
                          <div key={post.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-all">
                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-3xl shrink-0 overflow-hidden border border-gray-100">
                                  {post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" /> : post.iconEmoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-bold text-gray-900 truncate text-lg">{post.title}</h3>
                                      {post.status === 'published' ? (
                                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-100 text-green-700"><CheckCircle size={10}/> Public</span>
                                      ) : (
                                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600"><AlertCircle size={10}/> Draft</span>
                                      )}
                                  </div>
                                  <p className="text-xs text-gray-500 mb-1 line-clamp-1">{post.excerpt || 'Chưa có mô tả ngắn'}</p>
                                  <div className="flex gap-3 text-[10px] text-gray-400 items-center">
                                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                                          {categories.find(c => c.id === post.categoryId)?.name || 'Chưa phân loại'}
                                      </span>
                                      <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                                      <span className="flex items-center gap-1 text-gray-500"><Eye size={10}/> {post.views || 0} lượt xem</span>
                                  </div>
                              </div>
                              <div className="flex gap-2 shrink-0 self-end md:self-center">
                                  <button onClick={() => handleEditPost(post)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                  <button onClick={() => handleDeletePost(post.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* CATEGORY MODAL (Giữ nguyên) */}
      {showCatModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-pop-in">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">{editingCat ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
                  <div className="space-y-3">
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Tên danh mục (VD: Sức khỏe)" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-100" />
                      <input value={catForm.iconEmoji} onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} placeholder="Emoji Icon (VD: 💊)" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-100" />
                      <input type="number" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} placeholder="Thứ tự hiển thị" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                      <button onClick={handleSaveCat} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Lưu</button>
                  </div>
              </div>
          </div>
      )}

      {/* POST MODAL - ĐÃ TÍCH HỢP REACT QUILL */}
      {showPostModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-pop-in">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          {editingPost ? <Edit2 size={20} className="text-blue-500"/> : <Plus size={20} className="text-green-500"/>}
                          {editingPost ? 'Sửa bài viết' : 'Viết bài mới'}
                      </h3>
                      <button onClick={() => setShowPostModal(false)} className="hover:bg-gray-200 p-1 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-5">
                      {/* Tiêu đề & Slug */}
                      <div className="grid md:grid-cols-2 gap-5">
                          <div className="relative">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề</label>
                              <input 
                                value={postForm.title} 
                                onChange={handleTitleChange} 
                                placeholder="Tiêu đề bài viết" 
                                className="w-full p-3 border rounded-xl font-bold text-lg pr-20 focus:ring-2 focus:ring-blue-100 outline-none" 
                              />
                              <button 
                                onClick={handleAiTitle} 
                                disabled={aiLoading.title}
                                className="absolute right-2 top-8 p-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform border border-indigo-100"
                                title="AI Gợi ý tiêu đề"
                              >
                                {aiLoading.title ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI
                              </button>
                          </div>
                          
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Danh mục</label>
                              <select value={postForm.categoryId} onChange={e => setPostForm({...postForm, categoryId: e.target.value})} className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-100">
                                  <option value="">-- Chọn danh mục --</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* Slug */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Đường dẫn (Slug)</label>
                          <div className="flex gap-2">
                              <input 
                                  value={postForm.slug} 
                                  onChange={e => setPostForm({...postForm, slug: e.target.value})} 
                                  placeholder="duong-dan-bai-viet-chuan-seo" 
                                  className="w-full p-2 border rounded-xl text-sm font-mono text-gray-600 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100" 
                              />
                              <button 
                                  onClick={handleRegenerateSlug}
                                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                                  title="Tạo lại từ tiêu đề"
                              >
                                  <RefreshCw size={18} />
                              </button>
                          </div>
                      </div>

                      {/* Excerpt */}
                      <textarea 
                        value={postForm.excerpt} 
                        onChange={e => setPostForm({...postForm, excerpt: e.target.value})} 
                        placeholder="Mô tả ngắn (Excerpt) hiển thị bên ngoài thẻ bài viết..." 
                        className="w-full p-3 border rounded-xl h-24 resize-none focus:ring-2 focus:ring-blue-100 outline-none text-sm" 
                      />
                      
                      {/* EDITOR QUAN TRỌNG */}
                      <div className="relative">
                          <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Nội dung chi tiết</label>
                              <button 
                                onClick={handleAiContent} 
                                disabled={aiLoading.content}
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:shadow-lg active:scale-95 transition-all"
                              >
                                {aiLoading.content ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 
                                {aiLoading.content ? 'AI đang viết...' : 'Viết bài với AI'}
                              </button>
                          </div>
                          
                          {/* SỬ DỤNG REACT QUILL THAY CHO TEXTAREA */}
                          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                             <ReactQuill 
                                theme="snow"
                                value={postForm.content}
                                onChange={(content) => setPostForm({...postForm, content})}
                                modules={quillModules}
                                formats={quillFormats}
                                className="h-80 mb-12" // Thêm margin bottom để không bị che bởi toolbar dưới
                                placeholder="Viết nội dung bài viết tại đây..."
                             />
                          </div>
                      </div>
                      
                      {/* Media Inputs */}
                      <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">Media</label>
                              <div className="flex gap-2 items-center border rounded-xl p-2 bg-white">
                                  <ImageIcon size={18} className="text-gray-400" />
                                  <input value={postForm.coverImageUrl} onChange={e => setPostForm({...postForm, coverImageUrl: e.target.value})} placeholder="Link ảnh bìa" className="flex-1 outline-none text-sm" />
                              </div>
                              <div className="flex gap-2 items-center border rounded-xl p-2 bg-white">
                                  <span className="text-lg">😀</span>
                                  <input value={postForm.iconEmoji} onChange={e => setPostForm({...postForm, iconEmoji: e.target.value})} placeholder="Emoji đại diện" className="flex-1 outline-none text-sm" />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">Liên kết nguồn</label>
                              <div className="flex gap-2 items-center border rounded-xl p-2 bg-white">
                                  <Video size={18} className="text-gray-400" />
                                  <input value={postForm.youtubeUrl} onChange={e => setPostForm({...postForm, youtubeUrl: e.target.value})} placeholder="Youtube URL" className="flex-1 outline-none text-sm" />
                              </div>
                              <div className="flex gap-2 items-center border rounded-xl p-2 bg-white">
                                  <LinkIcon size={18} className="text-gray-400" />
                                  <input value={postForm.sourceUrl} onChange={e => setPostForm({...postForm, sourceUrl: e.target.value})} placeholder="Link nguồn tham khảo" className="flex-1 outline-none text-sm" />
                              </div>
                          </div>
                      </div>

                      {/* Status Checkboxes */}
                      <div className="flex items-center gap-6 border-t pt-4">
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <input type="radio" name="status" checked={postForm.status === 'draft'} onChange={() => setPostForm({...postForm, status: 'draft'})} className="accent-gray-500 w-4 h-4"/>
                              <span className="text-sm font-medium text-gray-600">Lưu nháp</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-green-50 transition-colors">
                              <input type="radio" name="status" checked={postForm.status === 'published'} onChange={() => setPostForm({...postForm, status: 'published'})} className="accent-green-600 w-4 h-4"/>
                              <span className="text-sm font-bold text-green-700">Công khai ngay</span>
                          </label>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setShowPostModal(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">Hủy</button>
                      <button onClick={handleSavePost} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                          <Edit2 size={18} /> Lưu bài viết
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* STYLE CUSTOM CHO QUILL EDITOR ĐẸP HƠN */}
      <style>{`
        .ql-toolbar.ql-snow {
            border-top-left-radius: 0.75rem;
            border-top-right-radius: 0.75rem;
            border-color: #e5e7eb;
            background-color: #f9fafb;
        }
        .ql-container.ql-snow {
            border-bottom-left-radius: 0.75rem;
            border-bottom-right-radius: 0.75rem;
            border-color: #e5e7eb;
            font-size: 1rem;
        }
        .ql-editor {
            min-height: 200px;
        }
      `}</style>
    </div>
  );
};
