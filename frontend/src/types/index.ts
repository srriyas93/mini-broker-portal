export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'client';
  phone?: string | null;
  balance: string | number;
  failed_login_attempts: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycSubmission {
  id: number;
  user_id: number;
  document_type: string;
  document_number?: string | null;
  document_front_path?: string | null;
  document_back_path?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade_profit' | 'trade_loss';
  amount: string | number;
  fee: string | number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_id?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface ActivityLog {
  id: number;
  user_id?: number | null;
  action: string;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface AuthResponse {
  token: string;
  user: User;
}

