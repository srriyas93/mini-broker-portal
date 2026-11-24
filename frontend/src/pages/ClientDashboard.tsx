import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kycApi, transactionApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import type { KycSubmission, Transaction } from '../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Loader2,
} from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [kycSubmission, setKycSubmission] = useState<KycSubmission | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [kycRes, txRes] = await Promise.all([
        kycApi.status(),
        transactionApi.list(1, 5),
      ]);
      setKycSubmission(kycRes.submission);
      setRecentTransactions(txRes.data || []);
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshUser(), loadData()]);
  };

  const balanceNumber = Number(user?.balance ?? 0);
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(balanceNumber);

  const kycStatus = kycSubmission ? kycSubmission.status : 'not_submitted';

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading your brokerage dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Trading Account Active
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {user?.email} • Account #{user?.id.toString().padStart(6, '0')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Balance</span>
        </button>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-sky-500/5 blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-sky-400" />
              <span>Available Wallet Balance</span>
            </div>
            <StatusBadge status="completed" type="transaction" />
          </div>

          <div className="mb-6">
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {formattedBalance}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Funds available for trading and withdrawals
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-700/60">
            <Link
              to="/transactions?action=deposit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deposit Funds</span>
            </Link>
            <Link
              to="/transactions?action=withdraw"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-colors"
            >
              <MinusCircle className="w-4 h-4" />
              <span>Withdraw Funds</span>
            </Link>
          </div>
        </div>

        {/* KYC Verification Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>KYC Verification</span>
              </div>
              <StatusBadge status={kycStatus} type="kyc" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {kycStatus === 'approved' && 'Identity Verified'}
              {kycStatus === 'pending' && 'Under Admin Review'}
              {kycStatus === 'rejected' && 'Verification Needs Attention'}
              {kycStatus === 'not_submitted' && 'Action Required'}
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              {kycStatus === 'approved' &&
                'Your documents have been verified. Withdrawals and full broker services are active.'}
              {kycStatus === 'pending' &&
                'Your submitted documents are being verified by compliance. This usually takes under 24 hours.'}
              {kycStatus === 'rejected' &&
                (kycSubmission?.rejection_reason
                  ? `Reason: ${kycSubmission.rejection_reason}`
                  : 'Please review submission guidelines and upload clear document copies.')}
              {kycStatus === 'not_submitted' &&
                'Submit your government-issued ID and proof of address to unlock withdrawal capabilities.'}
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <Link
              to="/kyc"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-sky-400 font-semibold text-xs transition-all hover:border-sky-500/40"
            >
              <span>{kycStatus === 'approved' ? 'View KYC Record' : 'Complete Verification'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Latest 5 Requests Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
            <p className="text-xs text-slate-400">Latest deposits and withdrawal requests</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No transactions requested yet. Start by making a deposit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4 rounded-r-xl">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold capitalize flex items-center gap-2">
                      {tx.type === 'deposit' ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="text-white">{tx.type}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span
                        className={tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'}
                      >
                        {tx.type === 'deposit' ? '+' : '-'}
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(Number(tx.amount))}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={tx.status} type="transaction" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {tx.reference_id || `#${tx.id}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
