import React, { useEffect, useState } from 'react';

import { Document, DocumentCategory } from '../../types';

import { toSlug } from '../../types'; // Import hàm toSlug chuẩn

import { 

  fetchDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,

  fetchAllDocumentsAdmin, createDocument, updateDocument, deleteDocument 

} from '../../services/documents';

import { uploadFile } from '../../services/storage';

import { subscribeToAuthChanges } from '../../services/auth';

import { 

  Plus, Trash2, Edit2, X, FileText, Folder, UploadCloud, Loader2, 

  Video, Image as ImageIcon, File, Link as LinkIcon, Globe, RefreshCw, CheckCircle, Download

} from 'lucide-react';



export const DocumentAdmin: React.FC = () => {

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'docs' | 'categories'>('docs');

  

  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  const [docs, setDocs] = useState<Document[]>([]);

  const [loading, setLoading] = useState(true);



  // Modals

  const [showCatModal, setShowCatModal] = useState(false);

  const [showDocModal, setShowDocModal] = useState(false);

  const [uploading, setUploading] = useState(false);



  // Forms

  const [catForm, setCatForm] = useState({ id: '', name: '', iconEmoji: '📁', order: 1 });

  

  const [docForm, setDocForm] = useState<Partial<Document>>({

      title: '', slug: '', description: '', categoryId: '', tags: [], 

      fileUrl: '', fileType: 'other', isExternal: false, externalLink: ''

  });

  const [tagsInput, setTagsInput] = useState('');

  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');



  useEffect(() => {

    const unsub = subscribeToAuthChanges(user => {

      setCurrentUser(user);

      if (user) loadData(user);

    });

    return () => unsub();

  }, []);



  const loadData = async (user: any) => {

    setLoading(true);

    // Admin thấy tất cả, Expert thấy của mình

    const authorFilter = user.isAdmin ? undefined : user.id;

    

    const [cats, allDocs] = await Promise.all([

      fetchDocumentCategories(),

      fetchAllDocumentsAdmin(authorFilter)

    ]);

    setCategories(cats);

    setDocs(allDocs);

    setLoading(false);

  };



  // --- CATEGORY HANDLERS ---

  const handleSaveCat = async () => {

      if (!catForm.name) return;

      const slug = toSlug(catForm.name); // Dùng toSlug chuẩn

      try {

          if (catForm.id) {

              await updateDocumentCategory(catForm.id, { ...catForm, slug });

          } else {

              await createDocumentCategory({ ...catForm, slug, isActive: true } as any);

          }

          setShowCatModal(false);

          loadData(currentUser);

      } catch (e) { alert("Lỗi: " + e); }

  };



  const handleDeleteCat = async (id: string) => {

      if(confirm("Bạn chắc chắn muốn xóa danh mục này?")) {

          await deleteDocumentCategory(id);

          loadData(currentUser);

      }

  };



  // --- DOCUMENT HANDLERS ---

  

  // Tự động tạo slug khi nhập tiêu đề

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

      const newTitle = e.target.value;

      setDocForm(prev => ({

          ...prev,

          title: newTitle,

          slug: (!prev.id || !prev.slug) ? toSlug(newTitle) : prev.slug

      }));

  };



  const handleRegenerateSlug = () => {

      if (docForm.title) {

          setDocForm(prev => ({ ...prev, slug: toSlug(prev.title || '') }));

      }

  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

      const file = e.target.files?.[0];

      if (!file) return;

      

      setUploading(true);

      try {

          const url = await uploadFile(file, 'documents');

          

          let type: any = 'other';

          if (file.type.includes('pdf')) type = 'pdf';

          else if (file.type.includes('image')) type = 'image';

          else if (file.type.includes('video')) type = 'video';

          else if (file.name.endsWith('docx') || file.name.endsWith('doc')) type = 'docx';

          else if (file.name.endsWith('xlsx') || file.name.endsWith('xls')) type = 'xlsx';

          

          setDocForm(prev => ({

              ...prev,

              fileUrl: url,

              fileName: file.name,

              fileSize: file.size,

              fileType: type

          }));

      } catch (e) {

          alert("Upload thất bại, vui lòng thử lại.");

      } finally {

          setUploading(false);

      }

  };



  const handleSaveDoc = async () => {

      if (!docForm.title) return alert("Vui lòng nhập tiêu đề tài liệu");

      if (inputMode === 'upload' && !docForm.fileUrl) return alert("Vui lòng tải file lên");

      if (inputMode === 'link' && !docForm.externalLink) return alert("Vui lòng nhập đường dẫn");

      

      const slug = docForm.slug || toSlug(docForm.title);

      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);



      const data: any = {

          ...docForm,

          slug,

          tags,

          authorId: currentUser.id,

          authorName: currentUser.name,

          authorAvatar: currentUser.avatar,

          isExpert: currentUser.isExpert,

          isExternal: inputMode === 'link',

          fileType: inputMode === 'link' ? 'link' : docForm.fileType,

          fileUrl: inputMode === 'link' ? '' : docForm.fileUrl,

          externalLink: inputMode === 'upload' ? '' : docForm.externalLink

      };



      try {

          if (docForm.id) {

              await updateDocument(docForm.id, data);

          } else {

              await createDocument(data);

          }

          setShowDocModal(false);

          loadData(currentUser);

      } catch (e) { alert("Lỗi lưu tài liệu: " + e); }

  };



  const handleDeleteDoc = async (id: string) => {

      if(confirm("Xóa tài liệu này?")) {

          await deleteDocument(id);

          loadData(currentUser);

      }

  };



  const openEditDocModal = (doc: Document) => {

      setDocForm(doc);

      setTagsInput(doc.tags?.join(', ') || '');

      setInputMode(doc.isExternal ? 'link' : 'upload');

      setShowDocModal(true);

  };



  const openCreateDocModal = () => {

      setDocForm({ 

          title: '', slug: '', description: '', 

          categoryId: categories[0]?.id || '', tags: [], 

          fileUrl: '', fileType: 'other', isExternal: false, externalLink: '' 

      });

      setTagsInput('');

      setInputMode('upload');

      setShowDocModal(true);

  };



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

                    <button 

                        onClick={() => setActiveTab('categories')} 

                        className={`px-4 py-2 rounded-lg font-bold text-sm flex gap-2 transition-all ${activeTab === 'categories' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}

                    >

                        <Folder size={18} /> Danh mục

                    </button>

                )}

                <button 

                    onClick={() => setActiveTab('docs')} 

                    className={`px-4 py-2 rounded-lg font-bold text-sm flex gap-2 transition-all ${activeTab === 'docs' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}

                >

                    <FileText size={18} /> Tài liệu

                </button>

            </div>

       </div>



       {/* --- DANH MỤC (CATEGORIES) --- */}

       {activeTab === 'categories' && currentUser.isAdmin && (

           <div className="space-y-4">

               <div className="flex justify-end">

                   <button 

                        onClick={() => { setCatForm({ id: '', name: '', iconEmoji: '📁', order: categories.length + 1 }); setShowCatModal(true); }} 

                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 shadow-lg hover:bg-green-700 transition-colors"

                   >

                       <Plus size={18} /> Thêm Danh mục

                   </button>

               </div>

               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                   <table className="w-full text-left">

                       <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500">

                           <tr>

                               <th className="px-6 py-4">Tên danh mục</th>

                               <th className="px-6 py-4">Icon</th>

                               <th className="px-6 py-4">Thứ tự</th>

                               <th className="px-6 py-4 text-right">Hành động</th>

                           </tr>

                       </thead>

                       <tbody className="divide-y divide-gray-100">

                           {categories.map(cat => (

                               <tr key={cat.id} className="hover:bg-gray-50">

                                   <td className="px-6 py-4 font-bold">{cat.name}</td>

                                   <td className="px-6 py-4 text-2xl">{cat.iconEmoji}</td>

                                   <td className="px-6 py-4">{cat.order}</td>

                                   <td className="px-6 py-4 text-right flex justify-end gap-2">

                                       <button onClick={() => { setCatForm(cat as any); setShowCatModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>

                                       <button onClick={() => handleDeleteCat(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>

                                   </td>

                               </tr>

                           ))}

                       </tbody>

                   </table>

               </div>

           </div>

       )}



       {/* --- TÀI LIỆU (DOCUMENTS) --- */}

       {activeTab === 'docs' && (

           <div className="space-y-4">

                <div className="flex justify-end">

                   <button 

                        onClick={openCreateDocModal} 

                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 shadow-lg hover:bg-green-700 transition-colors"

                   >

                       <Plus size={18} /> Tải tài liệu lên

                   </button>

               </div>

               

               {loading ? (

                   <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-600" /></div>

               ) : docs.length === 0 ? (

                   <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">

                       <FileText size={48} className="mx-auto text-gray-300 mb-2"/>

                       <p className="text-gray-500">Chưa có tài liệu nào.</p>

                   </div>

               ) : (

                   <div className="grid gap-4">

                       {docs.map(doc => (

                           <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-all">

                               <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${doc.isExternal ? 'bg-blue-50 text-blue-500' : 'bg-green-50'}`}>

                                   {doc.isExternal ? <LinkIcon size={24} /> : (doc.fileType === 'pdf' ? '📕' : doc.fileType === 'docx' ? '📝' : doc.fileType === 'video' ? '🎬' : '📄')}

                               </div>

                               <div className="flex-1 min-w-0">

                                   <h3 className="font-bold text-gray-900 truncate text-lg">{doc.title}</h3>

                                   <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">

                                       <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">

                                           {categories.find(c => c.id === doc.categoryId)?.name || 'Chưa phân loại'}

                                       </span>

                                       <span>{doc.authorName}</span>

                                       <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>

                                       <span className="flex items-center gap-1"><Download size={12}/> {doc.downloads}</span>

                                   </div>

                               </div>

                               <div className="flex gap-2 self-end md:self-center">

                                   <button onClick={() => openEditDocModal(doc)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={18}/></button>

                                   <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={18}/></button>

                               </div>

                           </div>

                       ))}

                   </div>

               )}

           </div>

       )}



       {/* CATEGORY MODAL */}

       {showCatModal && (

           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">

               <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 animate-pop-in">

                   <h3 className="font-bold text-lg">Danh mục tài liệu</h3>

                   <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Tên danh mục" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" />

                   <div className="grid grid-cols-2 gap-4">

                       <input value={catForm.iconEmoji} onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} placeholder="Icon Emoji (📁)" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" />

                       <input type="number" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} placeholder="Thứ tự" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" />

                   </div>

                   <div className="flex justify-end gap-2 pt-4">

                       <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Hủy</button>

                       <button onClick={handleSaveCat} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg">Lưu</button>

                   </div>

               </div>

           </div>

       )}



       {/* DOCUMENT MODAL */}

       {showDocModal && (

           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">

               <div className="bg-white p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-pop-in">

                   <div className="flex justify-between items-center border-b border-gray-100 pb-4">

                       <h3 className="font-bold text-xl text-gray-800">{docForm.id ? 'Sửa tài liệu' : 'Thêm tài liệu mới'}</h3>

                       <button onClick={() => setShowDocModal(false)} className="hover:bg-gray-100 p-1 rounded-full"><X /></button>

                   </div>

                   

                   <div className="space-y-4">

                       <div>

                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề</label>

                           <input 

                                value={docForm.title} 

                                onChange={handleTitleChange} 

                                placeholder="Nhập tiêu đề tài liệu..." 

                                className="w-full p-3 border rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-green-100" 

                           />

                       </div>



                       {/* SLUG & CATEGORY */}

                       <div className="grid md:grid-cols-2 gap-4">

                           <div>

                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Đường dẫn (Slug)</label>

                               <div className="flex gap-2">

                                   <input 

                                        value={docForm.slug} 

                                        onChange={e => setDocForm({...docForm, slug: e.target.value})} 

                                        placeholder="duong-dan-tai-lieu" 

                                        className="w-full p-2 border rounded-xl text-sm font-mono text-gray-600 bg-gray-50 outline-none" 

                                   />

                                   <button onClick={handleRegenerateSlug} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600" title="Tạo lại"><RefreshCw size={18}/></button>

                               </div>

                           </div>

                           <div>

                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Danh mục</label>

                               <select value={docForm.categoryId} onChange={e => setDocForm({...docForm, categoryId: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-100">

                                   <option value="">-- Chọn chuyên mục --</option>

                                   {categories.map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}

                               </select>

                           </div>

                       </div>

                       

                       {/* UPLOAD TABS */}

                       <div>

                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nguồn tài liệu</label>

                           <div className="flex bg-gray-100 p-1 rounded-xl mb-4">

                               <button onClick={() => setInputMode('upload')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'upload' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>

                                   <UploadCloud size={16} /> Tải file lên

                               </button>

                               <button onClick={() => setInputMode('link')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'link' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>

                                   <LinkIcon size={16} /> Nhập Link ngoài

                               </button>

                           </div>



                           {inputMode === 'upload' ? (

                               <div className="border-2 border-dashed border-green-200 bg-green-50/50 rounded-xl p-8 text-center hover:bg-green-50 transition-colors relative">

                                   {uploading ? (

                                       <div className="flex flex-col items-center text-green-600 animate-pulse">

                                           <Loader2 className="animate-spin mb-2" size={32} /> 

                                           <span className="font-bold">Đang tải lên...</span>

                                       </div>

                                   ) : docForm.fileUrl ? (

                                       <div className="flex flex-col items-center gap-2 justify-center">

                                           <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-2xl border border-gray-100">

                                                {docForm.fileType === 'pdf' ? '📕' : '📄'}

                                           </div>

                                           <div className="text-green-700 font-bold text-sm break-all max-w-xs">{docForm.fileName || 'File đã tải lên'}</div>

                                           <label className="text-xs font-bold text-blue-600 cursor-pointer hover:underline bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100">

                                               Thay đổi file <input type="file" className="hidden" onChange={handleFileUpload} />

                                           </label>

                                       </div>

                                   ) : (

                                       <label className="cursor-pointer block">

                                           <UploadCloud className="mx-auto text-green-400 mb-3" size={40} />

                                           <span className="text-sm font-bold text-gray-600 block">Nhấn để tải file lên</span>

                                           <span className="text-xs text-gray-400 block mt-1">(PDF, Word, Excel, Ảnh, Video...)</span>

                                           <input type="file" className="hidden" onChange={handleFileUpload} />

                                       </label>

                                   )}

                               </div>

                           ) : (

                               <div className="flex items-center border rounded-xl p-3 gap-2 focus-within:ring-2 focus-within:ring-blue-100 bg-gray-50 focus-within:bg-white transition-colors">

                                   <Globe size={20} className="text-gray-400" />

                                   <input value={docForm.externalLink || ''} onChange={e => setDocForm({...docForm, externalLink: e.target.value})} placeholder="https://drive.google.com/..." className="flex-1 outline-none text-sm bg-transparent" />

                               </div>

                           )}

                       </div>



                       <div>

                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mô tả ngắn</label>

                           <textarea value={docForm.description} onChange={e => setDocForm({...docForm, description: e.target.value})} placeholder="Giới thiệu sơ lược về tài liệu này..." className="w-full p-3 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-green-100" />

                       </div>

                       

                       <div>

                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags</label>

                           <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="VD: dinh duong, cho be, an dam (cách nhau bởi dấu phẩy)" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" />

                       </div>

                   </div>



                   <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">

                       <button onClick={() => setShowDocModal(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>

                       <button 

                            onClick={handleSaveDoc} 

                            disabled={uploading || (inputMode === 'upload' && !docForm.fileUrl) || (inputMode === 'link' && !docForm.externalLink)} 

                            className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"

                       >

                           <CheckCircle size={18} /> Lưu tài liệu

                       </button>

                   </div>

               </div>

           </div>

       )}

    </div>

  );

};
