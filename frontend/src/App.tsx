import { SchemaPanel } from './components/schema/SchemaPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { SettingsPanel } from './components/layout/SettingsPanel'

function App() {
  return (
    <div className="flex h-screen bg-white">
      <SchemaPanel />
      <ChatPanel />
      <SettingsPanel />
    </div>
  )
}

export default App
