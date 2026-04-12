import { useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';

const SUGGESTIONS: Record<string, string[]> = {
  orders: [
    'Top 5 products by revenue',
    'Total revenue by region',
    'Monthly sales trend',
    'Show all orders from last quarter',
  ],
  patients: [
    'Patient count by diagnosis',
    'Average length of stay',
    'Patients by department',
    'Most common treatments',
  ],
  employees: [
    'Headcount by department',
    'Average salary by department',
    'Top 5 highest paid employees',
    'Employee count by location',
  ],
};

export function SchemaPanel({ onCollapse }: { onCollapse: () => void }) {
  const { session, schema, setPendingInput } = useSessionStore();
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
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

  const suggestions = schema
    ? schema.flatMap((t) => SUGGESTIONS[t.name] ?? [])
    : [];

  return (
    <aside className="w-60 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800">ChatDB</span>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-1 space-y-0.5">
        {/* New Chat */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New chat
        </button>

        {/* Saved Queries */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          Saved queries
        </button>
      </nav>

      {/* Database section */}
      <div className="px-2 mt-3">
        <div className="px-2.5 mb-1">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Database</p>
        </div>

        {/* DB type badge */}
        {session && (
          <div className="px-2.5 py-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
              session.db_type === 'postgresql'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-green-50 text-green-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                session.db_type === 'postgresql' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
            </span>
          </div>
        )}
      </div>

      {/* Spacer — pushes collapsible sections to bottom */}
      <div className="flex-1" />

      {/* Schema section — collapsible, bottom-anchored */}
      <div className={`flex flex-col border-t border-gray-200 ${schemaOpen ? 'min-h-0 max-h-[50%]' : ''}`}>
        <button
          onClick={() => setSchemaOpen(!schemaOpen)}
          className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 transition-colors shrink-0"
        >
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform ${schemaOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {session?.db_type === 'mongodb' ? 'Collections' : 'Tables'}
          </span>
        </button>

        {schemaOpen && (
          <div className="overflow-y-auto px-2 pb-2">
            {!schema ? (
              <div className="px-2.5 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 bg-gray-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : schema.length === 0 ? (
              <p className="text-xs text-gray-400 px-2.5">No tables found</p>
            ) : (
              <div className="space-y-0.5">
                {schema.map((table) => (
                  <div key={table.name}>
                    <button
                      onClick={() => toggleTable(table.name)}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 text-gray-400 transition-transform ${
                          expandedTables.has(table.name) ? 'rotate-90' : ''
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-gray-700 font-medium truncate">{table.name}</span>
                      <span className="ml-auto text-[10px] text-gray-400 tabular-nums">{table.row_count} rows</span>
                    </button>

                    {expandedTables.has(table.name) && (
                      <div className="ml-5 pl-2 border-l border-gray-100 mb-1">
                        {table.columns.map((col) => (
                          <div key={col.name} className="flex items-center gap-1.5 py-0.5 px-1 text-xs">
                            <span className="text-gray-600 truncate">{col.name}</span>
                            <span className="text-gray-400 font-mono text-[10px]">{col.type}</span>
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
        )}
      </div>

      {/* Suggestions section — collapsible, bottom-anchored */}
      {suggestions.length > 0 && (
        <div className={`flex flex-col border-t border-gray-200 ${suggestionsOpen ? 'min-h-0 max-h-[40%]' : ''}`}>
          <button
            onClick={() => setSuggestionsOpen(!suggestionsOpen)}
            className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg
              className={`w-3 h-3 text-gray-500 transition-transform ${suggestionsOpen ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
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
                    className="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
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
