export function ChatPanel() {
  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-gray-400 text-center mt-20">
          Ask a question about your data
        </p>
      </div>
      <div className="border-t border-gray-200 p-4">
        <input
          type="text"
          placeholder="Ask a question in plain English..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </main>
  );
}
