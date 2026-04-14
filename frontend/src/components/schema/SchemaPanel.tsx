import { useState, useMemo } from 'react';
import { useSessionStore } from '../../store/sessionStore';

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
    'Players averaging 10+ assists',
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
    'Critical vulnerabilities with exploits',
    'Vulnerability count by severity',
  ],
  security_events: [
    'Events by type this month',
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
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(DOMAIN_ORDER));
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

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
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-navy-mid rounded-lg hover:bg-surface-2 transition-colors">
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New chat
        </button>

        {/* Saved Queries */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-navy-mid rounded-lg hover:bg-surface-2 transition-colors">
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          Saved queries
        </button>
      </nav>

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
    </aside>
  );
}
