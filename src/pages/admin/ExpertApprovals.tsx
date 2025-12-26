import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  Heart,
  Stethoscope,
  Baby,
  Brain,
  BookOpen,
  X,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface ExpertRegistrationProps {
  currentUser: User;
  onSubmitApplication: (data: any) => Promise<void>;
}

type AppStatus = 'pending' | 'approved' | 'rejected';

type LatestExpertApplication = {
  id: string;
  userId: string;
  fullName?: string;
  phone?: string;
  workplace?: string;
  specialty?: string;
  status: AppStatus;
  rejectionReason?: string | null;
  createdAt: string; // ISO string
  proofImages?: string[];
  approvedSpecialty?: string | null;
};

const SPECIALTIES = [
  { id: 'pediatrics', label: 'Bác sĩ Nhi khoa', icon: <Stethoscope size={20} /> },
  { id: 'nutrition', label: 'Chuyên gia Dinh dưỡng', icon: <Heart size={20} /> },
  { id: 'psychology', label: 'Tâm lý trẻ em', icon: <Brain size={20} /> },
  { id: 'education', label: 'Giáo dục sớm', icon: <BookOpen size={20} /> },
  { id: 'obgyn', label: 'Sản phụ khoa', icon: <Baby size={20} /> },
  { id: 'other', label: 'Khác', icon: <FileText size={20} /> },
];

const MAX_FILE_MB = 5;
const MAX_FILES = 6;

export const ExpertRegistration: React.FC<ExpertRegistrationProps> = ({
  currentUser,
  onSubmitApplication,
}) => {
  const [latestApp, setLatestApp] = useState<LatestExpertApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');

  const initialForm = useMemo(
    () => ({
      fullName: currentUser?.name || '',
      phone: (currentUser as any)?.phone || '',
      workplace: (currentUser as any)?.workplace || '',
      specialty: (currentUser as any)?.specialty || '',
      files: [] as File[],
    }),
    [currentUser]
  );

  const [formData, setFormData] = useState(initialForm);

  // -----------------------------
  // Load latest application (1 user -> latest doc)
  // -----------------------------
  const loadLatestApplication = async () => {
    if (!db || !currentUser?.id) {
      setLatestApp(null);
      setLoadingApp(false);
      return;
    }

    setLoadingApp(true);
    try {
      const q = query(
        collection(db, 'expert_applications'),
        where('userId', '==', currentUser.id),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setLatestApp(null);
      } else {
        const d = snap.docs[0];
        setLatestApp({ id: d.id, ...(d.data() as any) } as LatestExpertApplication);
      }
    } catch (e) {
      // Nếu user chưa có index cho orderBy/where, hoặc lỗi permission, fallback “không có hồ sơ”
      console.error('loadLatestApplication error:', e);
      setLatestApp(null);
    } finally {
      setLoadingApp(false);
    }
  };

  useEffect(() => {
    loadLatestApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // -----------------------------
  // Effective status (UI decision)
  // -----------------------------
  const effectiveStatus: AppStatus | null = useMemo(() => {
    if (currentUser?.isExpert || currentUser?.expertStatus === 'approved') return 'approved';

    // ưu tiên hồ sơ mới nhất từ expert_applications
    if (latestApp?.status) return latestApp.status;

    // fallback nếu app chưa load / không tồn tại
    if (currentUser?.expertStatus === 'pending') return 'pending';
    if (currentUser?.expertStatus === 'rejected') return 'rejected';

    return null;
  }, [currentUser?.isExpert, currentUser?.expertStatus, latestApp?.status]);

  const rejectionReason = useMemo(() => {
    const fromApp = latestApp?.rejectionReason;
    const fromUser = (currentUser as any)?.expertRejectionReason;
    return (fromApp || fromUser || '').trim();
  }, [latestApp?.rejectionReason, currentUser]);

  // -----------------------------
  // Actions
  // -----------------------------
  const resetToResubmit = () => {
    setFormError('');
    setFormData({
      ...initialForm,
      // giữ lại 1 chút thông tin cũ cho user đỡ nhập lại (có thể xoá nếu bạn muốn)
      specialty: latestApp?.approvedSpecialty || latestApp?.specialty || initialForm.specialty || '',
      workplace: latestApp?.workplace || initialForm.workplace || '',
      phone: latestApp?.phone || initialForm.phone || '',
      files: [],
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    if (files.length > MAX_FILES) {
      setFormError(`Bạn chỉ có thể tải tối đa ${MAX_FILES} tệp.`);
      return;
    }

    for (const f of files) {
      const sizeMb = f.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        setFormError(`Tệp "${f.name}" vượt quá ${MAX_FILE_MB}MB. Vui lòng chọn tệp nhỏ hơn.`);
        return;
      }
    }

    setFormData({ ...formData, files });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    if (!formData.specialty) {
      setFormError('Vui lòng chọn lĩnh vực chuyên môn.');
      return;
    }
    if (!formData.files.length) {
      setFormError('Vui lòng tải lên ít nhất 1 minh chứng chuyên môn.');
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ gửi thêm previousApplicationId để backend/admin tiện trace (không bắt buộc)
      await onSubmitApplication({
        ...formData,
        previousApplicationId: latestApp?.id || null,
        resubmittedAt: new Date().toISOString(),
      });

      // ✅ Optimistic UI: chuyển sang pending ngay (kể cả nếu user doc chưa update)
      setLatestApp((prev) => ({
        id: prev?.id || 'local_pending',
        userId: currentUser.id,
        fullName: formData.fullName,
        phone: formData.phone,
        workplace: formData.workplace,
        specialty: formData.specialty,
        status: 'pending',
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      }));

      // clear files in UI (tuỳ bạn)
      setFormData((s) => ({ ...s, files: [] }));
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Gửi hồ sơ thất bại. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // Views
  // -----------------------------
  if (loadingApp) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14 animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-[2rem] shadow-lg p-10 text-center border border-gray-100 dark:border-dark-border">
          <Loader2 className="mx-auto animate-spin text-blue-500 mb-3" />
          <p className="text-sm text-textGray dark:text-gray-400 font-medium">Đang tải trạng thái hồ sơ...</p>
        </div>
      </div>
    );
  }

  // Status View: APPROVED
  if (effectiveStatus === 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-[2rem] shadow-xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-blue-500">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Chào mừng Chuyên gia!</h2>
          <p className="mb-8 text-blue-50">
            Hồ sơ của bạn đã được duyệt. Giờ đây bạn có thể chia sẻ kiến thức chuyên môn và giúp đỡ cộng đồng với danh hiệu được xác thực.
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

  // Status View: PENDING
  if (effectiveStatus === 'pending') {
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

          <h2 className="text-2xl font-bold text-textDark dark:text-white mb-4">
            Hồ sơ đang được xét duyệt
          </h2>

          <p className="text-textGray dark:text-gray-400 mb-8 leading-relaxed">
            Cảm ơn bạn đã gửi hồ sơ đăng ký trở thành Chuyên gia.
            Đội ngũ admin đang kiểm tra thông tin (dự kiến 1–2 ngày làm việc).
            Chúng tôi sẽ thông báo kết quả qua email và thông báo trên ứng dụng.
          </p>

          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 text-left max-w-md mx-auto">
            <h4 className="font-bold text-sm text-textGray dark:text-gray-400 uppercase mb-4 tracking-wider">
              Tiến trình
            </h4>
            <TimelineItem status="completed" title="Gửi hồ sơ đăng ký" date="Đã gửi" />
            <TimelineItem status="active" title="Admin kiểm tra bằng cấp" date="Đang xử lý..." />
            <TimelineItem status="pending" title="Kích hoạt danh hiệu Chuyên gia" date="--" />
          </div>

          <button
            onClick={loadLatestApplication}
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            <RefreshCw size={16} /> Làm mới trạng thái
          </button>
        </div>
      </div>
    );
  }

  // Status View: REJECTED / REVOKED
  // - Hiển thị lý do (nếu có)
  // - Cho nộp lại hồ sơ: tạo doc mới
  if (effectiveStatus === 'rejected' && (latestApp || currentUser?.expertStatus === 'rejected')) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-[2rem] shadow-lg p-8 md:p-12 border border-gray-100 dark:border-dark-border transition-colors text-center">
          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X size={44} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-textDark dark:text-white mb-2">Hồ sơ chưa được duyệt</h2>
          <p className="text-textGray dark:text-gray-400 mb-6 leading-relaxed">
            Bạn có thể chỉnh sửa thông tin và <strong>nộp lại hồ sơ mới</strong>.
            Nếu cần hỗ trợ, vui lòng liên hệ admin.
          </p>

          {rejectionReason ? (
            <div className="bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 text-left max-w-xl mx-auto mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-300 mb-1">
                    Lý do từ chối
                  </p>
                  <p className="text-sm font-medium text-red-700 dark:text-red-200 leading-relaxed">
                    {rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 text-left max-w-xl mx-auto mb-6">
              <p className="text-sm text-textGray dark:text-gray-400">
                Admin chưa ghi lý do cụ thể. Bạn vẫn có thể nộp lại hồ sơ với minh chứng rõ hơn.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                resetToResubmit();
                // chuyển xuống form ở dưới (scroll nhẹ)
                const el = document.getElementById('expert-reg-form');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              Nộp lại hồ sơ mới <ChevronRight size={18} />
            </button>

            <button
              onClick={loadLatestApplication}
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold px-8 py-3 rounded-full hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={18} /> Làm mới
            </button>
          </div>
        </div>

        {/* Form luôn hiển thị bên dưới để user nộp lại ngay */}
        <div id="expert-reg-form" className="mt-10">
          {renderForm()}
        </div>
      </div>
    );
  }

  // Default: Form (chưa nộp lần nào)
  return renderForm();

  // -----------------------------
  // Form renderer (giữ UI như bạn đang có)
  // -----------------------------
  function renderForm() {
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
                Để đảm bảo thông tin sức khỏe và giáo dục trên Asking.vn luôn chính xác và an toàn,
                chúng tôi yêu cầu xác minh bằng cấp chuyên môn của tất cả chuyên gia.
              </p>
            </div>

            {!!formError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 text-left">
                <p className="text-sm font-bold text-red-700 dark:text-red-200">{formError}</p>
              </div>
            )}
          </div>

          {/* Form Area */}
          <div className="md:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-dark-card rounded-[2rem] shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden transition-colors"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-textDark dark:text-white mb-6">Thông tin đăng ký</h3>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Họ và tên</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-textDark dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 outline-none transition-all"
                        placeholder="0912 xxx xxx"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-textDark dark:text-gray-300 mb-2">Lĩnh vực chuyên môn</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {SPECIALTIES.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, specialty: spec.label })}
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
                      onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
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
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                      <UploadCloud className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm font-medium text-textDark dark:text-white">
                        Tải lên ảnh Bằng cấp / Chứng chỉ / Thẻ nhân viên
                      </p>
                      <p className="text-xs text-textGray dark:text-gray-500 mt-1">
                        Hỗ trợ JPG, PNG, PDF (Tối đa {MAX_FILE_MB}MB/tệp, tối đa {MAX_FILES} tệp)
                      </p>

                      {formData.files.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                          {formData.files.map((f, i) => (
                            <span
                              key={i}
                              className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md font-medium"
                            >
                              {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {!!formError && (
                    <div className="bg-red-50/70 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 text-left">
                      <p className="text-sm font-bold text-red-700 dark:text-red-200">{formError}</p>
                    </div>
                  )}
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

            {latestApp?.status === 'rejected' && (
              <p className="text-xs text-gray-400 mt-3">
                * Hệ thống sẽ tạo một hồ sơ mới khi bạn nộp lại. Admin vẫn xem được lịch sử để đối chiếu.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
};

const TimelineItem: React.FC<{
  status: 'completed' | 'active' | 'pending';
  title: string;
  date: string;
}> = ({ status, title, date }) => {
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
      <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-slate-700 last:hidden"></div>

      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${getColor()}`}>
        {getIcon()}
      </div>
      <div>
        <h5 className={`font-bold text-sm ${status === 'pending' ? 'text-gray-400 dark:text-gray-500' : 'text-textDark dark:text-white'}`}>
          {title}
        </h5>
        <span className="text-xs text-textGray dark:text-gray-500">{date}</span>
      </div>
    </div>
  );
};
