import React, { useEffect, useState } from 'react';
import { Report, toSlug } from '../../types';
import { fetchReports, resolveReport, deleteReportedContent } from '../../services/admin';
import { Flag, CheckCircle, XCircle, Trash2, ExternalLink, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
// @ts-ignore
import { Link } from 'react-router-dom';

export const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await fetchReports();
    setReports(data);
    setLoading(false);
  };

  const handleResolve = async (id: string) => {
    await resolveReport(id, 'resolved');
    loadReports();
  };

  const handleDismiss = async (id: string) => {
    await resolveReport(id, 'dismissed');
    loadReports();
  };

  const handleDeleteContent = async (report: Report) => {
    if(!confirm("Cảnh báo: Hành động này sẽ xóa nội dung bị báo cáo khỏi hệ thống. Tiếp tục?")) return;
    await deleteReportedContent(report);
    loadReports();
  };

  const filteredReports = reports.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'open') return r.status === 'open';
      if (filter === 'resolved') return r.status === 'resolved' || r.status === 'dismissed';
      return true;
  });

  return (
    <div className="space-y-6 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Flag className="text-red-500" /> Quản lý Báo cáo
             </h1>
             <p className="text-gray-500 text-sm mt-1">Xử lý các nội dung vi phạm tiêu chuẩn cộng đồng.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <button onClick={loadReports} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
             <div className="bg-gray-100 p-1 rounded-lg flex flex-1 md:flex-none">
                <button 
                    onClick={() => setFilter('open')} 
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'open' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                >
                    Chờ xử lý
                </button>
                <button 
                    onClick={() => setFilter('resolved')} 
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'resolved' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                >
                    Đã xử lý
                </button>
                <button 
                    onClick={() => setFilter('all')} 
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-md text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                    Tất cả
                </button>
             </div>
          </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
             <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" /> Đang tải báo cáo...
             </div>
          ) : filteredReports.length === 0 ? (
             <div className="p-10 text-center text-gray-400">
                Không có báo cáo nào ở trạng thái này.
             </div>
          ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                    <tr>
                        <th className="px-6 py-4">Đối tượng</th>
                        <th className="px-6 py-4">Lý do</th>
                        <th className="px-6 py-4">Người báo cáo</th>
                        <th className="px-6 py-4">Thời gian</th>
                        <th className="px-6 py-4 text-center">Trạng thái</th>
                        <th className="px-6 py-4 text-right">Hành động</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {filteredReports.map(report => (
                        <tr key={report.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${report.targetType === 'question' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {report.targetType === 'question' ? 'Câu hỏi' : 'Câu trả lời'}
                                </span>
                                <div className="mt-1 text-xs text-gray-400 font-mono">ID: {report.targetId}</div>
                                {report.targetType === 'question' && (
                                    <Link to={`/question/${toSlug("view-reported-content", report.targetId)}`} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                        Xem nội dung <ExternalLink size={10} />
                                    </Link>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-medium text-gray-900 text-sm">{report.reason}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">User ID: {report.reportedBy}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {report.status === 'open' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                                        <AlertTriangle size={12} /> Chờ xử lý
                                    </span>
                                ) : report.status === 'resolved' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-600">
                                        <CheckCircle size={12} /> Đã xử lý
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                        <XCircle size={12} /> Đã bỏ qua
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {report.status === 'open' && (
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => handleDismiss(report.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Bỏ qua báo cáo"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleResolve(report.id)}
                                            className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Đánh dấu đã xử lý"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteContent(report)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa nội dung vi phạm"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
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