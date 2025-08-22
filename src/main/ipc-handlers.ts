import { app, ipcMain, BrowserWindow, shell, session } from 'electron'

// Lazy-load a single persistent electron-store instance
const storePromise = import('electron-store').then(
  ({ default: Store }) => new Store({ cwd: app.getPath('userData'), name: 'account_store' })
)
import { openPipWindow } from './windows/pipWindow'
import { getMainWindow } from './windows/mainWindow'

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  ipcMain.on('ping', () => {})

  ipcMain.handle('open-pip-window', async (_event, url: string, currentTime?: number) => {
    await openPipWindow(url, currentTime)
    return null
  })

  ipcMain.handle('hide-main-window', () => {
    const win = getMainWindow()
    if (win) win.hide()
    return null
  })

  ipcMain.on('move-pip-window', (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setPosition(Math.round(x), Math.round(y))
  })

  ipcMain.handle('show-main-window', () => {
    const win = getMainWindow()
    if (win) win.show()
    return null
  })

  ipcMain.on('close-pip', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.close()
  })

  // Open URL in external system browser
  ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url)
    return null
  })

  // Storage handlers using a single persisted store instance
  ipcMain.handle('storage:get', async (_event, key: string) => {
    const store = await storePromise
    return store.get(key)
  })
  ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
    const store = await storePromise
    store.set(key, value)
    return null
  })
  ipcMain.handle('storage:remove', async (_event, key: string) => {
    const store = await storePromise
    store.delete(key)
    return null
  })

  // Google session sync handlers
  ipcMain.handle('sync-google-session', (_event, idToken: string) => {
    // Optional: sync session cookies here
    return null
  })
  ipcMain.handle('clear-google-session', async () => {
    await session.defaultSession.clearStorageData({ storages: ['cookies'] })
    return null
  })

  ipcMain.handle('app-quit', () => {
    app.quit()
  })
}
