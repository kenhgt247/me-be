import React, { useState } from 'react';
import { X, Mail, User, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { loginAnonymously } from '../services/auth'; // ✅ chỉnh path nếu file nằm nơi khác

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, name: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onGuestContinue: () => void; // giữ nguyên để không phá nơi gọi
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  onGoogleLogin,
  onGuestContinue
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        if (!name.trim()) throw new Error('Vui lòng nhập họ tên của mẹ');
        await onRegister(email, password, name);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký. Mẹ hãy chuyển sang Đăng nhập nhé.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu cần ít nhất 6 ký tự để bảo mật.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Mẹ kiểm tra lại WiFi/4G nhé.');
      } else {
        setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError('');
    setLoading(true);
    try {
      await onGoogleLogin();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Đã hủy đăng nhập Google.');
      } else {
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Guest => login anonymous thật sự
  const handleGuestClick = async () => {
    setError('');
    setLoading(true);

    try {
      await loginAnonymously(); // ✅ đăng nhập Firebase Anonymous -> có uid thật
      // Giữ callback cũ để app bạn đóng modal/điều hướng nếu đang dùng
      onGuestContinue?.();
      onClose();
    } catch (err: any) {
      console.error(err);

      // mapping lỗi rõ ràng
      if (err?.message === 'ANONYMOUS_DISABLED' || err?.code === 'auth/operation-not-allowed') {
        setError('Chế độ Khách đang bị tắt trên Firebase. Mẹ hãy đăng nhập bằng Google/Email nhé.');
      } else if (err?.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Mẹ kiểm tra lại WiFi/4G nhé.');
      } else {
        setError('Không thể vào bằng tư cách khách. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!loading) onClose();
        }}
      ></div>

      {/* Modal Content */}
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden animate-pop-in border border-white/20">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-10 active:scale-95 disabled:opacity-60"
        >
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-textDark mb-1 tracking-tight">
              {mode === 'login' ? 'Chào mẹ trở lại!' : 'Tham gia Asking.vn'}
            </h2>
            <p className="text-textGray text-sm font-medium">
              {mode === 'login'
                ? 'Đăng nhập để kết nối với cộng đồng.'
                : 'Tạo tài khoản miễn phí chỉ trong 1 phút.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl border border-gray-200 flex items-center justify-center gap-3 font-bold text-textDark hover:bg-gray-50 hover:border-gray-300 transition-all group bg-white active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    className="w-5 h-5"
                    alt="Google"
                  />
                  <span>Tiếp tục với Google</span>
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold uppercase tracking-wider">
                Hoặc
              </span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm flex items-start gap-2 animate-shake border border-red-100">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-tight font-medium">{error}</span>
                </div>
              )}

              {mode === 'register' && (
                <div className="relative group">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Tên hiển thị (vd: Mẹ Bắp)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl outline-none transition-all font-medium text-textDark"
                    required
                  />
                </div>
              )}

              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
                  size={20}
                />
                <input
                  type="email"
                  placeholder="Email của mẹ"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl outline-none transition-all font-medium text-textDark"
                  required
                />
              </div>

              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
                  size={20}
                />
                <input
                  type="password"
                  placeholder="Mật khẩu (6+ ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl outline-none transition-all font-medium text-textDark"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-[#26A69A] text-white flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    {mode === 'login' ? 'Đăng nhập' : 'Đăng ký ngay'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-sm">
            {mode === 'login' ? (
              <p className="text-textGray font-medium">
                Chưa có tài khoản?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-primary font-bold hover:underline"
                  disabled={loading}
                >
                  Đăng ký miễn phí
                </button>
              </p>
            ) : (
              <p className="text-textGray font-medium">
                Đã có tài khoản?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-primary font-bold hover:underline"
                  disabled={loading}
                >
                  Đăng nhập
                </button>
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 text-center">
           <button
  onClick={handleGuestClick}
  disabled={loading}
  className="text-[10px] text-gray-500 hover:text-teal-500 transition-colors font-bold uppercase tracking-widest disabled:opacity-70"
>
  — Ghé thăm ẩn danh —
</button>
          </div>
        </div>
      </div>
    </div>
  );
};
