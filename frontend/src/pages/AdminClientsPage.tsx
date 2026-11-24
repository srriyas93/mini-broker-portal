import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { StatusBadge } from '../components/StatusBadge';
import type { User } from '../types';
import {
  Users,
  Search,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const AdminClientsPage: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [kycStatus, setKycStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadClients = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const res = await adminApi.listClients({
        search: debouncedSearch.trim() || undefined,
        kyc_status: kycStatus !== 'all' ? kycStatus : undefined,
        page: pageNum,
        per_page: 15,
      });

      setClients(res.data);
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
    setPage(1);
    loadClients(1);
  }, [debouncedSearch, kycStatus]);

  const handlePageChange = (newPage: number) => {
    loadClients(newPage);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Client Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Clients Roster</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter by KYC status, and manage client accounts
          </p>
        </div>
        <button
          onClick={() => loadClients(page)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={kycStatus}
            onChange={(e) => setKycStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="all">All KYC Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="none">Not Submitted</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span>Loading clients roster...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No clients match the specified search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">Name / Email</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {clients.map((client) => {
                  return (
                    <tr key={client.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-400">
                        #{client.id.toString().padStart(5, '0')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{client.name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{client.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(Number(client.balance))}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={
                            // Check if client has a latest submission status or default
                            // (We'll safely render role/kyc)
                            (client as unknown as { latest_kyc?: { status: string } })
                              ?.latest_kyc?.status || 'not_submitted'
                          }
                          type="kyc"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 text-xs text-slate-400">
            <div>
              Showing page {page} of {lastPage} ({total} total clients)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
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
