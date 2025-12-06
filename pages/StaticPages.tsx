import React from 'react';
import { ArrowLeft, Mail, MapPin, Phone, Shield, Users, FileText, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageContainer: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center text-textGray hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={20} className="mr-1" /> Quay lại
      </button>
      
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-10">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-6">
          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-primary">
            {icon}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-textDark">{title}</h1>
        </div>
        
        <div className="prose prose-lg text-textDark/80 max-w-none prose-headings:text-primary prose-a:text-primary hover:prose-a:text-accent">
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
      <div className="bg-cream p-6 rounded-2xl text-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🤝</div>
        <h4 className="font-bold text-textDark mb-2">Tin cậy</h4>
        <p className="text-sm text-textGray">Thông tin được kiểm chứng bởi chuyên gia và cộng đồng.</p>
      </div>
      <div className="bg-cream p-6 rounded-2xl text-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">❤️</div>
        <h4 className="font-bold text-textDark mb-2">Thấu hiểu</h4>
        <p className="text-sm text-textGray">Luôn lắng nghe và chia sẻ với tâm thế của một người mẹ.</p>
      </div>
      <div className="bg-cream p-6 rounded-2xl text-center">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🌱</div>
        <h4 className="font-bold text-textDark mb-2">Đồng hành</h4>
        <p className="text-sm text-textGray">Cùng con khôn lớn mỗi ngày qua từng giai đoạn phát triển.</p>
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
    
    <p className="bg-blue-50 p-4 rounded-xl border-l-4 border-primary text-sm">
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
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <Mail size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark">Email</h5>
          <a href="mailto:hotro@asking.vn" className="text-primary hover:underline">hotro@asking.vn</a>
        </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
        <div className="w-12 h-12 bg-secondary/30 text-teal-600 rounded-full flex items-center justify-center">
          <Phone size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark">Hotline</h5>
          <a href="tel:19001000" className="text-primary hover:underline">1900 1000 (8h - 20h)</a>
        </div>
      </div>
      
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
        <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
          <MapPin size={24} />
        </div>
        <div>
          <h5 className="font-bold text-textDark">Văn phòng</h5>
          <p className="text-textGray m-0">Tầng 12, Tòa nhà Asking, Quận 1, TP.HCM</p>
        </div>
      </div>
    </div>
  </PageContainer>
);