import React, { useEffect, useState } from 'react';
import { 
  Users, FileQuestion, GraduationCap, FileText, 
  BookOpen, TrendingUp, Activity, ArrowUpRight, Loader2 
} from 'lucide-react';
import { getSystemStats } from '../../services/stats';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExperts: 0,
    totalQuestions: 0,
    totalBlogs: 0,
    totalDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Gọi hàm từ admin service
        const systemStats = await getSystemStats();
        
        // Cập nhật state từ kết quả trả về
        setStats({
          totalUsers: systemStats.totalUsers,
          totalExperts: 0, // Logic đếm chuyên gia có thể thêm sau nếu cần query riêng
          totalQuestions: systemStats.totalQuestions,
          totalBlogs: systemStats.totalBlogs,
          totalDocuments: systemStats.totalDocuments,
        });
      } catch (error) {
        console.error("Lỗi tải dữ liệu dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-gray-400">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Đang thống kê hệ thống...</p>
      </div>
    );
  }

  // Danh sách các thẻ thống kê
  const statCards = [
    { title: 'Người dùng', count: stats.totalUsers, icon: <Users size={24} className="text-blue-600" />, bg: 'bg-blue-50' },
    { title: 'Câu hỏi', count: stats.totalQuestions, icon: <FileQuestion size={24} className="text-orange-600" />, bg: 'bg-orange-50' },
    { title: 'Bài viết Blog', count: stats.totalBlogs, icon: <BookOpen size={24} className="text-purple-600" />, bg: 'bg-purple-50' },
    { title: 'Tài liệu', count: stats.totalDocuments, icon: <FileText size={24} className="text-pink-600" />, bg: 'bg-pink-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Báo cáo dữ liệu thời gian thực từ Cloud Firestore.</p>
        </div>
        <div className="bg-white px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold text-gray-400 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-4 rounded-2xl ${item.bg} group-hover:scale-110 transition-transform`}>{item.icon}</div>
              <div className="bg-green-50 p-1 rounded-lg">
                <TrendingUp size={14} className="text-green-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">{item.title}</p>
              <h3 className="text-3xl font-black text-gray-900">{item.count.toLocaleString()}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
          <h3 className="font-black text-lg text-gray-800 flex items-center gap-2 mb-8 uppercase tracking-tight">
            <Activity size={20} className="text-blue-500" /> Hoạt động hệ thống
          </h3>
          <div className="space-y-8 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
             <div className="flex items-start gap-6 relative">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-green-500 ring-4 ring-green-50 shrink-0 z-10" />
                <div className="flex-1">
                   <p className="text-sm text-gray-800 font-bold">Hệ thống đồng bộ dữ liệu thành công.</p>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Trạng thái: Healthy</p>
                </div>
             </div>
             <div className="flex items-start gap-6 relative">
                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-blue-500 ring-4 ring-blue-50 shrink-0 z-10" />
                <div className="flex-1">
                   <p className="text-sm text-gray-800 font-bold">Cập nhật logic phân trang hoàn tất.</p>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">1 giờ trước</p>
                </div>
             </div>
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-gray-900 rounded-[2rem] shadow-2xl p-8 text-white relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
          <h3 className="font-black text-xl mb-2 relative z-10">Tình trạng Server</h3>
          <p className="text-gray-400 text-xs font-medium mb-8 relative z-10 leading-relaxed uppercase tracking-wider">Mọi dịch vụ Google Cloud & Vercel đang vận hành tốt.</p>
          
          <div className="space-y-6 relative z-10">
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>Độ trễ (Latency)</span>
                  <span className="text-green-400">24ms</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-400 h-full rounded-full transition-all duration-1000" style={{ width: '15%' }}></div>
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>Database Load</span>
                  <span className="text-blue-400">Optimal</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: '8%' }}></div>
                </div>
             </div>
          </div>

          <button className="mt-12 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group-hover:border-blue-500/50">
            Xem báo cáo chi tiết <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
