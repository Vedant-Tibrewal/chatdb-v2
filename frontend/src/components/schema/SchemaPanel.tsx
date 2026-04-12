import { useSessionStore } from '../../store/sessionStore';

export function SchemaPanel({ onCollapse }: { onCollapse: () => void }) {
  const { session } = useSessionStore();

  return (
    <aside className="w-72 border-r border-gray-200 bg-white p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Schema
        </h2>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          title="Collapse schema panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {session ? (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              session.db_type === 'postgresql'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
            </span>
          </div>
          <p className="text-sm text-gray-400">Schema will load in Checkpoint 7</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No active session</p>
        </div>
      )}
    </aside>
  );
}
