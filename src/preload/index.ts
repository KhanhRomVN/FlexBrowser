import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Buffer } from 'buffer'

// Custom APIs for renderer
const OAUTH_BASE_URL = process.env.ENV === 'DEV' ? 'http://localhost:5173' : 'https://flex-oauth.vercel.app';

const api = {
  app: {
    quit: () => ipcRenderer.invoke('app-quit')
  },
  zoom: {
    setLevel: (level: number) => ipcRenderer.invoke('zoom-set-level', level)
  },
  tab: {
    newTab: () => ipcRenderer.invoke('new-tab')
  },
  page: {
    print: () => ipcRenderer.invoke('print-page'),
    save: () => ipcRenderer.invoke('save-page'),
    find: () => ipcRenderer.invoke('find-page'),
    translate: () => ipcRenderer.invoke('translate-page')
  },
  pip: {
    open: (url: string, currentTime?: number) =>
      ipcRenderer.invoke('open-pip-window', url, currentTime)
  },
  getVideoInfoForPip: () => {
    const video = document.querySelector('video')
    if (video) {
      return {
        src: video.currentSrc || video.src,
        currentTime: video.currentTime
      }
    }
    return null
  },
  auth: {
    /** Initiate Google sign-in for accountId, returns OAuth token */
    loginGoogle: (accountId: string) => {
      const oauthUrl = `${OAUTH_BASE_URL}/sign-in?accountId=${accountId}`
      // Open embedded OAuth window instead of external browser
      ipcRenderer.invoke('open-auth-window', oauthUrl)
      ipcRenderer.invoke('hide-main-window')
      return new Promise<{ idToken: string; profile: { name: string; email?: string; picture?: string } }>((resolve) => {
        ipcRenderer.once('oauth-token', (_event, token: string) => {
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
        })
      })
    },
    /** Listen for OAuth token from main process */
    onOauthToken: (callback: (token: string) => void) => {
      ipcRenderer.on('oauth-token', (_event, token: string) => callback(token))
    },
    logoutGoogle: (_accountId: string) => ipcRenderer.invoke('clear-google-session'),
    /** Base URL for embedded OAuth */
    baseUrl: OAUTH_BASE_URL
  },
  /** DevTools control */
  devtools: {
    /** Open DevTools for the main window */
    open: () => { ipcRenderer.send('devtools-open') },
    /** Emit event to open DevTools for the WebView */
    openWebview: () => {
      window.dispatchEvent(new CustomEvent('open-webview-devtools'))
    }
  },
  session: {
    syncGoogle: (idToken: string) => ipcRenderer.invoke('sync-google-session', idToken),
    clearGoogle: () => ipcRenderer.invoke('clear-google-session')
  },
  moveWindow: (x: number, y: number) => ipcRenderer.send('move-pip-window', x, y),
  hide: {
    main: () => ipcRenderer.invoke('hide-main-window')
  },
  show: {
    main: () => ipcRenderer.invoke('show-main-window')
  },
  getCwd: () => process.cwd()
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
