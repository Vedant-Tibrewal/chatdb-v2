import { useSessionStore } from '../../store/sessionStore';

export function ChatPanel() {
  const { session, loading } = useSessionStore();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !session ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Setting up your session...</p>
            </div>
          </div>
        ) : (
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
        )}
      </div>
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={session ? 'Ask a question in plain English...' : 'Waiting for session...'}
            disabled={!session}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white disabled:opacity-50 transition-colors placeholder:text-gray-400"
          />
          <button
            disabled={!session}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
