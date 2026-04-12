import { create } from 'zustand';
import { api, type SessionResponse } from '../services/api';
import { useChatStore } from './chatStore';

export interface SchemaTable {
  name: string;
  columns: { name: string; type: string; nullable: boolean }[];
  row_count: number;
}

interface SessionStore {
  // Session state
  session: SessionResponse | null;
  dbType: 'postgresql' | 'mongodb';
  models: { id: string; name: string; provider: string }[];
  schema: SchemaTable[] | null;
  pendingInput: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  initSession: (dbType?: 'postgresql' | 'mongodb') => Promise<void>;
  refreshSession: () => Promise<void>;
  reinitialize: () => Promise<void>;
  updateModel: (model: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  fetchSchema: () => Promise<void>;
  setDbType: (dbType: 'postgresql' | 'mongodb') => void;
  setPendingInput: (input: string | null) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  dbType: 'postgresql',
  models: [],
  schema: null,
  pendingInput: null,
  loading: false,
  error: null,

  initSession: async (dbType) => {
    const type = dbType ?? get().dbType;
    set({ loading: true, error: null });
    try {
      const session = await api.createSession(type);
      set({ session, dbType: type, loading: false });
      // Fetch models and schema in background
      get().fetchModels();
      get().fetchSchema();
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
    set({ loading: true, error: null, schema: null });
    try {
      await api.reinitialize(session.id);
      const updated = await api.getSession(session.id);
      set({ session: updated, loading: false });
      useChatStore.getState().clearMessages();
      get().fetchSchema();
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

  fetchSchema: async () => {
    const { session } = get();
    if (!session) return;
    try {
      const data = await api.getSchema(session.id);
      set({ schema: data.tables });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setDbType: (dbType) => set({ dbType }),
  setPendingInput: (input) => set({ pendingInput: input }),

  clearError: () => set({ error: null }),
}));
