
import React, { useEffect, useState } from 'react';
import { ExpertApplication } from '../../types';
import { fetchExpertApplications, processExpertApplication } from '../../services/admin';
import { Check, X, FileText, Clock, ExternalLink, Filter, ZoomIn, AlertTriangle, RefreshCw } from 'lucide-react';

export const ExpertApprovals: React.FC = () => {
  const [apps, setApps] = useState<ExpertApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ExpertApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modal States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
        const data = await fetchExpertApplications();
        setApps(data);
    } catch (e) {
        console.error("Failed to load apps", e);
    } finally {
        setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!confirm(`Bạn xác nhận DUYỆT hồ sơ của ${selectedApp.fullName}?`)) return;

    await processExpertApplication(
        selectedApp.id, 
        selectedApp.userId, 
        'approved', 
        undefined,
        selectedApp.specialty
    );
    
    setApps(apps.map(a => a.id === selectedApp.id ? { ...a, status: 'approved' } : a));
    setSelectedApp({ ...selectedApp, status: 'approved' });
  };

  const handleRejectSubmit = async () => {
    if (!selectedApp || !rejectReason.trim()) return;

    await processExpertApplication(
        selectedApp.id, 
        selectedApp.userId, 
        'rejected', 
        rejectReason
    );
    
    setApps(apps.map(a => a.id === selectedApp.id ? { ...a, status: 'rejected', rejectionReason: rejectReason } : a));
    setSelectedApp({ ...selectedApp, status: 'rejected', rejectionReason: rejectReason });
    setShowRejectModal(false);
    setRejectReason('');
  };

  const filteredApps = apps.filter(app => {
      if (filterStatus === 'all') return true;
      return app.status === filterStatus;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
       {/* Toolbar */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex gap-2 overflow-x-auto shrink-0 items-center">
          <button 
             onClick={loadApps}
             className="mr-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 active:scale-95 transition-all"
             title="Làm mới dữ liệu"
          >
             <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex items-center gap-2 mr-4 text-gray-500 font-bold text-sm uppercase tracking-wide">
             <Filter size={16} /> Bộ lọc:
          </div>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
             <button
               key={status}
               onClick={() => setFilterStatus(status)}
               className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                 filterStatus === status 
                 ? 'bg-gray-800 text-white shadow-md' 
                 : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
               }`}
             >
                {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs opacity-80">
                   {status === 'all' ? apps.length : apps.filter(a => a.status === status).length}
                </span>
             </button>
          ))}
       </div>

       <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* List Column */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {loading ? <div className="text-center p-4 text-gray-500">Đang tải dữ liệu...</div> : filteredApps.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Không có hồ sơ nào</div>
                ) : filteredApps.map(app => (
                   <button 
                     key={app.id}
                     onClick={() => setSelectedApp(app)}
                     className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                        selectedApp?.id === app.id 
                        ? 'bg-blue-50 border-blue-300 shadow-md z-10' 
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                     }`}
                   >
                      <div className="flex justify-between items-start mb-1">
                         <span className="font-bold text-gray-900 text-sm truncate pr-2">{app.fullName}</span>
                         {app.status === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0 mt-1.5"></span>}
                         {app.status === 'approved' && <Check size={14} className="text-green-500 shrink-0" />}
                         {app.status === 'rejected' && <X size={14} className="text-red-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-blue-600 font-medium mb-1 truncate">{app.specialty}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                         <Clock size={10} /> {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                   </button>
                ))}
             </div>
          </div>

          {/* Detail Column */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto relative">
             {selectedApp ? (
                <div className="space-y-6 animate-fade-in">
                   {/* Header Detail */}
                   <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100">
                      <div>
                         <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900">{selectedApp.fullName}</h2>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${
                               selectedApp.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                               selectedApp.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                               'bg-red-100 text-red-700 border-red-200'
                            }`}>
                               {selectedApp.status === 'pending' ? 'Chờ duyệt' : selectedApp.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                            </span>
                         </div>
                         <p className="text-gray-500 text-sm">Ứng tuyển vị trí: <strong className="text-blue-600">{selectedApp.specialty}</strong></p>
                      </div>

                      {selectedApp.status === 'pending' && (
                         <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => { setShowRejectModal(true); setRejectReason(''); }} 
                                className="flex-1 md:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                            >
                               <X size={18} /> Từ chối
                            </button>
                            <button 
                                onClick={handleApprove} 
                                className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                               <Check size={18} /> Duyệt hồ sơ
                            </button>
                         </div>
                      )}
                   </div>
                   
                   {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                       <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-700">
                           <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                           <div>
                               <p className="font-bold text-sm">Lý do từ chối:</p>
                               <p className="text-sm">{selectedApp.rejectionReason}</p>
                           </div>
                       </div>
                   )}

                   {/* Info Grid */}
                   <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 h-fit">
                         <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                             <FileText size={14} /> Thông tin cá nhân
                         </h4>
                         <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Số điện thoại</span>
                                <span className="font-medium text-gray-900">{selectedApp.phone}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500">Đơn vị công tác</span>
                                <span className="font-medium text-gray-900 text-right max-w-[60%]">{selectedApp.workplace}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ngày gửi</span>
                                <span className="font-medium text-gray-900">{new Date(selectedApp.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-200">
                         <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                             <ExternalLink size={14} /> Minh chứng chuyên môn
                         </h4>
                         {selectedApp.proofImages && selectedApp.proofImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {selectedApp.proofImages.map((img, idx) => (
                                    <div key={idx} className="group relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in" onClick={() => setPreviewImage(img)}>
                                        <img src={img} alt="Proof" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <p className="text-sm text-gray-400 italic">Không có tài liệu đính kèm</p>
                         )}
                      </div>
                   </div>
                </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                   <FileText size={64} className="mb-4 opacity-50" />
                   <p className="font-medium">Chọn một hồ sơ bên trái để xem chi tiết</p>
                </div>
             )}
          </div>
       </div>

       {/* Lightbox Modal */}
       {previewImage && (
           <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setPreviewImage(null)}>
               <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
                   <X size={24} />
               </button>
               <img src={previewImage} className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
           </div>
       )}

       {/* Rejection Modal */}
       {showRejectModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-pop-in">
                   <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                       <X className="text-red-500" /> Từ chối hồ sơ
                   </h3>
                   <p className="text-sm text-gray-600 mb-4">
                       Vui lòng nhập lý do từ chối để gửi phản hồi cho <strong>{selectedApp?.fullName}</strong>.
                   </p>
                   <textarea 
                       value={rejectReason}
                       onChange={(e) => setRejectReason(e.target.value)}
                       placeholder="Ví dụ: Hình ảnh bằng cấp bị mờ, thông tin không khớp..."
                       className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none resize-none mb-4 text-sm"
                       autoFocus
                   />
                   <div className="flex gap-3 justify-end">
                       <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Hủy</button>
                       <button 
                         onClick={handleRejectSubmit}
                         disabled={!rejectReason.trim()}
                         className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                       >
                           Xác nhận từ chối
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
