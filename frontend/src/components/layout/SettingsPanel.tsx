import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';

const PROVIDER_DISPLAY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

export function SettingsPanel({ onCollapse }: { onCollapse: () => void }) {
  const { session, models, reinitialize, updateModel, loading, initSession, fetchSchema, dataset, datasets } = useSessionStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ table_name: string; row_count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <aside className="w-64 border-l border-warm-border bg-surface-2 p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
          Settings
        </h2>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-surface text-muted"
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
          <label className="block text-xs font-medium text-muted mb-1.5">LLM Provider</label>
          <select
            value={session?.model ?? ''}
            onChange={(e) => updateModel(e.target.value)}
            disabled={!session || models.length === 0}
            className="w-full px-2.5 py-1.5 text-sm border border-warm-border rounded-lg bg-surface text-navy-mid focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent disabled:opacity-50"
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
          <label className="block text-xs font-medium text-muted mb-1.5">Session</label>
          {session ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">ID</span>
                <code className="text-xs font-mono text-navy-mid bg-surface px-1.5 py-0.5 rounded">
                  {session.id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Database</span>
                <span className="text-xs font-medium text-navy-mid">
                  {session.db_type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Expires in</span>
                <span className={`text-xs font-mono font-medium ${
                  parseInt(countdown) < 5 ? 'text-red-600' : 'text-navy-mid'
                }`}>
                  {countdown}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              {loading ? 'Creating session...' : 'No active session'}
            </p>
          )}
        </div>

        {/* DB Type Selector */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Database Type</label>
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
                    ? 'border-steel/30 bg-pill text-steel'
                    : 'border-warm-border bg-surface text-muted hover:bg-surface hover:text-navy-mid'
                } disabled:opacity-50`}
              >
                {type === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-1">Switching creates a new session</p>
        </div>

        {/* Dataset Selector */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Dataset</label>
          <select
            value={dataset ?? ''}
            onChange={(e) => {
              const val = e.target.value || null;
              useChatStore.getState().clearMessages();
              initSession(undefined, val);
            }}
            disabled={loading}
            className="w-full px-2.5 py-1.5 text-sm border border-warm-border rounded-lg bg-surface text-navy-mid focus:outline-none focus:ring-2 focus:ring-steel focus:border-transparent disabled:opacity-50 capitalize"
          >
            <option value="">All datasets</option>
            {datasets.map((ds) => (
              <option key={ds.name} value={ds.name}>
                {ds.name} ({ds.tables.length} tables)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted mt-1">Switching creates a new session</p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Upload Dataset</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !session) return;
              setUploading(true);
              setUploadResult(null);
              try {
                const formData = new FormData();
                formData.append('file', file);
                const result = await api.uploadDataset(session.id, formData);
                setUploadResult({ table_name: result.table_name, row_count: result.row_count });
                fetchSchema();
              } catch (err) {
                setUploadResult(null);
                useSessionStore.getState().setError((err as Error).message || 'Upload failed');
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!session || uploading || loading}
            className="w-full px-3 py-2 text-xs font-medium text-navy-mid bg-surface rounded-lg hover:bg-surface-2 border border-warm-border disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 border-2 border-steel border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload CSV / JSON
              </>
            )}
          </button>
          {uploadResult && (
            <p className="text-[10px] text-green-600 mt-1">
              Loaded {uploadResult.row_count} rows into "{uploadResult.table_name}"
            </p>
          )}
          <p className="text-[10px] text-muted mt-1">Creates or replaces a table in your session</p>
        </div>
      </div>

      {/* Reinitialize */}
      <div className="mt-6 pt-4 border-t border-warm-border">
        {showConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-navy-mid">Reset all data and chat history?</p>
            <div className="flex gap-2">
              <button
                onClick={handleReinitialize}
                disabled={loading}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-surface text-navy-mid rounded-lg hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!session || loading}
            className="w-full text-xs font-medium text-muted hover:text-navy-mid disabled:opacity-50 transition-colors py-1"
          >
            Reinitialize Database
          </button>
        )}
      </div>
    </aside>
  );
}
