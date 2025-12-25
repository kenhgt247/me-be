import React, { useEffect, useState, useMemo } from 'react';
import { Document, DocumentCategory } from '../../types';
import { toSlug } from '../../types';
import {
  fetchDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
  fetchDocumentsPaginated, createDocument, updateDocument, deleteDocument
} from '../../services/documents';
import { uploadFile } from '../../services/storage';
import { subscribeToAuthChanges } from '../../services/auth';
import { 
  Plus, Trash2, Edit2, X, FileText, Folder, UploadCloud, Loader2, 
  Link as LinkIcon, Globe, RefreshCw, CheckCircle, Download, ChevronDown, Search 
} from 'lucide-react';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 10;

const normalizeCategoryId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return value.id;
  return '';
};

export const DocumentAdmin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'categories'>('docs');
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Phân trang
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Forms
  const [catForm, setCatForm] = useState({ id: '', name: '', iconEmoji: '📁', order: 1 });
  const [docForm, setDocForm] = useState<Partial<Document>>({
    title: '', slug: '', description: '', categoryId: '', tags: [], fileUrl: '', fileType: 'other', isExternal: false, externalLink: ''
  });
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');

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
        const cats = await fetchDocumentCategories();
        setCategories(cats);

        if (activeTab === 'docs') {
            const authorFilter = user.isAdmin ? 'all' : user.id;
            const { docs: initialDocs, lastDoc: nextDoc, hasMore: more } = await fetchDocumentsPaginated(authorFilter, null, PAGE_SIZE);
            setDocs(initialDocs);
            setLastDoc(nextDoc);
            setHasMore(more);
        }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleLoadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const authorFilter = currentUser.isAdmin ? 'all' : currentUser.id;
    const { docs: newDocs, lastDoc: nextDoc, hasMore: more } = await fetchDocumentsPaginated(authorFilter, lastDoc, PAGE_SIZE);
    setDocs(prev => [...prev, ...newDocs]);
    setLastDoc(nextDoc);
    setHasMore(more);
    setLoadingMore(false);
  };

  // ✅ Tìm kiếm trong danh sách đã tải
  const filteredDocs = useMemo(() => {
    return docs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [docs, searchTerm]);

  const handleSaveDoc = async () => {
    if (!docForm.title) return alert('Vui lòng nhập tiêu đề');
    const slug = docForm.slug || toSlug(docForm.title);
    const data = {
      ...docForm, 
      categoryId: normalizeCategoryId(docForm.categoryId), 
      slug, 
      authorId: currentUser.id, 
      authorName: currentUser.name, 
      authorAvatar: currentUser.avatar, 
      isExpert: currentUser.isExpert, 
      isExternal: inputMode === 'link',
      fileType: inputMode === 'link' ? 'link' : docForm.fileType
    };
    docForm.id ? await updateDocument(docForm.id, data) : await createDocument(data);
    setShowDocModal(false);
    loadInitialData(currentUser);
  };

  const handleSaveCat = async () => {
    if (!catForm.name) return;
    const slug = toSlug(catForm.name);
    if (catForm.id) await updateDocumentCategory(catForm.id, { ...catForm, slug });
    else await createDocumentCategory({ ...catForm, slug, isActive: true } as any);
    setShowCatModal(false);
    loadInitialData(currentUser);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file, 'documents');
    let type: any = file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other';
    setDocForm(p => ({ ...p, fileUrl: url, fileName: file.name, fileSize: file.size, fileType: type }));
    setUploading(false);
  };

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) return <div className="p-10 text-center text-gray-400">Không có quyền truy cập</div>;

  return (
    <div className="space-y-6 pb-20 p-6 bg-gray-50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <FileText className="text-green-600" /> Quản lý Tài liệu
            </h1>
            <p className="text-gray-500 text-sm font-medium">Chia sẻ học liệu, cẩm nang cho cộng đồng</p>
         </div>
         <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setActiveTab('categories')} className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Danh mục</button>
            <button onClick={() => setActiveTab('docs')} className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'docs' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Tài liệu</button>
         </div>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => { setCatForm({ id: '', name: '', iconEmoji: '📁', order: categories.length + 1 }); setShowCatModal(true); }} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 shadow-lg hover:bg-green-700 active:scale-95 transition-all">
                    <Plus size={20} /> Thêm Danh mục
                </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                        <tr>
                            <th className="px-6 py-4">Tên / Emoji</th>
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
                                        <button onClick={() => { setCatForm(cat as any); setShowCatModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={() => { if(confirm("Xóa danh mục?")) deleteDocumentCategory(cat.id).then(() => loadInitialData(currentUser)) }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Tìm tài liệu đã tải..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-100" />
              </div>
              <button onClick={() => { setDocForm({ title: '', slug: '', description: '', categoryId: categories[0]?.id || '', tags: [], fileUrl: '', fileType: 'other', isExternal: false, externalLink: '' }); setShowDocModal(true); }} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 shadow-lg hover:bg-green-700 active:scale-95 transition-all"><Plus /> Tải tài liệu lên</button>
          </div>

          <div className="grid gap-3">
             {loading ? (
                <div className="text-center py-20"><Loader2 className="animate-spin text-green-600 inline" size={32} /></div>
             ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed text-gray-400 font-medium italic">Không tìm thấy tài liệu nào</div>
             ) : filteredDocs.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50'}`}>
                            {doc.isExternal ? <Globe size={22}/> : (doc.fileType === 'pdf' ? '📕' : '📄')}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{doc.title}</h3>
                            <p className="text-[11px] text-gray-400 font-medium">{doc.authorName} • {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setDocForm(doc); setInputMode(doc.isExternal ? 'link' : 'upload'); setShowDocModal(true); }} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                        <button onClick={() => { if(confirm("Xóa tài liệu này?")) deleteDocument(doc.id).then(() => loadInitialData(currentUser)) }} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                </div>
             ))}
          </div>
          {hasMore && !searchTerm && (
            <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-4 bg-white border border-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-gray-400 hover:text-green-600 transition-all shadow-sm">
                {loadingMore ? <Loader2 className="animate-spin" size={16}/> : <ChevronDown size={16}/>} Xem thêm tài liệu
            </button>
          )}
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-pop-in">
                  <h3 className="text-xl font-black mb-6 text-gray-900 tracking-tight">{catForm.id ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h3>
                  <div className="space-y-4">
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Tên danh mục (VD: Dinh dưỡng, Thai giáo...)" className="w-full p-3.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-100 font-bold" />
                      <div className="grid grid-cols-2 gap-4">
                          <input value={catForm.iconEmoji} onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl text-center text-xl" title="Icon Emoji" />
                          <input type="number" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold" title="Thứ tự" />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setShowCatModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">Hủy</button>
                      <button onClick={handleSaveCat} className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 active:scale-95 transition-all">Lưu thay đổi</button>
                  </div>
              </div>
          </div>
      )}

      {/* Document Modal */}
      {showDocModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-pop-in flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-black text-xl text-gray-800">{docForm.id ? 'Cập nhật tài liệu' : 'Tải tài liệu mới lên'}</h3>
                      <button onClick={() => setShowDocModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <input value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} placeholder="Nhập tiêu đề tài liệu học tập..." className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black text-xl focus:ring-2 focus:ring-green-100 outline-none" />
                      
                      <div className="grid grid-cols-2 gap-4">
                          <select value={docForm.categoryId} onChange={e => setDocForm({...docForm, categoryId: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-green-100">
                              <option value="">-- Chọn danh mục --</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
                          </select>
                          <div className="flex bg-gray-100 p-1 rounded-xl">
                              <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'upload' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Upload</button>
                              <button onClick={() => setInputMode('link')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>External Link</button>
                          </div>
                      </div>

                      {inputMode === 'upload' ? (
                          <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center bg-gray-50/50 hover:bg-green-50 transition-colors">
                              {uploading ? <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-green-600" size={32} /><span className="text-xs font-black text-green-600 uppercase">Đang xử lý file...</span></div> : (
                                  <label className="cursor-pointer block">
                                      <UploadCloud className="mx-auto mb-3 text-gray-300" size={48} />
                                      <span className="text-sm font-bold text-gray-600 block">Kéo thả hoặc Bấm để tải file</span>
                                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Hỗ trợ PDF, DOCX, Hình ảnh...</span>
                                      {docForm.fileName && <div className="mt-3 p-2 bg-white rounded-lg border border-green-200 text-green-600 text-xs font-bold truncate">{docForm.fileName}</div>}
                                      <input type="file" className="hidden" onChange={handleFileUpload} />
                                  </label>
                              )}
                          </div>
                      ) : (
                          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 focus-within:ring-2 ring-blue-200 transition-all">
                              <Globe size={20} className="text-blue-400" />
                              <input value={docForm.externalLink || ''} onChange={e => setDocForm({...docForm, externalLink: e.target.value})} placeholder="https://drive.google.com/..." className="w-full bg-transparent border-none outline-none font-medium text-sm text-blue-700" />
                          </div>
                      )}

                      <textarea value={docForm.description} onChange={e => setDocForm({...docForm, description: e.target.value})} rows={3} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-medium resize-none focus:ring-2 focus:ring-green-100" placeholder="Mô tả nội dung tài liệu..." />
                  </div>

                  <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 sticky bottom-0 z-10">
                      <button onClick={() => setShowDocModal(false)} className="px-8 py-3 text-gray-400 font-black text-xs uppercase tracking-widest">Hủy bỏ</button>
                      <button 
                        onClick={handleSaveDoc} 
                        disabled={uploading || (inputMode === 'upload' && !docForm.fileUrl) || (inputMode === 'link' && !docForm.externalLink)}
                        className="px-10 py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
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
