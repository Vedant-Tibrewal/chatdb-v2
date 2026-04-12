const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export interface SessionResponse {
  id: string;
  db_type: 'postgresql' | 'mongodb';
  model: string;
  created_at: string;
  expires_at: string;
}

export const api = {
  // Session
  createSession: (dbType?: 'postgresql' | 'mongodb') =>
    request<SessionResponse>('/session', {
      method: 'POST',
      body: dbType ? JSON.stringify({ db_type: dbType }) : undefined,
    }),
  getSession: (id: string) => request<SessionResponse>(`/session/${id}`),
  deleteSession: (id: string) => request(`/session/${id}`, { method: 'DELETE' }),
  reinitialize: (id: string) =>
    request<{ detail: string; expires_at: string }>(`/session/${id}/reinitialize`, { method: 'POST' }),
  updateModel: (id: string, model: string) =>
    request<SessionResponse>(`/session/${id}/model`, {
      method: 'PUT',
      body: JSON.stringify({ model }),
    }),

  // Query
  getModels: () => request<string[]>('/query/models'),
  generateQuery: (body: { session_id: string; question: string }) =>
    request<{ query: string; db_type: string }>('/query/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  executeQuery: (body: { session_id: string; query: string; question?: string }) =>
    request<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number; execution_time_ms: number; affected_rows?: number }>('/query/execute', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Schema
  getSchema: (sessionId: string) =>
    request<{ db_type: string; tables: { name: string; columns: { name: string; type: string; nullable: boolean }[]; row_count: number }[] }>(`/schema/${sessionId}`),

  // Upload
  uploadDataset: (sessionId: string, formData: FormData) =>
    fetch(`${API_BASE}/upload/${sessionId}`, { method: 'POST', body: formData }).then(r => r.json()),

  // Analytics
  getAnalytics: (sessionId: string) => request(`/analytics/${sessionId}`),
};
