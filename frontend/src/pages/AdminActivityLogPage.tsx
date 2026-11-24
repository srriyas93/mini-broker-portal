import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/client';
import type { ActivityLog } from '../types';
import {
  Activity,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export const AdminActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const res = await adminApi.listActivityLogs({ page: pageNum, per_page: 20 });
      setLogs(res.data);
      setPage(res.meta.current_page);
      setLastPage(res.meta.last_page);
      setTotal(res.meta.total);
    } catch {
      // Ignore background error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('approved')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          APPROVED
        </span>
      );
    }
    if (action.includes('rejected')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          REJECTED
        </span>
      );
    }
    if (action.includes('requested') || action.includes('submitted')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
          SUBMITTED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">
        {action}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Activity Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete compliance ledger showing who did what, IP addresses, and exact timestamps
          </p>
        </div>
        <button
          onClick={() => loadLogs(page)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Activity Log Feed */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No activity log records recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Event / Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">
                        {log.user?.name || `User #${log.user_id}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {log.user?.email || ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="text-slate-200 font-medium">
                        {log.details?.message || log.action}
                      </div>
                      {log.details?.reason && (
                        <div className="text-[11px] text-rose-400 mt-0.5">
                          Reason: {String(log.details.reason)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-right whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 text-xs text-slate-400">
            <div>
              Showing page {page} of {lastPage} ({total} events logged)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadLogs(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadLogs(page + 1)}
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
  );
};
