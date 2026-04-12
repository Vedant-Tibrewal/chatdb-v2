import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useChatStore, type ChatMessage } from '../../store/chatStore';

// ── Result Table ──────────────────────────────────────────────

function ResultTable({ columns, rows, rowCount, executionTimeMs, affectedRows }: {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  affectedRows?: number;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 100;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  // Single-value metric card
  if (columns.length === 1 && rows.length === 1) {
    const value = rows[0][columns[0]];
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 inline-block">
        <p className="text-xs text-gray-400 mb-1">{columns[0]}</p>
        <p className="text-2xl font-semibold text-gray-800">{String(value)}</p>
        <p className="text-[10px] text-gray-400 mt-1">{executionTimeMs.toFixed(0)}ms</p>
      </div>
    );
  }

  // Write operation result
  if (columns.length === 0 && affectedRows !== undefined) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 inline-block">
        <p className="text-sm text-gray-700">{affectedRows} row{affectedRows !== 1 ? 's' : ''} affected</p>
        <p className="text-[10px] text-gray-400 mt-1">{executionTimeMs.toFixed(0)}ms</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">{rowCount} row{rowCount !== 1 ? 's' : ''} · {executionTimeMs.toFixed(0)}ms</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30">‹</button>
            <span className="text-[10px] text-gray-400">{page + 1}/{totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30">›</button>
          </div>
        )}
      </div>
      {/* Table */}
      <div className="overflow-x-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-1.5 font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[300px] truncate">{row[col] == null ? <span className="text-gray-300">null</span> : String(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Query Block ───────────────────────────────────────────────

function QueryBlock({ msg, onConfirm, onCancel, onEdit, onUpdateText, onSetStatus }: {
  msg: ChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onUpdateText: (text: string) => void;
  onSetStatus: (status: 'pending' | 'editing') => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isEditing = msg.status === 'editing';
  const isPending = msg.status === 'pending';
  const isConfirmed = msg.status === 'confirmed';
  const isCancelled = msg.status === 'cancelled';

  return (
    <div className={`rounded-lg border ${isPending || isEditing ? 'border-blue-200 bg-blue-50/30' : isCancelled ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600">
            <svg className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-[11px] font-medium text-gray-500 uppercase">
            {msg.dbType === 'postgresql' ? 'SQL' : 'MongoDB'}
          </span>
          {isConfirmed && <span className="text-[10px] text-green-600">✓ Executed</span>}
          {isCancelled && <span className="text-[10px] text-gray-400">Cancelled</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded" title="Copy">
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Query content */}
      {!collapsed && (
        <div className="px-3 py-2">
          {isEditing ? (
            <textarea
              value={msg.content}
              onChange={(e) => onUpdateText(e.target.value)}
              className="w-full font-mono text-xs bg-white border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y min-h-[60px]"
              rows={Math.min(msg.content.split('\n').length + 1, 12)}
            />
          ) : (
            <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-words">{msg.content}</pre>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(isPending || isEditing) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200/60">
          <button onClick={onConfirm} className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Run
          </button>
          {isEditing ? (
            <button onClick={() => onSetStatus('pending')} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Cancel edit
            </button>
          ) : (
            <button onClick={onEdit} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              Edit
            </button>
          )}
          <button onClick={onCancel} className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────

export function ChatPanel() {
  const { session, pendingInput, setPendingInput, fetchSchema } = useSessionStore();
  const { messages, generating, executing, sendQuestion, confirmQuery, cancelQuery, updateQueryText, setQueryStatus } = useChatStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pending input from suggestion chips
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      setPendingInput(null);
      inputRef.current?.focus();
    }
  }, [pendingInput, setPendingInput]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generating, executing]);

  // Track last user question for each query message
  const getQuestionForQuery = useCallback((queryMsgId: string) => {
    const idx = messages.findIndex((m) => m.id === queryMsgId);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].type === 'user') return messages[i].content;
    }
    return '';
  }, [messages]);

  const handleSend = () => {
    if (!session || !input.trim() || generating || executing) return;
    sendQuestion(session.id, input.trim());
    setInput('');
  };

  const handleConfirm = async (msgId: string) => {
    if (!session) return;
    const question = getQuestionForQuery(msgId);
    await confirmQuery(session.id, msgId, question);
    // Refresh schema after potential mutation
    fetchSchema();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasMessages && !generating ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-700 mb-1">Ask a question about your data</h2>
              <p className="text-sm text-gray-400">
                Type a question in plain English below and ChatDB will generate and run the query for you.
              </p>
            </div>
          </div>
        ) : (
          /* Message thread */
          <div className="max-w-3xl mx-auto space-y-3">
            {messages.map((msg) => {
              if (msg.type === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%] text-sm">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.type === 'query') {
                return (
                  <div key={msg.id} className="max-w-[90%]">
                    <QueryBlock
                      msg={msg}
                      onConfirm={() => handleConfirm(msg.id)}
                      onCancel={() => cancelQuery(msg.id)}
                      onEdit={() => setQueryStatus(msg.id, 'editing')}
                      onUpdateText={(text) => updateQueryText(msg.id, text)}
                      onSetStatus={(status) => setQueryStatus(msg.id, status)}
                    />
                  </div>
                );
              }

              if (msg.type === 'result' && msg.result) {
                return (
                  <div key={msg.id} className="max-w-[90%]">
                    <ResultTable
                      columns={msg.result.columns}
                      rows={msg.result.rows}
                      rowCount={msg.result.row_count}
                      executionTimeMs={msg.result.execution_time_ms}
                      affectedRows={msg.result.affected_rows}
                    />
                  </div>
                );
              }

              if (msg.type === 'error') {
                return (
                  <div key={msg.id} className="max-w-[90%]">
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Generating indicator */}
            {generating && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Generating query...
              </div>
            )}

            {/* Executing indicator */}
            {executing && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                Running query...
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={session ? 'Ask a question in plain English...' : 'Waiting for session...'}
            disabled={!session || generating || executing}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white disabled:opacity-50 transition-colors placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!session || !input.trim() || generating || executing}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
