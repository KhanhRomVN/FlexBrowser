import { app, ipcMain, BrowserWindow, shell, session } from 'electron'

// Lazy-load a single persistent electron-store instance
const storePromise = import('electron-store').then(({ default: Store }) =>
  new Store({
    cwd: app.getPath('userData'),
    name: 'account_store',
    // Add some safety options
    clearInvalidConfig: true,
    watch: false // Disable file watching to prevent conflicts
  })
)
import { openPipWindow } from './windows/pipWindow'
import { getMainWindow } from './windows/mainWindow'

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  // Simple ping handler
  ipcMain.on('ping', (event) => {
    event.reply('pong')
  })

  // PiP window management
  ipcMain.handle('open-pip-window', async (event, url: string, currentTime?: number) => {
    try {
      await openPipWindow(url, currentTime)
      return { success: true }
    } catch (error) {
      console.error('Failed to open PiP window:', error)
      return { success: false, error: error.message }
    }
  })

  // Main window visibility
  ipcMain.handle('hide-main-window', () => {
    try {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.hide()
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to hide main window:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('show-main-window', () => {
    try {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.show()
        win.focus()
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to show main window:', error)
      return { success: false, error: error.message }
    }
  })

  // PiP window movement
  ipcMain.on('move-pip-window', (event, x: number, y: number) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        const safeX = Math.max(0, Math.round(x))
        const safeY = Math.max(0, Math.round(y))
        win.setPosition(safeX, safeY)
      }
    } catch (error) {
      console.error('Failed to move PiP window:', error)
    }
  })

  // Close PiP window
  ipcMain.on('close-pip', (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.close()
      }
    } catch (error) {
      console.error('Failed to close PiP window:', error)
    }
  })

  // Open URL in external system browser
  ipcMain.handle('open-external', async (event, url: string) => {
    try {
      // Validate URL format
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided')
      }

      // Basic URL validation
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        throw new Error('URL must start with http://, https://, or mailto:')
      }

      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Failed to open external URL:', error)
      return { success: false, error: error.message }
    }
  })

  // Storage handlers using a single persisted store instance
  ipcMain.handle('storage:get', async (event, key: string) => {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key')
      }

      const store = await storePromise
      const value = store.get(key)
      return { success: true, value }
    } catch (error) {
      console.error('Storage get error:', error)
      return { success: false, error: error.message, value: null }
    }
  })

  ipcMain.handle('storage:set', async (event, key: string, value: any) => {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key')
      }

      const store = await storePromise
      store.set(key, value)
      return { success: true }
    } catch (error) {
      console.error('Storage set error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('storage:remove', async (event, key: string) => {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key')
      }

      const store = await storePromise
      store.delete(key)
      return { success: true }
    } catch (error) {
      console.error('Storage remove error:', error)
      return { success: false, error: error.message }
    }
  })

  // Google session sync handlers with better error handling
  ipcMain.handle('sync-google-session', async (event, idToken: string) => {
    try {
      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Invalid ID token provided')
      }

      // Validate token format (basic JWT structure check)
      const tokenParts = idToken.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }

      // Here you could implement actual session cookie syncing if needed
      // For now, just return success

      return { success: true }
    } catch (error) {
      console.error('Failed to sync Google session:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('clear-google-session', async () => {
    try {
      // Clear cookies and other storage data
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'sessionstorage', 'websql', 'indexdb']
      })

      // Also clear cache
      await session.defaultSession.clearCache()

      return { success: true }
    } catch (error) {
      console.error('Failed to clear Google session:', error)
      return { success: false, error: error.message }
    }
  })

  // App quit handler
  ipcMain.handle('app-quit', () => {
    try {
      // Give some time for cleanup
      setTimeout(() => {
        app.quit()
      }, 100)
      return { success: true }
    } catch (error) {
      console.error('Failed to quit app:', error)
      return { success: false, error: error.message }
    }
  })

  // DevTools handlers
  ipcMain.on('devtools-open', (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.webContents.openDevTools({ mode: 'detach' })
      }
    } catch (error) {
      console.error('Failed to open DevTools:', error)
    }
  })

  // Path getter (synchronous)
  ipcMain.on('get-path', (event, name: string) => {
    try {
      const validPaths = ['home', 'appData', 'userData', 'temp', 'desktop', 'documents', 'downloads']

      if (!validPaths.includes(name)) {
        event.returnValue = null
        return
      }

      event.returnValue = app.getPath(name as any)
    } catch (error) {
      console.error('Failed to get path:', error)
      event.returnValue = null
    }
  })

  // Handle app events
  app.on('before-quit', () => {
    console.log('App is about to quit, cleaning up...')
  })

  app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}