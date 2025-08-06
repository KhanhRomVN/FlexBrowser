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

  useEffect(() => {
    if (!isElectron || !activeAccountId || !activeTabId) return
    const el = webviewRef.current
    if (!el) return

    // Reset destruction flag
    isWebviewDestroyedRef.current = false

    const handleDomReady = () => {
      if (isWebviewDestroyedRef.current || !el) return

      try {
        const currentUrl = el.getURL()
        if (!currentUrl) return

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
          ).catch(console.warn)

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
          ).catch(console.warn)
        }
      } catch (error) {
        console.warn('Error in dom-ready handler:', error)
      }
    }

    const handleTitle = (e: Electron.PageTitleUpdatedEvent) => {
      if (isWebviewDestroyedRef.current || !el) return

      try {
        const newUrl = el.getURL()
        if (!newUrl) return

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
      if (isWebviewDestroyedRef.current || !e.url) return

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
      if (isWebviewDestroyedRef.current || !el) return

      try {
        if (typeof el.isCurrentlyAudible === 'function') {
          const isPlaying = el.isCurrentlyAudible()
          const currentUrl = el.getURL()
          const currentTitle = el.getTitle()

          if (currentUrl) {
            safeSetAudioState(tabId, {
              isPlaying,
              url: currentUrl,
              title: currentTitle || 'Unknown'
            })
          }
        }
      } catch (error) {
        console.warn('Error checking audio state:', error)
      }
    }

    const handleLoadFail = (e: Electron.DidFailLoadEvent) => {
      const { errorCode, errorDescription, validatedURL } = e
      // Ignore common navigation errors that don't need handling
      const ignoredCodes = [-3, -27, -105] // ERR_ABORTED, ERR_BLOCKED_BY_CLIENT, ERR_NAME_NOT_RESOLVED

      if (ignoredCodes.includes(errorCode)) {
        console.log(`Navigation issue (${errorCode}): ${validatedURL} - ${errorDescription}`)
        return
      }

      console.warn(`Load failed (${errorCode}): ${validatedURL} - ${errorDescription}`)

      // For serious errors, you might want to show an error page
      if (errorCode === -6) {
        // ERR_FILE_NOT_FOUND
        // Could redirect to an error page or retry
      }
    }

    const handleRenderProcessGone = (event: any) => {
      console.warn(`Render process ended: ${event.reason}`)

      // If the process crashed, you might want to reload
      if (event.reason === 'crashed' && el && !isWebviewDestroyedRef.current) {
        console.log('Attempting to reload crashed webview...')
        setTimeout(() => {
          if (!isWebviewDestroyedRef.current && el) {
            try {
              el.reload()
            } catch (error) {
              console.warn('Failed to reload webview:', error)
            }
          }
        }, 1000)
      }
    }

    const handleNewWindow = (event: any) => {
      console.log('New window requested:', event.url)
      // Handle popup windows - you might want to open in new tab instead
      event.preventDefault()
      // Optionally open in new tab or external browser
    }

    // Add event listeners with error handling
    try {
      el.addEventListener('dom-ready', handleDomReady)
      el.addEventListener('page-title-updated', handleTitle)
      el.addEventListener('did-navigate', handleNavigate)
      el.addEventListener('did-navigate-in-page', handleNavigate)
      el.addEventListener('did-fail-load', handleLoadFail)
      el.addEventListener('render-process-gone', handleRenderProcessGone)
      el.addEventListener('new-window', handleNewWindow)
    } catch (error) {
      console.warn('Error adding webview listeners:', error)
    }

    // Start audio monitoring with safer interval
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
    }
    audioIntervalRef.current = setInterval(handleAudioState, 1000)

    // DevTools toggle on F12
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

    // Listen for DevTools menu click
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

    return () => {
      // Mark as destroyed first
      isWebviewDestroyedRef.current = true

      // Clear audio interval
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }

      // Remove event listeners safely
      if (el) {
        try {
          el.removeEventListener('dom-ready', handleDomReady)
          el.removeEventListener('page-title-updated', handleTitle)
          el.removeEventListener('did-navigate', handleNavigate)
          el.removeEventListener('did-navigate-in-page', handleNavigate)
          el.removeEventListener('did-fail-load', handleLoadFail)
          el.removeEventListener('render-process-gone', handleRenderProcessGone)
          el.removeEventListener('new-window', handleNewWindow)
        } catch (error) {
          console.warn('Error removing webview listeners:', error)
        }
      }

      window.removeEventListener('keydown', handleF12)
      window.removeEventListener('open-webview-devtools', handleOpenWebviewDevtools)
    }
  }, [activeAccountId, activeTabId, isElectron, tabId, safeUpdateTab, safeSetAudioState])

  if (isElectron && !mediaMode) {
    return (
      <div className="h-full relative overflow-hidden">
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
                ref={acc.id === activeAccountId && tab.id === activeTabId ? webviewRef : undefined}
                className={`absolute top-0 left-0 right-0 bottom-0 z-0 ${
                  acc.id === activeAccountId && tab.id === activeTabId ? '' : 'hidden'
                }`}
                style={{
                  width: '100%',
                  height: '100%'
                }}
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
            className="absolute top-0 left-0 right-0 bottom-0 z-0"
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full relative overflow-hidden">
      <iframe
        src={url}
        className="absolute top-0 left-0 right-0 bottom-0"
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
      />
    </div>
  )
}

export default WebviewContainer
