import { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useChatStore } from '../../store/chatStore';

const PROVIDER_DISPLAY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

export function SettingsPanel({ onCollapse }: { onCollapse: () => void }) {
  const { session, models, reinitialize, updateModel, loading, initSession } = useSessionStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState('');

  const updateCountdown = useCallback(() => {
    if (!session) return;
    const expires = new Date(session.expires_at).getTime();
    const now = Date.now();
    const diff = Math.max(0, expires - now);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
  }, [session]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const handleReinitialize = async () => {
    setShowConfirm(false);
    await reinitialize();
  };

  return (
    <aside className="w-64 border-l border-gray-200 bg-white p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Settings
        </h2>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          title="Collapse settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="space-y-5 flex-1">
        {/* Provider Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">LLM Provider</label>
          <select
            value={session?.model ?? ''}
            onChange={(e) => updateModel(e.target.value)}
            disabled={!session || models.length === 0}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {PROVIDER_DISPLAY[m.provider] ?? m.provider}
              </option>
            ))}
            {models.length === 0 && (
              <option value="">No providers available</option>
            )}
          </select>
        </div>

        {/* Session Info */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Session</label>
          {session ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ID</span>
                <code className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  {session.id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Database</span>
                <span className="text-xs font-medium text-gray-700">
                  {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Expires in</span>
                <span className={`text-xs font-mono font-medium ${
                  parseInt(countdown) < 5 ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {countdown}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {loading ? 'Creating session...' : 'No active session'}
            </p>
          )}
        </div>

        {/* DB Type Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Database Type</label>
          <div className="flex gap-1">
            {(['postgresql', 'mongodb'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  if (session?.db_type !== type) {
                    useChatStore.getState().clearMessages();
                    initSession(type);
                  }
                }}
                disabled={loading}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  session?.db_type === type
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                } disabled:opacity-50`}
              >
                {type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Switching creates a new session</p>
        </div>
      </div>

      {/* Reinitialize */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        {showConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Reset all data and chat history?</p>
            <div className="flex gap-2">
              <button
                onClick={handleReinitialize}
                disabled={loading}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!session || loading}
            className="w-full px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
          >
            Reinitialize Database
          </button>
        )}
      </div>
    </aside>
  );
}
