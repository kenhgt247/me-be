import React, { useEffect, useState, useMemo } from 'react';
// Giả định các types được định nghĩa đúng
import { Document, DocumentCategory } from '../../types'; 
import { toSlug } from '../../types'; // Giả định hàm toSlug chuẩn
import { 
    fetchDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
    fetchAllDocumentsAdmin, createDocument, updateDocument, deleteDocument 
} from '../../services/documents'; // Giả định service documents
import { uploadFile } from '../../services/storage'; // Giả định service upload file
import { subscribeToAuthChanges } from '../../services/auth'; // Giả định service auth
import { 
    Plus, Trash2, Edit2, X, FileText, Folder, UploadCloud, Loader2, 
    File, Link as LinkIcon, Globe, RefreshCw, CheckCircle, Download, FileImage, FileVideo, BookText
} from 'lucide-react';

// --- UTILITY FUNCTIONS ---
// Hàm xác định icon dựa trên fileType
const getFileIcon = (fileType?: string) => {
    switch (fileType) {
        case 'pdf': return <BookText size={24} className="text-red-500" />;
        case 'docx':
        case 'xlsx': return <FileText size={24} className="text-blue-500" />;
        case 'image': return <FileImage size={24} className="text-purple-500" />;
        case 'video': return <FileVideo size={24} className="text-teal-500" />;
        case 'link': return <LinkIcon size={24} className="text-blue-500" />;
        default: return <File size={24} className="text-gray-500" />;
    }
}

// --- INITIAL STATES ---
const initialCatForm = { id: '', name: '', iconEmoji: '📁', order: 1 };
const initialDocForm: Partial<Document> = {
    title: '', slug: '', description: '', categoryId: '', tags: [], 
    fileUrl: '', fileType: 'other', isExternal: false, externalLink: ''
};

// --- MAIN COMPONENT ---
export const DocumentAdmin: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'docs' | 'categories'>('docs');
    
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals & Upload
    const [showCatModal, setShowCatModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Forms
    const [catForm, setCatForm] = useState(initialCatForm);
    const [docForm, setDocForm] = useState<Partial<Document>>(initialDocForm);
    const [tagsInput, setTagsInput] = useState('');
    const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload'); 

    // Lấy tên danh mục từ ID
    const getCategoryName = useMemo(() => {
        const map = new Map(categories.map(c => [c.id, c.name]));
        return (categoryId?: string) => categoryId ? map.get(categoryId) || 'Chưa phân loại' : 'Chưa phân loại';
    }, [categories]);

    // --- EFFECTS ---
    useEffect(() => {
        const unsub = subscribeToAuthChanges(user => {
            setCurrentUser(user);
            if (user && (user.isAdmin || user.isExpert)) {
                loadData(user);
            } else {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    const loadData = async (user: any) => {
        setLoading(true);
        try {
            const authorFilter = user?.isAdmin ? undefined : user?.id;
            
            const [cats, allDocs] = await Promise.all([
                fetchDocumentCategories(),
                fetchAllDocumentsAdmin(authorFilter)
            ]);
            setCategories(cats);
            setDocs(allDocs);
            console.log(`[Dữ liệu tải]: Đã tải ${cats.length} danh mục và ${allDocs.length} tài liệu.`);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CATEGORY HANDLERS ---
    const handleSaveCat = async () => {
        if (!catForm.name || !currentUser) return;
        const slug = toSlug(catForm.name);
        
        try {
            const dataToSave = { 
                ...catForm, 
                slug, 
                order: Number(catForm.order) 
            };
            
            if (catForm.id) {
                // UPDATE
                await updateDocumentCategory(catForm.id, dataToSave);
            } else {
                // CREATE
                // Đảm bảo id không bị gửi vào hàm create
                const { id, ...dataToCreate } = dataToSave;
                await createDocumentCategory({ 
                    ...dataToCreate, 
                    isActive: true, 
                } as DocumentCategory);
            }
            setShowCatModal(false);
            loadData(currentUser);
        } catch (e) { 
            alert("Lỗi lưu danh mục: " + (e as Error).message);
        }
    };

    const handleDeleteCat = async (id: string) => {
        if(confirm("Bạn chắc chắn muốn xóa danh mục này?")) {
            try {
                await deleteDocumentCategory(id);
                loadData(currentUser);
            } catch (e) {
                alert("Lỗi xóa danh mục: " + (e as Error).message);
            }
        }
    };

    const openEditCatModal = (cat: DocumentCategory) => {
        setCatForm(cat as any);
        setShowCatModal(true);
    }
    
    // Đảm bảo reset form hoàn toàn khi tạo mới
    const openCreateCatModal = () => {
        setCatForm({ ...initialCatForm, id: '', order: categories.length + 1 });
        setShowCatModal(true);
    };

    // --- DOCUMENT HANDLERS ---
    
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
            
            let type: string = 'other';
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
                fileType: type,
                isExternal: false,
                externalLink: '' 
            }));
            setInputMode('upload'); 
        } catch (e) {
            alert("Upload thất bại, vui lòng thử lại.");
        } finally {
            setUploading(false);
            e.target.value = ''; 
        }
    };

    const handleSaveDoc = async () => {
        if (!currentUser) return alert("Không tìm thấy thông tin người dùng.");
        if (!docForm.title) return alert("Vui lòng nhập tiêu đề tài liệu.");
        if (!docForm.categoryId) return alert("Vui lòng chọn danh mục."); 

        const isExternal = inputMode === 'link';
        if (isExternal && !docForm.externalLink) return alert("Vui lòng nhập đường dẫn liên kết.");
        if (!isExternal && !docForm.fileUrl && !docForm.id) return alert("Vui lòng tải file lên."); 
        
        const slug = docForm.slug || toSlug(docForm.title);
        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

        const data: Partial<Document> = {
            ...docForm,
            slug,
            tags,
            authorId: currentUser.id,
            authorName: currentUser.name || 'Admin',
            authorAvatar: currentUser.avatar,
            isExpert: !!currentUser.isExpert, 
            isExternal: isExternal,
            
            fileType: isExternal ? 'link' : docForm.fileType,
            fileUrl: isExternal ? '' : docForm.fileUrl,
            externalLink: isExternal ? docForm.externalLink : ''
        };

        try {
            const { id, ...dataToSave } = data;
            
            if (docForm.id) {
                // UPDATE
                await updateDocument(docForm.id, dataToSave as Document);
            } else {
                // CREATE
                await createDocument(dataToSave as Document);
            }
            setShowDocModal(false);
            loadData(currentUser);
        } catch (e) { 
            alert("Lỗi lưu tài liệu: " + (e as Error).message); 
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if(confirm("Xóa tài liệu này? Hành động này không thể hoàn tác.")) {
            try {
                await deleteDocument(id);
                loadData(currentUser);
            } catch (e) {
                alert("Lỗi xóa tài liệu: " + (e as Error).message);
            }
        }
    };

    const openEditDocModal = (doc: Document) => {
        const safeDoc: Partial<Document> = {
            ...doc,
            categoryId: doc.categoryId || '' 
        }
        setDocForm(safeDoc);
        setTagsInput(doc.tags?.join(', ') || '');
        setInputMode(doc.isExternal ? 'link' : 'upload');
        setShowDocModal(true);
    };

    const openCreateDocModal = () => {
        // LUÔN đặt categoryId là chuỗi rỗng để kích hoạt option đầu tiên
        setDocForm({ 
            ...initialDocForm,
            categoryId: '' 
        }); 
        setTagsInput('');
        setInputMode('upload');
        setShowDocModal(true);
    };

    // --- RENDER CHECK ---
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-green-600" size={32} />
            </div>
        );
    }

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) {
        return <div className="p-10 text-center text-red-500 font-bold">Không có quyền truy cập vào trang quản lý này.</div>;
    }

    // --- JSX RENDER ---
    return (
        <div className="space-y-6 pb-20">
            {/* Header và Tab Selector */}
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
                            onClick={openCreateCatModal} 
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
                                {categories
                                    .sort((a, b) => (a.order || 0) - (b.order || 0)) 
                                    .map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold">{cat.name}</td>
                                        <td className="px-6 py-4 text-2xl">{cat.iconEmoji}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{cat.order}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => openEditCatModal(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
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
                    
                    {docs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <FileText size={48} className="mx-auto text-gray-300 mb-2"/>
                            <p className="text-gray-500">Chưa có tài liệu nào được thêm.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {docs.map(doc => (
                                <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-all">
                                    {/* Icon */}
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${doc.isExternal ? 'bg-blue-50' : 'bg-green-50'}`}>
                                        {doc.isExternal ? <Globe size={24} className="text-blue-500" /> : getFileIcon(doc.fileType)}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate text-lg">{doc.title}</h3>
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                            {/* Category Tag */}
                                            <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-600">
                                                <Folder size={12} className="inline mr-1 -mt-0.5"/> {getCategoryName(doc.categoryId)}
                                            </span>
                                            {/* Author and Date */}
                                            <span>Bởi: **{doc.authorName || 'Không rõ'}**</span>
                                            <span>Ngày tạo: {new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                                            {/* Downloads */}
                                            <span className="flex items-center gap-1"><Download size={12}/> {doc.downloads || 0}</span>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex gap-2 self-end md:self-center">
                                        <button onClick={() => openEditDocModal(doc)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Chỉnh sửa"><Edit2 size={18}/></button>
                                        <button onClick={() => handleDeleteDoc(doc.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Xóa"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* CATEGORY MODAL */}
            {showCatModal && (
                <div key="cat-modal" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 animate-pop-in">
                        <h3 className="font-bold text-xl text-gray-800">{catForm.id ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}</h3>
                        <input 
                            value={catForm.name} 
                            onChange={e => setCatForm({...catForm, name: e.target.value})} 
                            placeholder="Tên danh mục" 
                            className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                value={catForm.iconEmoji} 
                                onChange={e => setCatForm({...catForm, iconEmoji: e.target.value})} 
                                placeholder="Icon Emoji (📁)" 
                                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" 
                            />
                            <input 
                                type="number" 
                                value={catForm.order} 
                                onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} 
                                placeholder="Thứ tự" 
                                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" 
                            />
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
                <div key="doc-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-pop-in">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-xl text-gray-800">{docForm.id ? 'Sửa tài liệu' : 'Thêm tài liệu mới'}</h3>
                            <button onClick={() => setShowDocModal(false)} className="hover:bg-gray-100 p-1 rounded-full"><X /></button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Tiêu đề */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề</label>
                                <input 
                                    value={docForm.title || ''} 
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
                                            value={docForm.slug || ''} 
                                            onChange={e => setDocForm({...docForm, slug: e.target.value})} 
                                            placeholder="duong-dan-tai-lieu" 
                                            className="w-full p-2 border rounded-xl text-sm font-mono text-gray-600 bg-gray-50 outline-none" 
                                        />
                                        <button onClick={handleRegenerateSlug} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600" title="Tạo lại"><RefreshCw size={18}/></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Danh mục</label>
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-red-500 p-2 border border-red-200 bg-red-50 rounded-xl">
                                            Chưa có danh mục nào được tải. Vui lòng tạo danh mục trước.
                                        </p>
                                    ) : (
                                        <select 
                                            value={docForm.categoryId || ''} 
                                            onChange={e => setDocForm({...docForm, categoryId: e.target.value})} 
                                            className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-100"
                                        >
                                            <option value="">-- Chọn chuyên mục --</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.iconEmoji} {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            
                            {/* UPLOAD TABS & INPUT */}
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
                                    // Upload Input Area
                                    <div className="border-2 border-dashed border-green-200 bg-green-50/50 rounded-xl p-8 text-center hover:bg-green-50 transition-colors relative">
                                        {uploading ? (
                                            <div className="flex flex-col items-center text-green-600 animate-pulse">
                                                <Loader2 className="animate-spin mb-2" size={32} /> 
                                                <span className="font-bold">Đang tải lên...</span>
                                            </div>
                                        ) : docForm.fileUrl ? (
                                            <div className="flex flex-col items-center gap-2 justify-center">
                                                <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center border border-gray-100">
                                                    {getFileIcon(docForm.fileType)}
                                                </div>
                                                <div className="text-green-700 font-bold text-sm break-all max-w-xs">{docForm.fileName || 'File đã tải lên'}</div>
                                                <label className="text-xs font-bold text-blue-600 cursor-pointer hover:underline bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100">
                                                    Thay đổi file <input type="file" className="hidden" onChange={handleFileUpload} accept="*/*" />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer block">
                                                <UploadCloud className="mx-auto text-green-400 mb-3" size={40} />
                                                <span className="text-sm font-bold text-gray-600 block">Nhấn để tải file lên</span>
                                                <span className="text-xs text-gray-400 block mt-1">(PDF, Word, Excel, Ảnh, Video...)</span>
                                                <input type="file" className="hidden" onChange={handleFileUpload} accept="*/*" />
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    // External Link Input
                                    <div className="flex items-center border rounded-xl p-3 gap-2 focus-within:ring-2 focus-within:ring-blue-100 bg-gray-50 focus-within:bg-white transition-colors">
                                        <Globe size={20} className="text-gray-400" />
                                        <input 
                                            value={docForm.externalLink || ''} 
                                            onChange={e => setDocForm({...docForm, externalLink: e.target.value})} 
                                            placeholder="https://drive.google.com/..." 
                                            className="flex-1 outline-none text-sm bg-transparent" 
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Mô tả ngắn */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mô tả ngắn</label>
                                <textarea 
                                    value={docForm.description || ''} 
                                    onChange={e => setDocForm({...docForm, description: e.target.value})} 
                                    placeholder="Giới thiệu sơ lược về tài liệu này..." 
                                    className="w-full p-3 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-green-100" 
                                />
                            </div>
                            
                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (từ khóa)</label>
                                <input 
                                    value={tagsInput} 
                                    onChange={e => setTagsInput(e.target.value)} 
                                    placeholder="VD: dinh duong, cho be, an dam (cách nhau bởi dấu phẩy)" 
                                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-green-100" 
                                />
                            </div>
                        </div>

                        {/* Footer - Save/Cancel */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowDocModal(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Hủy</button>
                            <button 
                                onClick={handleSaveDoc} 
                                disabled={uploading || !docForm.categoryId || (inputMode === 'upload' && !docForm.fileUrl && !docForm.id) || (inputMode === 'link' && !docForm.externalLink)} 
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
