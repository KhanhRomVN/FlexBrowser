import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import { getMainWindow } from './windows/mainWindow'
import { openPipWindow } from './windows/pipWindow'
import {
  syncGoogleSession,
  syncChatGPTSession
} from './ipc/cookies'
import { ensureChatWindow } from './ipc/chatWindow'
import { storePromise } from './ipc/storage'

// Register all IPC handlers
export function registerIpcHandlers(): void {
  ipcMain.on('ping', (event) => {
    event.reply('pong')
  })

  ipcMain.handle(
    'open-pip-window',
    async (_event, url: string, currentTime?: number) => {
      try {
        await openPipWindow(url, currentTime)
        return { success: true }
      } catch (error: any) {
        console.error('Failed to open PiP window:', error)
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('hide-main-window', () => {
    try {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) win.hide()
      return { success: true }
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Failed to show main window:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('chatgpt:ask', async (_event, prompt: string, idToken?: string) => {
    console.log('[chatgpt:ask] Received prompt:', prompt)
    try {
      const win = await ensureChatWindow(idToken)
      // New chat
      await win.webContents.executeJavaScript(`
        (() => {
          const btn = document.querySelector('a[href="/"]') ||
            document.querySelector('button[data-testid="mobile-menu-button"]')
          if (btn) {
            btn.click()
            return true
          }
          return false
        })()
      `)
      await new Promise((r) => setTimeout(r, 2000))
      // Enter prompt
      await win.webContents.executeJavaScript(`
        (() => {
          const sel = 'textarea#prompt-textarea, textarea[data-id="root"], [contenteditable="true"]'
          const el = document.querySelector(sel)
          if (!el) return false
          if (el.getAttribute('contenteditable') === 'true') {
            el.innerHTML = ${JSON.stringify(prompt)}
            el.dispatchEvent(new Event('input', { bubbles: true }))
          } else {
            ;(el as HTMLTextAreaElement).value = ${JSON.stringify(prompt)}
            el.dispatchEvent(new Event('input', { bubbles: true }))
          }
          return true
        })()
      `)
      // Send
      await win.webContents.executeJavaScript(`
        (() => {
          const btn = document.querySelector('button[data-testid="send-button"]')
          if (btn) btn.click()
          return !!btn
        })()
      `)
      // Wait response
      const response = await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
          let count = 0
          const max = 300
          const check = () => {
            count++
            const stop = document.querySelector('button[data-testid="stop-button"]')
            const msgs = document.querySelectorAll('.markdown')
            if (!stop && msgs.length) return resolve(msgs[msgs.length - 1].innerText)
            if (count >= max) return resolve('RESPONSE_TIMEOUT')
            setTimeout(check, 1000)
          }
          check()
        })
      `)
      if (response === 'RESPONSE_TIMEOUT') {
        throw new Error('RESPONSE_TIMEOUT')
      }
      return { success: true, response }
    } catch (error: any) {
      console.error('ChatGPT ask error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('chatgpt:sync-session', async (_event, idToken?: string) => {
    try {
      // If a new Google token is provided, sync it first
      if (idToken) {
        await syncGoogleSession(idToken)
      }
      // Always sync ChatGPT session afterwards
      await syncChatGPTSession()
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] chatgpt:sync-session error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.on('move-pip-window', (_event, x: number, y: number) => {
    try {
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (win && !win.isDestroyed()) {
        win.setPosition(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)))
      }
    } catch (error: any) {
      console.error('Failed to move PiP window:', error)
    }
  })

  ipcMain.on('close-pip', (_event) => {
    try {
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (win && !win.isDestroyed()) win.close()
    } catch (error) {
      console.error('Failed to close PiP window:', error)
    }
  })

  ipcMain.handle('open-external', async (_event, url: string) => {
    try {
      if (!url || typeof url !== 'string') throw new Error('Invalid URL')
      if (!/^https?:\/\//.test(url) && !url.startsWith('mailto:'))
        throw new Error('URL must start with http://, https://, or mailto:')
      await shell.openExternal(url)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to open external URL:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('storage:get', async (_event, key: string) => {
    try {
      const store: any = await storePromise
      return { success: true, value: store.get(key) }
    } catch (error: any) {
      console.error('Storage get error:', error)
      return { success: false, error: error.message, value: null }
    }
  })

  ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
    try {
      const store: any = await storePromise
      store.set(key, value)
      return { success: true }
    } catch (error: any) {
      console.error('Storage set error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('storage:remove', async (_event, key: string) => {
    try {
      const store: any = await storePromise
      store.delete(key)
      return { success: true }
    } catch (error: any) {
      console.error('Storage remove error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('sync-google-session', async (_event, idToken: string) => {
    try {
      await syncGoogleSession(idToken)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to sync Google session:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('clear-google-session', async () => {
    try {
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'websql', 'indexdb']
      })
      await session.defaultSession.clearCache()
      return { success: true }
    } catch (error: any) {
      console.error('Failed to clear Google session:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('app-quit', () => {
    try {
      setTimeout(() => app.quit(), 100)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to quit app:', error)
      return { success: false, error: error.message }
    }
  })

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

  ipcMain.on('get-path', (event, name: string) => {
    try {
      const validPaths = [
        'home',
        'appData',
        'userData',
        'temp',
        'desktop',
        'documents',
        'downloads'
      ]
      event.returnValue = validPaths.includes(name)
        ? app.getPath(name as any)
        : null
    } catch (error) {
      console.error('Failed to get path:', error)
    }
  })

  app.on('before-quit', () => {
    console.log('App is about to quit, cleaning up...')
  })
}