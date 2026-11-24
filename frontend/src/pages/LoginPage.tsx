import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { LogIn, AlertCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { ApiErrorResponse } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLockoutMinutes(null);
    setIsSubmitting(true);

    try {
      const res = await authApi.login({
        email,
        password,
        remember,
      });

      login(res.token, res.user, remember);

      if (from) {
        navigate(from, { replace: true });
      } else if (res.user.role === 'admin') {
        navigate('/admin/clients', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err) && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 429) {
          // Account lockout wait-time alert
          const minutes = data?.remaining_minutes ?? 15;
          setLockoutMinutes(minutes);
          setErrorMessage(
            data?.message || `Your account is temporarily locked. Please try again in ${minutes} minute(s).`
          );
        } else if (status === 401) {
          // Friendly generic error alert matching backend
          setErrorMessage(data?.message || 'Email or password is incorrect.');
        } else if (data?.message) {
          setErrorMessage(data.message);
        } else {
          setErrorMessage('Unable to sign in. Please verify your credentials.');
        }
      } else {
        setErrorMessage('Network error. Unable to connect to authentication service.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setLockoutMinutes(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to MiniBroker</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your brokerage wallet, KYC, and management portal
          </p>
        </div>

        {/* Lockout Alert */}
        {lockoutMinutes !== null && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-400 text-xs shadow-lg">
            <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-300">Account Temporarily Locked</p>
              <p className="mt-1 text-amber-400/90 leading-relaxed">
                Too many failed login attempts. For security reasons, please wait{' '}
                <span className="font-bold underline">{lockoutMinutes} minute(s)</span> before attempting to sign in again.
              </p>
            </div>
          </div>
        )}

        {/* Friendly generic error alert */}
        {errorMessage && lockoutMinutes === null && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@test.com or client@test.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="mt-8 pt-6 border-t border-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Demo Credentials (Click to fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@test.com', 'Admin@123')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 hover:border-sky-500/40 text-left transition-colors"
            >
              <div className="font-semibold text-sky-400">Admin User</div>
              <div className="text-[11px] text-slate-400">admin@test.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('client@test.com', 'Client@123')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 hover:border-emerald-500/40 text-left transition-colors"
            >
              <div className="font-semibold text-emerald-400">Client User</div>
              <div className="text-[11px] text-slate-400">client@test.com</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-400 hover:underline font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
