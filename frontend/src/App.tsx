import { useEffect, useState, useRef } from 'react'
import { SchemaPanel } from './components/schema/SchemaPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { DashboardPanel } from './components/dashboard/DashboardPanel'
import { SettingsPanel } from './components/layout/SettingsPanel'
import { useSessionStore } from './store/sessionStore'

type ActiveView = 'chat' | 'dashboard'

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [error, onDismiss]);

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-in">
      <span className="text-sm text-red-700">{error}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 ml-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Expandable "About" dropdown — shows a plain-English description of the app
function AppDescription() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-muted hover:text-navy-mid transition-colors"
      >
        Query your database in plain English — no SQL required.
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-warm-border bg-cream shadow-lg p-4 z-50 text-sm text-navy-mid leading-relaxed space-y-3">
          <div>
            <p className="font-semibold text-navy mb-1">What is this?</p>
            <p>A tool that lets you ask questions about your data in <strong>plain English</strong>. No SQL, no code — just type what you want to know and get instant answers.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">How does it work?</p>
            <p>Your question is sent to an <strong>AI model</strong> (GPT-4o, Claude, or Gemini) which converts it into a database query. The query runs on your <strong>PostgreSQL</strong> or <strong>MongoDB</strong> database, and the results are shown as tables and charts — all in real time.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">Who is it for?</p>
            <p><strong>Business teams</strong>, analysts, and stakeholders who need data access without writing code. Think of it as a bridge between your data and the people who make decisions with it.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">Why does it matter?</p>
            <p>It removes the bottleneck of waiting for data engineers to run queries. Anyone can <strong>self-serve</strong> their data needs — faster decisions, fewer handoffs.</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
          {/* Left: sidebar toggle + app subtitle */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="p-1.5 rounded-md hover:bg-surface text-muted transition-colors"
              title={leftCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <AppDescription />
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

        {/* Error banner — auto-dismiss after 8s */}
        {error && (
          <ErrorBanner error={error} onDismiss={clearError} />
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
