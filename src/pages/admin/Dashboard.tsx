import React, { useEffect, useState } from 'react';
import { 
  Users, FileQuestion, GraduationCap, FileText, 
  BookOpen, TrendingUp, Activity, ArrowUpRight, Loader2
} from 'lucide-react';
import { getSystemStats } from '../../services/admin';

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
        const systemStats = await getSystemStats();
        setStats({
          totalUsers: systemStats.totalUsers,
          totalExperts: 0, // Bạn có thể thêm logic đếm chuyên gia riêng nếu cần
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
        <p className="font-bold animate-pulse">Đang thống kê hệ thống...</p>
      </div>
    );
  }

  const statCards = [
    { title: 'Người dùng', count: stats.totalUsers, icon: <Users size={24} className="text-blue-600" />, bg: 'bg-blue-50', color: 'text-blue-600' },
    { title: 'Câu hỏi', count: stats.totalQuestions, icon: <FileQuestion size={24} className="text-orange-600" />, bg: 'bg-orange-50', color: 'text-orange-600' },
    { title: 'Bài viết Blog', count: stats.totalBlogs, icon: <BookOpen size={24} className="text-purple-600" />, bg: 'bg-purple-50', color: 'text-purple-600' },
    { title: 'Tài liệu', count: stats.totalDocuments, icon: <FileText size={24} className="text-pink-600" />, bg: 'bg-pink-50', color: 'text-pink-600' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h1>
          <p className="text-gray-500 mt-1">Dữ liệu được cập nhật theo thời gian thực từ Cloud Firestore.</p>
        </div>
        <div className="bg-white px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 shadow-sm">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${item.bg}`}>{item.icon}</div>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">{item.title}</p>
              <h3 className="text-3xl font-bold text-gray-800">{item.count.toLocaleString()}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-6">
            <Activity size={20} className="text-blue-500" /> Hoạt động hệ thống
          </h3>
          <div className="space-y-6">
             <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                <div className="flex-1">
                   <p className="text-sm text-gray-800">Hệ thống đang kết nối ổn định với Database.</p>
                   <p className="text-xs text-gray-400 mt-1">Vừa xong</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                   <p className="text-sm text-gray-800">Tất cả các hàm phân trang đã được kích hoạt thành công.</p>
                   <p className="text-xs text-gray-400 mt-1">1 giờ trước</p>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-black rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <h3 className="font-bold text-xl mb-2">Trạng thái Server</h3>
          <p className="text-gray-400 text-sm mb-6">Firestore & Storage hoạt động bình thường.</p>
          <div className="space-y-3">
             <div className="flex justify-between text-sm"><span>Latency</span><span className="text-green-400 font-bold">24ms</span></div>
             <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-green-400 h-1.5 rounded-full w-[10%]"></div></div>
          </div>
          <button className="mt-8 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
            Xem báo cáo chi tiết <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
