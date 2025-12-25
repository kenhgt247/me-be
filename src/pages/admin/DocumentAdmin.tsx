import React, { useEffect, useState } from 'react';
import { Document, DocumentCategory } from '../../types';
import { toSlug } from '../../types';
import {
  fetchDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
  fetchDocumentsPaginated, createDocument, updateDocument, deleteDocument
} from '../../services/documents';
import { uploadFile } from '../../services/storage';
import { subscribeToAuthChanges } from '../../services/auth';
import { Plus, Trash2, Edit2, X, FileText, Folder, UploadCloud, Loader2, Link as LinkIcon, Globe, RefreshCw, CheckCircle, Download, ChevronDown } from 'lucide-react';
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

  // Phân trang
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [catForm, setCatForm] = useState({ id: '', name: '', iconEmoji: '📁', order: 1 });
  const [docForm, setDocForm] = useState<Partial<Document>>({
    title: '', slug: '', description: '', categoryId: '', tags: [], fileUrl: '', fileType: 'other', isExternal: false, externalLink: ''
  });

  const [tagsInput, setTagsInput] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');

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
        const cats = await fetchDocumentCategories();
        setCategories(cats);

        const { docs: initialDocs, lastDoc: nextDoc, hasMore: more } = await fetchDocumentsPaginated(authorFilter, null, PAGE_SIZE);
        setDocs(initialDocs);
        setLastDoc(nextDoc);
        setHasMore(more);
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

  const handleSaveDoc = async () => {
    if (!docForm.title) return alert('Vui lòng nhập tiêu đề');
    const slug = docForm.slug || toSlug(docForm.title);
    const data = {
      ...docForm, categoryId: normalizeCategoryId(docForm.categoryId), slug, authorId: currentUser.id, authorName: currentUser.name, authorAvatar: currentUser.avatar, isExpert: currentUser.isExpert, isExternal: inputMode === 'link',
      fileType: inputMode === 'link' ? 'link' : docForm.fileType
    };
    docForm.id ? await updateDocument(docForm.id, data) : await createDocument(data);
    setShowDocModal(false);
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

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) return <div className="p-10 text-center">Không có quyền truy cập</div>;

  return (
    <div className="space-y-6 pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
         <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-green-600" /> Quản lý Tài liệu</h1></div>
         <div className="flex gap-2">
            <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'categories' ? 'bg-green-100' : 'bg-gray-100'}`}>Danh mục</button>
            <button onClick={() => setActiveTab('docs')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'docs' ? 'bg-green-100' : 'bg-gray-100'}`}>Tài liệu</button>
         </div>
      </div>

      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowDocModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2"><Plus /> Tải tài liệu lên</button></div>
          <div className="grid gap-4">
             {loading ? <div className="text-center py-20"><Loader2 className="animate-spin inline" /></div> : docs.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center text-xl">{doc.isExternal ? <Globe size={20}/> : '📄'}</div>
                        <div><h3 className="font-bold text-gray-800">{doc.title}</h3><p className="text-xs text-gray-400">{doc.authorName} • {new Date(doc.createdAt).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setDocForm(doc); setShowDocModal(true); }} className="p-2 text-blue-500"><Edit2 size={18}/></button>
                        <button onClick={() => { if(confirm("Xóa?")) deleteDocument(doc.id).then(() => loadInitialData(currentUser)) }} className="p-2 text-red-500"><Trash2 size={18}/></button>
                    </div>
                </div>
             ))}
          </div>
          {hasMore && <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-3 bg-white border rounded-xl font-bold flex items-center justify-center gap-2"><ChevronDown /> Xem thêm tài liệu</button>}
        </div>
      )}

      {/* MODAL tải lên tài liệu */}
      {showDocModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4">
                  <h3 className="font-bold text-xl">Thêm tài liệu</h3>
                  <input value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} placeholder="Tiêu đề tài liệu" className="w-full p-3 border rounded-xl" />
                  <div className="border-2 border-dashed rounded-xl p-8 text-center bg-gray-50">
                      {uploading ? <Loader2 className="animate-spin mx-auto" /> : (
                          <label className="cursor-pointer">
                              <UploadCloud className="mx-auto mb-2 text-gray-400" />
                              <span className="text-sm font-bold">Bấm để tải file</span>
                              <input type="file" className="hidden" onChange={handleFileUpload} />
                          </label>
                      )}
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowDocModal(false)} className="px-6 py-2">Hủy</button>
                      <button onClick={handleSaveDoc} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold">Lưu tài liệu</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
