
import React, { useEffect, useState } from 'react';
import { ExpertApplication } from '../../types';
import { fetchExpertApplications, processExpertApplication } from '../../services/admin';
import { Check, X, FileText, Clock, ExternalLink } from 'lucide-react';

export const ExpertApprovals: React.FC = () => {
  const [apps, setApps] = useState<ExpertApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ExpertApplication | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    const data = await fetchExpertApplications();
    setApps(data);
    setLoading(false);
  };

  const handleProcess = async (status: 'approved' | 'rejected') => {
    if (!selectedApp) return;
    if (!confirm(`Bạn xác nhận ${status === 'approved' ? 'DUYỆT' : 'TỪ CHỐI'} hồ sơ này?`)) return;

    await processExpertApplication(
        selectedApp.id, 
        selectedApp.userId, 
        status, 
        status === 'rejected' ? 'Hồ sơ không đủ điều kiện' : undefined,
        selectedApp.specialty
    );
    setSelectedApp(null);
    loadApps();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
       {/* List Column */}
       <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200">
             <h3 className="font-bold text-gray-800">Danh sách đăng ký ({apps.filter(a => a.status === 'pending').length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {loading ? <div className="text-center p-4 text-gray-500">Đang tải...</div> : apps.map(app => (
                <button 
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                     selectedApp?.id === app.id 
                     ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                     : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-900 text-sm truncate">{app.fullName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                         {app.status}
                      </span>
                   </div>
                   <p className="text-xs text-gray-500 mb-1">{app.specialty}</p>
                   <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                   </p>
                </button>
             ))}
          </div>
       </div>

       {/* Detail Column */}
       <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
          {selectedApp ? (
             <div className="space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedApp.fullName}</h2>
                      <p className="text-gray-500 text-sm">Ứng tuyển: <strong className="text-blue-600">{selectedApp.specialty}</strong></p>
                   </div>
                   {selectedApp.status === 'pending' && (
                      <div className="flex gap-2">
                         <button onClick={() => handleProcess('rejected')} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
                            <X size={18} /> Từ chối
                         </button>
                         <button onClick={() => handleProcess('approved')} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-200">
                            <Check size={18} /> Duyệt hồ sơ
                         </button>
                      </div>
                   )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Thông tin cá nhân</h4>
                      <div className="space-y-2 text-sm">
                         <p><span className="text-gray-500 w-24 inline-block">SĐT:</span> <strong>{selectedApp.phone}</strong></p>
                         <p><span className="text-gray-500 w-24 inline-block">Đơn vị:</span> <strong>{selectedApp.workplace}</strong></p>
                      </div>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Minh chứng</h4>
                      <div className="space-y-2">
                         {selectedApp.proofImages && selectedApp.proofImages.map((img, idx) => (
                            <a 
                              key={idx} 
                              href={img} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 bg-white rounded-lg border border-gray-200"
                            >
                               <FileText size={16} /> Tài liệu đính kèm {idx + 1} <ExternalLink size={12} />
                            </a>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <FileText size={48} className="mb-4 opacity-50" />
                <p>Chọn một hồ sơ để xem chi tiết</p>
             </div>
          )}
       </div>
    </div>
  );
};
