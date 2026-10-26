import {
  Business,
  FinancialMetrics,
  DocumentItem,
  TransactionItem,
  Meeting,
  Task,
  Recommendation,
  SystemHealth
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
      if (typeof errorDetail === 'object') {
        errorDetail = JSON.stringify(errorDetail);
      }
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export const api = {
  // System Health
  getHealth: () => request<SystemHealth>('/api/health'),
  seedSamples: () => request<{ status: string; message: string; business_ids: string[] }>('/api/seed-samples', { method: 'POST' }),

  // Businesses
  getBusinesses: () => request<Business[]>('/api/businesses'),
  getBusiness: (id: string) => request<Business>(`/api/businesses/${id}`),
  createBusiness: (data: Partial<Business>) => request<Business>('/api/businesses', { method: 'POST', body: JSON.stringify(data) }),
  updateBusiness: (id: string, data: Partial<Business>) => request<Business>(`/api/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBusiness: (id: string) => request<void>(`/api/businesses/${id}`, { method: 'DELETE' }),

  // Financial Metrics
  getMetrics: (businessId: string) => request<FinancialMetrics>(`/api/businesses/${businessId}/metrics`),

  // Documents
  getDocuments: (businessId: string) => request<DocumentItem[]>(`/api/businesses/${businessId}/documents`),
  previewDocument: (businessId: string, docId: string) => request<any>(`/api/businesses/${businessId}/documents/${docId}/preview`),
  deleteDocument: (businessId: string, docId: string) => request<void>(`/api/businesses/${businessId}/documents/${docId}`, { method: 'DELETE' }),
  uploadDocument: async (businessId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/businesses/${businessId}/documents`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json() as Promise<DocumentItem>;
  },

  // Transactions
  getTransactions: (businessId: string) => request<TransactionItem[]>(`/api/businesses/${businessId}/transactions`),
  clearTransactions: (businessId: string) => request<void>(`/api/businesses/${businessId}/transactions`, { method: 'DELETE' }),
  importTransactions: (businessId: string, docId: string, mapping: any) =>
    request<{ imported_count: number; skipped_count: number; total_processed: number; errors: string[] }>(
      `/api/businesses/${businessId}/transactions/import/${docId}`,
      { method: 'POST', body: JSON.stringify({ mapping }) }
    ),

  // Meetings
  getMeetings: (businessId: string) => request<Meeting[]>(`/api/businesses/${businessId}/meetings`),
  getMeeting: (meetingId: string) => request<Meeting>(`/api/meetings/${meetingId}`),
  createMeeting: (businessId: string, question: string, participants?: string[]) =>
    request<Meeting>(`/api/businesses/${businessId}/meetings`, {
      method: 'POST',
      body: JSON.stringify({ question, participants })
    }),
  cancelMeeting: (meetingId: string) => request<{ message: string; status: string }>(`/api/meetings/${meetingId}/cancel`, { method: 'POST' }),
  followUpMeeting: (meetingId: string, question: string) =>
    request<Meeting>(`/api/meetings/${meetingId}/follow-up`, {
      method: 'POST',
      body: JSON.stringify({ question })
    }),
  updateRecommendationStatus: (meetingId: string, recId: string, status: string) =>
    request<Recommendation>(`/api/meetings/${meetingId}/recommendations/${recId}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
  getReportPdfUrl: (meetingId: string) => `${API_BASE}/api/meetings/${meetingId}/report.pdf`,

  // Tasks
  getTasks: (businessId: string) => request<Task[]>(`/api/businesses/${businessId}/tasks`),
  createTask: (businessId: string, data: Partial<Task>) => request<Task>(`/api/businesses/${businessId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: string, data: Partial<Task>) => request<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (taskId: string) => request<void>(`/api/tasks/${taskId}`, { method: 'DELETE' })
};
