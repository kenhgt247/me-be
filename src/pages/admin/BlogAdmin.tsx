import React, { useEffect, useState, useMemo } from 'react';
import { BlogPost, BlogCategory } from '../../types';
import { toSlug } from '../../types'; 
import { 
  fetchBlogCategories, createBlogCategory, updateBlogCategory, deleteBlogCategory,
  createBlogPost, updateBlogPost, deleteBlogPost, fetchPostsPaginated, fetchPublishedPosts
} from '../../services/blog';
import { generateBlogPost, generateBlogTitle } from '../../services/gemini';
import { subscribeToAuthChanges } from '../../services/auth';
import { Plus, Trash2, Edit2, X, Image as ImageIcon, Video, Link as LinkIcon, BookOpen, Layers, Sparkles, Loader2, RefreshCw, FileText, CheckCircle, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// --- IMPORT REACT QUILL ---
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const PAGE_SIZE = 10;

export const BlogAdmin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts');
  
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Phân trang state
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [aiLoading, setAiLoading] = useState({ title: false, content: false });

  const [editingCat, setEditingCat] = useState<BlogCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', iconEmoji: '📝', order: 1, isActive: true });

  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postForm, setPostForm] = useState({
    title: '', slug: '', excerpt: '', content: '', coverImageUrl: '',
    iconEmoji: '📰', youtubeUrl: '', sourceUrl: '', sourceLabel: '',
    categoryId: '', status: 'draft' as 'draft' | 'published'
  });

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
  }, []);

  const loadInitialData = async (user: any) => {
    setLoading(true);
    try {
        const authorFilter = user.isAdmin ? 'all' : user.id;
        const cats = await fetchBlogCategories();
        setCategories(cats);

        const { posts: initialPosts, lastDoc: nextDoc, hasMore: more } = await fetchPostsPaginated(authorFilter, null, PAGE_SIZE);
        setPosts(initialPosts);
        setLastDoc(nextDoc);
        setHasMore(more);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const authorFilter = currentUser.isAdmin ? 'all' : currentUser.id;
    const { posts: newPosts, lastDoc: nextDoc, hasMore: more } = await fetchPostsPaginated(authorFilter, lastDoc, PAGE_SIZE);
    setPosts(prev => [...prev, ...newPosts]);
    setLastDoc(nextDoc);
    setHasMore(more);
    setLoadingMore(false);
  };

  const handleSaveCat = async () => {
    if (!catForm.name) return;
    const slug = toSlug(catForm.name);
    if (editingCat) await updateBlogCategory(editingCat.id, { ...catForm, slug });
    else await createBlogCategory({ ...catForm, slug });
    setShowCatModal(false);
    loadInitialData(currentUser);
  };

  const handleSavePost = async () => {
    if (!postForm.title || !currentUser) return;
    const slug = postForm.slug || toSlug(postForm.title);
    const postData = { ...postForm, slug, authorId: currentUser.id, authorName: currentUser.name, authorAvatar: currentUser.avatar };
    
    editingPost ? await updateBlogPost(editingPost.id, postData) : await createBlogPost(postData);
    setShowPostModal(false);
    loadInitialData(currentUser);
  };

  const handleDeletePost = async (id: string) => {
    if (confirm("Xóa bài viết này?")) {
        await deleteBlogPost(id);
        loadInitialData(currentUser);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setPostForm(prev => ({ ...prev, title: newTitle, slug: !editingPost ? toSlug(newTitle) : prev.slug }));
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
      if (!postForm.title) return alert("Cần tiêu đề");
      setAiLoading(p => ({ ...p, content: true }));
      const content = await generateBlogPost(postForm.title);
      if (content) setPostForm(p => ({ ...p, content }));
      setAiLoading(p => ({ ...p, content: false }));
  };

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) return <div className="p-10 text-center">Không có quyền truy cập</div>;

  return (
    <div className="space-y-6 pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="text-blue-600" /> Quản trị Blog</h1>
            <p className="text-gray-500 text-sm">{currentUser.isAdmin ? 'Toàn quyền hệ thống' : 'Quản lý bài viết của bạn'}</p>
         </div>
         <div className="flex gap-2">
            {currentUser.isAdmin && <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Danh mục</button>}
            <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>Bài viết</button>
         </div>
      </div>

      {activeTab === 'posts' && (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => { setEditingPost(null); setPostForm({ title: '', slug: '', excerpt: '', content: '', coverImageUrl: '', iconEmoji: '📰', youtubeUrl: '', sourceUrl: '', sourceLabel: '', categoryId: categories[0]?.id || '', status: 'draft' }); setShowPostModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 shadow-lg"><Plus /> Viết bài mới</button>
            </div>

            <div className="grid gap-4">
                {loading ? <div className="text-center py-20"><Loader2 className="animate-spin inline" /></div> : posts.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-2xl overflow-hidden">
                                {post.coverImageUrl ? <img src={post.coverImageUrl} className="w-full h-full object-cover" /> : post.iconEmoji}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{post.title}</h3>
                                <p className="text-xs text-gray-400">{post.status} • {new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingPost(post); setPostForm(post as any); setShowPostModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={18}/></button>
                            <button onClick={() => handleDeletePost(post.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            {hasMore && (
                <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-3 bg-white border rounded-xl font-bold flex items-center justify-center gap-2 text-gray-500">
                    {loadingMore ? <Loader2 className="animate-spin" /> : <ChevronDown />} Xem thêm bài viết
                </button>
            )}
        </div>
      )}

      {/* MODALS giữ nguyên cấu trúc input của bạn */}
      {showPostModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                  <div className="flex justify-between mb-6">
                      <h3 className="font-bold text-xl">{editingPost ? 'Sửa bài viết' : 'Viết bài mới'}</h3>
                      <button onClick={() => setShowPostModal(false)}><X /></button>
                  </div>
                  <div className="space-y-4">
                      <input value={postForm.title} onChange={handleTitleChange} placeholder="Tiêu đề bài viết" className="w-full p-3 border rounded-xl font-bold text-lg" />
                      <div className="flex gap-2">
                          <button onClick={handleAiTitle} className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><Sparkles size={14}/> AI Tiêu đề</button>
                          <button onClick={handleAiContent} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><Sparkles size={14}/> AI Nội dung</button>
                      </div>
                      <ReactQuill theme="snow" value={postForm.content} onChange={v => setPostForm({...postForm, content: v})} modules={quillModules} formats={quillFormats} className="h-64 mb-12" />
                      <div className="pt-8 flex justify-end gap-2">
                          <button onClick={() => setShowPostModal(false)} className="px-6 py-2">Hủy</button>
                          <button onClick={handleSavePost} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Lưu bài viết</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <style>{`.ql-editor { min-height: 200px; }`}</style>
    </div>
  );
};
