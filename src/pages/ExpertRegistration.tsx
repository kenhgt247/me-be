import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, UploadCloud, FileText, CheckCircle, Clock, XCircle, ChevronRight, UserCheck, Heart, Stethoscope, Baby, Brain, BookOpen } from 'lucide-react';
// @ts-ignore
import { Link } from 'react-router-dom';

interface ExpertRegistrationProps {
  currentUser: User;
  onSubmitApplication: (data: any) => Promise<void>;
}

const SPECIALTIES = [
  { id: 'pediatrics', label: 'Bác sĩ Nhi khoa', icon: <Stethoscope size={20} /> },
  { id: 'nutrition', label: 'Chuyên gia Dinh dưỡng', icon: <Heart size={20} /> },
  { id: 'psychology', label: 'Tâm lý trẻ em', icon: <Brain size={20} /> },
  { id: 'education', label: 'Giáo dục sớm', icon: <BookOpen size={20} /> },
  { id: 'obgyn', label: 'Sản phụ khoa', icon: <Baby size={20} /> },
  { id: 'other', label: 'Khác', icon: <FileText size={20} /> }
];

export const ExpertRegistration: React.FC<ExpertRegistrationProps> = ({ currentUser, onSubmitApplication }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: currentUser.name,
    phone: '',
    workplace: '',
    specialty: '',
    files: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status View: PENDING
  if (currentUser.expertStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-[2rem] shadow-lg p-8 md:p-12 text-center border border-gray-100 dark:border-dark-border transition-colors">
          <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Clock size={48} className="text-blue-500" />
            <span className="absolute top-0 right-0 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
            </span>
          </div>
          <h2 className="text-2xl font-bold text-textDark dark:text-white mb-4">Hồ sơ đang được xét duyệt</h2>
          <p className="text-textGray dark:text-gray-400 mb-8 leading-relaxed">
            Cảm ơn bạn đã gửi hồ sơ đăng ký trở thành Chuyên gia. 
            Đội ngũ admin đang kiểm tra thông tin (dự kiến 1-2 ngày làm việc).
            Chúng tôi sẽ thông báo kết quả qua email và thông báo trên ứng dụng.
          </p>
          
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 text-left max-w-md mx-auto">
             <h4 className="font-bold text-sm text-textGray dark:text-gray-400 uppercase mb-4 tracking-wider">Tiến trình</h4>
             <TimelineItem status="completed" title="Gửi hồ sơ đăng ký" date="Hôm nay" />
             <TimelineItem status="active" title="Admin kiểm tra bằng cấp" date="Đang xử lý..." />
             <TimelineItem status="pending" title="Kích hoạt danh hiệu Chuyên gia" date="--" />
          </div>
        </div>
      </div>
    );
  }

  // Status View: APPROVED
  if (currentUser.expertStatus === 'approved' || currentUser.isExpert) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
         <div className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-[2rem] shadow-xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-blue-500">
               <ShieldCheck size={48} />
            </div>
            <h2 className="text-3xl font-bold mb-4">Chào mừng Chuyên gia!</h2>
            <p className="mb-8 text-blue-50">
               Hồ sơ của bạn đã được duyệt. Giờ đây bạn có thể chia sẻ kiến thức chuyên môn và giúp đỡ hàng nghìn bà mẹ Việt Nam với danh hiệu được xác thực.
            </p>
           <Link 
  to="/" 
  className="relative z-10 inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
>
  Bắt đầu chia sẻ <ChevronRight size={20} />
</Link>
         </div>
      </div>
    );
  }

  // Registration Form Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, files: Array.from(e.target.files) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await onSubmitApplication(formData);
    } catch (e) {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-textDark dark:text-white mb-4">
          Đăng ký đối tác <span className="text-blue-600 dark:text-blue-400">Chuyên gia</span>
        </h1>
        <p className="text-textGray dark:text-gray-400 max-w-2xl mx-auto">
          Tham gia đội ngũ chuyên gia uy tín tại Asking.vn để xây dựng thương hiệu cá nhân và lan tỏa giá trị tích cực đến cộng đồng.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border transition-colors">
            <h3 className="font-bold text-textDark dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={20} /> Quyền lợi
            </h3>
            <ul className="space-y-3 text-sm text-textGray dark:text-gray-400">
              <li className="flex gap-3">
                <CheckCircle className="text-green-500 shrink-0" size={16} />
                <span>Dấu tích xanh xác thực uy tín</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-green-500 shrink-0" size={16} />
                <span>Nổi bật câu trả lời chuyên môn</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-green-500 shrink-0" size={16} />
                <span>Tiếp cận 10,000+ phụ huynh</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle className="text-green-500 shrink-0" size={16} />
                <span>Được quyền Viết Blog và chia sẻ tài liệu của riêng mình</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
             <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm">Tại sao cần xác thực?</h3>
             <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
               Để đảm bảo thông tin sức khỏe và giáo dục trên Asking.vn luôn chính xác và an toàn, chúng tôi yêu cầu xác minh bằng cấp chuyên môn của tất cả chuyên gia.
             </p>
          </div>
        </div>

        {/* Form Area */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-[2rem] shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden transition-colors">
            <div className="p-8">
              <h3 className="text-xl font-bold text-textDark dark:text-white mb-6">Thông tin đăng ký</h3>
              
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Họ và tên</label>
                    <input 
                      type="text" 
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-textDark dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 outline-none transition-all"
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Số điện thoại</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-textDark dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 outline-none transition-all"
                      placeholder="0912 xxx xxx"
                      required
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Lĩnh vực chuyên môn</label>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {SPECIALTIES.map(spec => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setFormData({...formData, specialty: spec.label})}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                             formData.specialty === spec.label 
                             ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400' 
                             : 'border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600 text-textGray dark:text-gray-400 bg-white dark:bg-slate-800'
                          }`}
                        >
                           {spec.icon}
                           <span className="text-xs font-medium">{spec.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Đơn vị công tác hiện tại</label>
                  <input 
                    type="text" 
                    value={formData.workplace}
                    onChange={(e) => setFormData({...formData, workplace: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-textDark dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 outline-none transition-all"
                    placeholder="Ví dụ: Bệnh viện Nhi Đồng 1, Trường Mầm non Hoa Hồng..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Minh chứng chuyên môn</label>
                  <div className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors relative">
                    <input 
                      type="file" 
                      multiple 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                      accept=".jpg,.png,.pdf"
                    />
                    <UploadCloud className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm font-medium text-textDark dark:text-white">Tải lên ảnh Bằng cấp / Chứng chỉ / Thẻ nhân viên</p>
                    <p className="text-xs text-textGray dark:text-gray-500 mt-1">Hỗ trợ JPG, PNG, PDF (Tối đa 5MB)</p>
                    {formData.files.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {formData.files.map((f, i) => (
                          <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md font-medium">
                            {f.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-6 flex justify-end items-center border-t border-gray-100 dark:border-dark-border">
               <button 
                 type="submit" 
                 disabled={isSubmitting || !formData.specialty || formData.files.length === 0}
                 className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {isSubmitting ? 'Đang gửi...' : 'Gửi hồ sơ đăng ký'}
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TimelineItem: React.FC<{ status: 'completed' | 'active' | 'pending'; title: string; date: string }> = ({ status, title, date }) => {
  const getIcon = () => {
    if (status === 'completed') return <CheckCircle size={16} className="text-white" />;
    if (status === 'active') return <div className="w-2.5 h-2.5 bg-white rounded-full"></div>;
    return <div className="w-2.5 h-2.5 bg-gray-300 dark:bg-gray-500 rounded-full"></div>;
  };

  const getColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'active') return 'bg-blue-500';
    return 'bg-gray-200 dark:bg-slate-700';
  };

  return (
    <div className="flex gap-4 mb-6 last:mb-0 relative">
      {/* Line */}
      <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-slate-700 last:hidden"></div>
      
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${getColor()}`}>
        {getIcon()}
      </div>
      <div>
        <h5 className={`font-bold text-sm ${status === 'pending' ? 'text-gray-400 dark:text-gray-500' : 'text-textDark dark:text-white'}`}>{title}</h5>
        <span className="text-xs text-textGray dark:text-gray-500">{date}</span>
      </div>
    </div>
  );
};
