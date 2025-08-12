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
    (accountId: string, tId: string, updates: any) => {
      if (!isWebviewDestroyedRef.current) {
        try {
          updateTab(accountId, tId, updates)
        } catch (error) {
          console.warn('Error updating tab:', error)
        }
      }
    },
    [updateTab]
  )

  const safeSetAudioState = useCallback(
    (tId: string, state: any) => {
      if (!isWebviewDestroyedRef.current) {
        try {
          setAudioState(tId, state)
        } catch (error) {
          console.warn('Error setting audio state:', error)
        }
      }
    },
    [setAudioState]
  )
  const getAudioState = useCallback((): boolean => {
    const el = webviewRef.current
    if (!el) return false

    try {
      return el.isCurrentlyAudible?.() || false
    } catch (e) {
      console.error('Error checking audio state:', e)
      return false
    }
  }, [])

  const isValidUrl = useCallback((testUrl: string): boolean => {
    if (!testUrl || testUrl.trim() === '') return false
    try {
      new URL(testUrl)
      return true
    } catch {
      return testUrl.startsWith('file://') || testUrl.startsWith('data:')
    }
  }, [])

  // Register/unregister this webview with main process after DOM ready
  useEffect(() => {
    if (!isElectron) return
    const el = webviewRef.current
    if (!el) return

    const handleRegister = () => {
      try {
        const wcId = el.getWebContentsId()
        window.api.chatgpt.registerWebview(tabId, wcId)
      } catch (err) {
        console.warn('Failed to register webview:', err)
      }
    }

    handleRegister()
    el.addEventListener('dom-ready', handleRegister)
    el.addEventListener('render-process-gone', () => {
      try {
        el.reload()
      } catch {}
    })

    return () => {
      el.removeEventListener('dom-ready', handleRegister)
      // do not unregister here to allow fallback
    }
  }, [tabId, isElectron, activeTabId])

  // Main update effect
  useEffect(() => {
    if (!isElectron || !activeAccountId || !activeTabId) return
    const el = webviewRef.current
    if (!el) return

    try {
      const wcId = el.getWebContentsId()
      window.api.chatgpt.registerWebview(tabId, wcId)
    } catch {}

    isWebviewDestroyedRef.current = false
    isInitializedRef.current = false

    const handleDomReady = () => {
      if (!el || isWebviewDestroyedRef.current) return
      setTimeout(() => {
        if (!el || isWebviewDestroyedRef.current) return
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
            #electron-pip-button { position: fixed; top: 16px; right: 16px; z-index: 9999; border-radius: 8px; background: rgba(255,255,255,0.8); border: none; padding: 8px; cursor: pointer; }
          `
          ).catch(() => {})
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
          ).catch(() => {})
        }

        isInitializedRef.current = true
      }, 100)
    }

    const handleTitle = (e: Electron.PageTitleUpdatedEvent) => {
      if (!el || isWebviewDestroyedRef.current || !isInitializedRef.current) return
      const newUrl = el.getURL()
      if (!newUrl || !isValidUrl(newUrl)) return
      const hostname = new URL(newUrl).hostname
      safeUpdateTab(activeAccountId, activeTabId, {
        title: e.title,
        url: newUrl,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
    }

    const handleNavigate = (e: Electron.DidNavigateEvent) => {
      if (!e.url || isWebviewDestroyedRef.current || !isValidUrl(e.url)) return
      const hostname = new URL(e.url).hostname
      safeUpdateTab(activeAccountId, activeTabId, {
        url: e.url,
        icon: `https://www.google.com/s2/favicons?domain=${hostname}`
      })
    }

    const handleAudioState = () => {
      if (!el || isWebviewDestroyedRef.current || !isInitializedRef.current) return
      const isPlaying = getAudioState()
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

    const handleLoadFail = (e: Electron.DidFailLoadEvent) => {
      const ignoredCodes = [-3, -27, -105, -125]
      if (!ignoredCodes.includes(e.errorCode)) {
        console.warn(`Load failed (${e.errorCode}): ${e.validatedURL}`)
      }
    }

    const handleRenderProcessGone = (event: any) => {
      const reason = event.reason
      isWebviewDestroyedRef.current = true
      isInitializedRef.current = false
      const shouldReload = ['crashed', 'abnormal-exit', 'killed', 'oom'].includes(reason)
      if (shouldReload && el) {
        setTimeout(() => {
          if (webviewRef.current && !isWebviewDestroyedRef.current) {
            try {
              isWebviewDestroyedRef.current = false
              webviewRef.current.reload()
            } catch {
              isWebviewDestroyedRef.current = true
            }
          }
        }, 1000)
      }
    }

    const handleNewWindow = (event: any) => {
      event.preventDefault()
      if (event.url && isValidUrl(event.url)) {
        // Use PiP API to open external links
        window.api.pip.open(event.url)
      }
    }

    const handleDidFailProvisionalLoad = (e: any) => {
      const ignoredCodes = [-3, -27, -105, -125]
      if (!ignoredCodes.includes(e.errorCode)) {
        console.warn(`Provisional load failed (${e.errorCode}): ${e.validatedURL}`)
      }
    }

    el.addEventListener('dom-ready', handleDomReady)
    el.addEventListener('page-title-updated', handleTitle)
    el.addEventListener('did-navigate', handleNavigate)
    el.addEventListener('did-navigate-in-page', handleNavigate)
    el.addEventListener('did-fail-load', handleLoadFail)
    el.addEventListener('did-fail-provisional-load', handleDidFailProvisionalLoad)
    el.addEventListener('render-process-gone', handleRenderProcessGone)
    el.addEventListener('new-window', handleNewWindow)

    audioIntervalRef.current && clearInterval(audioIntervalRef.current)
    audioIntervalRef.current = setInterval(handleAudioState, 2000)
    setTimeout(() => audioIntervalRef.current && clearInterval(audioIntervalRef.current), 1000)

    const handleF12 = (e: KeyboardEvent) => {
      if (e.key === 'F12' && webviewRef.current && !isWebviewDestroyedRef.current) {
        webviewRef.current.openDevTools()
      }
    }
    window.addEventListener('keydown', handleF12)
    window.addEventListener('open-webview-devtools', () => {
      webviewRef.current?.openDevTools()
    })

    return () => {
      isWebviewDestroyedRef.current = true
      isInitializedRef.current = false
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
      el.removeEventListener('dom-ready', handleDomReady)
      el.removeEventListener('page-title-updated', handleTitle)
      el.removeEventListener('did-navigate', handleNavigate)
      el.removeEventListener('did-navigate-in-page', handleNavigate)
      el.removeEventListener('did-fail-load', handleLoadFail)
      el.removeEventListener('did-fail-provisional-load', handleDidFailProvisionalLoad)
      el.removeEventListener('render-process-gone', handleRenderProcessGone)
      el.removeEventListener('new-window', handleNewWindow)
      window.removeEventListener('keydown', handleF12)
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

  // cleanup unregister on unmount
  useEffect(() => {
    return () => {
      accounts.forEach((acc) =>
        acc.tabs.forEach((t) => {
          window.api.chatgpt.unregisterWebview(t.id)
        })
      )
    }
  }, [accounts])

  if (isElectron && !mediaMode) {
    return (
      <div className="h-full relative overflow-hidden bg-background">
        {accounts.length > 0 ? (
          accounts.map((acc) =>
            acc.tabs.map((tab) => {
              const isActive = acc.id === activeAccountId && tab.id === activeTabId
              return (
                <webview
                  key={`${acc.id}-${tab.id}`}
                  id={`webview-${tab.id}`}
                  partition={'persist:default' as any}
                  src={tab.url}
                  allowpopups={true as any}
                  nodeintegration={false as any}
                  webpreferences="contextIsolation=true,nodeIntegration=false,enableRemoteModule=false"
                  ref={(node: Electron.WebviewTag | null) => {
                    if (node && isElectron) {
                      try {
                        const wcId = node.getWebContentsId()
                        window.api.chatgpt.registerWebview(tab.id, wcId)
                      } catch {}
                    }
                  }}
                  className={`absolute top-0 left-0 right-0 bottom-0 z-0 ${
                    isActive ? '' : 'hidden'
                  }`}
                  style={{ width: '100%', height: '100%' }}
                />
              )
            })
          )
        ) : (
          <webview
            id={`webview-${tabId}`}
            partition={'persist:default' as any}
            ref={(node: Electron.WebviewTag | null) => {
              if (node && isElectron) {
                try {
                  const wcId = node.getWebContentsId()
                  window.api.chatgpt.registerWebview(tabId, wcId)
                } catch {}
              }
            }}
            src={url}
            allowpopups={true as any}
            nodeintegration={false as any}
            webpreferences="contextIsolation=true,nodeIntegration=false,enableRemoteModule=false"
            className="absolute top-0 left-0 right-0 bottom-0 z-0"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden bg-background">
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
