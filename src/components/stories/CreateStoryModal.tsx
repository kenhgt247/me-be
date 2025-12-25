import React, { useState, useRef, useEffect, memo } from 'react';
import { X, Image as ImageIcon, UploadCloud, Loader2, Trash2, Send } from 'lucide-react';
import { User, Story } from '../../types'; // Lùi lại 2 cấp thư mục
import { createStory } from '../../services/stories';

interface CreateStoryModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: (story: Story) => void;
}

export const CreateStoryModal = memo(({ currentUser, onClose, onSuccess }: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ảnh mặc định dùng khi avatar lỗi
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { setError('Vui lòng chỉ chọn file ảnh.'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('File quá lớn (max 5MB).'); return; }
      setError(null); setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!selectedFile || !currentUser) return;
    setIsUploading(true); setError(null);
    try {
      const newStory = await createStory(currentUser, selectedFile);
      onSuccess(newStory); onClose();
    } catch (err) { setError("Lỗi khi đăng tin."); } finally { setIsUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Tạo tin mới</h3>
          <button onClick={onClose} disabled={isUploading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X size={24} /></button>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-black/50 relative overflow-hidden">
          {error && <div className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-200 z-20 text-center animate-shake">{error}</div>}
          {!previewUrl ? (
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-full min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer group hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all gap-4 p-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300"><ImageIcon size={40} /></div>
              <div className="text-center"><p className="font-bold text-gray-700 dark:text-gray-200 text-lg mb-1">Chọn ảnh</p><p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG, WEBP</p></div>
              <button className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-gray-200 dark:border-gray-700 mt-2 flex items-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"><UploadCloud size={16} /> Tải lên</button>
            </div>
          ) : (
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center animate-zoom-in">
               <img src={previewUrl} className="w-full h-full object-contain max-h-[60vh]" alt="Preview" decoding="async" />
               {!isUploading && <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-red-500 backdrop-blur-md transition-all shadow-lg"><Trash2 size={18} /></button>}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
           <div className="flex items-center gap-3">
             <img 
                src={currentUser.avatar || DEFAULT_AVATAR} 
                onError={(e) => e.currentTarget.src = DEFAULT_AVATAR} 
                className="w-10 h-10 rounded-full border border-gray-200 object-cover" 
                alt="User" 
                decoding="async" 
             />
             <div className="flex flex-col"><span className="text-sm font-bold text-gray-900 dark:text-white">Đăng bởi</span><span className="text-xs text-gray-500">{currentUser.name}</span></div>
           </div>
           <div className="flex gap-3">
             <button onClick={onClose} disabled={isUploading} className="px-5 py-2.5 rounded-full font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Hủy</button>
             <button onClick={handlePost} disabled={!selectedFile || isUploading} className={`px-6 py-2.5 rounded-full font-bold text-white flex items-center gap-2 transition-all shadow-lg ${!selectedFile || isUploading ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 active:scale-95 shadow-primary/30'}`}>{isUploading ? <><Loader2 size={18} className="animate-spin" /><span>Đang xử lý...</span></> : <><Send size={18} /><span>Chia sẻ</span></>}</button>
           </div>
        </div>
      </div>
    </div>
  );
});