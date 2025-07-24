import { useState, useRef } from 'react'
import './styles.css'

function App() {
  const [url, setUrl] = useState('https://www.google.com')
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const isElectron = !!(window as any).process?.versions?.electron

  const handleGo = () => {
    let val = url.trim()
    if (!/^https?:\/\//.test(val)) {
      val = 'http://' + val
    }
    // use React state to update src attribute instead of loadURL
    setUrl(val)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex p-2 bg-gray-100 dark:bg-gray-800 items-center space-x-2">
        <input
          className="flex-1 px-2 py-1 border rounded"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
        />
        <button
          className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleGo}
        >
          Go
        </button>
      </div>
      {isElectron ? (
        <webview
          ref={webviewRef}
          src={url}
          allowpopups
          className="flex-1"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <iframe src={url} className="flex-1" style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  )
}

export default App
