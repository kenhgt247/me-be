import React from 'react';
import { ArrowLeft, Mail, MapPin, Phone, Shield, Users, FileText, Heart, HelpCircle } from 'lucide-react';

import { useNavigate, Link } from 'react-router-dom';

const PageContainer: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const navigate = useNavigate();
  
  return (
    // THAY ĐỔI: bg-white -> dark:bg-dark-card, border-gray-100 -> dark:border-dark-border
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center text-textGray dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={20} className="mr-1" /> Quay lại
      </button>
      
      <div className="bg-white dark:bg-dark-card rounded-[2rem] shadow-sm dark:shadow-none border border-gray-100 dark:border-dark-border p-6 md:p-10 transition-colors">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 dark:border-slate-700 pb-6">
          <div className="w-12 h-12 rounded-full bg-secondary/30 dark:bg-secondary/20 flex items-center justify-center text-primary">
            {icon}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-textDark dark:text-white">{title}</h1>
        </div>
        
        {/* THAY ĐỔI: Thêm các class dark:... để xử lý văn bản */}
        <div className="prose prose-lg text-textDark/80 dark:text-gray-300 max-w-none 
            prose-headings:text-primary dark:prose-headings:text-white 
            prose-a:text-primary dark:prose-a:text-blue-400 hover:prose-a:text-accent 
            prose-strong:text-textDark dark:prose-strong:text-white
            prose-li:marker:text-gray-400">
          {children}
        </div>
      </div>
    </div>
  );
};

export const About: React.FC = () => (
  <PageContainer title="Về Asking.vn" icon={<Users size={24} />}>
    <h3>Sứ mệnh của chúng tôi</h3>
    <p>
      <strong>Asking.vn</strong> ra đời với sứ mệnh trở thành người bạn đồng hành tin cậy nhất của hàng triệu bà mẹ Việt Nam. 
      Chúng tôi hiểu rằng, làm mẹ là một hành trình tuyệt vời nhưng cũng đầy rẫy những lo âu, thắc mắc, đặc biệt là trong những năm tháng đầu đời của con.
    </p>
    <p>
      Tại đây, chúng tôi kết nối cộng đồng các mẹ bỉm sữa thông thái cùng đội ngũ chuyên gia, bác sĩ uy tín để mang đến những kiến thức khoa học, 
      cập nhật và phù hợp nhất với văn hóa Việt Nam.
    </p>
    
    <h3>Giá trị cốt lõi</h3>
    <div className="grid md:grid-cols-3 gap-6 my-8 not-prose">
      <div className="bg-cream dark:bg-slate-800 p-6 rounded-2xl text-center border border-transparent dark:border-slate-700">
        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🤝</div>
        <h4 className="font-bold text-textDark dark:text-white mb-2">Tin cậy</h4>
        <p className="text-sm text-textGray dark:text-gray-400">Thông tin được kiểm chứng bởi chuyên gia và cộng đồng.</p>
      </div>
      <div className="bg-cream dark:bg-slate-800 p-6 rounded-2xl text-center border border-transparent dark:border-slate-700">
        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">❤️</div>
        <h4 className="font-bold text-textDark dark:text-white mb-2">Thấu hiểu</h4>
        <p className="text-sm text-textGray dark:text-gray-400">Luôn lắng nghe và chia sẻ với tâm thế của một người mẹ.</p>
      </div>
      <div className="bg-cream dark:bg-slate-800 p-6 rounded-2xl text-center border border-transparent dark:border-slate-700">
        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🌱</div>
        <h4 className="font-bold text-textDark dark:text-white mb-2">Đồng hành</h4>
        <p className="text-sm text-textGray dark:text-gray-400">Cùng con khôn lớn mỗi ngày qua từng giai đoạn phát triển.</p>
      </div>
    </div>
  </PageContainer>
);

export const Terms: React.FC = () => (
  <PageContainer title="Điều khoản sử dụng" icon={<FileText size={24} />}>
    <p>Chào mừng bạn đến với Asking.vn. Khi sử dụng nền tảng này, bạn đồng ý với các điều khoản sau:</p>
    
    <h4>1. Tài khoản người dùng</h4>
    <p>Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình. Mọi hoạt động dưới tên tài khoản của bạn sẽ do bạn chịu trách nhiệm hoàn toàn.</p>
    
    <h4>2. Nội dung chia sẻ</h4>
    <p>
      Asking.vn khuyến khích chia sẻ kiến thức và kinh nghiệm. Tuy nhiên, nghiêm cấm:
    </p>
    <ul>
      <li>Nội dung kích động, thù địch, vi phạm thuần phong mỹ tục.</li>
      <li>Spam quảng cáo, bán hàng đa cấp trái phép.</li>
      <li>Thông tin y tế sai lệch gây nguy hại đến sức khỏe.</li>
    </ul>

    <h4>3. Miễn trừ trách nhiệm</h4>
    <p>
      Các thông tin trên Asking.vn chỉ mang tính chất tham khảo. 
      <strong>Chúng tôi không thay thế cho lời khuyên của bác sĩ chuyên khoa.</strong> 
      Trong trường hợp khẩn cấp về sức khỏe, vui lòng đến cơ sở y tế gần nhất.
    </p>
  </PageContainer>
);

export const Privacy: React.FC = () => (
  <PageContainer title="Chính sách bảo mật" icon={<Shield size={24} />}>
    <p>Asking.vn cam kết bảo vệ sự riêng tư của bạn. Chính sách này giải thích cách chúng tôi thu thập và sử dụng dữ liệu.</p>
    
    <h4>1. Dữ liệu chúng tôi thu thập</h4>
    <ul>
      <li>Thông tin cơ bản: Tên hiển thị, email (để đăng nhập).</li>
      <li>Nội dung bạn tạo: Câu hỏi, câu trả lời, bình luận.</li>
      <li>Dữ liệu ẩn danh: Thống kê truy cập để cải thiện trải nghiệm người dùng.</li>
    </ul>

    <h4>2. Sử dụng dữ liệu</h4>
    <p>Chúng tôi sử dụng dữ liệu để:</p>
    <ul>
      <li>Cá nhân hóa nội dung phù hợp với độ tuổi của bé nhà bạn.</li>
      <li>Gợi ý các chủ đề bạn quan tâm.</li>
      <li>Bảo vệ cộng đồng khỏi spam và nội dung xấu.</li>
    </ul>
    
    <p className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-l-4 border-primary dark:border-blue-500 text-sm">
      <strong>Lưu ý:</strong> Chúng tôi KHÔNG BAO GIỜ chia sẻ hoặc bán dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích thương mại.
    </p>
  </PageContainer>
);

export const Contact: React.FC = () => (
  <PageContainer title="Liên hệ hỗ trợ" icon={<Mail size={24} />}>
    <p className="mb-8">
      Mẹ có thắc mắc cần giải đáp? Hoặc muốn hợp tác cùng Asking.vn? Hãy liên hệ với chúng tôi qua các kênh sau:
    </p>
    
    <div className="space-y-6 not-prose">
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
        <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center">
          <Mail size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark dark:text-white">Email</h5>
          <a href="mailto:hotro@asking.vn" className="text-primary hover:underline">hotro@asking.vn</a>
        </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
        <div className="w-12 h-12 bg-secondary/30 dark:bg-secondary/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center">
          <Phone size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark dark:text-white">Hotline</h5>
          <a href="tel:0912.434.666" className="text-primary hover:underline">0912.434.666 (8h - 20h)</a>
        </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-600">
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center">
          <MapPin size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark dark:text-white">Văn phòng</h5>
          <p className="text-textGray dark:text-gray-400 m-0">Tầng 12, Tòa nhà Asking, Quận 1, TP.HCM</p>
        </div>
      </div>
    </div>
  </PageContainer>
);

// --- CÂU HỎI THƯỜNG GẶP (FAQ) ---
export const FAQ: React.FC = () => (
  <PageContainer title="Câu hỏi thường gặp" icon={<HelpCircle size={24} />}>
    <div className="space-y-6">
      <div className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <h4 className="text-lg font-bold text-textDark dark:text-white mb-2 flex items-center gap-2">
          <span className="text-primary">Q.</span> Asking.vn có hoàn toàn miễn phí không?
        </h4>
        <p className="text-textGray dark:text-gray-300 pl-6">
          Có. Asking.vn là nền tảng cộng đồng hoàn toàn miễn phí dành cho các mẹ bỉm sữa để chia sẻ kiến thức và kết nối.
        </p>
      </div>

      <div className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <h4 className="text-lg font-bold text-textDark dark:text-white mb-2 flex items-center gap-2">
          <span className="text-primary">Q.</span> Làm thế nào để tôi nhận biết đâu là Chuyên gia thật?
        </h4>
        <p className="text-textGray dark:text-gray-300 pl-6">
          Các tài khoản Chuyên gia (Bác sĩ, Dược sĩ, Chuyên gia dinh dưỡng...) trên Asking.vn đều phải trải qua quy trình xác minh bằng cấp nghiêm ngặt. Khi được duyệt, họ sẽ có huy hiệu <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-xs font-bold mx-1">Chuyên gia</span> hoặc tích xanh bên cạnh tên.
        </p>
      </div>

      <div className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <h4 className="text-lg font-bold text-textDark dark:text-white mb-2 flex items-center gap-2">
          <span className="text-primary">Q.</span> Tôi có thể xóa câu hỏi đã đăng không?
        </h4>
        <p className="text-textGray dark:text-gray-300 pl-6">
          Có. Bạn có thể xóa câu hỏi của mình bằng cách vào trang chi tiết câu hỏi, bấm vào dấu 3 chấm góc phải và chọn "Xóa câu hỏi". Tuy nhiên, nếu câu hỏi đã có nhiều câu trả lời hữu ích, chúng tôi khuyến khích bạn giữ lại để giúp ích cho các mẹ khác.
        </p>
      </div>

      <div className="border-b border-gray-100 dark:border-slate-700 pb-4">
        <h4 className="text-lg font-bold text-textDark dark:text-white mb-2 flex items-center gap-2">
          <span className="text-primary">Q.</span> Làm sao để báo cáo nội dung không phù hợp?
        </h4>
        <p className="text-textGray dark:text-gray-300 pl-6">
          Asking.vn đề cao môi trường văn minh. Nếu thấy nội dung spam, quảng cáo rác hoặc ngôn từ thiếu văn hóa, bạn hãy bấm vào dấu 3 chấm góc phải và chọn <strong>Báo cáo</strong> (hình lá cờ) ở mỗi bài viết hoặc câu trả lời. Đội ngũ admin sẽ xử lý trong vòng 24h.
        </p>
      </div>

      <div>
        <h4 className="text-lg font-bold text-textDark dark:text-white mb-2 flex items-center gap-2">
          <span className="text-primary">Q.</span> Tôi muốn đăng ký làm Chuyên gia thì phải làm sao?
        </h4>
        <p className="text-textGray dark:text-gray-300 pl-6">
          Rất hoan nghênh bạn! Hãy truy cập trang <Link to="/expert-register" className="text-primary hover:underline font-bold">Đăng ký Chuyên gia</Link>, điền thông tin và tải lên ảnh chụp bằng cấp/chứng chỉ hành nghề. Chúng tôi sẽ liên hệ lại sớm nhất.
        </p>
      </div>
    </div>
  </PageContainer>
);
