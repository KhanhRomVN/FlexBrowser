import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import { getMainWindow } from './windows/mainWindow'
import { openPipWindow } from './windows/pipWindow'
import { storePromise } from './ipc/storage'

// Map lưu tabId -> webContentsId
const tabToWebContentsMap = new Map<string, number>()

// Register all IPC handlers
export function registerIpcHandlers(): void {
  ipcMain.on('ping', (event) => {
    event.reply('pong')
  })

  ipcMain.handle('open-pip-window', async (_event, url: string, currentTime?: number) => {
    try {
      await openPipWindow(url, currentTime)
      return { success: true }
    } catch (error: any) {
      console.error('Failed to open PiP window:', error)
      return { success: false, error: error.message }
    }
  })

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
  // Handle new-tab command from renderer
  ipcMain.handle('new-tab', async () => {
    try {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('new-tab');
      }
      return { success: true };
    } catch (error: any) {
      console.error('[ipc-handlers] new-tab error:', error);
      return { success: false, error: error.message };
    }
  });


  ipcMain.handle('chatgpt:ask-via-tab', async (_event, tabId: string, prompt: string, accountId: string) => {
    let retryCount = 0
    const maxRetries = 3
    let webContentsId: number | undefined
    while (retryCount < maxRetries) {
      webContentsId = tabToWebContentsMap.get(tabId)
      if (webContentsId) break
      retryCount++
      await new Promise(r => setTimeout(r, 500))
    }
    if (!webContentsId) {
      return { success: false, error: 'WebContents not found after retries' }
    }
    try {

      const wc = BrowserWindow.fromId(webContentsId)?.webContents
      if (!wc || wc.isDestroyed()) {
        return { success: false, error: 'WebContents is destroyed' }
      }

      await new Promise(r => setTimeout(r, 500)) // allow webview ready

      const result = await wc.executeJavaScript(`
        (async function() {
          try {
            const promptText = ${JSON.stringify(prompt)};
            const inputSelector = 'textarea#prompt-textarea, [contenteditable="true"]';
            const inputEl = document.querySelector(inputSelector);
            if (!inputEl) {
              return { success: false, error: 'INPUT_NOT_FOUND' };
            }
            if (inputEl.tagName === 'TEXTAREA') {
              inputEl.value = promptText;
            } else {
              inputEl.innerText = promptText;
            }
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            const sendBtn = document.querySelector('button[data-testid="send-button"]');
            if (!sendBtn) {
              return { success: false, error: 'SEND_BUTTON_NOT_FOUND' };
            }
            sendBtn.click();
            return new Promise(resolve => {
              let attempts = 0;
              const maxAttempts = 60;
              const check = () => {
                attempts++;
                const stopBtn = document.querySelector('button[data-testid="stop-button"]');
                const msgs = document.querySelectorAll('.markdown, [data-message-author-role="assistant"]');
                const last = msgs[msgs.length - 1];
                if (!stopBtn && last?.textContent.trim().length) {
                  return resolve({ success: true, response: last.textContent });
                }
                if (attempts >= maxAttempts) {
                  return resolve({ success: false, error: 'RESPONSE_TIMEOUT' });
                }
                setTimeout(check, 500);
              };
              check();
            });
          } catch (e) {
            return { success: false, error: e.message };
          }
        })()
      `)

      return result
    } catch (err: any) {
      console.error('ask-via-tab handler error:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.on('register-webview', (_event, tabId, webContentsId) => {
    tabToWebContentsMap.set(tabId, webContentsId)
  })

  // Unregister webview for tab
  ipcMain.on('unregister-webview', (_event, tabId: string) => {
    tabToWebContentsMap.delete(tabId)
  })
  // Storage handlers
  ipcMain.handle('storage:get', async (_event, key: string) => {
    try {
      const store = await storePromise;
      const value = store.get(key);
      return { success: true, value };
    } catch (error: any) {
      console.error('storage:get error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
    try {
      const store = await storePromise;
      await store.set(key, value);
      return { success: true };
    } catch (error: any) {
      console.error('storage:set error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('storage:remove', async (_event, key: string) => {
    try {
      const store = await storePromise;
      await store.delete(key);
      return { success: true };
    } catch (error: any) {
      console.error('storage:remove error:', error);
      return { success: false, error: error.message };
    }
  });
  // Sync Google OAuth session
  ipcMain.handle('sync-google-session', async (_event, idToken: string) => {
    try {
      await session.defaultSession.cookies.set({
        url: 'https://google.com',
        name: 'idToken',
        value: idToken
      });
      return { success: true };
    } catch (error: any) {
      console.error('[ipc-handlers] sync-google-session error:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear Google OAuth session
  ipcMain.handle('clear-google-session', async () => {
    try {
      // No-op for now
      return { success: true };
    } catch (error: any) {
      console.error('[ipc-handlers] clear-google-session error:', error);
      return { success: false, error: error.message };
    }
  });
}
