import React from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';

export const ExpertPromoBox: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary to-[#26A69A] p-6 text-white shadow-lg shadow-primary/20 dark:shadow-none animate-fade-in ${className}`}>
      
      {/* Background Decor (Vòng tròn mờ phía sau làm nền) */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      {/* Nội dung chính (Thêm pr-28 để chừa chỗ cho hình bác sĩ bên phải) */}
      <div className="relative z-10 flex flex-col items-start pr-20 md:pr-24">
        
        <div className="flex items-center gap-2 mb-2 bg-white/20 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm shadow-sm">
            <ShieldCheck size={14} className="text-white" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Đối tác chuyên môn</span>
        </div>
        
        <h3 className="text-xl font-black mb-2 leading-tight drop-shadow-md">Góc Chuyên Gia</h3>
        <p className="text-sm text-blue-50 font-medium mb-5 leading-relaxed opacity-95 text-shadow-sm">
           Bạn là Bác sĩ hay Giáo viên? Hãy tham gia để lan tỏa giá trị. Đăng ký để có quyền chia sẻ tài liệu và bài viết của chính mình.
        </p>
        
        <Link 
            to="/expert-register" 
            className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-blue-50 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md hover:shadow-lg"
        >
            <Sparkles size={16} /> Đăng ký ngay <ChevronRight size={16} />
        </Link>
      </div>
      
      {/* Hình bác sĩ to, rõ nét, nằm bên phải */}
      <div className="absolute bottom-0 right-2 z-0 pointer-events-none transform translate-y-1">
          {/* Tăng kích thước chữ (emoji) lên cực đại và bỏ các hiệu ứng làm mờ */}
          <span className="text-[5.5rem] md:text-[6.5rem] leading-none filter drop-shadow-xl">
            👨‍⚕️
          </span>
      </div>
    </div>
  );
};
