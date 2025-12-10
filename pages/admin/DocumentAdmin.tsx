import React, { useEffect, useState, useMemo } from 'react';
import { Document, DocumentCategory, User } from '../../types'; // Đã thêm User
import { 
  fetchDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
  fetchAllDocumentsAdmin, createDocument, updateDocument, deleteDocument, CreateDocumentData // Đã thêm deleteDocument
} from '../../services/documents';
import { uploadFile } from '../../services/storage';
import { subscribeToAuthChanges } from '../../services/auth';
import { Plus, Trash2, Edit2, X, FileText, Folder, UploadCloud, Loader2, Video, Image as ImageIcon, File, Link as LinkIcon, Globe } from 'lucide-react';

// --- INITIAL STATE & HELPERS ---
const INITIAL_DOC_FORM: Partial<Document> = {
    title: '', slug: '', description: '', categoryId: '', tags: [], 
    fileUrl: '', fileType: 'other', isExternal: false, externalLink: ''
};

// Helper để xác định kiểu file
const getFileType = (file: File): Document['fileType'] => {
    if (file.type.includes('pdf')) return 'pdf';
    if (file.type.includes('image')) return 'image';
    if (file.type.includes('video')) return 'video';
    if (file.name.toLowerCase().endsWith('docx')) return 'docx';
    if (file.name.toLowerCase().endsWith('xlsx')) return 'xlsx';
    if (file.name.toLowerCase().endsWith('pptx')) return 'pptx';
    return 'other';
};

// Helper đơn giản hóa tạo slug
const simpleSlugify = (title: string): string => {
    // Lưu ý: Nếu bạn có hàm removeVietnameseTones/toSlug, nên sử dụng nó ở đây
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

export const DocumentAdmin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Type Safe
  const [activeTab, setActiveTab] = useState<'docs' | 'categories'>('docs');
  
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Forms
  const [catForm, setCatForm] = useState<Partial<DocumentCategory>>({ id: '', name: '', iconEmoji: '📁', order: 0 }); 
  const [docForm, setDocForm] = useState<Partial<Document>>(INITIAL_DOC_FORM);
  const [tagsInput, setTagsInput] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');

  useEffect(() => {
    const unsub = subscribeToAuthChanges(user => {
      setCurrentUser(user);
      if (user) loadData(user);
    });
    return () => unsub();
  }, []);

  const loadData = async (user: User) => { 
    setLoading(true);
    const authorId = user.isAdmin ? undefined : user.id;

    const [cats, allDocs] = await Promise.all([
      fetchDocumentCategories(),
      fetchAllDocumentsAdmin(authorId)
    ]);
    setCategories(cats);
    setDocs(allDocs);
    setLoading(false);
  };

  // --- CATEGORY ---
  const handleSaveCat = async () => {
      if (!catForm.name || !currentUser || !currentUser.isAdmin) return;
      
      const slug = simpleSlugify(catForm.name); 
      const categoryData = { ...catForm, slug, isActive: true, order: catForm.order || 0 };

      try {
          if (catForm.id) {
              await updateDocumentCategory(catForm.id, categoryData as Partial<DocumentCategory>);
          } else {
              const { id, ...dataToCreate } = categoryData;
              await createDocumentCategory(dataToCreate as Omit<DocumentCategory, 'id'>);
          }
          setShowCatModal(false);
          loadData(currentUser);
      } catch (e) { console.error("Lỗi khi lưu danh mục:", e); alert("Lỗi: Không thể lưu danh mục."); }
  };

  const handleDeleteCat = async (id: string) => {
      if(!currentUser || !currentUser.isAdmin) return;
      if(confirm("Xóa danh mục này?")) {
          await deleteDocumentCategory(id);
          loadData(currentUser);
      }
  };

  // --- DOCUMENT ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setUploading(true);
      try {
          const url = await uploadFile(file, 'documents');
          const type = getFileType(file);
          
          setDocForm(prev => ({
              ...prev,
              fileUrl: url,
              fileName: file.name,
              fileSize: file.size,
              fileType: type,
              externalLink: '', 
          }));
      } catch (e) {
          console.error("Upload thất bại:", e);
          alert("Upload thất bại");
      } finally {
          setUploading(false);
      }
  };

  const handleSaveDoc = async () => {
      if (!docForm.title || !currentUser) return;
      if (inputMode === 'upload' && !docForm.fileUrl) return;
      if (inputMode === 'link' && !docForm.externalLink) return;
      
      const slug = docForm.slug || simpleSlugify(docForm.title);
      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

      const baseData: Partial<Document> = {
          ...docForm,
          slug,
          tags,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          isExpert: currentUser.isExpert,
          isExternal: inputMode === 'link',
          
          fileType: inputMode === 'link' ? 'link' : (docForm.fileType || 'other'),
          fileUrl: inputMode === 'link' ? '' : docForm.fileUrl,
          externalLink: inputMode === 'upload' ? '' : docForm.externalLink,
      };

      try {
          if (docForm.id) {
              await updateDocument(docForm.id, baseData);
          } else {
              // Ép kiểu sang CreateDocumentData vì đã kiểm tra đủ các trường bắt buộc
              await createDocument(baseData as CreateDocumentData); 
          }
          setShowDocModal(false);
          loadData(currentUser);
      } catch (e) { 
        console.error("Lỗi lưu tài liệu:", e);
        alert("Lỗi lưu tài liệu"); 
      }
  };

  const handleDeleteDoc = async (id: string) => {
      if(confirm("Xóa tài liệu này?")) {
          await deleteDocument(id);
          loadData(currentUser);
      }
  };

  // --- JSX RENDER ---

  // Xử lý Loading
  if (loading) {
    return <div className="p-10 text-center text-lg text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Đang tải dữ liệu...</div>
  }

  // Xử lý Quyền truy cập
  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) {
      return <div className="p-10 text-center">Không có quyền truy cập</div>;
  }

  return (
    <div className="space-y-6 pb-20">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-green-600" /> Quản lý Tài liệu
                </h1>
                <p className="text-gray-500 text-sm">Chia sẻ tài liệu, giáo trình, video cho cộng đồng.</p>
            </div>
            <div className="flex gap-2">
                {currentUser.isAdmin && (
                    <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm flex gap-2 ${activeTab === 'categories' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        <Folder size={18} /> Danh mục
                    </button>
                )}
                <button onClick={() => setActiveTab('docs')} className={`px-4 py-2 rounded-lg font-bold text-sm flex gap-2 ${activeTab === 'docs' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                    <FileText size={18} /> Tài liệu
                </button>
            </div>
        </div>

        {activeTab === 'categories' && currentUser.isAdmin && (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button onClick={() => { setCatForm({ id: '', name: '', iconEmoji: '📁', order: 0 }); setShowCatModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2">
                        <Plus size={18} /> Thêm Danh mục
                    </button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{cat.iconEmoji}</span>
                                <span className="font-bold">{cat.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setCatForm(cat); setShowCatModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteCat(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'docs' && (
            <div className="space-y-4">
                <div className="flex justify-end">
                   <button 
                        onClick={() => { 
                            setDocForm({ ...INITIAL_DOC_FORM, categoryId: categories[0]?.id || '' }); 
                            setTagsInput('');
                            setInputMode('upload');
                            setShowDocModal(true); 
                        }} 
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2"
                   >
                        <Plus size={18} /> Tải tài liệu lên
                   </button>
                </div>
                {docs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                        Chưa có tài liệu nào được đăng.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {docs.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-gray-100'}`}>
                                    {doc.isExternal ? <LinkIcon size={24} /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'image' ? '🖼️' : '📄')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{doc.title}</h3>
                                    <p className="text-xs text-gray-500">{doc.authorName} • {new Date(doc.createdAt).toLocaleDateString('vi-VN')} • {doc.downloads} tải</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { 
                                            setDocForm(doc); 
                                            setTagsInput(doc.tags?.join(', ') || ''); 
                                            setInputMode(doc.isExternal ? 'link' : 'upload');
                                            setShowDocModal(true); 
                                        }} className="p-2 text-blue-500 bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                                    <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* CATEGORY MODAL */}
        {showCatModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm space-y-4">
                    <h3 className="font-bold text-lg">Danh mục tài liệu</h3>
                    <input value={catForm.name || ''} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Tên danh mục" className="w-full p-2 border rounded-lg" />
                    <input value={catForm.iconEmoji || '📁'} onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} placeholder="Icon Emoji" className="w-full p-2 border rounded-lg" />
                    <input type="number" value={catForm.order || 0} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} placeholder="Thứ tự" className="w-full p-2 border rounded-lg" />
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-500">Hủy</button>
                        <button onClick={handleSaveCat} className="px-4 py-2 bg-green-600 text-white rounded-lg">Lưu</button>
                    </div>
                </div>
            </div>
        )}

        {/* DOCUMENT MODAL */}
        {showDocModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-xl">Thông tin tài liệu</h3>
                        <button onClick={() => setShowDocModal(false)}><X /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <input value={docForm.title || ''} onChange={e => setDocForm({...docForm, title: e.target.value})} placeholder="Tiêu đề tài liệu" className="w-full p-3 border rounded-xl font-bold" />
                        
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'upload' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>
                                <UploadCloud size={16} /> Tải file lên
                            </button>
                            <button onClick={() => setInputMode('link')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'link' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>
                                <LinkIcon size={16} /> Nhập Link
                            </button>
                        </div>

                        {inputMode === 'upload' ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                                {uploading ? (
                                    <div className="flex flex-col items-center text-green-600">
                                        <Loader2 className="animate-spin mb-2" /> Đang tải lên...
                                    </div>
                                ) : docForm.fileUrl ? (
                                    <div className="flex items-center gap-4 justify-center">
                                        <div className="text-green-600 font-bold flex items-center gap-2">
                                            <File size={20} /> Đã có file: {docForm.fileName} 
                                        </div>
                                        <label className="text-sm text-blue-500 cursor-pointer hover:underline">
                                            Thay đổi <input type="file" className="hidden" onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <UploadCloud className="mx-auto text-gray-400 mb-2" size={32} />
                                        <span className="text-sm text-gray-500">Tải file tài liệu (PDF, Word, Excel, Ảnh, Video...)</span>
                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Link tài liệu</label>
                                <div className="flex items-center border rounded-xl p-3 gap-2 focus-within:ring-2 focus-within:ring-blue-100">
                                    <Globe size={18} className="text-gray-400" />
                                    <input value={docForm.externalLink || ''} onChange={e => setDocForm({...docForm, externalLink: e.target.value, fileType: 'link'})} placeholder="https://..." className="flex-1 outline-none text-sm" />
                                </div>
                            </div>
                        )}
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <select value={docForm.categoryId || ''} onChange={e => setDocForm({...docForm, categoryId: e.target.value})} className="w-full p-3 border rounded-xl">
                                <option value="">-- Chọn chuyên mục --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Tags (cách nhau bởi dấu phẩy)" className="w-full p-3 border rounded-xl" />
                        </div>

                        <textarea value={docForm.description || ''} onChange={e => setDocForm({...docForm, description: e.target.value})} placeholder="Mô tả ngắn về tài liệu..." className="w-full p-3 border rounded-xl h-24" />
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button onClick={() => setShowDocModal(false)} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Hủy</button>
                        <button 
                            onClick={handleSaveDoc} 
                            disabled={uploading || !docForm.title || (inputMode === 'upload' && !docForm.fileUrl) || (inputMode === 'link' && !docForm.externalLink)} 
                            className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
                        >
                            Lưu tài liệu
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
