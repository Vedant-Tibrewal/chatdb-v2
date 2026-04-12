import { create } from 'zustand';
import { api, type SessionResponse } from '../services/api';

interface SessionStore {
  // Session state
  session: SessionResponse | null;
  dbType: 'postgresql' | 'mongodb';
  models: { id: string; name: string; provider: string }[];
  loading: boolean;
  error: string | null;

  // Actions
  initSession: (dbType?: 'postgresql' | 'mongodb') => Promise<void>;
  refreshSession: () => Promise<void>;
  reinitialize: () => Promise<void>;
  updateModel: (model: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  setDbType: (dbType: 'postgresql' | 'mongodb') => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  dbType: 'postgresql',
  models: [],
  loading: false,
  error: null,

  initSession: async (dbType) => {
    const type = dbType ?? get().dbType;
    set({ loading: true, error: null });
    try {
      const session = await api.createSession(type);
      set({ session, dbType: type, loading: false });
      // Fetch models in background
      get().fetchModels();
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  refreshSession: async () => {
    const { session } = get();
    if (!session) return;
    try {
      const updated = await api.getSession(session.id);
      set({ session: updated });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  reinitialize: async () => {
    const { session } = get();
    if (!session) return;
    set({ loading: true, error: null });
    try {
      await api.reinitialize(session.id);
      const updated = await api.getSession(session.id);
      set({ session: updated, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  updateModel: async (model: string) => {
    const { session } = get();
    if (!session) return;
    try {
      const updated = await api.updateModel(session.id, model);
      set({ session: updated });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchModels: async () => {
    try {
      const models = await api.getModels();
      set({ models });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setDbType: (dbType) => set({ dbType }),

  clearError: () => set({ error: null }),
}));
