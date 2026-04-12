export interface Session {
  id: string;
  dbType: 'postgresql' | 'mongodb';
  model: string;
  createdAt: string;
  expiresAt: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  rowCount: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  query?: string;
  result?: QueryResult;
  timestamp: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface AnalyticsCard {
  id: string;
  title: string;
  type: 'metric' | 'bar' | 'line' | 'pie' | 'area' | 'histogram' | 'donut' | 'scatter';
  data: unknown;
  value?: string | number;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
}
