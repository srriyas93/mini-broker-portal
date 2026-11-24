import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import {
  ArrowRightLeft,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  Users,
  Inbox,
  Activity,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isClient, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/admin/clients') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              to={isAuthenticated ? (isAdmin ? '/admin/clients' : '/dashboard') : '/login'}
              className="flex items-center gap-2.5 font-extrabold text-base sm:text-lg text-white group"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span className="tracking-tight">
                Mini<span className="text-sky-400">Broker</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
                {isClient && (
                  <>
                    <Link
                      to="/dashboard"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/dashboard')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/kyc"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/kyc')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>KYC Verification</span>
                    </Link>
                    <Link
                      to="/transactions"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/transactions')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Transactions</span>
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link
                      to="/admin/clients"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/admin/clients')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Clients</span>
                    </Link>
                    <Link
                      to="/admin/requests"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/admin/requests')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>Pending Requests</span>
                    </Link>
                    <Link
                      to="/admin/activity-logs"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                        isActive('/admin/activity-logs')
                          ? 'bg-slate-800 text-sky-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Activity Logs</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Action Menu */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                    <span>{user.name}</span>
                    <StatusBadge status={user.role} type="role" />
                  </div>
                  {isClient && (
                    <div className="text-[11px] font-mono text-emerald-400 font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(Number(user.balance))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition-colors shadow-lg shadow-sky-500/20"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3">
          {isAuthenticated && user ? (
            <>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                </div>
                <StatusBadge status={user.role} type="role" />
              </div>

              {isClient && (
                <div className="space-y-1 text-xs">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/kyc"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>KYC Verification</span>
                  </Link>
                  <Link
                    to="/transactions"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <Wallet className="w-4 h-4 text-sky-400" />
                    <span>Transactions</span>
                  </Link>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-1 text-xs">
                  <Link
                    to="/admin/clients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Clients Roster</span>
                  </Link>
                  <Link
                    to="/admin/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <Inbox className="w-4 h-4 text-sky-400" />
                    <span>Pending Requests</span>
                  </Link>
                  <Link
                    to="/admin/activity-logs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200"
                  >
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Activity Logs</span>
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center rounded-xl bg-sky-500 text-white font-bold"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
