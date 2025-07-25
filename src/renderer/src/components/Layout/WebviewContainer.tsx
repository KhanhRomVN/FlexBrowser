import React, { useRef } from 'react'
import useAccountStore from '../../store/useAccountStore'

const WebviewContainer: React.FC<{ url: string; isElectron: boolean }> = ({ url, isElectron }) => {
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const { accounts, activeAccountId } = useAccountStore()
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const activeTabId = activeAccount?.activeTabId

  if (isElectron) {
    return (
      <div className="flex-1 relative">
        {accounts.length > 0 ? (
          accounts.map((acc) =>
            acc.tabs.map((tab) => (
              <webview
                key={`${acc.id}-${tab.id}`}
                src={tab.url}
                allowpopups
                className={`absolute top-0 left-0 w-full h-full ${
                  acc.id === activeAccountId && tab.id === activeTabId ? '' : 'hidden'
                }`}
              />
            ))
          )
        ) : (
          <webview
            ref={webviewRef}
            src={url}
            allowpopups
            className="absolute top-0 left-0 w-full h-full"
          />
        )}
      </div>
    )
  }

  return <iframe src={url} className="flex-1" style={{ width: '100%', height: '100%' }} />
}

export default WebviewContainer
