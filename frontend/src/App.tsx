import { useEffect, useState } from 'react'
import { SchemaPanel } from './components/schema/SchemaPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { DashboardPanel } from './components/dashboard/DashboardPanel'
import { SettingsPanel } from './components/layout/SettingsPanel'
import { useSessionStore } from './store/sessionStore'

type ActiveView = 'chat' | 'dashboard'

function App() {
  const { loading, error, initSession, fetchDatasets, clearError } = useSessionStore()
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('chat')

  useEffect(() => {
    fetchDatasets()
    initSession()
  }, [initSession, fetchDatasets])

  return (
    <div className="flex h-screen bg-cream text-navy">
      {/* Left sidebar */}
      {!leftCollapsed && <SchemaPanel onCollapse={() => setLeftCollapsed(true)} />}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-warm-border bg-cream px-3 py-1.5">
          {/* Left: sidebar toggle */}
          <div className="flex items-center gap-2 w-40">
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="p-1.5 rounded-md hover:bg-surface text-muted transition-colors"
              title={leftCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Center: view switcher */}
          <div className="flex items-center bg-surface rounded-lg p-0.5">
            {(['chat', 'dashboard'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1 text-sm font-medium rounded-md transition-all ${
                  activeView === view
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-muted hover:text-navy-mid'
                }`}
              >
                {view === 'chat' ? 'Chat' : 'Dashboard'}
              </button>
            ))}
          </div>

          {/* Right: settings toggle */}
          <div className="flex items-center justify-end gap-2 w-40">
            {loading && (
              <span className="text-xs text-muted animate-pulse">Loading...</span>
            )}
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="p-1.5 rounded-md hover:bg-surface text-muted transition-colors"
              title={rightCollapsed ? 'Show settings' : 'Hide settings'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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

        {/* View content */}
        {activeView === 'chat' ? <ChatPanel /> : <DashboardPanel />}
      </main>

      {/* Right sidebar */}
      {!rightCollapsed && <SettingsPanel onCollapse={() => setRightCollapsed(true)} />}
    </div>
  )
}

export default App
