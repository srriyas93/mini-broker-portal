export type UserRole = 'admin' | 'client';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  balance: string | number;
  failed_login_attempts: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export type KycStatusType = 'pending' | 'approved' | 'rejected';

export interface KycSubmission {
  id: number;
  user_id: number;
  document_type: string;
  document_number?: string | null;
  document_front_path?: string | null;
  document_back_path?: string | null;
  id_document_url?: string | null;
  address_document_url?: string | null;
  status: KycStatusType;
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'trade_profit'
  | 'trade_loss';

export type TransactionStatusType =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: string | number;
  fee: string | number;
  status: TransactionStatusType;
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
  details?: {
    message?: string;
    transaction_id?: number;
    client_id?: number;
    amount?: string | number;
    type?: string;
    status?: string;
    reason?: string;
    rejection_reason?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ClientDetailResponse {
  profile: User;
  balance: string | number;
  latest_kyc: KycSubmission | null;
  transactions: Transaction[];
}

export interface ApiErrorResponse {
  message?: string;
  remaining_minutes?: number;
  errors?: Record<string, string[]>;
}
