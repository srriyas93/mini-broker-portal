import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Auth Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Client Pages
import { ClientDashboard } from './pages/ClientDashboard';
import { KycPage } from './pages/KycPage';
import { TransactionsPage } from './pages/TransactionsPage';

// Admin Pages
import { AdminClientsPage } from './pages/AdminClientsPage';
import { AdminClientDetailPage } from './pages/AdminClientDetailPage';
import { AdminRequestsPage } from './pages/AdminRequestsPage';
import { AdminActivityLogPage } from './pages/AdminActivityLogPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
            <Navbar />

            <main className="flex-1 pb-16">
              <Routes>
                {/* Guest Routes */}
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <GuestRoute>
                      <RegisterPage />
                    </GuestRoute>
                  }
                />

                {/* Client Area (Role: client) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRole="client">
                      <ClientDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kyc"
                  element={
                    <ProtectedRoute requiredRole="client">
                      <KycPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute requiredRole="client">
                      <TransactionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Area (Role: admin) */}
                <Route
                  path="/admin/clients"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminClientDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/requests"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminRequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/activity-logs"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminActivityLogPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback / Index Redirection */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-800/80 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div>Mini Broker Portal • Multi-Role Brokerage Architecture</div>
                <div className="font-mono text-[11px] text-slate-600">
                  Laravel 11 API + Sanctum • React 18 + TypeScript + Vite + Tailwind
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
