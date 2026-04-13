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
  dataset: string | null;
  model: string;
  created_at: string;
  expires_at: string;
}

export const api = {
  // Session
  getDatasets: () =>
    request<{ name: string; tables: string[] }[]>('/session/datasets'),
  createSession: (dbType?: 'postgresql' | 'mongodb', dataset?: string) =>
    request<SessionResponse>('/session', {
      method: 'POST',
      body: JSON.stringify({ db_type: dbType ?? 'postgresql', dataset: dataset ?? null }),
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
  getModels: () => request<{ id: string; name: string; provider: string }[]>('/query/models'),
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
  uploadDataset: async (sessionId: string, formData: FormData) => {
    const res = await fetch(`${API_BASE}/upload/${sessionId}`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Upload error: ${res.status}`);
    }
    return res.json() as Promise<{ table_name: string; columns: { name: string; type: string }[]; row_count: number }>;
  },

  // Analytics
  getAnalytics: (sessionId: string) => request(`/analytics/${sessionId}`),
};
