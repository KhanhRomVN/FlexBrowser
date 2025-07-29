import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  pip: {
    open: (url: string, currentTime?: number) =>
      ipcRenderer.invoke('open-pip-window', url, currentTime)
  },
  moveWindow: (x: number, y: number) => ipcRenderer.send('move-pip-window', x, y),
  hide: {
    main: () => ipcRenderer.invoke('hide-main-window')
  },
  show: {
    main: () => ipcRenderer.invoke('show-main-window')
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
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
