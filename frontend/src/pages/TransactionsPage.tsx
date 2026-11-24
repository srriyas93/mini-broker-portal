import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { transactionApi, kycApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import type { Transaction, KycSubmission, ApiErrorResponse } from '../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import axios from 'axios';

export const TransactionsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();

  // Tab: deposit | withdraw
  const actionParam = searchParams.get('action');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal'>(
    actionParam === 'withdraw' ? 'withdrawal' : 'deposit'
  );

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // KYC state for withdrawal gating
  const [kycSubmission, setKycSubmission] = useState<KycSubmission | null>(null);
  const [isCheckingKyc, setIsCheckingKyc] = useState(true);

  // History state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  const loadKyc = async () => {
    try {
      const res = await kycApi.status();
      setKycSubmission(res.submission);
    } catch {
      // Ignore background error
    } finally {
      setIsCheckingKyc(false);
    }
  };

  const loadHistory = async (pageNum = 1) => {
    setIsLoadingHistory(true);
    try {
      const res = await transactionApi.list(pageNum, 10);
      setTransactions(res.data);
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
      setTotalCount(res.meta.total);
    } catch {
      // Ignore background error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadKyc();
    loadHistory(1);
  }, []);

  const balanceNumber = Number(user?.balance ?? 0);
  const inputAmountNumber = parseFloat(amount) || 0;
  const isKycApproved = kycSubmission?.status === 'approved';
  const isWithdrawalExceedingBalance =
    activeTab === 'withdrawal' && inputAmountNumber > balanceNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (inputAmountNumber <= 0) {
      setFormError('Please enter a valid amount greater than $0.00.');
      return;
    }

    if (activeTab === 'withdrawal') {
      if (!isKycApproved) {
        setFormError('Withdrawals require an approved KYC verification.');
        return;
      }
      if (inputAmountNumber > balanceNumber) {
        setFormError(`Withdrawal amount exceeds your available balance of $${balanceNumber.toFixed(2)}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await transactionApi.create({
        type: activeTab,
        amount: inputAmountNumber,
        note: note.trim() || undefined,
      });

      setFormSuccess(
        `${activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} request of $${inputAmountNumber.toFixed(
          2
        )} submitted successfully. Status is Pending administrator review.`
      );
      setAmount('');
      setNote('');
      await Promise.all([refreshUser(), loadHistory(1)]);
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err) && err.response) {
        setFormError(err.response.data?.message || 'Transaction submission failed.');
      } else {
        setFormError('Network error. Unable to process transaction request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter === 'all') return true;
    return tx.type === typeFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2">
            <Wallet className="w-3.5 h-3.5" />
            <span>Brokerage Ledger</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Transactions & Wallet</h1>
          <p className="text-sm text-slate-400 mt-1">
            Request deposits, submit withdrawals, and track real-time request statuses
          </p>
        </div>
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl px-5 py-3 text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Wallet Balance
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(balanceNumber)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Request Form */}
        <div className="lg:col-span-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl h-fit">
          <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('deposit');
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'deposit'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('withdrawal');
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'withdrawal'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>

          {/* KYC Gating Warning on Withdrawal */}
          {activeTab === 'withdrawal' && !isCheckingKyc && !isKycApproved && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">KYC Verification Required</p>
                <p className="mt-1 leading-relaxed">
                  Withdrawals are locked until your identity is verified.
                </p>
                <Link
                  to="/kyc"
                  className="inline-block mt-2 font-semibold text-sky-400 hover:underline"
                >
                  Submit KYC Documents →
                </Link>
              </div>
            </div>
          )}

          {/* Exceeding Balance Warning */}
          {isWithdrawalExceedingBalance && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Amount exceeds available balance (${balanceNumber.toFixed(2)}).</span>
            </div>
          )}

          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Amount (USD) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reference / Note <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  activeTab === 'deposit'
                    ? 'e.g. Wire reference, card last 4'
                    : 'e.g. Bank IBAN, PayPal email'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                (activeTab === 'withdrawal' && (!isKycApproved || isWithdrawalExceedingBalance))
              }
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'deposit'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Submit {activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} Request</span>
              )}
            </button>
          </form>
        </div>

        {/* Full Request History Table */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Transaction History</h2>
              <p className="text-xs text-slate-400">All deposit and withdrawal records</p>
            </div>
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  typeFilter === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('deposit')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  typeFilter === 'deposit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Deposits
              </button>
              <button
                onClick={() => setTypeFilter('withdrawal')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  typeFilter === 'withdrawal' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Withdrawals
              </button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span>Loading ledger history...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No transactions match the selected filter.
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
                  {filteredTransactions.map((tx) => (
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

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/60 text-xs text-slate-400">
              <div>
                Page {page} of {lastPage} ({totalCount} total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadHistory(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadHistory(page + 1)}
                  disabled={page >= lastPage}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
