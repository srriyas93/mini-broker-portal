import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldCheck, ArrowRightLeft, UserCheck, TrendingUp, Lock } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4" />
          <span>Mini Broker Portal</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Trading & Client Management Portal
        </h1>
        <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
          Secure multi-role brokerage architecture with Laravel 11 API, Sanctum authentication, KYC verification, and transaction ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
        {/* Admin Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-sky-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Administrator Access</h2>
              <span className="text-xs text-sky-400 font-mono">Role: admin</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 mb-4">
            <div><span className="text-slate-500">Email:</span> admin@test.com</div>
            <div><span className="text-slate-500">Password:</span> Admin@123</div>
            <div><span className="text-slate-500">Initial Balance:</span> $10,000.00</div>
          </div>
          <p className="text-xs text-slate-400">
            Full management of client KYC reviews, system activity audits, and transaction approvals.
          </p>
        </div>

        {/* Client Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Client Portal</h2>
              <span className="text-xs text-emerald-400 font-mono">Role: client</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 mb-4">
            <div><span className="text-slate-500">Email:</span> client@test.com</div>
            <div><span className="text-slate-500">Password:</span> Client@123</div>
            <div><span className="text-slate-500">Initial Balance:</span> $5,000.00</div>
          </div>
          <p className="text-xs text-slate-400">
            Deposit/withdrawal transactions, KYC document submissions, and trading balance overview.
          </p>
        </div>
      </div>

      {/* Database Schema Status */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 max-w-3xl mx-auto">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Core Domain Models & Migrations Ready</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div className="font-bold text-white">users</div>
            <div className="text-slate-500 text-[11px] mt-1">Role, Phone, Balance, Lockouts</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div className="font-bold text-white">kyc_submissions</div>
            <div className="text-slate-500 text-[11px] mt-1">Passports, Status, Reviewer</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div className="font-bold text-white">transactions</div>
            <div className="text-slate-500 text-[11px] mt-1">Deposits, Withdrawals, Fees</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div className="font-bold text-white">activity_logs</div>
            <div className="text-slate-500 text-[11px] mt-1">Audit Trail, IP, Agent</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
          <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <span>MiniBroker</span>
              </Link>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Laravel 11 API + Sanctum
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </main>

          <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
            Mini Broker Portal • React 18 TS + Vite + Tailwind + TanStack Query + Laravel 11
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
