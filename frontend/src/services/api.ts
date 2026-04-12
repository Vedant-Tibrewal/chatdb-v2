const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Session
  createSession: () => request('/session', { method: 'POST' }),
  getSession: (id: string) => request(`/session/${id}`),
  deleteSession: (id: string) => request(`/session/${id}`, { method: 'DELETE' }),
  reinitialize: (id: string) => request(`/session/${id}/reinitialize`, { method: 'POST' }),

  // Query
  generateQuery: (body: unknown) => request('/query/generate', { method: 'POST', body: JSON.stringify(body) }),
  executeQuery: (body: unknown) => request('/query/execute', { method: 'POST', body: JSON.stringify(body) }),

  // Schema
  getSchema: (sessionId: string) => request(`/schema/${sessionId}`),

  // Upload
  uploadDataset: (sessionId: string, formData: FormData) =>
    fetch(`${API_BASE}/upload/${sessionId}`, { method: 'POST', body: formData }).then(r => r.json()),

  // Analytics
  getAnalytics: (sessionId: string) => request(`/analytics/${sessionId}`),
};
