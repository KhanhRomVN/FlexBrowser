import React, { useRef, useEffect } from 'react'
import useAccountStore from '../../store/useAccountStore'
import { useGlobalAudioStore } from '../../store/useGlobalAudioStore'

interface WebviewContainerProps {
  url: string
  isElectron: boolean
  mediaMode?: boolean
  tabId: string
}

const WebviewContainer: React.FC<WebviewContainerProps> = ({
  url,
  isElectron,
  mediaMode,
  tabId
}) => {
  const updateTab = useAccountStore((state) => state.updateTab)
  const { accounts, activeAccountId } = useAccountStore()
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const activeTabId = activeAccount?.activeTabId || ''
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const setAudioState = useGlobalAudioStore((state) => state.setAudioState)

  useEffect(() => {
    if (!isElectron || !activeAccountId || !activeTabId) return
    const el = webviewRef.current
    if (!el) return

    const handleDomReady = () => {
      const currentUrl = el.getURL()
      const hostname = new URL(currentUrl).hostname
      // update tab state on initial load
      updateTab(activeAccountId, activeTabId, {
        url: currentUrl,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
      const match =
        /youtube\\.com/.test(currentUrl) || /\.(mp4|webm|ogg|mp3|wav)(\\?.*)?$/.test(currentUrl)
      if (match) {
        el.insertCSS(`
          #electron-pip-button {
            position: fixed;
            top: 16px;
            right: 16px;
            z-index: 9999;
            border-radius: 8px;
            background: rgba(255,255,255,0.8);
            border: none;
            padding: 8px;
            cursor: pointer;
          }
        `)
        el.executeJavaScript(`
          (function() {
            if (!document.getElementById('electron-pip-button')) {
              const btn = document.createElement('button');
              btn.id = 'electron-pip-button';
              btn.innerText = '♪';
              btn.onclick = function() { window.api.pip.open(window.location.href); };
              document.body.appendChild(btn);
            }
          })();
        `)
      }
    }

    const handleTitle = (e: any) => {
      const newUrl = el.getURL()
      const hostname = new URL(newUrl).hostname
      updateTab(activeAccountId, activeTabId, {
        title: e.title,
        url: newUrl,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
    }

    const handleNavigate = (_event: any, navigationUrl: string) => {
      const hostname = new URL(navigationUrl).hostname
      updateTab(activeAccountId, activeTabId, {
        url: navigationUrl,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
    }

    const handleAudioState = () => {
      if (typeof el.isCurrentlyAudible === 'function') {
        const isPlaying = el.isCurrentlyAudible()
        setAudioState(tabId, {
          isPlaying,
          url: el.getURL(),
          title: el.getTitle()
        })
      }
    }

    el.addEventListener('dom-ready', handleDomReady)
    el.addEventListener('page-title-updated', handleTitle as any)
    el.addEventListener('did-navigate', handleNavigate as any)
    // also catch in-page/SPAs navigation so we update stored URL
    el.addEventListener('did-navigate-in-page', handleNavigate as any)
    const audioInterval = setInterval(handleAudioState, 1000)
    // DevTools toggle on F12
    const handleF12 = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        el.openDevTools()
      }
    }
    window.addEventListener('keydown', handleF12)
    // Listen for DevTools menu click to open webview DevTools
    const handleOpenWebviewDevtools = () => {
      webviewRef.current?.openDevTools()
    }
    window.addEventListener('open-webview-devtools', handleOpenWebviewDevtools)

    return () => {
      el.removeEventListener('dom-ready', handleDomReady)
      el.removeEventListener('page-title-updated', handleTitle as any)
      el.removeEventListener('did-navigate', handleNavigate as any)
      el.removeEventListener('did-navigate-in-page', handleNavigate as any)
      clearInterval(audioInterval)
      window.removeEventListener('keydown', handleF12)
      window.removeEventListener('open-webview-devtools', handleOpenWebviewDevtools)
    }
  }, [activeAccountId, activeTabId, isElectron, updateTab, tabId, setAudioState])

  if (isElectron && !mediaMode) {
    return (
      <div className="h-full relative overflow-hidden">
        {/* DevTools button for embedded Webview */}
        <button
          onClick={() => webviewRef.current?.openDevTools()}
          className="absolute top-2 right-2 z-50 p-1 bg-gray-800 text-white rounded"
        >
          DevTools
        </button>
        {accounts.length > 0 ? (
          accounts.map((acc) =>
            acc.tabs.map((tab) => (
              <webview
                id={`webview-${tab.id}`}
                key={`${acc.id}-${tab.id}`}
                partition="persist:default"
                src={tab.url}
                allowpopups
                ref={acc.id === activeAccountId && tab.id === activeTabId ? webviewRef : undefined}
                className={`absolute top-0 left-0 right-0 bottom-0 z-0 ${
                  acc.id === activeAccountId && tab.id === activeTabId ? '' : 'hidden'
                }`}
              />
            ))
          )
        ) : (
          <webview
            id={`webview-${tabId}`}
            partition="persist:default"
            ref={webviewRef}
            src={url}
            allowpopups
            className="absolute top-0 left-0 right-0 bottom-0 z-0"
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      <iframe src={url} className="absolute top-0 left-0 right-0 bottom-0" />
    </div>
  )
}

export default WebviewContainer
