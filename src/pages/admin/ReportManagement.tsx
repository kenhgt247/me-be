import React, { useEffect, useState } from 'react';
import { Report, toSlug } from '../../types';
import { fetchReports, resolveReport, deleteReportedContent } from '../../services/admin';
import { Flag, CheckCircle, XCircle, Trash2, ExternalLink, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setProcessingId(id);
    try {
      await resolveReport(id, 'resolved');
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (error) {
      alert("Lỗi khi xử lý báo cáo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setProcessingId(id);
    try {
      await resolveReport(id, 'dismissed');
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' } : r));
    } catch (error) {
      alert("Lỗi khi bỏ qua báo cáo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteContent = async (report: Report) => {
    if (!confirm("Cảnh báo: Hành động này sẽ xóa vĩnh viễn nội dung bị báo cáo. Tiếp tục?")) return;
    setProcessingId(report.id);
    try {
      await deleteReportedContent(report);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
      alert("Đã xóa nội dung vi phạm thành công.");
    } catch (error) {
      alert("Lỗi khi xóa nội dung.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'open') return r.status === 'open' || r.status === 'pending';
    if (filter === 'resolved') return r.status === 'resolved' || r.status === 'dismissed';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="text-red-500" /> Quản lý Báo cáo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Xử lý các nội dung vi phạm tiêu chuẩn cộng đồng.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={loadReports} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="bg-gray-100 p-1 rounded-lg flex flex-1 md:flex-none">
            {['open', 'resolved', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {f === 'open' ? 'Chờ xử lý' : f === 'resolved' ? 'Đã xử lý' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-gray-400 font-medium">Đang tải danh sách báo cáo...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            Không có báo cáo nào ở trạng thái này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                  <th className="px-6 py-4">Đối tượng</th>
                  <th className="px-6 py-4">Lý do</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        report.targetType === 'question' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {report.targetType === 'question' ? 'Câu hỏi' : 'Câu trả lời'}
                      </span>
                      <div className="mt-1 text-xs text-gray-400 font-mono">ID: {report.targetId}</div>
                      {report.targetType === 'question' && (
                        <Link 
                          to={`/question/${toSlug("view", report.targetId)}`} 
                          target="_blank" 
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 font-bold"
                        >
                          Xem nội dung <ExternalLink size={10} />
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{report.reason}</p>
                      {report.description && <p className="text-xs text-gray-500 italic mt-1">"{report.description}"</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {report.status === 'open' || report.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600 uppercase">
                          <AlertTriangle size={10} /> Chờ xử lý
                        </span>
                      ) : report.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-600 uppercase">
                          <CheckCircle size={10} /> Đã xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600 uppercase">
                          <XCircle size={10} /> Bỏ qua
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(report.status === 'open' || report.status === 'pending') && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            disabled={!!processingId}
                            onClick={() => handleDismiss(report.id)} 
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="Bỏ qua"
                          >
                            <XCircle size={18} />
                          </button>
                          <button 
                            disabled={!!processingId}
                            onClick={() => handleResolve(report.id)} 
                            className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                            title="Xác nhận xong"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            disabled={!!processingId}
                            onClick={() => handleDeleteContent(report)} 
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="Xóa nội dung vi phạm"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                      {processingId === report.id && <Loader2 className="animate-spin text-blue-500 inline" size={18} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
