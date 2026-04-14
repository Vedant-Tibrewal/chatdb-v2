import { useState, useMemo, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useChatStore } from '../../store/chatStore';

const SUGGESTIONS: Record<string, string[]> = {
  // E-Commerce
  customers: [
    'Top 10 customers by total spend',
    'Customer count by membership tier',
    'New signups per month in 2024',
  ],
  products: [
    'Top 5 highest rated products',
    'Average price by category',
    'Products with low stock (< 20)',
  ],
  orders: [
    'Monthly revenue trend',
    'Orders by payment method',
    'Average order value by shipping method',
  ],
  ecommerce_orders: [
    'Monthly revenue trend',
    'Orders by payment method',
    'Average order value by shipping method',
  ],
  order_items: [
    'Best selling products by quantity',
    'Revenue by product category',
    'Average discount per order',
  ],
  // Sports
  teams: [
    'Teams in the Western conference',
  ],
  players: [
    'Highest paid players by position',
    'Average salary by team',
    'Players with 10+ years experience',
  ],
  games: [
    'Highest scoring games this season',
    'Average attendance by team',
    'Home win percentage per team',
  ],
  player_stats: [
    'Top scorers this season',
    'Points per game ranking',
  ],
  // Medical
  doctors: [
    'Doctors by specialization',
    'Most experienced doctors',
  ],
  patients: [
    'Patient count by diagnosis',
    'Age distribution of patients',
    'Patients by insurance type',
  ],
  visits: [
    'Average length of stay by department',
    'Total cost by visit type',
    'Monthly admission trends',
  ],
  prescriptions: [
    'Most prescribed medications',
    'Prescriptions per doctor',
  ],
  // Sales
  sales_reps: [
    'Top reps by region',
    'Rep count by seniority level',
  ],
  catalog: [
    'Most expensive products in catalog',
    'Products by category',
  ],
  deals: [
    'Total pipeline value by stage',
    'Win rate by deal source',
    'Average deal size by product category',
  ],
  activities: [
    'Activity count by type',
    'Average call duration by rep',
  ],
  // Cybersecurity
  assets: [
    'Assets by criticality level',
    'Online vs offline assets',
  ],
  vulnerabilities: [
    'Vulnerability count by severity',
  ],
  security_events: [
    'Top 10 source IPs by event count',
    'Alert status breakdown',
  ],
  scan_results: [
    'Open findings by severity',
    'Remediation action distribution',
  ],
  // HR
  employees: [
    'Headcount by department',
    'Average salary by location',
    'Top 5 highest paid employees',
  ],
  performance_reviews: [
    'Average rating by department',
    'Employees with Outstanding reviews',
  ],
  salary_history: [
    'Biggest salary increases',
    'Promotions per year',
  ],
  // Restaurant (prefixed — collision with ecommerce orders)
  restaurant_orders: [
    'Orders by table number',
    'Average order total',
    'Orders by payment method',
  ],
  // Education
  students: [
    'Student count by major',
    'Average GPA by department',
  ],
  courses: [
    'Courses by department',
    'Highest enrollment courses',
  ],
  enrollments: [
    'Enrollments per semester',
    'Average grade by course',
  ],
  // Real Estate
  properties: [
    'Properties by type',
    'Average listing price by city',
  ],
  agents: [
    'Agent count by office',
    'Top performing agents by sales',
  ],
  transactions: [
    'Total transaction volume by month',
    'Sales vs rentals',
  ],
  // Restaurant
  menu_items: [
    'Menu items by category',
    'Average price per category',
  ],
  order_details: [
    'Most ordered items',
    'Average quantity per order',
  ],
};

const TABLE_DOMAINS: Record<string, string> = {
  customers: 'E-Commerce',
  products: 'E-Commerce',
  orders: 'E-Commerce',
  order_items: 'E-Commerce',
  ecommerce_orders: 'E-Commerce',
  teams: 'Sports',
  players: 'Sports',
  games: 'Sports',
  player_stats: 'Sports',
  doctors: 'Medical',
  patients: 'Medical',
  visits: 'Medical',
  prescriptions: 'Medical',
  sales_reps: 'Sales',
  catalog: 'Sales',
  deals: 'Sales',
  activities: 'Sales',
  assets: 'Cybersecurity',
  vulnerabilities: 'Cybersecurity',
  security_events: 'Cybersecurity',
  scan_results: 'Cybersecurity',
  employees: 'HR',
  performance_reviews: 'HR',
  salary_history: 'HR',
  students: 'Education',
  courses: 'Education',
  enrollments: 'Education',
  properties: 'Real Estate',
  agents: 'Real Estate',
  transactions: 'Real Estate',
  menu_items: 'Restaurant',
  order_details: 'Restaurant',
  restaurant_orders: 'Restaurant',
  sensor_readings: 'IoT',
};

const DOMAIN_ORDER = ['E-Commerce', 'Sports', 'Medical', 'Sales', 'Cybersecurity', 'HR', 'Education', 'Real Estate', 'Restaurant', 'IoT'];

export function SchemaPanel({ onCollapse: _onCollapse }: { onCollapse: () => void }) {
  const { session, schema, setPendingInput } = useSessionStore();
  const { messages, clearMessages, savedQueries, removeSavedQuery } = useChatStore();
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(DOMAIN_ORDER));
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [savedBannerDismissed, setSavedBannerDismissed] = useState(false);
  const [expandedSavedQuery, setExpandedSavedQuery] = useState<string | null>(null);

  // Start a fresh chat — clears messages but preserves saved queries and session
  const handleNewChat = () => {
    clearMessages();
    setShowNewChatConfirm(false);
  };

  // Close saved queries modal on Escape key
  useEffect(() => {
    if (!showSavedQueries) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSavedQueries(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSavedQueries]);

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const groupedSchema = useMemo(() => {
    if (!schema) return null;
    const groups: Record<string, typeof schema> = {};
    const ungrouped: typeof schema = [];
    for (const table of schema) {
      const domain = TABLE_DOMAINS[table.name];
      if (domain) {
        (groups[domain] ??= []).push(table);
      } else {
        ungrouped.push(table);
      }
    }
    const ordered: { domain: string; tables: typeof schema }[] = [];
    for (const d of DOMAIN_ORDER) {
      if (groups[d]) ordered.push({ domain: d, tables: groups[d] });
    }
    if (ungrouped.length > 0) ordered.push({ domain: 'Other', tables: ungrouped });
    return ordered;
  }, [schema]);

  const suggestions = schema
    ? schema.flatMap((t) => SUGGESTIONS[t.name] ?? [])
    : [];

  return (
    <aside className="w-60 border-r border-warm-border bg-surface flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-steel flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-navy">ChatDB</span>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-1 space-y-0.5">
        {/* New Chat */}
        <button
          onClick={() => messages.length > 0 ? setShowNewChatConfirm(true) : handleNewChat()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-navy-mid rounded-lg hover:bg-surface-2 transition-colors"
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New chat
        </button>

        {/* Saved Queries */}
        <button
          onClick={() => setShowSavedQueries(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-navy-mid rounded-lg hover:bg-surface-2 transition-colors"
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          Saved queries
          {savedQueries.length > 0 && (
            <span className="ml-auto text-[10px] bg-pill text-pill-text px-1.5 py-0.5 rounded-full">{savedQueries.length}</span>
          )}
        </button>
      </nav>

      {/* New Chat confirmation dialog */}
      {showNewChatConfirm && (
        <div className="mx-2 mb-2 p-3 rounded-lg border border-warm-border bg-cream shadow-sm">
          <p className="text-xs text-navy-mid mb-2.5">Start a new chat? This will clear your current conversation.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewChatConfirm(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-navy-mid bg-surface border border-warm-border rounded-lg hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNewChat}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-steel text-white rounded-lg hover:bg-steel/90 transition-colors"
            >
              New Chat
            </button>
          </div>
        </div>
      )}

      {/* Database section */}
      <div className="px-2 mt-3">
        <div className="px-2.5 mb-1">
          <p className="text-[11px] font-medium text-navy uppercase tracking-wider">Database</p>
        </div>

        {/* DB type badge */}
        {session && (
          <div className="px-2.5 py-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
              session.db_type === 'postgresql'
                ? 'bg-pill text-steel'
                : 'bg-green-50 text-green-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                session.db_type === 'postgresql' ? 'bg-steel' : 'bg-green-500'
              }`} />
              {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
            </span>
          </div>
        )}
      </div>

      {/* Spacer — pushes collapsible sections to bottom */}
      <div className="flex-1" />

      {/* Schema section — collapsible, bottom-anchored */}
      <div className={`flex flex-col border-t border-warm-border ${schemaOpen ? 'min-h-0 max-h-[50%]' : ''}`}>
        <button
          onClick={() => setSchemaOpen(!schemaOpen)}
          className="flex items-center gap-1 px-3 py-1.5 hover:bg-surface-2 transition-colors shrink-0"
        >
          <svg
            className={`w-3 h-3 text-muted transition-transform ${schemaOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[11px] font-semibold text-navy uppercase tracking-wider">
            {session?.db_type === 'mongodb' ? 'Collections' : 'Tables'}
          </span>
        </button>

        {schemaOpen && (
          <div className="overflow-y-auto px-2 pb-2">
            {!groupedSchema ? (
              <div className="px-2.5 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 bg-surface-2 rounded-md animate-pulse" />
                ))}
              </div>
            ) : groupedSchema.length === 0 ? (
              <p className="text-xs text-muted px-2.5">No tables found</p>
            ) : (
              <div className="space-y-1">
                {groupedSchema.map(({ domain, tables }) => (
                  <div key={domain}>
                    <button
                      onClick={() => toggleDomain(domain)}
                      className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-navy uppercase tracking-wider rounded hover:bg-surface-2 transition-colors"
                    >
                      <svg
                        className={`w-2.5 h-2.5 text-muted transition-transform ${
                          expandedDomains.has(domain) ? 'rotate-90' : ''
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {domain}
                      <span className="ml-auto text-[10px] text-muted font-normal normal-case">{tables.length}</span>
                    </button>

                    {expandedDomains.has(domain) && (
                      <div className="ml-2 space-y-0.5">
                        {tables.map((table) => (
                          <div key={table.name}>
                            <button
                              onClick={() => toggleTable(table.name)}
                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md hover:bg-surface-2 transition-colors"
                            >
                              <svg
                                className={`w-3 h-3 text-muted transition-transform ${
                                  expandedTables.has(table.name) ? 'rotate-90' : ''
                                }`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-navy-mid font-medium truncate">{table.name}</span>
                              <span className="ml-auto text-[10px] text-muted tabular-nums">{table.row_count} rows</span>
                            </button>

                            {expandedTables.has(table.name) && (
                              <div className="ml-5 pl-2 border-l border-warm-border mb-1">
                                {table.columns.map((col) => (
                                  <div key={col.name} className="flex items-center gap-1.5 py-0.5 px-1 text-xs">
                                    <span className="text-navy-mid truncate">{col.name}</span>
                                    <span className="text-muted font-mono text-[10px]">{col.type}</span>
                                    {col.nullable && (
                                      <span className="text-[9px] text-yellow-600 bg-yellow-50 px-1 rounded">null</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions section — collapsible, bottom-anchored */}
      {suggestions.length > 0 && (
        <div className={`flex flex-col border-t border-warm-border ${suggestionsOpen ? 'min-h-0 max-h-[40%]' : ''}`}>
          <button
            onClick={() => setSuggestionsOpen(!suggestionsOpen)}
            className="flex items-center gap-1 px-3 py-1.5 hover:bg-surface-2 transition-colors shrink-0"
          >
            <svg
              className={`w-3 h-3 text-muted transition-transform ${suggestionsOpen ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[11px] font-semibold text-navy uppercase tracking-wider">
              Suggestions
            </span>
          </button>

          {suggestionsOpen && (
            <div className="px-3 pb-3 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setPendingInput(s)}
                    className="px-2.5 py-1 text-xs text-pill-text bg-pill rounded-full hover:border hover:border-steel transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Queries modal — slides in from the left over the sidebar */}
      {showSavedQueries && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setShowSavedQueries(false)}
        >
          {/* Panel */}
          <div
            className="w-80 max-w-[90vw] h-full bg-surface border-r border-warm-border shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-warm-border">
              <h2 className="text-sm font-semibold text-navy">Saved Queries</h2>
              <button
                onClick={() => setShowSavedQueries(false)}
                className="p-1 rounded-md hover:bg-surface-2 text-muted transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Warning banner — dismissible per session */}
            {!savedBannerDismissed && (
              <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Demo Feature:</strong> Saved queries are stored in-session only.
                    They will be lost when you refresh or close the app.
                  </p>
                </div>
                <button
                  onClick={() => setSavedBannerDismissed(true)}
                  className="text-amber-400 hover:text-amber-600 shrink-0 mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Saved queries list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedQueries.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 mx-auto text-muted/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  <p className="text-xs text-muted">No saved queries yet</p>
                  <p className="text-[10px] text-muted mt-1">Click the bookmark icon on any result to save it</p>
                </div>
              ) : (
                savedQueries.map((sq) => (
                  <div key={sq.id} className="rounded-lg border border-warm-border bg-cream overflow-hidden">
                    <button
                      onClick={() => setExpandedSavedQuery(expandedSavedQuery === sq.id ? null : sq.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface/50 transition-colors"
                    >
                      <p className="text-sm text-navy font-medium leading-snug">{sq.question}</p>
                      <p className="text-[11px] text-muted mt-1 truncate">{sq.resultPreview}</p>
                      <p className="text-[10px] text-muted/60 mt-1 font-mono">
                        {sq.savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>

                    {/* Expanded view — show full result table */}
                    {expandedSavedQuery === sq.id && sq.fullResult && (
                      <div className="border-t border-warm-border p-2 bg-surface/30 max-h-60 overflow-auto">
                        <table className="w-full text-[11px] font-mono">
                          <thead>
                            <tr>
                              {sq.fullResult.columns.map((col) => (
                                <th key={col} className="text-left px-2 py-1 font-semibold text-navy-mid whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-warm-border/30">
                            {sq.fullResult.rows.slice(0, 50).map((row, i) => (
                              <tr key={i}>
                                {sq.fullResult!.columns.map((col) => (
                                  <td key={col} className="px-2 py-1 text-navy-mid whitespace-nowrap truncate max-w-[150px]">
                                    {row[col] == null ? <span className="text-muted/40 italic">null</span> : String(row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {sq.fullResult.rows.length > 50 && (
                          <p className="text-[10px] text-muted text-center mt-1">Showing 50 of {sq.fullResult.row_count} rows</p>
                        )}
                      </div>
                    )}

                    {/* Remove button */}
                    <div className="flex justify-end px-2 py-1 border-t border-warm-border/50">
                      <button
                        onClick={() => removeSavedQuery(sq.id)}
                        className="text-[10px] text-muted hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
