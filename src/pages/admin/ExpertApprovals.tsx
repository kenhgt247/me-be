import React, { useEffect, useMemo, useState } from 'react';
import { ExpertApplication } from '../../types';
import {
  fetchExpertApplications,
  processExpertApplication,
  deleteExpertApplication,
  revokeExpertByAdmin,
  updateExpertSpecialtyFromApp,
} from '../../services/admin';

import {
  Check, X, FileText, Clock, ExternalLink, Filter,
  ZoomIn, AlertTriangle, RefreshCw, Loader2, UserCheck, UserX,
  Trash2, Pencil, Save
} from 'lucide-react';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export const ExpertApprovals: React.FC = () => {
  const [apps, setApps] = useState<ExpertApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ExpertApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Modal & Action States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit specialty
  const [isEditing, setIsEditing] = useState(false);
  const [editSpecialty, setEditSpecialty] = useState('');

  useEffect(() => {
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await fetchExpertApplications();
      setApps(data);
      // auto select first
      if (!selectedApp && data.length) setSelectedApp(data[0]);
    } catch (e) {
      console.error("Failed to load apps", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp || isProcessing) return;
    if (!confirm(`Bạn xác nhận DUYỆT hồ sơ của ${selectedApp.fullName}?`)) return;

    setIsProcessing(true);
    try {
      await processExpertApplication(
        selectedApp.id,
        selectedApp.userId,
        'approved',
        undefined,
        selectedApp.specialty
      );

      setApps(prev =>
        prev.map(a => a.id === selectedApp.id ? { ...a, status: 'approved' } : a)
      );
      setSelectedApp(prev => prev ? { ...prev, status: 'approved' } : prev);
    } catch (e) {
      alert("Lỗi khi duyệt hồ sơ!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedApp || !rejectReason.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await processExpertApplication(
        selectedApp.id,
        selectedApp.userId,
        'rejected',
        rejectReason
      );

      setApps(prev =>
        prev.map(a => a.id === selectedApp.id ? { ...a, status: 'rejected', rejectionReason: rejectReason } : a)
      );
      setSelectedApp(prev => prev ? { ...prev, status: 'rejected', rejectionReason: rejectReason } : prev);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (e) {
      alert("Lỗi khi từ chối hồ sơ!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedApp || isProcessing) return;
    if (!confirm(`Xoá hồ sơ ứng tuyển của ${selectedApp.fullName}? Thao tác này không thể hoàn tác.`)) return;

    setIsProcessing(true);
    try {
      await deleteExpertApplication(selectedApp.id);
      setApps(prev => prev.filter(a => a.id !== selectedApp.id));
      setSelectedApp(null);
      setIsEditing(false);
      setEditSpecialty('');
    } catch (e) {
      alert("Không xoá được hồ sơ!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeExpert = async () => {
    if (!selectedApp || isProcessing) return;
    if (!confirm(`GỠ QUYỀN chuyên gia của ${selectedApp.fullName}? (user sẽ mất isExpert)`)) return;

    setIsProcessing(true);
    try {
      await revokeExpertByAdmin({
        userId: selectedApp.userId,
        appId: selectedApp.id,
        reason: 'Admin gỡ quyền chuyên gia'
      });

      // Đồng bộ UI: chuyển về rejected (để đúng filter + nhìn thấy trạng thái)
      setApps(prev =>
        prev.map(a => a.id === selectedApp.id ? { ...a, status: 'rejected', rejectionReason: 'Admin gỡ quyền chuyên gia' } : a)
      );
      setSelectedApp(prev => prev ? { ...prev, status: 'rejected', rejectionReason: 'Admin gỡ quyền chuyên gia' } : prev);
    } catch (e) {
      alert("Không gỡ quyền được!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartEdit = () => {
    if (!selectedApp) return;
    setIsEditing(true);
    setEditSpecialty((selectedApp as any)?.approvedSpecialty || selectedApp.specialty || '');
  };

  const handleSaveEdit = async () => {
    if (!selectedApp || !editSpecialty.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await updateExpertSpecialtyFromApp({
        appId: selectedApp.id,
        userId: selectedApp.userId,
        specialty: editSpecialty.trim()
      });

      setApps(prev =>
        prev.map(a => a.id === selectedApp.id
          ? ({ ...a, specialty: editSpecialty.trim(), approvedSpecialty: editSpecialty.trim() } as any)
          : a
        )
      );
      setSelectedApp(prev => prev
        ? ({ ...prev, specialty: editSpecialty.trim(), approvedSpecialty: editSpecialty.trim() } as any)
        : prev
      );

      setIsEditing(false);
    } catch (e) {
      alert("Không lưu được chỉnh sửa!");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApps = useMemo(() => {
    return apps.filter(app => filterStatus === 'all' ? true : app.status === filterStatus);
  }, [apps, filterStatus]);

  const counts = useMemo(() => {
    return {
      all: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      approved: apps.filter(a => a.status === 'approved').length,
      rejected: apps.filter(a => a.status === 'rejected').length
    };
  }, [apps]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex gap-2 overflow-x-auto shrink-0 items-center">
        <button
          onClick={loadApps}
          disabled={loading}
          className="mr-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 active:scale-95 transition-all disabled:opacity-50"
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>

        <div className="flex items-center gap-2 mr-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
          <Filter size={14} /> Bộ lọc
        </div>

        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => { setFilterStatus(status); setSelectedApp(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all flex items-center gap-2 ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filterStatus === status ? 'bg-white/20' : 'bg-gray-100'}`}>
              {(counts as any)[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* List Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-sm text-gray-400">Đang tìm hồ sơ...</span>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200 mx-2">
                <p className="text-gray-400 text-sm font-medium">Không có hồ sơ nào</p>
              </div>
            ) : filteredApps.map(app => (
              <button
                key={app.id}
                onClick={() => { setSelectedApp(app); setIsEditing(false); setEditSpecialty(''); }}
                className={`w-full text-left p-4 rounded-xl border transition-all relative group ${
                  selectedApp?.id === app.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-bold text-sm ${selectedApp?.id === app.id ? 'text-blue-700' : 'text-gray-900'}`}>
                    {app.fullName}
                  </span>

                  <div className="flex items-center gap-2">
                    {app.status === 'pending' && (
                      <span className="flex h-2 w-2 relative mt-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                    )}
                    {app.status === 'approved' && <Check size={14} className="text-green-500 shrink-0" />}
                    {app.status === 'rejected' && <X size={14} className="text-red-500 shrink-0" />}
                  </div>
                </div>

                <p className="text-[11px] text-blue-600 font-bold mb-2 uppercase tracking-tight">
                  {(app as any)?.approvedSpecialty || app.specialty}
                </p>

                <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                  <Clock size={10} /> Gửi ngày {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto relative custom-scrollbar">
          {selectedApp ? (
            <div className="space-y-8 animate-fade-in">
              {/* Header Detail */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-2xl border border-blue-100">
                    {selectedApp.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedApp.fullName}</h2>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        selectedApp.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        selectedApp.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {selectedApp.status === 'pending' ? 'Chờ duyệt' : selectedApp.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                      </span>
                    </div>

                    <p className="text-gray-500 text-sm font-medium">
                      Chuyên môn:&nbsp;
                      <strong className="text-blue-600 font-bold">
                        {(selectedApp as any)?.approvedSpecialty || selectedApp.specialty}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {/* Xoá hồ sơ */}
                  <button
                    onClick={handleDeleteApp}
                    disabled={isProcessing}
                    className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    title="Xoá hồ sơ"
                  >
                    <Trash2 size={16} /> Xoá hồ sơ
                  </button>

                  {/* Sửa chuyên môn */}
                  <button
                    onClick={isEditing ? handleSaveEdit : handleStartEdit}
                    disabled={isProcessing}
                    className="px-4 py-2.5 bg-white border border-blue-100 text-blue-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    title="Sửa chuyên môn"
                  >
                    {isEditing ? <Save size={16} /> : <Pencil size={16} />}
                    {isEditing ? 'Lưu' : 'Sửa'}
                  </button>

                  {/* Pending: duyệt / từ chối */}
                  {selectedApp.status === 'pending' && (
                    <>
                      <button
                        onClick={() => { setShowRejectModal(true); setRejectReason(''); }}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-white border border-red-100 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        <UserX size={16} /> Từ chối
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-100 active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        Duyệt
                      </button>
                    </>
                  )}

                  {/* Approved: gỡ quyền */}
                  {selectedApp.status === 'approved' && (
                    <button
                      onClick={handleRevokeExpert}
                      disabled={isProcessing}
                      className="px-4 py-2.5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-100 active:scale-95 disabled:opacity-50"
                      title="Gỡ quyền chuyên gia"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                      Gỡ quyền
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit specialty */}
              {isEditing && (
                <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700 mb-2">Chỉnh sửa chuyên môn</p>
                  <div className="flex gap-2">
                    <input
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-blue-200 bg-white outline-none focus:ring-4 focus:ring-blue-100 font-bold text-gray-900"
                      placeholder="Ví dụ: Bác sĩ Nhi khoa"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editSpecialty.trim() || isProcessing}
                      className="px-5 rounded-xl bg-blue-600 text-white font-black active:scale-95 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              )}

              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-700 animate-slide-up">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-black text-xs uppercase tracking-wider mb-1">Lý do từ chối:</p>
                    <p className="text-sm font-medium leading-relaxed">{selectedApp.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <FileText size={12} /> Thông tin chi tiết
                    </h4>
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Số điện thoại</span>
                        <span className="font-bold text-gray-900">{selectedApp.phone}</span>
                      </div>
                      <div className="flex flex-col border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị công tác</span>
                        <span className="font-bold text-gray-900">{selectedApp.workplace}</span>
                      </div>
                      <div className="flex flex-col border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Thời gian gửi hồ sơ</span>
                        <span className="font-bold text-gray-900">{new Date(selectedApp.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <ExternalLink size={12} /> Bằng cấp & Minh chứng
                  </h4>
                  {selectedApp.proofImages && selectedApp.proofImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedApp.proofImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 cursor-zoom-in shadow-sm hover:shadow-md transition-all"
                          onClick={() => setPreviewImage(img)}
                        >
                          <img src={img} alt="Proof" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="bg-white/90 p-2 rounded-full transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
                              <ZoomIn size={20} className="text-blue-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                      <FileText size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Không có tài liệu</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-200 animate-pulse">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <UserCheck size={48} className="opacity-20" />
              </div>
              <p className="font-black text-xs uppercase tracking-[0.3em] text-gray-400">Vui lòng chọn một hồ sơ để kiểm duyệt</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-fade-in p-4" onClick={() => setPreviewImage(null)}>
          <div className="absolute top-6 right-6 flex gap-4">
            <a href={previewImage} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors" onClick={e => e.stopPropagation()}>
              <ExternalLink size={24} />
            </a>
            <button className="text-white/60 hover:text-white transition-colors">
              <X size={28} />
            </button>
          </div>
          <img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()} />
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-6">Nhấp vào vùng trống để thoát</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 p-safe-bottom">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-pop-in border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-100">
              <UserX size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Từ chối hồ sơ</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
              Hệ thống sẽ gửi thông báo từ chối kèm lý do cho <strong>{selectedApp?.fullName}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Hình ảnh bằng cấp bị mờ, thông tin không khớp thực tế..."
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-100 focus:border-red-500 focus:bg-white outline-none resize-none mb-6 text-sm font-medium transition-all"
              autoFocus
            />
            <div className="flex gap-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all">
                Quay lại
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || isProcessing}
                className="flex-[2] py-3.5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 shadow-xl shadow-red-100 disabled:opacity-50 active:scale-95 transition-all"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
