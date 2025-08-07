import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Buffer } from 'buffer'

// Custom APIs for renderer
const OAUTH_BASE_URL = process.env.ENV === 'DEV' ? 'http://localhost:5173' : 'https://flex-oauth.vercel.app';

const api = {
  app: {
    quit: () => ipcRenderer.invoke('app-quit').catch(err => {
      console.error('Failed to quit app:', err)
      return { success: false, error: err.message }
    })
  },
  zoom: {
    setLevel: (level: number) => ipcRenderer.invoke('zoom-set-level', level).catch(err => {
      console.error('Failed to set zoom level:', err)
      return { success: false, error: err.message }
    })
  },
  tab: {
    newTab: () => ipcRenderer.invoke('new-tab').catch(err => {
      console.error('Failed to create new tab:', err)
      return { success: false, error: err.message }
    })
  },
  page: {
    print: () => ipcRenderer.invoke('print-page').catch(err => {
      console.error('Failed to print page:', err)
      return { success: false, error: err.message }
    }),
    save: () => ipcRenderer.invoke('save-page').catch(err => {
      console.error('Failed to save page:', err)
      return { success: false, error: err.message }
    }),
    find: () => ipcRenderer.invoke('find-page').catch(err => {
      console.error('Failed to find on page:', err)
      return { success: false, error: err.message }
    }),
    translate: () => ipcRenderer.invoke('translate-page').catch(err => {
      console.error('Failed to translate page:', err)
      return { success: false, error: err.message }
    })
  },
  pip: {
    open: (url: string, currentTime?: number) =>
      ipcRenderer.invoke('open-pip-window', url, currentTime).catch(err => {
        console.error('Failed to open PiP window:', err)
        return { success: false, error: err.message }
      })
  },
  getVideoInfoForPip: () => {
    try {
      const video = document.querySelector('video')
      if (video) {
        return {
          src: video.currentSrc || video.src,
          currentTime: video.currentTime
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get video info:', error)
      return null
    }
  },
  auth: {
    /** Initiate Google sign-in for accountId, returns OAuth token */
    loginGoogle: async (accountId: string) => {
      try {
        if (!accountId || typeof accountId !== 'string') {
          throw new Error('Invalid account ID')
        }

        const oauthUrl = `${OAUTH_BASE_URL}/sign-in?accountId=${accountId}`

        // Hide main window and open OAuth URL in external browser
        await ipcRenderer.invoke('hide-main-window')
        await ipcRenderer.invoke('open-external', oauthUrl)

        return new Promise<{ idToken: string; profile: { name: string; email?: string; picture?: string } }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('OAuth timeout'))
          }, 300000) // 5 minute timeout

          const handleToken = (_event: any, token: string) => {
            clearTimeout(timeout)
            ipcRenderer.removeListener('oauth-token', handleToken)

            // Decode JWT payload to extract user profile
            const profileData: { name: string; email?: string; picture?: string } = {
              name: '',
              email: undefined,
              picture: undefined
            }

            try {
              const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
              profileData.name = payload.name || ''
              profileData.email = payload.email
              profileData.picture = payload.picture
            } catch (error) {
              console.error('[PRELOAD] Failed to parse token payload', error)
            }

            resolve({ idToken: token, profile: profileData })
          }

          ipcRenderer.once('oauth-token', handleToken)
        })
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },
    /** Listen for OAuth token from main process */
    onOauthToken: (callback: (token: string, accountId?: string) => void) => {
      const safeCallback = (event: any, token: string, accountId?: string) => {
        try {
          callback(token, accountId)
        } catch (error) {
          console.error('OAuth token callback error:', error)
        }
      }

      ipcRenderer.on('oauth-token', safeCallback)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('oauth-token', safeCallback)
      }
    },
    logoutGoogle: (accountId: string) =>
      ipcRenderer.invoke('clear-google-session').catch(err => {
        console.error('Failed to logout:', err)
        return { success: false, error: err.message }
      }),
    /** Base URL for embedded OAuth */
    baseUrl: OAUTH_BASE_URL
  },
  /** DevTools control */
  devtools: {
    /** Open DevTools for the main window */
    open: () => {
      try {
        ipcRenderer.send('devtools-open')
      } catch (error) {
        console.error('Failed to open DevTools:', error)
      }
    },
    /** Emit event to open DevTools for the WebView */
    openWebview: () => {
      try {
        window.dispatchEvent(new CustomEvent('open-webview-devtools'))
      } catch (error) {
        console.error('Failed to open WebView DevTools:', error)
      }
    }
  },
  session: {
    syncGoogle: (idToken: string) =>
      ipcRenderer.invoke('sync-google-session', idToken).catch(err => {
        console.error('Failed to sync Google session:', err)
        return { success: false, error: err.message }
      }),
    clearGoogle: () =>
      ipcRenderer.invoke('clear-google-session').catch(err => {
        console.error('Failed to clear Google session:', err)
        return { success: false, error: err.message }
      })
  },
  storage: {
    /** Get item as JSON string or null */
    getItem: async (key: string): Promise<string | null> => {
      try {
        if (!key || typeof key !== 'string') {
          throw new Error('Invalid storage key')
        }

        const result = await ipcRenderer.invoke('storage:get', key)

        if (!result.success) {
          console.error('Storage get failed:', result.error)
          return null
        }

        return result.value === undefined ? null : JSON.stringify(result.value)
      } catch (error) {
        console.error('Storage getItem error:', error)
        return null
      }
    },
    /** Set item by parsing JSON string */
    setItem: async (key: string, value: string): Promise<unknown> => {
      try {
        if (!key || typeof key !== 'string') {
          throw new Error('Invalid storage key')
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(value)
        } catch {
          parsed = value
        }

        const result = await ipcRenderer.invoke('storage:set', key, parsed)

        if (!result.success) {
          throw new Error(result.error)
        }

        return result
      } catch (error) {
        console.error('Storage setItem error:', error)
        throw error
      }
    },
    /** Remove item */
    removeItem: async (key: string): Promise<unknown> => {
      try {
        if (!key || typeof key !== 'string') {
          throw new Error('Invalid storage key')
        }

        const result = await ipcRenderer.invoke('storage:remove', key)

        if (!result.success) {
          throw new Error(result.error)
        }

        return result
      } catch (error) {
        console.error('Storage removeItem error:', error)
        throw error
      }
    }
  },
  getPath: (name: string) => {
    try {
      return ipcRenderer.sendSync('get-path', name)
    } catch (error) {
      console.error('Failed to get path:', error)
      return null
    }
  },
  moveWindow: (x: number, y: number) => {
    try {
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Invalid coordinates')
      }
      ipcRenderer.send('move-pip-window', x, y)
    } catch (error) {
      console.error('Failed to move window:', error)
    }
  },
  shell: {
    /** Open URL in external system browser */
    openExternal: (url: string) =>
      ipcRenderer.invoke('open-external', url).catch(err => {
        console.error('Failed to open external URL:', err)
        return { success: false, error: err.message }
      })
  },
  hide: {
    main: () =>
      ipcRenderer.invoke('hide-main-window').catch(err => {
        console.error('Failed to hide main window:', err)
        return { success: false, error: err.message }
      })
  },
  show: {
    main: () =>
      ipcRenderer.invoke('show-main-window').catch(err => {
        console.error('Failed to show main window:', err)
        return { success: false, error: err.message }
      })
  },
  getCwd: () => {
    try {
      return process.cwd()
    } catch (error) {
      console.error('Failed to get current working directory:', error)
      return ''
    }
  },
  chatgpt: {
    /** Send prompt and idToken to main for ChatGPT */
    ask: (prompt: string, idToken: string) =>
      ipcRenderer.invoke('chatgpt:ask', prompt, idToken).catch(err => {
        console.error('Failed to ask ChatGPT:', err);
        return { success: false, error: err.message };
      }),
    // Thêm hàm syncSession
    syncSession: () =>
      ipcRenderer.invoke('chatgpt:sync-session').catch(async (err) => {
        console.error('Failed to sync ChatGPT session, retrying...', err);
        // Thử đồng bộ lại sau 2 giây
        await new Promise(resolve => setTimeout(resolve, 2000));
        return ipcRenderer.invoke('chatgpt:sync-session');
      })
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs to renderer:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}