import React, { useEffect, useState } from 'react';
import { 
  Users, FileQuestion, GraduationCap, FileText, 
  BookOpen, TrendingUp, Activity, ArrowUpRight 
} from 'lucide-react';
import { 
  fetchAllUsers, 
  fetchAllQuestionsAdmin, 
  fetchAllBlogs, 
  fetchAllDocuments 
} from '../services/admin'; // Đảm bảo đường dẫn import đúng file admin.ts của bạn

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExperts: 0,
    totalQuestions: 0,
    totalBlogs: 0,
    totalDocuments: 0,
    newUsersToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Gọi song song tất cả các API để tiết kiệm thời gian
        const [users, questions, blogs, documents] = await Promise.all([
          fetchAllUsers(),
          fetchAllQuestionsAdmin(),
          fetchAllBlogs(),
          fetchAllDocuments()
        ]);

        // Tính toán số liệu
        const experts = users.filter(u => u.isExpert).length;
        
        // Tính user mới trong ngày (Demo logic)
        const today = new Date().toDateString();
        const newUsers = users.filter(u => 
          u.joinedAt && new Date(u.joinedAt).toDateString() === today
        ).length;

        setStats({
          totalUsers: users.length,
          totalExperts: experts,
          totalQuestions: questions.length,
          totalBlogs: blogs.length,
          totalDocuments: documents.length,
          newUsersToday: newUsers
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Cấu hình danh sách thẻ hiển thị
  const statCards = [
    {
      title: 'Người dùng',
      count: stats.totalUsers,
      icon: <Users size={24} className="text-blue-600" />,
      bg: 'bg-blue-50',
      trend: `+${stats.newUsersToday} hôm nay`,
      color: 'text-blue-600'
    },
    {
      title: 'Chuyên gia',
      count: stats.totalExperts,
      icon: <GraduationCap size={24} className="text-green-600" />,
      bg: 'bg-green-50',
      trend: 'Đã xác thực',
      color: 'text-green-600'
    },
    {
      title: 'Câu hỏi',
      count: stats.totalQuestions,
      icon: <FileQuestion size={24} className="text-orange-600" />,
      bg: 'bg-orange-50',
      trend: 'Đang hoạt động',
      color: 'text-orange-600'
    },
    {
      title: 'Bài viết Blog',
      count: stats.totalBlogs,
      icon: <BookOpen size={24} className="text-purple-600" />,
      bg: 'bg-purple-50',
      trend: 'Kiến thức',
      color: 'text-purple-600'
    },
    {
      title: 'Tài liệu',
      count: stats.totalDocuments,
      icon: <FileText size={24} className="text-pink-600" />,
      bg: 'bg-pink-50',
      trend: 'Thư viện',
      color: 'text-pink-600'
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h1>
          <p className="text-gray-500 mt-1">Chào mừng quay trở lại, đây là báo cáo ngày hôm nay.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 shadow-sm">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((item, index) => (
          <div 
            key={index} 
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${item.bg}`}>
                {item.icon}
              </div>
              {index === 0 && (
                <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <TrendingUp size={12} className="mr-1" /> Tăng trưởng
                </span>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">{item.title}</p>
              <h3 className="text-3xl font-bold text-gray-800">{item.count.toLocaleString()}</h3>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs">
              <span className={`font-semibold ${item.color} flex items-center`}>
                {item.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Section: Activity & Quick Actions (Demo UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <Activity size={20} className="text-blue-500" /> Hoạt động gần đây
            </h3>
            <button className="text-sm text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          
          <div className="space-y-6">
            {/* Mock Data Items - Bạn có thể thay thế bằng dữ liệu thật */}
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">
                    Hệ thống vừa ghi nhận thêm {stats.newUsersToday > 0 ? stats.newUsersToday : 5} người dùng mới.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">2 giờ trước</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 font-medium">
                     Có {stats.totalQuestions > 5 ? 5 : stats.totalQuestions} câu hỏi mới cần được duyệt.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">5 giờ trước</p>
                </div>
              </div>
          </div>
        </div>

        {/* Quick Tips / Status Panel */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={100} />
          </div>
          <h3 className="font-bold text-xl mb-2 relative z-10">Trạng thái hệ thống</h3>
          <p className="text-blue-100 text-sm mb-6 relative z-10">
            Hệ thống đang hoạt động ổn định. Chưa phát hiện báo cáo vi phạm nghiêm trọng nào trong 24h qua.
          </p>
          
          <div className="space-y-3 relative z-10">
             <div className="flex justify-between text-sm">
                <span className="text-blue-200">Server Load</span>
                <span className="font-bold">12%</span>
             </div>
             <div className="w-full bg-blue-900/30 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: '12%' }}></div>
             </div>
             
             <div className="flex justify-between text-sm mt-2">
                <span className="text-blue-200">Database</span>
                <span className="font-bold">Good</span>
             </div>
          </div>

          <button className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            Kiểm tra chi tiết <ArrowUpRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
