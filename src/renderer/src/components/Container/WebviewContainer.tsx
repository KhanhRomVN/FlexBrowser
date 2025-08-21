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
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const setAudioState = useGlobalAudioStore((state) => state.setAudioState)
  const clearAudioState = useGlobalAudioStore((state) => state.clearAudioState)
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

  const isValidUrl = useCallback((testUrl: string): boolean => {
    if (!testUrl || testUrl.trim() === '') return false
    try {
      new URL(testUrl)
      return true
    } catch {
      return (
        testUrl.startsWith('file://') ||
        testUrl.startsWith('data:') ||
        testUrl.startsWith('code://')
      )
    }
  }, [])

  // Enhanced audio detection for YouTube and general media
  const checkAudioState = useCallback(async (): Promise<void> => {
    const el = webviewRef.current
    if (!el || isWebviewDestroyedRef.current || !isInitializedRef.current) {
      return
    }

    try {
      const currentUrl = el.getURL()
      if (!currentUrl || !isValidUrl(currentUrl)) {
        return
      }

      // Enhanced detection script with better YouTube support
      const audioData = await el.executeJavaScript(`
        (function() {
          const result = {
            isPlaying: false,
            title: '',
            url: window.location.href,
            debug: {
              timestamp: Date.now(),
              hostname: window.location.hostname
            }
          };
                    
          // === YouTube Specific Detection ===
          if (window.location.hostname.includes('youtube.com')) {
            
            // Method 1: YouTube Player API
            try {
              const ytPlayer = window.yt?.player?.getPlayerByElement?.(document.querySelector('#movie_player'));
              if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
                const state = ytPlayer.getPlayerState();
                result.debug.ytPlayerState = state;
                if (state === 1) { // YT_PlayerState.PLAYING
                  result.isPlaying = true;
                }
              } else {
                result.debug.ytPlayerError = 'API not available';
              }
            } catch (e) {
              result.debug.ytPlayerError = e.message;
            }
            
            // Method 2: DOM Class Analysis (more reliable)
            if (!result.isPlaying) {
              const moviePlayer = document.getElementById('movie_player');
              if (moviePlayer) {
                const classes = Array.from(moviePlayer.classList);
                result.debug.moviePlayerClasses = classes;
                
                // Check for playing states
                const hasPlayingIndicators = classes.some(cls => 
                  cls.includes('playing') || 
                  cls.includes('unstarted') ||
                  cls.includes('buffering')
                ) && !classes.some(cls => 
                  cls.includes('paused') || 
                  cls.includes('ended')
                );
                
                if (hasPlayingIndicators) {
                  result.isPlaying = true;
                }
              }
            }
            
            // Method 3: Play/Pause Button State
            if (!result.isPlaying) {
              const playButton = document.querySelector('.ytp-play-button');
              if (playButton) {
                const ariaLabel = playButton.getAttribute('aria-label') || '';
                const title = playButton.getAttribute('title') || '';
                result.debug.playButtonState = { ariaLabel, title };
                
                if (ariaLabel.toLowerCase().includes('pause') || title.toLowerCase().includes('pause')) {
                  result.isPlaying = true;
                }
              }
            }
            
            // Method 4: Video Element Direct Check
            if (!result.isPlaying) {
              const videos = document.querySelectorAll('video');
              
              for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                const isVideoPlaying = !video.paused && 
                                     !video.ended && 
                                     video.readyState >= 3 && 
                                     video.currentTime > 0;
                
                if (isVideoPlaying) {
                  result.isPlaying = true;
                  break;
                }
              }
            }
            
            // Get YouTube title
            let titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                              document.querySelector('.ytp-title-link') ||
                              document.querySelector('#container h1') ||
                              document.querySelector('meta[property="og:title"]');
            
            if (titleElement) {
              result.title = titleElement.textContent || titleElement.getAttribute('content') || '';
            }
            
            if (!result.title) {
              result.title = document.title || 'YouTube';
            }
          }
          
          // === General Media Element Detection ===
          if (!result.isPlaying) {
            const allMedia = document.querySelectorAll('video, audio');
            result.debug.totalMediaElements = allMedia.length;
            
            const playingMedia = [];
            allMedia.forEach((media, index) => {
              const isMediaPlaying = !media.paused && 
                                   !media.ended && 
                                   media.readyState >= 3 && 
                                   media.currentTime > 0;
              
              if (isMediaPlaying) {
                playingMedia.push(index);
              }
            });
            
            if (playingMedia.length > 0) {
              result.isPlaying = true;
              result.debug.playingMediaElements = playingMedia;
            }
          }
          
          // === Web Audio API Detection ===
          if (!result.isPlaying && window.__webAudioPlaying) {
            result.isPlaying = true;
            result.debug.webAudioActive = true;
          }
          
          // === Custom Media Element Tracking ===
          if (!result.isPlaying && window.__mediaElementPlaying) {
            result.isPlaying = true;
            result.debug.customMediaTracking = true;
          }
          
          // Fallback title
          if (!result.title) {
            result.title = document.title || 'Media';
          }
          
          return result;
        })()
      `)

      if (audioData && typeof audioData === 'object') {
        // Always update the audio state, even if not playing
        // This ensures the store gets updated and we can track state changes
        safeSetAudioState(tabId, {
          isPlaying: audioData.isPlaying || false,
          url: audioData.url || currentUrl,
          title: audioData.title || 'Unknown'
        })
      } else {
        console.warn(`[checkAudioState][${tabId}] Invalid audio data:`, audioData)
      }
    } catch (error) {
      console.error(`[checkAudioState][${tabId}] Error:`, error)
      // Clear audio state on error
      clearAudioState(tabId)
    }
  }, [tabId, safeSetAudioState, clearAudioState, isValidUrl])

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
      isWebviewDestroyedRef.current = true
      el.removeEventListener('dom-ready', handleRegister)
    }
  }, [tabId, isElectron, activeTabId])

  // Main effect for handling webview events and audio detection
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

    const handleDomReady = async () => {
      if (!el || isWebviewDestroyedRef.current) return

      // Enhanced injection with better YouTube support
      try {
        await el.executeJavaScript(`
          (function() {
            
            // === YouTube Enhanced Tracking ===
            if (window.location.hostname.includes('youtube.com')) {
              
              // Global YouTube state tracking
              window.__youtubeState = {
                isPlaying: false,
                lastCheck: 0
              };
              
              // Enhanced MutationObserver for YouTube
              const ytObserver = new MutationObserver((mutations) => {
                let shouldCheck = false;
                
                mutations.forEach((mutation) => {
                  // Check for class changes on movie_player
                  if (mutation.type === 'attributes' && 
                      mutation.attributeName === 'class' &&
                      mutation.target.id === 'movie_player') {
                    shouldCheck = true;
                  }
                  
                  // Check for button state changes
                  if (mutation.target.classList?.contains('ytp-play-button')) {
                    shouldCheck = true;
                  }
                });
                
                if (shouldCheck) {
                  // Debounce checks
                  const now = Date.now();
                  if (now - window.__youtubeState.lastCheck > 500) {
                    window.__youtubeState.lastCheck = now;
                    
                    // Check current state
                    const moviePlayer = document.getElementById('movie_player');
                    const playButton = document.querySelector('.ytp-play-button');
                    
                    if (moviePlayer && playButton) {
                      const classes = Array.from(moviePlayer.classList);
                      const buttonLabel = playButton.getAttribute('aria-label') || '';
                      
                      const isPlaying = !classes.includes('paused-mode') && 
                                       !classes.includes('ended-mode') &&
                                       (buttonLabel.includes('Pause') || classes.includes('playing-mode'));
                      
                      if (isPlaying !== window.__youtubeState.isPlaying) {
                        window.__youtubeState.isPlaying = isPlaying;
                      }
                    }
                  }
                }
              });
              
              // Observe the entire player area
              const playerContainer = document.getElementById('movie_player') || 
                                    document.getElementById('player-container') ||
                                    document.body;
              
              if (playerContainer) {
                ytObserver.observe(playerContainer, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ['class', 'aria-label', 'title']
                });
              }
            }
            
            // === Enhanced Web Audio API Tracking ===
            if (!window.__audioContextPatched) {
              window.__audioContextPatched = true;
              window.__webAudioPlaying = false;
              
              const originalAudioContext = window.AudioContext || window.webkitAudioContext;
              if (originalAudioContext) {
                window.AudioContext = function(...args) {
                  const context = new originalAudioContext(...args);
                  
                  const originalResume = context.resume.bind(context);
                  context.resume = function() {
                    window.__webAudioPlaying = true;
                    return originalResume();
                  };
                  
                  const originalSuspend = context.suspend.bind(context);
                  context.suspend = function() {
                    window.__webAudioPlaying = false;
                    return originalSuspend();
                  };
                  
                  return context;
                };
                
                Object.setPrototypeOf(window.AudioContext, originalAudioContext);
              }
            }
            
            // === Media Element Event Tracking ===
            window.__mediaElementPlaying = false;
            
            const trackMediaElement = (element) => {
              const updateState = () => {
                const isPlaying = !element.paused && 
                               !element.ended && 
                               element.readyState >= 3;
                
                if (isPlaying !== window.__mediaElementPlaying) {
                  window.__mediaElementPlaying = isPlaying;
                }
              };
              
              ['play', 'playing', 'pause', 'ended', 'waiting'].forEach(event => {
                element.addEventListener(event, updateState);
              });
              
              updateState(); // Initial check
            };
            
            // Track existing media
            document.querySelectorAll('video, audio').forEach(trackMediaElement);
            
            // Track new media elements
            const mediaObserver = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) {
                    if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                      trackMediaElement(node);
                    }
                    const newMedia = node.querySelectorAll?.('video, audio') || [];
                    newMedia.forEach(trackMediaElement);
                  }
                });
              });
            });
            
            mediaObserver.observe(document.body, { childList: true, subtree: true });
          })();
        `)
      } catch (err) {
        console.error(`[handleDomReady][${tabId}] Audio injection failed:`, err)
      }

      // Handle URL updates and favicon
      setTimeout(() => {
        if (!el || isWebviewDestroyedRef.current) return
        const currentUrl = el.getURL()
        if (!currentUrl || !isValidUrl(currentUrl)) return

        const hostname = new URL(currentUrl).hostname
        safeUpdateTab(activeAccountId, activeTabId, {
          url: currentUrl,
          icon: `https://www.google.com/s2/favicons?domain=${hostname}`
        })

        // Add PiP button for video sites
        const isVideoSite =
          /youtube\.com/.test(currentUrl) || /\.(mp4|webm|ogg|mp3|wav)(\?.*)?$/.test(currentUrl)

        if (isVideoSite) {
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
      }, 500)
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
      clearAudioState(tabId)

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
        window.api.pip.open(event.url)
      }
    }

    // Event listeners
    el.addEventListener('dom-ready', handleDomReady)
    el.addEventListener('page-title-updated', handleTitle)
    el.addEventListener('did-navigate', handleNavigate)
    el.addEventListener('did-navigate-in-page', handleNavigate)
    el.addEventListener('did-fail-load', handleLoadFail)
    el.addEventListener('render-process-gone', handleRenderProcessGone)
    el.addEventListener('new-window', handleNewWindow)

    // Start audio monitoring
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
    }

    // Initial check after a delay
    setTimeout(() => {
      if (!isWebviewDestroyedRef.current) {
        checkAudioState()
      }
    }, 2000)

    // Regular monitoring
    audioIntervalRef.current = setInterval(() => {
      if (!isWebviewDestroyedRef.current && isInitializedRef.current) {
        checkAudioState()
      }
    }, 1500)

    // DevTools shortcut
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

      clearAudioState(tabId)

      el.removeEventListener('dom-ready', handleDomReady)
      el.removeEventListener('page-title-updated', handleTitle)
      el.removeEventListener('did-navigate', handleNavigate)
      el.removeEventListener('did-navigate-in-page', handleNavigate)
      el.removeEventListener('did-fail-load', handleLoadFail)
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
    clearAudioState,
    isValidUrl,
    checkAudioState
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      accounts.forEach((acc) =>
        acc.tabs.forEach((t) => {
          window.api.chatgpt.unregisterWebview(t.id)
        })
      )
      clearAudioState(tabId)
    }
  }, [accounts, clearAudioState, tabId])

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
                    if (node && isElectron && tab.id === tabId) {
                      webviewRef.current = node
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
            ref={webviewRef}
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
