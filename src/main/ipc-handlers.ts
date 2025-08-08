import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import { getMainWindow } from './windows/mainWindow'
import { openPipWindow } from './windows/pipWindow'
import { ensureChatGPTWindow } from './windows/chatGPTWindow'
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

  ipcMain.handle('chatgpt:ask', async (_event, prompt: string, idToken?: string) => {
    console.log('[chatgpt:ask] Received prompt:', prompt)
    console.log('[DEBUG] Ensuring ChatGPT window with idToken:', idToken)
    try {
      const win = await ensureChatGPTWindow(idToken)

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

      // Wait for response
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
      if (idToken) {
        await session.defaultSession.cookies.set({
          url: 'https://chat.openai.com',
          name: '__Secure-next-auth.session-token',
          value: idToken,
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        })
        await ensureChatGPTWindow(idToken)
      }
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] chatgpt:sync-session error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('chatgpt:ask-via-tab', async (_event, tabId: string, prompt: string, accountId: string) => {
    try {
      const webContentsId = tabToWebContentsMap.get(tabId)
      if (!webContentsId) {
        return { success: false, error: 'WebContents not found for tab' }
      }

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
