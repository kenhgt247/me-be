import React, { useState } from 'react';
import { Database, Trash2, Play, AlertTriangle, Terminal, FileText, BookOpen, Users } from 'lucide-react';
// Import các hàm sinh dữ liệu từ cả 2 file seeder
import { generateFakeUsers, generateFakeContent, clearFakeData } from '../../services/seeder';
import { generateFakeBlogs, generateFakeDocuments, clearFakeBlogDocs } from '../../services/seedBlogDocs';

export const SeedData: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // --- 1. SINH USER & HỎI ĐÁP ---
  const handleSeedQA = async () => {
    if (!confirm("CẢNH BÁO: Tạo ~50 User và ~100 Câu hỏi. Tiếp tục?")) return;
    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Bắt đầu sinh User & Hỏi đáp...");

    try {
      addLog("--- Bước 1: Tạo User giả (Chuyên gia & Thường) ---");
      const fakeUsers = await generateFakeUsers(50, addLog);
      
      addLog("--- Bước 2: Tạo Câu hỏi & Trả lời ---");
      await generateFakeContent(fakeUsers, 15, 20, addLog); // Tăng số lượng lên chút cho xôm

      addLog("🏁 HOÀN TẤT Q&A SEEDING!");
    } catch (error: any) {
      addLog(`❌ LỖI: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // --- 2. SINH BLOG & TÀI LIỆU (MỚI) ---
  const handleSeedBlogDocs = async () => {
    if (!confirm("CẢNH BÁO: Tạo ~20 Blog và ~20 Tài liệu từ Chuyên gia. Tiếp tục?")) return;
    setIsRunning(true);
    setLogs([]); // Xóa log cũ cho gọn
    addLog("🚀 Bắt đầu sinh Blog & Tài liệu...");

    try {
      // Vì hàm tạo Blog cần danh sách User (để lấy Expert làm tác giả), ta cần lấy lại User giả từ DB
      // Tuy nhiên, để đơn giản và nhanh, ta sẽ gọi hàm generateFakeUsers với số lượng 0 để nó trả về list user có sẵn (nếu logic hàm đó hỗ trợ)
      // HOẶC: Cách tốt nhất là ta tạo một hàm helper nhỏ để fetch user giả về.
      // Ở đây tôi sẽ dùng cách: Tạo lại 1 nhóm nhỏ Expert nếu chưa có, hoặc dùng hàm generateFakeUsers nhưng chỉ lấy danh sách trả về.
      
      addLog("⏳ Đang lấy danh sách Chuyên gia...");
      const fakeUsers = await generateFakeUsers(5, addLog); // Tạo thêm hoặc lấy đè (Firebase sẽ merge nếu ID trùng)
      
      addLog("--- Bước 1: Viết Blog chuyên sâu ---");
      await generateFakeBlogs(fakeUsers, 20, addLog);

      addLog("--- Bước 2: Upload Tài liệu/Ebook ---");
      await generateFakeDocuments(fakeUsers, 20, addLog);

      addLog("🏁 HOÀN TẤT BLOG & DOCS SEEDING!");
    } catch (error: any) {
      addLog(`❌ LỖI: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // --- XÓA DỮ LIỆU ---
  const handleClearQA = async () => {
    if (!confirm("Xóa hết User và Câu hỏi giả?")) return;
    setIsRunning(true);
    try { await clearFakeData(addLog); } catch(e:any) { addLog(`❌ ${e.message}`); } finally { setIsRunning(false); }
  };

  const handleClearBlogDocs = async () => {
    if (!confirm("Xóa hết Blog và Tài liệu giả?")) return;
    setIsRunning(true);
    try { await clearFakeBlogDocs(addLog); } catch(e:any) { addLog(`❌ ${e.message}`); } finally { setIsRunning(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
       
       {/* HEADER */}
       <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border flex items-start gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
             <Database size={32} />
          </div>
          <div>
             <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Công cụ Sinh Dữ liệu Giả (Seeder)</h1>
             <p className="text-gray-500 dark:text-gray-400 mt-1">
                Tạo nhanh nội dung chuẩn SEO, Y khoa để demo cho Asking.vn. <br/>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Lưu ý: Chỉ chạy trên môi trường Test.</span>
             </p>
          </div>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
          
          {/* CỘT 1: CỘNG ĐỒNG (USER + HỎI ĐÁP) */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                  <Users className="text-blue-500"/> Cộng đồng & Hỏi đáp
              </h3>
              <p className="text-sm text-gray-500">Tạo 50+ User, Chuyên gia và hàng trăm câu hỏi thảo luận sôi nổi.</p>
              
              <div className="flex flex-col gap-3">
                  <button onClick={handleSeedQA} disabled={isRunning} className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                      {isRunning ? <span className="animate-spin">⏳</span> : <Play size={18} />} Sinh Dữ liệu Cộng đồng
                  </button>
                  <button onClick={handleClearQA} disabled={isRunning} className="flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all disabled:opacity-50">
                      <Trash2 size={18} /> Xóa Dữ liệu Cộng đồng
                  </button>
              </div>
          </div>

          {/* CỘT 2: NỘI DUNG (BLOG + TÀI LIỆU) */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                  <BookOpen className="text-green-500"/> Kiến thức (Blog & Docs)
              </h3>
              <p className="text-sm text-gray-500">Tạo Blog chuyên sâu và Tài liệu Ebook do Chuyên gia chia sẻ.</p>
              
              <div className="flex flex-col gap-3">
                  <button onClick={handleSeedBlogDocs} disabled={isRunning} className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50">
                      {isRunning ? <span className="animate-spin">⏳</span> : <FileText size={18} />} Sinh Blog & Tài liệu
                  </button>
                  <button onClick={handleClearBlogDocs} disabled={isRunning} className="flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all disabled:opacity-50">
                      <Trash2 size={18} /> Xóa Blog & Tài liệu
                  </button>
              </div>
          </div>

       </div>

       {/* LOGS CONSOLE */}
       <div className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800 font-mono text-xs md:text-sm h-[300px] flex flex-col">
          <div className="flex items-center gap-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
             <Terminal size={16} />
             <span>System Logs</span>
             {isRunning && <span className="ml-auto flex items-center gap-2 text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Processing...</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
             {logs.length === 0 ? (
                <span className="text-gray-600 italic">Ready to seed...</span>
             ) : (
                logs.map((log, idx) => (
                   <div key={idx} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('✨') || log.includes('🏁') ? 'text-green-400' : log.includes('---') ? 'text-yellow-400 font-bold mt-2' : 'text-gray-300'}`}>
                      {log}
                   </div>
                ))
             )}
          </div>
       </div>
    </div>
  );
};
