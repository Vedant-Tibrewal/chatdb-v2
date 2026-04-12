import { useEffect, useState } from 'react'
import { SchemaPanel } from './components/schema/SchemaPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { SettingsPanel } from './components/layout/SettingsPanel'
import { useSessionStore } from './store/sessionStore'

function App() {
  const { session, loading, error, initSession, clearError } = useSessionStore()
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  useEffect(() => {
    initSession()
  }, [initSession])

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Left sidebar */}
      {!leftCollapsed && <SchemaPanel onCollapse={() => setLeftCollapsed(true)} />}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            {leftCollapsed && (
              <button
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                title="Show schema panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-800">ChatDB</h1>
            {session && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
            )}
            {rightCollapsed && (
              <button
                onClick={() => setRightCollapsed(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                title="Show settings panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 ml-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <ChatPanel />
      </main>

      {/* Right sidebar */}
      {!rightCollapsed && <SettingsPanel onCollapse={() => setRightCollapsed(true)} />}
    </div>
  )
}

export default App
