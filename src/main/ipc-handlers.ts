import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import path from 'path'

// Lazy-load a single persistent electron-store instance
const storePromise = import('electron-store').then(({ default: Store }) =>
  new Store({
    cwd: app.getPath('userData'),
    name: 'account_store',
    clearInvalidConfig: true,
    watch: false
  })
)

import { openPipWindow } from './windows/pipWindow'
// ChatGPT hidden background window
console.log('[ipc-handlers] Module loaded');
let chatWindow: BrowserWindow | null = null;
const ensureChatWindow = async (): Promise<BrowserWindow> => {
  console.log('[ipc-handlers] ensureChatWindow invoked');
  if (!chatWindow || chatWindow.isDestroyed()) {
    console.log('[ipc-handlers] Creating new chatWindow');
    chatWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true
      }
    });
    console.log('[ipc-handlers] chatWindow created, loading URL...');
    await chatWindow.loadURL('https://chat.openai.com');
    console.log('[ipc-handlers] loadURL completed, waiting for prompt-textarea...');
    await chatWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const waitForInput = () => {
          if (document.getElementById('prompt-textarea')) {
            console.log('[ipc-handlers] prompt-textarea found');
            resolve(undefined);
          } else {
            setTimeout(waitForInput, 500);
          }
        };
        waitForInput();
      });
    `, true);
  }
  console.log('[ipc-handlers] Opening DevTools for chatWindow');
  chatWindow!.webContents.openDevTools({ mode: 'detach' });
  console.log('[ipc-handlers] DevTools opened');
  console.log('[ipc-handlers] Returning chatWindow');
  return chatWindow!;
};

import { getMainWindow } from './windows/mainWindow'

export function registerIpcHandlers(): void {
  // Simple ping handler
  ipcMain.on('ping', (event) => {
    event.reply('pong');
  });

  ipcMain.handle('open-pip-window', async (_event, url: string, currentTime?: number) => {
    try {
      await openPipWindow(url, currentTime);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to open PiP window:', error)
      return { success: false, error: error.message }
    }
  });

  ipcMain.handle('hide-main-window', () => {
    try {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.hide()
      }
      return { success: true }
    } catch (error: any) {
      console.error('Failed to hide main window:', error)
      return { success: false, error: error.message }
    }
  });

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
  });

  // ChatGPT ask handler - SỬA Ở ĐÂY
  ipcMain.handle('chatgpt:ask', async (_event, prompt: string) => {
    console.log('[chatgpt:ask] Received prompt:', prompt)
    try {
      const win = await ensureChatWindow()
      console.log('[chatgpt:ask] Chat window ready')
      // Start a fresh chat to clear welcome message
      const newChatResult = await win.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const link = document.querySelector('a[href="/chat"]') || document.querySelector('a[href="/?model=gpt-4"]');
          if (!link) return reject('NEW_CHAT_LINK_NOT_FOUND');
          link.click();
          resolve('NEW_CHAT_CLICKED');
        });
      `, true);
      console.log('[chatgpt:ask] newChatResult:', newChatResult);
      // Record initial conversation turns count
      const initialCount: number = await win.webContents.executeJavaScript(
        `document.querySelectorAll('[data-testid^="conversation-turn-"]').length`,
        true
      )
      console.log('[chatgpt:ask] Initial turn count:', initialCount)
      // Inject prompt using textarea selector with error handling
      await win.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          try {
            const textarea = document.querySelector('textarea');
            if (!textarea) {
              return reject('TEXTAREA_NOT_FOUND');
            }
            textarea.value = ${JSON.stringify(prompt)};
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('[ipc-handlers] Prompt injected via textarea');
            resolve('SUCCESS');
          } catch (e) {
            reject(e);
          }
        });
      `, true)
      console.log('[chatgpt:ask] Prompt injected successfully')
      // Click send button using data-testid selector
      const clickResult = await win.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          try {
            const btn = document.querySelector('button[data-testid="send-button"]');
            if (!btn) return reject('SEND_BUTTON_NOT_FOUND');
            btn.click();
            console.log('[ipc-handlers] Send button clicked');
            resolve('CLICKED');
          } catch (e) {
            reject(e);
          }
        });
      `, true);
      console.log('[chatgpt:ask] clickResult:', clickResult);
      // Wait for response text, skip initial welcome turns
      console.log('[chatgpt:ask] Waiting for ChatGPT response...')
      const response: string = await win.webContents.executeJavaScript(`
     new Promise((resolve, reject) => {
       let attempts = 0
       const initial = ${initialCount}
       const interval = setInterval(() => {
         attempts++
         const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]')
         if (turns.length > initial) {
           const last = turns[turns.length - 1]
           if (!last.querySelector('.result-streaming')) {
             const contentEl = last.querySelector('.markdown')
             clearInterval(interval)
             resolve(contentEl ? contentEl.textContent : '')
           }
         }
         if (attempts >= 60) {
           clearInterval(interval)
           reject('Timeout waiting for ChatGPT response')
         }
       }, 1000)
     });
   `, true)
      console.log('[chatgpt:ask] Received response length:', response.length)
      return { success: true, response }
    } catch (error: any) {
      console.error('ChatGPT ask error:', error)
      return { success: false, error: error.message }
    }
  });

  // PiP window movement
  ipcMain.on('move-pip-window', (event, x: number, y: number) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        const safeX = Math.max(0, Math.round(x))
        const safeY = Math.max(0, Math.round(y))
        win.setPosition(safeX, safeY)
      }
    } catch (error: any) {
      console.error('Failed to move PiP window:', error)
    }
  });

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
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    try {
      if (!url || typeof url !== 'string') throw new Error('Invalid URL provided')
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:'))
        throw new Error('URL must start with http://, https://, or mailto:')
      await shell.openExternal(url)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to open external URL:', error)
      return { success: false, error: error.message }
    }
  });

  ipcMain.handle('storage:get', async (_event, key: string) => {
    try {
      if (!key || typeof key !== 'string')
        throw new Error('Invalid storage key')
      const store = await storePromise
      const value = store.get(key)
      return { success: true, value }
    } catch (error: any) {
      console.error('Storage get error:', error)
      return { success: false, error: error.message, value: null }
    }
  });

  ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
    try {
      if (!key || typeof key !== 'string')
        throw new Error('Invalid storage key')
      const store = await storePromise
      store.set(key, value)
      return { success: true }
    } catch (error: any) {
      console.error('Storage set error:', error)
      return { success: false, error: error.message }
    }
  });

  ipcMain.handle('storage:remove', async (_event, key: string) => {
    try {
      if (!key || typeof key !== 'string')
        throw new Error('Invalid storage key')
      const store = await storePromise
      store.delete(key)
      return { success: true }
    } catch (error: any) {
      console.error('Storage remove error:', error)
      return { success: false, error: error.message }
    }
  });

  ipcMain.handle('sync-google-session', async (_event, idToken: string) => {
    try {
      if (!idToken || typeof idToken !== 'string')
        throw new Error('Invalid ID token provided')
      const tokenParts = idToken.split('.')
      if (tokenParts.length !== 3)
        throw new Error('Invalid token format')
      // Here you could implement actual session cookie syncing if needed
      return { success: true }
    } catch (error: any) {
      console.error('Failed to sync Google session:', error)
      return { success: false, error: error.message }
    }
  });

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
  });

  ipcMain.handle('app-quit', () => {
    try {
      setTimeout(() => {
        app.quit()
      }, 100)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to quit app:', error)
      return { success: false, error: error.message }
    }
  });

  ipcMain.on('devtools-open', (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.webContents.openDevTools({ mode: 'detach' })
      }
    } catch (error) {
      console.error('Failed to open DevTools:', error)
    }
  });

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
    }
  });

  app.on('before-quit', () => {
    console.log('App is about to quit, cleaning up...')
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });
}
