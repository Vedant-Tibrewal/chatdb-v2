import { useSessionStore } from '../../store/sessionStore';

export function SchemaPanel({ onCollapse }: { onCollapse: () => void }) {
  const { session } = useSessionStore();

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
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {/* New Chat */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New chat
        </button>

        {/* Schema */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
          </svg>
          Schema
        </button>

        {/* Saved Queries */}
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          Saved queries
        </button>

        <div className="!mt-4 px-2.5">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Database</p>
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
      </nav>

      {/* Footer — Schema placeholder */}
      <div className="px-3 py-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400">Schema details in Checkpoint 7</p>
      </div>
    </aside>
  );
}
