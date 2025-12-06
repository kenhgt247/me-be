
import React, { useState } from 'react';
import { X, Mail, ShieldCheck, Bell, User, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, name: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onGuestContinue: () => void;
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
        if (!name.trim()) throw new Error("Vui lòng nhập họ tên của mẹ");
        await onRegister(email, password, name);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu cần ít nhất 6 ký tự.');
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
      setError('Đăng nhập Google thất bại (Vui lòng kiểm tra Config).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden animate-pop-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-textDark mb-1">
              {mode === 'login' ? 'Chào mẹ trở lại!' : 'Tham gia Asking.vn'}
            </h2>
            <p className="text-textGray text-sm">
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
              className="w-full py-3 rounded-xl border border-gray-200 flex items-center justify-center gap-3 font-bold text-textDark hover:bg-gray-50 hover:border-gray-300 transition-all group bg-white"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  <span>Tiếp tục với Google</span>
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink-0 mx-4 text-gray-300 text-xs">Hoặc dùng Email</span>
                <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm flex items-center gap-2">
                   <AlertCircle size={16} /> {error}
                </div>
              )}

              {mode === 'register' && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Tên hiển thị (vd: Mẹ Bắp)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-primary rounded-xl outline-none transition-all"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  placeholder="Email của mẹ"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-primary rounded-xl outline-none transition-all"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  placeholder="Mật khẩu (ít nhất 6 ký tự)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-primary rounded-xl outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-white flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/30 hover:bg-[#25A99C] transition-all disabled:opacity-70"
              >
                {loading ? 'Đang xử lý...' : (
                  <>
                    {mode === 'login' ? 'Đăng nhập' : 'Đăng ký ngay'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-sm">
             {mode === 'login' ? (
                <p className="text-textGray">
                   Chưa có tài khoản?{' '}
                   <button onClick={() => setMode('register')} className="text-primary font-bold hover:underline">
                      Đăng ký miễn phí
                   </button>
                </p>
             ) : (
                <p className="text-textGray">
                   Đã có tài khoản?{' '}
                   <button onClick={() => setMode('login')} className="text-primary font-bold hover:underline">
                      Đăng nhập
                   </button>
                </p>
             )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50 text-center">
            <button onClick={onGuestContinue} className="text-xs text-gray-400 hover:text-textGray transition-colors">
              Tiếp tục với tư cách Khách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
