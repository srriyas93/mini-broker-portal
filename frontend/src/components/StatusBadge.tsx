import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'kyc' | 'transaction' | 'role';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'kyc',
  className = '',
}) => {
  const norm = status.toLowerCase();

  // KYC Badges
  if (type === 'kyc') {
    switch (norm) {
      case 'approved':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/40 ${className}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Not Submitted</span>
          </span>
        );
    }
  }

  // Transaction Status Badges
  if (type === 'transaction') {
    switch (norm) {
      case 'completed':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'pending':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
        );
      case 'cancelled':
      case 'failed':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{norm === 'cancelled' ? 'Cancelled' : 'Failed'}</span>
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/40 ${className}`}
          >
            <span>{status}</span>
          </span>
        );
    }
  }

  // Role Badge
  if (norm === 'admin') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 ${className}`}
      >
        ADMIN
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-700/50 text-slate-300 border border-slate-600/40 ${className}`}
    >
      CLIENT
    </span>
  );
};
