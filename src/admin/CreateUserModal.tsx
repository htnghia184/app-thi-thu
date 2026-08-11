import React, { useState } from 'react';
import { X, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { adminCreateUser } from '../lib/supabaseService';

interface CreateUserModalProps {
  role: 'student' | 'teacher';
  onClose: () => void;
  onCreated: (userId: string) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ role, onClose, onCreated }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleLabel = role === 'teacher' ? 'giáo viên' : 'học viên';

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!trimmedName) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userId = await adminCreateUser(trimmedEmail, password, trimmedName, role);
      onCreated(userId);
    } catch (err: any) {
      console.error('Create user failed:', err);
      setError('Không thể tạo tài khoản: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
            <UserPlus size={20} className="text-indigo-500" />
            Tạo tài khoản {roleLabel}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Họ tên {roleLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={role === 'teacher' ? 'VD: Cô Lan' : 'VD: Nguyễn Văn A'}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3 py-2 pr-10 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
              Nhập lại mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
};
