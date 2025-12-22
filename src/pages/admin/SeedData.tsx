import React, { useState } from 'react';
import { Database, Trash2, Play, Terminal, Users, BookOpen } from 'lucide-react';

// Đảm bảo import đúng đường dẫn 2 file services bạn vừa cập nhật
import { generateFakeUsers, generateFakeContent, clearFakeData } from '../../services/seeder';
import { generateFakeBlogs, generateFakeDocuments, clearFakeBlogDocs } from '../../services/seedBlogDocs';

export const SeedData: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => {
    // Đẩy log mới lên đầu danh sách
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // --- NHÓM 1: CỘNG ĐỒNG (USER + QA) ---
  const handleSeedCommunity = async () => {
    if (!confirm("Hệ thống sẽ tạo ~20 User (ID thật) và ~50 Thảo luận y khoa. Tiếp tục?")) return;
    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Bắt đầu sinh dữ liệu Cộng đồng...");
    
    try {
      // Bước 1: Tạo User và lấy danh sách user vừa tạo
      // Hàm generateFakeUsers mới trả về danh sách user
      const users = await generateFakeUsers(20, addLog); 
      
      // Bước 2: Dùng user đó để tạo câu hỏi
      // Hàm generateFakeContent mới nhận vào: (users, số_câu_hỏi, số_trả_lời, log)
      await generateFakeContent(users, 5, 5, addLog); 
      
      addLog("🏁 HOÀN TẤT CỘNG ĐỒNG!");
    } catch (error: any) {
      addLog(`❌ Lỗi: ${error.message}`);
      console.error(error);
    } finally { 
      setIsRunning(false); 
    }
  };

  const handleClearCommunity = async () => {
    if (!confirm("Xóa sạch dữ liệu Cộng đồng ảo (dựa trên cờ isFake)?")) return;
    setIsRunning(true);
    try { 
      await clearFakeData(addLog); 
    } catch (error: any) {
      addLog(`❌ Lỗi: ${error.message}`);
    } finally { 
      setIsRunning(false); 
    }
  };

  // --- NHÓM 2: KIẾN THỨC (BLOG + DOCS) ---
  const handleSeedKnowledge = async () => {
    if (!confirm("Hệ thống sẽ tạo ~20 Blog chuẩn SEO và Tài liệu. Tiếp tục?")) return;
    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Bắt đầu sinh Blog & Docs...");
    
    try {
      // Hàm mới KHÔNG CẦN truyền users hay số lượng nữa (nó tự lấy trong DB)
      // Chỉ cần truyền hàm log
      await generateFakeBlogs(addLog);
      
      await generateFakeDocuments(addLog);
      
      addLog("🏁 HOÀN TẤT KIẾN THỨC!");
    } catch (error: any) {
      addLog(`❌ Lỗi: ${error.message}`);
      console.error(error);
    } finally { 
      setIsRunning(false); 
    }
  };

  const handleClearKnowledge = async () => {
    if (!confirm("Xóa sạch Blog & Docs ảo?")) return;
    setIsRunning(true);
    try { 
      await clearFakeBlogDocs(addLog); 
    } catch (error: any) {
      addLog(`❌ Lỗi: ${error.message}`);
    } finally { 
      setIsRunning(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><Database size={32} /></div>
          <div>
             <h1 className="text-2xl font-bold text-gray-800">Trình tạo dữ liệu mẫu (Deep Fake)</h1>
             <p className="text-gray-600 text-sm">Sinh dữ liệu y khoa chuẩn, avatar xịn, ID thật của Firestore.</p>
          </div>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
          {/* CỘNG ĐỒNG */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Users className="text-blue-500"/> Cộng đồng</h3>
              <p className="text-xs text-gray-500 mb-4">Tạo User giả, Câu hỏi, Bình luận, Like...</p>
              <div className="space-y-3">
                  <button onClick={handleSeedCommunity} disabled={isRunning} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all">
                      {isRunning ? "Đang xử lý..." : <><Play size={18}/> Sinh User & Hỏi đáp</>}
                  </button>
                  <button onClick={handleClearCommunity} disabled={isRunning} className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50 transition-all">
                      <Trash2 size={18}/> Dọn dẹp Cộng đồng
                  </button>
              </div>
          </div>

          {/* KIẾN THỨC */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><BookOpen className="text-green-500"/> Kiến thức</h3>
              <p className="text-xs text-gray-500 mb-4">Tạo bài Blog HTML chuẩn SEO, Tài liệu PDF...</p>
              <div className="space-y-3">
                  <button onClick={handleSeedKnowledge} disabled={isRunning} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all">
                      {isRunning ? "Đang xử lý..." : <><Play size={18}/> Sinh Blog & Tài liệu</>}
                  </button>
                  <button onClick={handleClearKnowledge} disabled={isRunning} className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 disabled:opacity-50 transition-all">
                      <Trash2 size={18}/> Dọn dẹp Kiến thức
                  </button>
              </div>
          </div>
       </div>

       {/* LOGS */}
       <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs md:text-sm text-gray-300 h-64 overflow-y-auto border border-gray-800 shadow-inner">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2 text-gray-400 font-bold">
             <Terminal size={16}/> System Logs
          </div>
          {logs.length === 0 ? (
             <span className="opacity-50 italic">Hệ thống sẵn sàng...</span>
          ) : (
             logs.map((log, i) => (
                <div key={i} className={`py-0.5 ${log.includes('❌') ? 'text-red-400 font-bold' : log.includes('✅') || log.includes('🏁') ? 'text-green-400' : ''}`}>
                   {log}
                </div>
             ))
          )}
       </div>
    </div>
  );
};
