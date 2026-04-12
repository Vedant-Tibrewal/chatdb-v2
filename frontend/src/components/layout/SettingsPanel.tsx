export function SettingsPanel() {
  return (
    <aside className="w-64 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Settings
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
          <select className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option>GPT-4o</option>
            <option>GPT-4o-mini</option>
            <option>Claude 3.5 Sonnet</option>
            <option>Gemini 1.5 Pro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Session</label>
          <p className="text-xs text-gray-400">No active session</p>
        </div>

        <button className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">
          Reinitialize Database
        </button>
      </div>
    </aside>
  );
}
