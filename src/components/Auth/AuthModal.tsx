import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, Loader2, UserRound } from 'lucide-react';
import logoBg from '../../../logo-without-background.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  onGuestLogin: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, onGuestLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      onAuthSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setError('');
    onGuestLogin();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Nền lặp lại logo */}
      <div
        className="logo-pattern"
        style={{ backgroundImage: `url(${logoBg})` }}
      />
      {/* Lớp phủ tối */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 min-h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>

        <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100 mb-2 text-center">
          Welcome Back
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Sign in to start practicing
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={handleGuestLogin}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
        >
          <UserRound size={20} />
          Login as Guest
        </button>
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Try public tests for free without an account
        </p>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          No self-registration. Contact the administrator to create your account.
        </p>
        </div>
      </div>
    </div>
  );
};
