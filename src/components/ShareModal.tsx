
import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'Zalo',
      icon: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo-Arc.png',
      action: () => window.open(`https://zalo.me/share/?url=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'X (Twitter)',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg',
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank')
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end md:items-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full md:w-[400px] rounded-t-[2rem] md:rounded-[2rem] p-6 pb-safe-bottom relative z-10 animate-slide-up shadow-2xl">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden"></div>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">Chia sẻ câu hỏi</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Social Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {shareLinks.map((item) => (
            <button 
              key={item.name}
              onClick={item.action}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100 group-active:scale-90 transition-transform shadow-sm">
                <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-medium text-gray-600">{item.name}</span>
            </button>
          ))}
          
          <button 
            onClick={() => setShowQr(!showQr)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-sm ${showQr ? 'bg-primary text-white border-primary' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
              <QrCode size={24} />
            </div>
            <span className="text-xs font-medium text-gray-600">Mã QR</span>
          </button>
        </div>

        {/* Copy Link Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 mb-4">
           <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Liên kết bài viết</p>
              <p className="text-sm text-gray-800 truncate font-medium">{url}</p>
           </div>
           <button 
             onClick={handleCopy}
             className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${copied ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
           >
             {copied ? <Check size={16} /> : <Copy size={16} />}
             {copied ? 'Đã chép' : 'Sao chép'}
           </button>
        </div>

        {/* QR Code Expansion */}
        {showQr && (
           <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-2xl shadow-inner animate-fade-in">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} 
                alt="QR Code" 
                className="w-40 h-40 object-contain mb-3"
              />
              <p className="text-sm text-gray-500">Quét để mở trên điện thoại</p>
           </div>
        )}
      </div>
    </div>
  );
};
