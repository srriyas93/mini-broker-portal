import axios from 'axios';
import type {
  User,
  AuthResponse,
  KycSubmission,
  Transaction,
  PaginatedResponse,
  ClientDetailResponse,
  ActivityLog,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const getStoredUser = (): User | null => {
  const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
};

export const saveAuthData = (token: string, user: User, remember: boolean): void => {
  if (remember) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('remember_me', 'true');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  } else {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('remember_me');
  }
};

export const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('remember_me');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthData();
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Typed API services
export const authApi = {
  login: async (credentials: { email: string; password: string; remember?: boolean }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/login', credentials);
    return res.data;
  },
  register: async (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
  }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/register', payload);
    return res.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/logout');
  },
  me: async (): Promise<{ user: User }> => {
    const res = await api.get<{ user: User }>('/me');
    return res.data;
  },
};

export const kycApi = {
  upload: async (formData: FormData): Promise<{ message: string; submission: KycSubmission }> => {
    const res = await api.post<{ message: string; submission: KycSubmission }>('/kyc/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  status: async (): Promise<{ submission: KycSubmission | null }> => {
    const res = await api.get<{ submission: KycSubmission | null }>('/kyc/status');
    return res.data;
  },
  getDocumentBlob: async (submissionId: number, type: 'id' | 'address'): Promise<Blob> => {
    const res = await api.get<Blob>(`/kyc-documents/${submissionId}/${type}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export const transactionApi = {
  list: async (page = 1, perPage = 15): Promise<PaginatedResponse<Transaction>> => {
    const res = await api.get<PaginatedResponse<Transaction>>('/transactions', {
      params: { page, per_page: perPage },
    });
    return res.data;
  },
  create: async (payload: {
    type: 'deposit' | 'withdrawal';
    amount: number | string;
    note?: string;
  }): Promise<{ message: string; transaction: Transaction }> => {
    const res = await api.post<{ message: string; transaction: Transaction }>('/transactions', payload);
    return res.data;
  },
};

export const adminApi = {
  listClients: async (params?: {
    search?: string;
    kyc_status?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<User>> => {
    const res = await api.get<PaginatedResponse<User>>('/admin/clients', { params });
    return res.data;
  },
  getClient: async (id: number): Promise<ClientDetailResponse> => {
    const res = await api.get<ClientDetailResponse>(`/admin/clients/${id}`);
    return res.data;
  },
  reviewKyc: async (
    submissionId: number,
    payload: { status: 'approved' | 'rejected'; rejection_reason?: string }
  ): Promise<{ message: string; submission: KycSubmission }> => {
    const res = await api.post<{ message: string; submission: KycSubmission }>(
      `/admin/kyc/${submissionId}/review`,
      payload
    );
    return res.data;
  },
  approveKyc: async (submissionId: number): Promise<{ message: string; submission: KycSubmission }> => {
    const res = await api.post<{ message: string; submission: KycSubmission }>(`/admin/kyc/${submissionId}/approve`);
    return res.data;
  },
  rejectKyc: async (
    submissionId: number,
    rejectionReason: string
  ): Promise<{ message: string; submission: KycSubmission }> => {
    const res = await api.post<{ message: string; submission: KycSubmission }>(
      `/admin/kyc/${submissionId}/reject`,
      { rejection_reason: rejectionReason }
    );
    return res.data;
  },
  listTransactions: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<Transaction>> => {
    const res = await api.get<PaginatedResponse<Transaction>>('/admin/transactions', { params });
    return res.data;
  },
  approveTransaction: async (id: number): Promise<{ message: string; transaction: Transaction }> => {
    const res = await api.post<{ message: string; transaction: Transaction }>(`/admin/transactions/${id}/approve`);
    return res.data;
  },
  rejectTransaction: async (
    id: number,
    reason?: string
  ): Promise<{ message: string; transaction: Transaction }> => {
    const res = await api.post<{ message: string; transaction: Transaction }>(`/admin/transactions/${id}/reject`, {
      reason,
    });
    return res.data;
  },
  listActivityLogs: async (params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<ActivityLog>> => {
    const res = await api.get<PaginatedResponse<ActivityLog>>('/admin/activity-logs', { params });
    return res.data;
  },
};

export default api;
