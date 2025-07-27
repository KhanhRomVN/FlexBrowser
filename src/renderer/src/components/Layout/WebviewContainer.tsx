import React, { useRef, useEffect } from 'react'
import useAccountStore from '../../store/useAccountStore'

const WebviewContainer: React.FC<{ url: string; isElectron: boolean }> = ({ url, isElectron }) => {
  const updateTab = useAccountStore((state) => state.updateTab)
  const { accounts, activeAccountId } = useAccountStore()
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const activeTabId = activeAccount?.activeTabId || ''
  const webviewRef = useRef<Electron.WebviewTag>(null)

  useEffect(() => {
    if (!isElectron || !activeAccountId || !activeTabId) return
    const el = webviewRef.current
    if (!el) return
    const handleTitle = (e: any) => {
      const newTitle = e.title
      updateTab(activeAccountId, activeTabId, { title: newTitle })
    }
    const handleNavigate = (_event: any, navigationUrl: string) => {
      const hostname = new URL(navigationUrl).hostname
      updateTab(activeAccountId, activeTabId, {
        url: navigationUrl,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
    }
    el.addEventListener('page-title-updated', handleTitle as any)
    el.addEventListener('did-navigate', handleNavigate as any)
    return () => {
      el.removeEventListener('page-title-updated', handleTitle as any)
      el.removeEventListener('did-navigate', handleNavigate as any)
    }
  }, [activeAccountId, activeTabId, isElectron, updateTab])

  if (isElectron) {
    return (
      <div className="flex-1 relative pb-14">
        {accounts.length > 0 ? (
          accounts.map((acc) =>
            acc.tabs.map((tab) => (
              <webview
                key={`${acc.id}-${tab.id}`}
                src={tab.url}
                allowpopups
                ref={acc.id === activeAccountId && tab.id === activeTabId ? webviewRef : undefined}
                className={`absolute top-0 left-0 right-0 bottom-0 ${
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
            className="absolute top-0 left-0 right-0 bottom-0"
          />
        )}
      </div>
    )
  }

  return <iframe src={url} className="flex-1" style={{ width: '100%', height: '100%' }} />
}

export default WebviewContainer
