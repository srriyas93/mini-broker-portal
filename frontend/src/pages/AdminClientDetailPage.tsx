import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { ConfirmModal } from '../components/ConfirmModal';
import type { ClientDetailResponse, Transaction } from '../types';
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Eye,
  Check,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);

  const [detail, setDetail] = useState<ClientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Document Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<'id' | 'address'>('id');
  const [viewerTitle, setViewerTitle] = useState('');

  // KYC Modal state
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycAction, setKycAction] = useState<'approve' | 'reject'>('approve');
  const [isProcessingKyc, setIsProcessingKyc] = useState(false);

  // Transaction Modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txAction, setTxAction] = useState<'approve' | 'reject'>('approve');
  const [isProcessingTx, setIsProcessingTx] = useState(false);

  const loadClient = async () => {
    try {
      const data = await adminApi.getClient(clientId);
      setDetail(data);
    } catch {
      setActionError('Failed to load client details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const handleOpenDoc = (type: 'id' | 'address') => {
    if (!detail?.latest_kyc) return;
    setViewerType(type);
    setViewerTitle(
      type === 'id'
        ? `ID Document - ${detail.profile.name}`
        : `Proof of Address - ${detail.profile.name}`
    );
    setViewerOpen(true);
  };

  const handleKycConfirm = async (reason?: string) => {
    if (!detail?.latest_kyc) return;
    setIsProcessingKyc(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (kycAction === 'approve') {
        await adminApi.approveKyc(detail.latest_kyc.id);
        setActionSuccess('KYC submission approved successfully.');
      } else {
        await adminApi.rejectKyc(detail.latest_kyc.id, reason || 'Compliance criteria not met.');
        setActionSuccess('KYC submission rejected.');
      }
      setKycModalOpen(false);
      await loadClient();
    } catch {
      setActionError('Failed to update KYC decision.');
    } finally {
      setIsProcessingKyc(false);
    }
  };

  const handleTxConfirm = async (reason?: string) => {
    if (!selectedTx) return;
    setIsProcessingTx(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (txAction === 'approve') {
        await adminApi.approveTransaction(selectedTx.id);
        setActionSuccess(
          `${selectedTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} #${selectedTx.id} approved successfully.`
        );
      } else {
        await adminApi.rejectTransaction(selectedTx.id, reason);
        setActionSuccess(
          `${selectedTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} #${selectedTx.id} rejected.`
        );
      }
      setTxModalOpen(false);
      setSelectedTx(null);
      await loadClient();
    } catch {
      setActionError('Failed to process transaction.');
    } finally {
      setIsProcessingTx(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading client file...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-rose-400 font-semibold text-sm">Client account not found.</p>
        <Link to="/admin/clients" className="mt-4 inline-block text-xs text-sky-400 hover:underline">
          ← Back to Clients Roster
        </Link>
      </div>
    );
  }

  const { profile, balance, latest_kyc, transactions } = detail;
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(balance));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients Roster</span>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Profile & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{profile.name}</h1>
                <p className="text-xs text-slate-400 font-mono">{profile.email}</p>
              </div>
            </div>
            <StatusBadge status={latest_kyc?.status || 'not_submitted'} type="kyc" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/60 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[11px]">Client ID</span>
              <span className="text-slate-200">#{profile.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Phone</span>
              <span className="text-slate-200">{profile.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Failed Logins</span>
              <span className="text-slate-200">{profile.failed_login_attempts}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Joined Date</span>
              <span className="text-slate-200">
                {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Client Ledger Balance</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
              {formattedBalance}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Settled wallet balance for trades & withdrawals
            </p>
          </div>
        </div>
      </div>

      {/* KYC Review Section */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <span>KYC Compliance Verification</span>
            </h2>
            <p className="text-xs text-slate-400">
              Review submitted documents and approve or reject client status
            </p>
          </div>
          <StatusBadge status={latest_kyc?.status || 'not_submitted'} type="kyc" />
        </div>

        {!latest_kyc ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Client has not submitted any KYC verification documents yet.
          </div>
        ) : (
          <div className="pt-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
              <div>
                <span className="text-slate-500 block text-[11px]">Document Type</span>
                <span className="text-white font-semibold capitalize">
                  {latest_kyc.document_type}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Document Number</span>
                <span className="text-white font-semibold">
                  {latest_kyc.document_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Submitted At</span>
                <span className="text-white">
                  {new Date(latest_kyc.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reviewed At</span>
                <span className="text-white">
                  {latest_kyc.reviewed_at ? new Date(latest_kyc.reviewed_at).toLocaleString() : 'Pending'}
                </span>
              </div>
            </div>

            {latest_kyc.status === 'rejected' && latest_kyc.rejection_reason && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <span className="font-bold text-rose-200">Rejection Reason:</span>{' '}
                {latest_kyc.rejection_reason}
              </div>
            )}

            {/* Document preview buttons using authenticated blob streaming */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenDoc('id')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View ID Document</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenDoc('address')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Proof of Address</span>
              </button>

              {/* Approve / Reject Actions (available if pending) */}
              {latest_kyc.status === 'pending' && (
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setKycAction('approve');
                      setKycModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve KYC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKycAction('reject');
                      setKycModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-500/20"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject KYC</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Client Transactions Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Transactions History</h2>
          <p className="text-xs text-slate-400">All deposits and withdrawals for this client</p>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No transaction records found for this client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((tx) => (
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
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {tx.status === 'pending' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setTxAction('approve');
                              setTxModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setTxAction('reject');
                              setTxModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Authenticated Blob Document Viewer Modal */}
      {latest_kyc && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={viewerTitle}
          submissionId={latest_kyc.id}
          type={viewerType}
        />
      )}

      {/* KYC Approve/Reject Confirm Modal */}
      <ConfirmModal
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        onConfirm={handleKycConfirm}
        title={kycAction === 'approve' ? 'Approve KYC Verification?' : 'Reject KYC Submission?'}
        message={
          kycAction === 'approve'
            ? `Are you sure you want to approve ${profile.name}'s identity documents? This will unlock full withdrawal privileges.`
            : `Please provide an official rejection reason explaining why ${profile.name}'s submission does not meet compliance standards.`
        }
        confirmText={kycAction === 'approve' ? 'Approve Identity' : 'Reject Submission'}
        variant={kycAction === 'approve' ? 'success' : 'danger'}
        requireReason={kycAction === 'reject'}
        reasonPlaceholder="e.g. Identity photo is blurry, document expired, name mismatch..."
        isLoading={isProcessingKyc}
      />

      {/* Transaction Approve/Reject Confirm Modal */}
      <ConfirmModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setSelectedTx(null);
        }}
        onConfirm={handleTxConfirm}
        title={
          txAction === 'approve'
            ? `Approve ${selectedTx?.type} of $${Number(selectedTx?.amount || 0).toFixed(2)}?`
            : `Reject ${selectedTx?.type} of $${Number(selectedTx?.amount || 0).toFixed(2)}?`
        }
        message={
          txAction === 'approve'
            ? `This action will atomically update ${profile.name}'s wallet balance using database locks to prevent double processing.`
            : 'Are you sure you want to reject this request? The wallet balance will remain unchanged.'
        }
        confirmText={txAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        variant={txAction === 'approve' ? 'success' : 'danger'}
        requireReason={txAction === 'reject'}
        reasonPlaceholder="Optional reason for rejection (e.g. Invalid bank reference)..."
        isLoading={isProcessingTx}
      />
    </div>
  );
};
