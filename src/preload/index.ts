import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
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
      console.log('[PRELOAD] Initiating Google login')
      return ipcRenderer.invoke('login-google', accountId)
    }
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
