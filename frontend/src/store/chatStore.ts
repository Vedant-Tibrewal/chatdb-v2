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

interface ChatStore {
  messages: ChatMessage[];
  generating: boolean;
  executing: boolean;

  sendQuestion: (sessionId: string, question: string) => Promise<void>;
  confirmQuery: (sessionId: string, messageId: string, question: string) => Promise<void>;
  cancelQuery: (messageId: string) => void;
  updateQueryText: (messageId: string, text: string) => void;
  setQueryStatus: (messageId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'editing') => void;
  clearMessages: () => void;
}

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}`;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  generating: false,
  executing: false,

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
}));
