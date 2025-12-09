
import React, { useState } from 'react';
import { Database, Trash2, Play, AlertTriangle, Terminal } from 'lucide-react';
import { generateFakeUsers, generateFakeContent, clearFakeData } from '../../services/seeder';

export const SeedData: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    // Scroll to bottom logic can be handled by ref if needed, but flex-col-reverse works too
  };

  const handleSeed = async () => {
    if (!confirm("CẢNH BÁO: Bạn sắp tạo một lượng lớn dữ liệu giả. Hành động này sẽ ghi vào Database. Tiếp tục?")) return;
    
    setIsRunning(true);
    setLogs([]);
    addLog("🚀 Bắt đầu quá trình sinh dữ liệu...");

    try {
      // 1. Users
      addLog("--- Bước 1: Tạo User giả ---");
      const fakeUsers = await generateFakeUsers(50, addLog);
      
      // 2. Content
      addLog("--- Bước 2: Tạo Nội dung (Câu hỏi & Trả lời) ---");
      // 50 users, 10 questions per category (8 cats = 80 total), ~15 answers each
      await generateFakeContent(fakeUsers, 10, 15, addLog);

      addLog("🏁 QUÁ TRÌNH HOÀN TẤT THÀNH CÔNG!");
    } catch (error: any) {
      console.error(error);
      addLog(`❌ LỖI: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("NGUY HIỂM: Bạn chắc chắn muốn xóa TOÀN BỘ dữ liệu có cờ 'isFake'? Dữ liệu thật sẽ không bị ảnh hưởng.")) return;
    
    setIsRunning(true);
    setLogs([]);
    addLog("🧹 Bắt đầu dọn dẹp...");
    
    try {
        await clearFakeData(addLog);
    } catch (error: any) {
        addLog(`❌ LỖI: ${error.message}`);
    } finally {
        setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-start gap-4 mb-6">
             <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Database size={32} />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">Sinh dữ liệu mẫu (Seed Data)</h1>
                <p className="text-gray-500 mt-1">
                   Công cụ này giúp tạo nhanh Users, Câu hỏi, Câu trả lời giả để kiểm thử giao diện.
                   Dữ liệu sinh ra sẽ có cờ <code>isFake: true</code>.
                </p>
             </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
             <div className="flex items-center gap-2 text-yellow-800 font-bold mb-1">
                <AlertTriangle size={18} />
                Lưu ý quan trọng
             </div>
             <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                <li>Chỉ sử dụng trên môi trường Dev hoặc Project Demo.</li>
                <li>Quá trình có thể mất 1-2 phút tùy thuộc vào mạng.</li>
                <li>Không tắt trình duyệt khi đang chạy.</li>
             </ul>
          </div>

          <div className="flex flex-wrap gap-4">
             <button 
                onClick={handleSeed}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isRunning ? <span className="animate-spin">⏳</span> : <Play size={20} />}
                Bắt đầu sinh Data (50 User, ~80 Bài viết)
             </button>

             <button 
                onClick={handleClear}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
             >
                <Trash2 size={20} />
                Xóa toàn bộ Data giả
             </button>
          </div>
       </div>

       {/* Logs Console */}
       <div className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800 font-mono text-sm h-[400px] flex flex-col">
          <div className="flex items-center gap-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
             <Terminal size={16} />
             <span>System Logs</span>
             {isRunning && <span className="ml-auto flex items-center gap-2 text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Running...</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
             {logs.length === 0 ? (
                <span className="text-gray-600 italic">Waiting for command...</span>
             ) : (
                logs.map((log, idx) => (
                   <div key={idx} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('✨') ? 'text-green-400' : 'text-gray-300'}`}>
                      {log}
                   </div>
                ))
             )}
             {/* Dummy div to scroll into view could go here */}
          </div>
       </div>
    </div>
  );
};
