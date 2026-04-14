import { useState, useEffect, useRef, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
} from 'recharts';
import { useSessionStore } from '../../store/sessionStore';
import { useChatStore, type ChatMessage, type QueryResult } from '../../store/chatStore';

// ── Save button for query results ────────────────────────────

function SaveQueryButton({ question, result }: { question: string; result: QueryResult }) {
  const { saveQuery, savedQueries } = useChatStore();
  const [justSaved, setJustSaved] = useState(false);

  // Check if this question is already saved (simple dedup by question text)
  const alreadySaved = savedQueries.some((sq) => sq.question === question);

  const handleSave = () => {
    if (alreadySaved) return;
    saveQuery(question, result);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <button
      onClick={handleSave}
      disabled={alreadySaved}
      className={`flex items-center gap-1 px-2.5 py-1 mt-1.5 text-[11px] rounded-md border transition-colors ${
        alreadySaved || justSaved
          ? 'border-green-200 bg-green-50 text-green-600 cursor-default'
          : 'border-warm-border bg-surface text-muted hover:text-navy-mid hover:border-steel'
      }`}
      title={alreadySaved ? 'Already saved' : 'Save this query and result'}
    >
      <svg className="w-3.5 h-3.5" fill={alreadySaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
      {justSaved ? 'Saved!' : alreadySaved ? 'Saved' : 'Save'}
    </button>
  );
}

// ── Chart colors ──────────────────────────────────────────────
const CHART_COLORS = ['#3A5F8A', '#5E7D5F', '#6B93B5', '#9BBAD1', '#C5D9E8', '#B5705A', '#D4A574', '#8B6F5C'];
const GRID_STROKE = 'rgba(212,207,200,0.5)';
const TIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #D6D2CC', background: '#EDEAE4' };

type ChartType = 'bar' | 'horizontal_bar' | 'pie' | 'line' | 'area' | 'none';

// ── Auto chart suggestion ─────────────────────────────────────

function suggestChart(result: QueryResult): { type: ChartType; labelCol: string; valueCol: string; insight: string } {
  const { columns, rows } = result;
  const none = { type: 'none' as ChartType, labelCol: '', valueCol: '', insight: '' };

  if (!rows.length || !columns.length || columns.length < 2) return none;
  if (result.affected_rows != null) return none;
  if (rows.length > 200) return none;

  // Identify column roles
  const numericCols: string[] = [];
  const categoryCols: string[] = [];

  for (const col of columns) {
    const sample = rows.slice(0, 20).map(r => r[col]).filter(v => v != null);
    const numCount = sample.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')).length;
    if (numCount > sample.length * 0.7) {
      numericCols.push(col);
    } else {
      categoryCols.push(col);
    }
  }

  if (!numericCols.length || !categoryCols.length) return none;

  const labelCol = categoryCols[0];
  const valueCol = numericCols[0];
  const uniqueLabels = new Set(rows.map(r => String(r[labelCol])));

  // Generate insight
  const values = rows.map(r => Number(r[valueCol])).filter(v => !isNaN(v));
  const total = values.reduce((s, v) => s + v, 0);
  const maxIdx = values.indexOf(Math.max(...values));
  const topLabel = rows[maxIdx]?.[labelCol];
  const topVal = values[maxIdx];

  let insight = '';
  let type: ChartType = 'bar';

  if (uniqueLabels.size <= 6 && rows.length <= 6) {
    // Few categories — pie
    type = 'pie';
    const pct = total > 0 ? ((topVal / total) * 100).toFixed(0) : '0';
    insight = `${topLabel} leads at ${pct}% of the total.`;
  } else if (uniqueLabels.size <= 20) {
    // Moderate categories — horizontal bar if labels are long
    const avgLabelLen = rows.reduce((s, r) => s + String(r[labelCol]).length, 0) / rows.length;
    type = avgLabelLen > 8 ? 'horizontal_bar' : 'bar';
    insight = `${topLabel} has the highest ${valueCol} (${typeof topVal === 'number' ? topVal.toLocaleString() : topVal}).`;
  } else {
    // Many data points — line/area
    type = 'area';
    const avg = total / values.length;
    insight = `Average ${valueCol}: ${avg.toLocaleString(undefined, { maximumFractionDigits: 1 })} across ${rows.length} entries.`;
  }

  return { type, labelCol, valueCol, insight };
}

// ── Result Chart ──────────────────────────────────────────────

function ResultChart({ result }: { result: QueryResult }) {
  const suggestion = suggestChart(result);
  const [chartType, setChartType] = useState<ChartType>(suggestion.type);
  const [showInsight, setShowInsight] = useState(true);

  if (suggestion.type === 'none') return null;

  const { labelCol, valueCol, insight } = suggestion;
  const data = result.rows.map(r => ({
    name: String(r[labelCol] ?? ''),
    value: Number(r[valueCol]) || 0,
  }));

  const chartOptions: { value: ChartType; label: string }[] = [
    { value: 'bar', label: 'Bar' },
    { value: 'horizontal_bar', label: 'H-Bar' },
    { value: 'pie', label: 'Pie' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' },
  ];

  return (
    <div className="rounded-xl border border-warm-border bg-surface shadow-sm overflow-hidden mt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-border">
        <span className="text-[11px] text-muted uppercase tracking-wide font-mono">Auto Chart</span>
        <div className="flex items-center gap-1">
          {chartOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setChartType(opt.value)}
              className={`px-2 py-0.5 text-[10px] rounded-md font-mono transition-colors ${
                chartType === opt.value
                  ? 'bg-navy text-white'
                  : 'text-muted hover:text-navy-mid hover:bg-cream'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : chartType === 'horizontal_bar' ? (
            <BarChart data={[...data].sort((a, b) => a.value - b.value)} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}
                label={{ position: 'right', fontSize: 10, fill: '#7A8696' }}
              >
                {data.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : chartType === 'pie' ? (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                {data.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TIP_STYLE} />
            </PieChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Line type="monotone" dataKey="value" stroke="#3A5F8A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Area type="monotone" dataKey="value" fill="#3A5F8A" fillOpacity={0.12} stroke="#3A5F8A" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      {insight && (
        <div className="px-4 pb-3">
          <button onClick={() => setShowInsight(!showInsight)} className="text-[10px] text-steel hover:text-navy-mid font-mono transition-colors">
            {showInsight ? 'Hide insight' : 'Show insight'}
          </button>
          {showInsight && (
            <p className="text-xs text-navy-mid mt-1 leading-relaxed">{insight}</p>
          )}
        </div>
      )}
    </div>
  );
}

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
      <div className="rounded-xl border border-warm-border bg-gradient-to-br from-cream to-surface p-5 inline-block shadow-sm">
        <p className="text-[11px] text-muted uppercase tracking-wide mb-1 font-mono">{columns[0]}</p>
        <p className="text-3xl font-bold text-navy">{String(value)}</p>
        <p className="text-[10px] text-muted mt-2 font-mono">{executionTimeMs.toFixed(0)}ms</p>
      </div>
    );
  }

  // Write operation result
  if (affectedRows != null) {
    return (
      <div className="rounded-xl border border-warm-border bg-gradient-to-br from-cream to-surface p-5 inline-block shadow-sm">
        <p className="text-sm font-medium text-navy-mid">{affectedRows} row{affectedRows !== 1 ? 's' : ''} affected</p>
        <p className="text-[10px] text-muted mt-1 font-mono">{executionTimeMs.toFixed(0)}ms</p>
      </div>
    );
  }

  // Empty result set (e.g. find with no matches)
  if (columns.length === 0 && rows.length === 0) {
    return (
      <div className="rounded-xl border border-warm-border bg-gradient-to-br from-cream to-surface p-5 inline-block shadow-sm">
        <p className="text-sm font-medium text-muted">No results found</p>
        <p className="text-[10px] text-muted mt-1 font-mono">{executionTimeMs.toFixed(0)}ms</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warm-border bg-cream overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2 bg-surface border-b border-warm-border flex items-center justify-between">
        <span className="text-xs text-muted font-mono font-medium">{rowCount} row{rowCount !== 1 ? 's' : ''} · {executionTimeMs.toFixed(0)}ms</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-0.5 text-xs text-muted hover:bg-surface-2 rounded-md disabled:opacity-30 transition-colors">‹</button>
            <span className="text-[11px] text-muted tabular-nums font-mono">{page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-2 py-0.5 text-xs text-muted hover:bg-surface-2 rounded-md disabled:opacity-30 transition-colors">›</button>
          </div>
        )}
      </div>
      {/* Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-[13px] font-mono">
          <thead className="bg-surface/80 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left px-4 py-2 font-semibold text-navy-mid border-b border-warm-border whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border/50">
            {pageRows.map((row, i) => (
              <tr key={i} className={`hover:bg-pill/40 transition-colors ${i % 2 === 0 ? 'bg-cream' : 'bg-surface/30'}`}>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-navy-mid whitespace-nowrap max-w-[300px] truncate text-xs">{row[col] == null ? <span className="text-muted/50 italic">null</span> : String(row[col])}</td>
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
    <div className={`rounded-xl overflow-hidden border border-warm-border shadow-sm ${isPending || isEditing ? 'ring-1 ring-steel/40' : isCancelled ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-warm-border">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-muted hover:text-navy-mid transition-colors">
            <svg className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted font-mono">
            {msg.dbType === 'postgresql' ? 'SQL' : 'MongoDB'}
          </span>
          {isConfirmed && <span className="text-[10px] text-green-600 font-medium">✓ Executed</span>}
          {isCancelled && <span className="text-[10px] text-muted">Cancelled</span>}
        </div>
        <button onClick={handleCopy} className="px-2 py-0.5 text-[11px] text-muted hover:text-navy-mid hover:bg-surface-2 rounded-md transition-colors font-mono" title="Copy">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Query content */}
      {!collapsed && (
        <div className="bg-cream">
          {isEditing ? (
            <div className="px-4 py-3">
              <textarea
                value={msg.content}
                onChange={(e) => onUpdateText(e.target.value)}
                className="w-full font-mono text-sm bg-surface text-navy border border-warm-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-steel resize-y min-h-[60px]"
                rows={Math.min(msg.content.split('\n').length + 1, 12)}
              />
            </div>
          ) : (
            <Highlight theme={themes.github} code={msg.content.trim()} language={msg.dbType === 'postgresql' ? 'sql' : 'javascript'}>
              {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed px-4 py-3 overflow-x-auto" style={{ ...style, background: 'transparent' }}>
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(isPending || isEditing) && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border-t border-warm-border">
          <button onClick={onConfirm} className="px-4 py-1.5 text-xs font-semibold bg-steel text-white rounded-lg hover:bg-steel/90 transition-colors shadow-sm">
            ▶ Run
          </button>
          {isEditing ? (
            <button onClick={() => onSetStatus('pending')} className="px-3 py-1.5 text-xs font-medium text-navy-mid bg-cream border border-warm-border rounded-lg hover:bg-surface transition-colors">
              Cancel edit
            </button>
          ) : (
            <button onClick={onEdit} className="px-3 py-1.5 text-xs font-medium text-navy-mid bg-cream border border-warm-border rounded-lg hover:bg-surface transition-colors">
              Edit
            </button>
          )}
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-cream border border-warm-border rounded-lg hover:bg-red-50 transition-colors">
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

  // Find the user question that led to a result message
  const getQuestionForResult = useCallback((resultMsgId: string) => {
    const idx = messages.findIndex((m) => m.id === resultMsgId);
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
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasMessages && !generating ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-pill flex items-center justify-center">
                <svg className="w-6 h-6 text-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-navy mb-1">Ask a question about your data</h2>
              <p className="text-sm text-muted">
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
                    <div className="bg-steel text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%] text-sm">
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
                    <ResultChart result={msg.result} />
                    <SaveQueryButton question={getQuestionForResult(msg.id)} result={msg.result} />
                  </div>
                );
              }

              if (msg.type === 'error') {
                return (
                  <div key={msg.id} className="max-w-[90%]">
                    <div className="rounded-xl border border-warm-border bg-surface px-4 py-3 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <span className="text-amber-500 mt-0.5 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </span>
                        <p className="text-sm text-navy-mid leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Generating indicator */}
            {generating && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-4 h-4 border-2 border-steel border-t-transparent rounded-full animate-spin" />
                Generating query...
              </div>
            )}

            {/* Executing indicator */}
            {executing && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                Running query...
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-warm-border bg-surface px-4 pt-3 pb-2">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={session ? 'Ask a question in plain English...' : 'Waiting for session...'}
            disabled={!session || generating || executing}
            className="flex-1 px-4 py-2.5 rounded-lg border border-warm-border bg-cream text-sm text-navy focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent disabled:opacity-50 transition-colors placeholder:text-muted"
          />
          <button
            onClick={handleSend}
            disabled={!session || !input.trim() || generating || executing}
            className="px-4 py-2.5 rounded-lg bg-steel text-white text-sm font-medium hover:bg-steel/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-[10px] text-muted mt-1.5 text-center">
          Your schema metadata is sent to the selected LLM provider for query generation.
        </p>
      </div>
    </div>
  );
}
