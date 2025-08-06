import React, { useRef, useEffect, useCallback } from 'react'
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
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isWebviewDestroyedRef = useRef(false)
  const isInitializedRef = useRef(false)

  const safeUpdateTab = useCallback(
    (accountId: string, tabId: string, updates: any) => {
      if (!isWebviewDestroyedRef.current) {
        try {
          updateTab(accountId, tabId, updates)
        } catch (error) {
          console.warn('Error updating tab:', error)
        }
      }
    },
    [updateTab]
  )

  const safeSetAudioState = useCallback(
    (tabId: string, state: any) => {
      if (!isWebviewDestroyedRef.current) {
        try {
          setAudioState(tabId, state)
        } catch (error) {
          console.warn('Error setting audio state:', error)
        }
      }
    },
    [setAudioState]
  )

  const isValidUrl = useCallback((url: string): boolean => {
    if (!url || url.trim() === '') return false
    try {
      new URL(url)
      return true
    } catch {
      return url.startsWith('file://') || url.startsWith('data:')
    }
  }, [])

  useEffect(() => {
    if (!isElectron || !activeAccountId || !activeTabId) return
    const el = webviewRef.current
    if (!el) return

    // Reset refs for new webview instance
    isWebviewDestroyedRef.current = false
    isInitializedRef.current = false

    const handleDomReady = () => {
      if (!el || isWebviewDestroyedRef.current) return

      try {
        // Wait a bit to ensure webview is fully ready
        setTimeout(() => {
          if (isWebviewDestroyedRef.current || !el) return

          const currentUrl = el.getURL()
          if (!currentUrl || !isValidUrl(currentUrl)) return

          const hostname = new URL(currentUrl).hostname
          safeUpdateTab(activeAccountId, activeTabId, {
            url: currentUrl,
            icon: `https://www.google.com/s2/favicons?domain=${hostname}`
          })

          const match =
            /youtube\.com/.test(currentUrl) || /\.(mp4|webm|ogg|mp3|wav)(\?.*)?$/.test(currentUrl)

          if (match) {
            el.insertCSS(
              `
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
            `
            ).catch(() => {}) // Ignore CSS insertion errors

            el.executeJavaScript(
              `
              (function() {
                if (!document.getElementById('electron-pip-button')) {
                  const btn = document.createElement('button');
                  btn.id = 'electron-pip-button';
                  btn.innerText = '♪';
                  btn.onclick = function() { 
                    if (window.api && window.api.pip) {
                      window.api.pip.open(window.location.href); 
                    }
                  };
                  document.body.appendChild(btn);
                }
              })();
            `
            ).catch(() => {}) // Ignore JS execution errors
          }

          isInitializedRef.current = true
        }, 100)
      } catch (error) {
        console.warn('Error in dom-ready handler:', error)
      }
    }

    const handleTitle = (e: Electron.PageTitleUpdatedEvent) => {
      if (!el || isWebviewDestroyedRef.current || !isInitializedRef.current) return

      try {
        const newUrl = el.getURL()
        if (!newUrl || !isValidUrl(newUrl)) return

        const hostname = new URL(newUrl).hostname
        safeUpdateTab(activeAccountId, activeTabId, {
          title: e.title,
          url: newUrl,
          icon: `https://www.google.com/s2/favicons?domain=${hostname}`
        })
      } catch (error) {
        console.warn('Error in title handler:', error)
      }
    }

    const handleNavigate = (e: Electron.DidNavigateEvent) => {
      if (!e.url || isWebviewDestroyedRef.current || !isValidUrl(e.url)) return

      try {
        const hostname = new URL(e.url).hostname
        safeUpdateTab(activeAccountId, activeTabId, {
          url: e.url,
          icon: `https://www.google.com/s2/favicons?domain=${hostname}`
        })
      } catch (error) {
        console.warn('Error in navigate handler:', error)
      }
    }

    const handleAudioState = () => {
      if (!el || isWebviewDestroyedRef.current || !isInitializedRef.current) return

      try {
        if (typeof el.isCurrentlyAudible === 'function') {
          const isPlaying = el.isCurrentlyAudible()
          const currentUrl = el.getURL()
          const currentTitle = el.getTitle()

          if (currentUrl && isValidUrl(currentUrl)) {
            safeSetAudioState(tabId, {
              isPlaying,
              url: currentUrl,
              title: currentTitle || 'Unknown'
            })
          }
        }
      } catch (error) {
        // Silently ignore audio state errors as they're not critical
      }
    }

    const handleLoadFail = (e: Electron.DidFailLoadEvent) => {
      const ignoredCodes = [-3, -27, -105, -125] // Added -125 for network change
      if (ignoredCodes.includes(e.errorCode)) return

      console.warn(`Load failed (${e.errorCode}): ${e.validatedURL} - ${e.errorDescription}`)
    }

    const handleRenderProcessGone = (event: any) => {
      const reason = event.reason
      const exitCode = event.exitCode
      const el = webviewRef.current

      console.warn(`[Webview] Render process gone (reason: ${reason}, exitCode: ${exitCode})`)

      // Mark as destroyed to prevent further operations
      isWebviewDestroyedRef.current = true
      isInitializedRef.current = false

      const shouldReload = ['crashed', 'abnormal-exit', 'killed', 'oom'].includes(reason)

      if (shouldReload && el) {
        console.log(`[Webview] Attempting to reload webview after crash: ${reason}`)

        // Use a more conservative approach for reloading
        setTimeout(() => {
          if (webviewRef.current && !isWebviewDestroyedRef.current) {
            try {
              isWebviewDestroyedRef.current = false // Reset for reload attempt
              webviewRef.current.reload()
              console.log(`[Webview] Reload initiated`)
            } catch (error) {
              console.warn('Reload failed:', error)
              isWebviewDestroyedRef.current = true
            }
          }
        }, 1000) // Wait 1 second before attempting reload
      }
    }

    const handleNewWindow = (event: any) => {
      console.log('New window requested:', event.url)
      event.preventDefault()

      // Optionally open in system browser
      if (event.url && isValidUrl(event.url)) {
        if ((window as any).api?.shell?.openExternal) {
          ;(window as any).api.shell.openExternal(event.url)
        }
      }
    }

    const handleDidFailProvisionalLoad = (event: any) => {
      // Handle provisional load failures more gracefully
      const ignoredCodes = [-3, -27, -105, -125]
      if (!ignoredCodes.includes(event.errorCode)) {
        console.warn(`Provisional load failed (${event.errorCode}): ${event.validatedURL}`)
      }
    }

    // Add event listeners with error handling
    try {
      el.addEventListener('dom-ready', handleDomReady)
      el.addEventListener('page-title-updated', handleTitle)
      el.addEventListener('did-navigate', handleNavigate)
      el.addEventListener('did-navigate-in-page', handleNavigate)
      el.addEventListener('did-fail-load', handleLoadFail)
      el.addEventListener('did-fail-provisional-load', handleDidFailProvisionalLoad)
      el.addEventListener('render-process-gone', handleRenderProcessGone)
      el.addEventListener('new-window', handleNewWindow)
    } catch (error) {
      console.warn('Error adding webview listeners:', error)
    }

    // Start audio monitoring with a delay
    const startAudioMonitoring = () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
      audioIntervalRef.current = setInterval(handleAudioState, 2000) // Increased interval
    }

    // Delay audio monitoring until webview is ready
    setTimeout(startAudioMonitoring, 1000)

    const handleF12 = (e: KeyboardEvent) => {
      if (e.key === 'F12' && el && !isWebviewDestroyedRef.current) {
        try {
          el.openDevTools()
        } catch (error) {
          console.warn('Failed to open DevTools:', error)
        }
      }
    }
    window.addEventListener('keydown', handleF12)

    const handleOpenWebviewDevtools = () => {
      if (webviewRef.current && !isWebviewDestroyedRef.current) {
        try {
          webviewRef.current.openDevTools()
        } catch (error) {
          console.warn('Failed to open DevTools from menu:', error)
        }
      }
    }
    window.addEventListener('open-webview-devtools', handleOpenWebviewDevtools)

    // Cleanup function
    return () => {
      isWebviewDestroyedRef.current = true
      isInitializedRef.current = false

      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }

      if (el) {
        try {
          el.removeEventListener('dom-ready', handleDomReady)
          el.removeEventListener('page-title-updated', handleTitle)
          el.removeEventListener('did-navigate', handleNavigate)
          el.removeEventListener('did-navigate-in-page', handleNavigate)
          el.removeEventListener('did-fail-load', handleLoadFail)
          el.removeEventListener('did-fail-provisional-load', handleDidFailProvisionalLoad)
          el.removeEventListener('render-process-gone', handleRenderProcessGone)
          el.removeEventListener('new-window', handleNewWindow)
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      window.removeEventListener('keydown', handleF12)
      window.removeEventListener('open-webview-devtools', handleOpenWebviewDevtools)
    }
  }, [
    activeAccountId,
    activeTabId,
    isElectron,
    tabId,
    safeUpdateTab,
    safeSetAudioState,
    isValidUrl
  ])

  if (isElectron && !mediaMode) {
    return (
      <div className="h-full relative overflow-hidden bg-white">
        {accounts.length > 0 ? (
          accounts.map((acc) =>
            acc.tabs.map((tab) => (
              <webview
                id={`webview-${tab.id}`}
                key={`${acc.id}-${tab.id}`}
                partition="persist:default"
                src={tab.url}
                allowpopups={true}
                nodeintegration={false}
                webpreferences="contextIsolation=true,nodeIntegration=false,enableRemoteModule=false"
                ref={acc.id === activeAccountId && tab.id === activeTabId ? webviewRef : undefined}
                className={`absolute top-0 left-0 right-0 bottom-0 z-0 ${
                  acc.id === activeAccountId && tab.id === activeTabId ? '' : 'hidden'
                }`}
                style={{ width: '100%', height: '100%' }}
              />
            ))
          )
        ) : (
          <webview
            id={`webview-${tabId}`}
            partition="persist:default"
            ref={webviewRef}
            src={url}
            allowpopups={true}
            nodeintegration={false}
            webpreferences="contextIsolation=true,nodeIntegration=false,enableRemoteModule=false"
            className="absolute top-0 left-0 right-0 bottom-0 z-0"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden bg-white">
      <iframe
        src={url}
        className="absolute top-0 left-0 right-0 bottom-0"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  )
}

export default WebviewContainer
