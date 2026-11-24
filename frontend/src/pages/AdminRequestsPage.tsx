import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import type { Transaction, KycSubmission } from '../types';
import {
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminRequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'kyc'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Transaction Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txAction, setTxAction] = useState<'approve' | 'reject'>('approve');
  const [isProcessingTx, setIsProcessingTx] = useState(false);

  // KYC Modal State
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycAction, setKycAction] = useState<'approve' | 'reject'>('approve');
  const [isProcessingKyc, setIsProcessingKyc] = useState(false);

  // Doc Viewer Modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSubmission, setViewerSubmission] = useState<KycSubmission | null>(null);
  const [viewerType, setViewerType] = useState<'id' | 'address'>('id');

  const loadRequests = async () => {
    setIsLoading(true);
    setFeedbackError(null);
    try {
      const [txRes, clientsRes] = await Promise.all([
        adminApi.listTransactions({ status: 'pending', per_page: 50 }),
        adminApi.listClients({ kyc_status: 'pending', per_page: 50 }),
      ]);
      setTransactions(txRes.data);

      // Collect pending KYC submissions from clients
      const pendingKycs: KycSubmission[] = [];
      for (const client of clientsRes.data) {
        const fullClient = await adminApi.getClient(client.id);
        if (fullClient.latest_kyc && fullClient.latest_kyc.status === 'pending') {
          pendingKycs.push({ ...fullClient.latest_kyc, user: fullClient.profile });
        }
      }
      setKycSubmissions(pendingKycs);
    } catch {
      setFeedbackError('Failed to load pending requests queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleTxConfirm = async (reason?: string) => {
    if (!selectedTx) return;
    setIsProcessingTx(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      if (txAction === 'approve') {
        await adminApi.approveTransaction(selectedTx.id);
        setFeedbackSuccess(`Transaction #${selectedTx.id} approved successfully.`);
      } else {
        await adminApi.rejectTransaction(selectedTx.id, reason);
        setFeedbackSuccess(`Transaction #${selectedTx.id} rejected.`);
      }
      setTxModalOpen(false);
      setSelectedTx(null);
      await loadRequests();
    } catch {
      setFeedbackError('Failed to process transaction.');
    } finally {
      setIsProcessingTx(false);
    }
  };

  const handleKycConfirm = async (reason?: string) => {
    if (!selectedKyc) return;
    setIsProcessingKyc(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      if (kycAction === 'approve') {
        await adminApi.approveKyc(selectedKyc.id);
        setFeedbackSuccess(`KYC submission #${selectedKyc.id} approved.`);
      } else {
        await adminApi.rejectKyc(selectedKyc.id, reason || 'Compliance criteria not met.');
        setFeedbackSuccess(`KYC submission #${selectedKyc.id} rejected.`);
      }
      setKycModalOpen(false);
      setSelectedKyc(null);
      await loadRequests();
    } catch {
      setFeedbackError('Failed to update KYC submission.');
    } finally {
      setIsProcessingKyc(false);
    }
  };

  const handleViewDoc = (submission: KycSubmission, type: 'id' | 'address') => {
    setViewerSubmission(submission);
    setViewerType(type);
    setViewerOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5" />
            <span>Operational Backlog</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Pending Requests</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and atomically process deposit, withdrawal, and identity compliance requests
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}

      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <span>Pending Transactions</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-900/60 text-[11px] font-mono">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'kyc'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <span>Pending KYC Reviews</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-900/60 text-[11px] font-mono">
            {kycSubmissions.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Transactions Queue */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span>Loading transactions queue...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              All caught up! There are no pending transactions in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reference / Note</th>
                    <th className="py-3 px-4">Requested</th>
                    <th className="py-3 px-4 text-right">Decision</th>
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
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">
                          {tx.user?.name || `Client #${tx.user_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {tx.user?.email || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={tx.type === 'deposit' ? 'text-emerald-400' : 'text-slate-200'}
                        >
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(Number(tx.amount))}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        {tx.description || tx.reference_id || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setTxAction('approve');
                              setTxModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setTxAction('reject');
                              setTxModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: KYC Reviews Queue */}
      {activeTab === 'kyc' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span>Loading KYC submissions...</span>
            </div>
          ) : kycSubmissions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              No pending KYC submissions to review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Document Type</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Preview Files</th>
                    <th className="py-3 px-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {kycSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">
                          {sub.user?.name || `Client #${sub.user_id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {sub.user?.email || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold capitalize text-white">
                        {sub.document_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(sub.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewDoc(sub, 'id')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ID</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewDoc(sub, 'address')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Address</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKyc(sub);
                              setKycAction('approve');
                              setKycModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKyc(sub);
                              setKycAction('reject');
                              setKycModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
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
            ? 'This action will atomically update the client wallet balance using database row locks.'
            : 'Rejecting this request will mark it as cancelled without modifying client funds.'
        }
        confirmText={txAction === 'approve' ? 'Approve' : 'Reject'}
        variant={txAction === 'approve' ? 'success' : 'danger'}
        requireReason={txAction === 'reject'}
        reasonPlaceholder="Reason for rejection (e.g. Incomplete payment proof)..."
        isLoading={isProcessingTx}
      />

      {/* KYC Modal */}
      <ConfirmModal
        isOpen={kycModalOpen}
        onClose={() => {
          setKycModalOpen(false);
          setSelectedKyc(null);
        }}
        onConfirm={handleKycConfirm}
        title={kycAction === 'approve' ? 'Approve Identity Verification?' : 'Reject KYC Submission?'}
        message={
          kycAction === 'approve'
            ? `Confirm approval for ${selectedKyc?.user?.name || 'this client'}? This will unlock full withdrawal capabilities.`
            : `Please specify the reason for rejecting ${selectedKyc?.user?.name || 'this client'}'s documents.`
        }
        confirmText={kycAction === 'approve' ? 'Approve KYC' : 'Reject KYC'}
        variant={kycAction === 'approve' ? 'success' : 'danger'}
        requireReason={kycAction === 'reject'}
        reasonPlaceholder="e.g. Illegible passport photo, proof of address older than 3 months..."
        isLoading={isProcessingKyc}
      />

      {/* Blob Viewer */}
      {viewerSubmission && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewerSubmission(null);
          }}
          title={`${viewerType === 'id' ? 'Identity Document' : 'Proof of Address'} - ${
            viewerSubmission.user?.name || `Client #${viewerSubmission.user_id}`
          }`}
          submissionId={viewerSubmission.id}
          type={viewerType}
        />
      )}
    </div>
  );
};
