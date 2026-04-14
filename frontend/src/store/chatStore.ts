import { create } from 'zustand';
import { api } from '../services/api';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  affected_rows?: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'query' | 'result' | 'error';
  content: string;
  // For query messages
  dbType?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'editing';
  originalQuery?: string;
  // For result messages
  result?: QueryResult;
}

// Saved query — persists in-session only (lost on refresh/close)
export interface SavedQuery {
  id: string;
  question: string;
  resultPreview: string;
  fullResult: QueryResult | null;
  savedAt: Date;
}

interface ChatStore {
  messages: ChatMessage[];
  generating: boolean;
  executing: boolean;
  savedQueries: SavedQuery[];

  sendQuestion: (sessionId: string, question: string) => Promise<void>;
  confirmQuery: (sessionId: string, messageId: string, question: string) => Promise<void>;
  cancelQuery: (messageId: string) => void;
  updateQueryText: (messageId: string, text: string) => void;
  setQueryStatus: (messageId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'editing') => void;
  clearMessages: () => void;
  saveQuery: (question: string, result: QueryResult) => void;
  removeSavedQuery: (id: string) => void;
}

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  generating: false,
  executing: false,
  savedQueries: [],

  sendQuestion: async (sessionId, question) => {
    const userMsg: ChatMessage = { id: nextId(), type: 'user', content: question };
    set((s) => ({ messages: [...s.messages, userMsg], generating: true }));

    try {
      const { query, db_type } = await api.generateQuery({ session_id: sessionId, question });
      const queryMsg: ChatMessage = {
        id: nextId(),
        type: 'query',
        content: query,
        dbType: db_type,
        status: 'pending',
        originalQuery: query,
      };
      set((s) => ({ messages: [...s.messages, queryMsg], generating: false }));
    } catch (e) {
      const errMsg: ChatMessage = { id: nextId(), type: 'error', content: (e as Error).message };
      set((s) => ({ messages: [...s.messages, errMsg], generating: false }));
    }
  },

  confirmQuery: async (sessionId, messageId, question) => {
    const { messages } = get();
    const queryMsg = messages.find((m) => m.id === messageId);
    if (!queryMsg) return;

    // Mark as confirmed
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, status: 'confirmed' as const } : m)),
      executing: true,
    }));

    try {
      const result = await api.executeQuery({
        session_id: sessionId,
        query: queryMsg.content,
        question,
      });
      const resultMsg: ChatMessage = { id: nextId(), type: 'result', content: '', result };
      set((s) => ({ messages: [...s.messages, resultMsg], executing: false }));
    } catch (e) {
      const errMsg: ChatMessage = { id: nextId(), type: 'error', content: (e as Error).message };
      set((s) => ({ messages: [...s.messages, errMsg], executing: false }));
    }
  },

  cancelQuery: (messageId) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, status: 'cancelled' as const } : m)),
    }));
  },

  updateQueryText: (messageId, text) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, content: text } : m)),
    }));
  },

  setQueryStatus: (messageId, status) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
    }));
  },

  clearMessages: () => set({ messages: [] }),

  // Save a query+result pair for later reference
  saveQuery: (question: string, result: QueryResult) => {
    const preview = result.rows.length > 0
      ? result.columns.slice(0, 3).map(c => `${c}: ${result.rows[0][c]}`).join(', ') + (result.rows.length > 1 ? ` (+${result.rows.length - 1} more)` : '')
      : result.affected_rows != null
        ? `${result.affected_rows} row${result.affected_rows !== 1 ? 's' : ''} affected`
        : 'No results';

    const saved: SavedQuery = {
      id: `saved-${Date.now()}`,
      question,
      resultPreview: preview,
      fullResult: result,
      savedAt: new Date(),
    };
    set((s) => ({ savedQueries: [...s.savedQueries, saved] }));
  },

  removeSavedQuery: (id: string) => {
    set((s) => ({ savedQueries: s.savedQueries.filter((q) => q.id !== id) }));
  },
}));
