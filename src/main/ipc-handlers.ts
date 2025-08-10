import { app, ipcMain, BrowserWindow, shell, session, webContents } from 'electron'
import { getMainWindow } from './windows/mainWindow'
import { openPipWindow } from './windows/pipWindow'
import { storePromise } from './ipc/storage'

// Map lưu tabId -> webContentsId
const tabToWebContentsMap = new Map<string, number>()

// Helper to fallback find webContents id by URL pattern
function findWebContentsIdByUrl(urlPattern: string): number | undefined {
  for (const [tId, wcId] of tabToWebContentsMap) {
    const wc = webContents.fromId(wcId)
    if (wc && !wc.isDestroyed() && wc.getURL().includes(urlPattern)) {
      return wcId
    }
  }
  return undefined
}

// Register all IPC handlers
export function registerIpcHandlers(): void {
  ipcMain.on('ping', (event) => {
    event.reply('pong')
  })

  // ChatGPT webview registration
  ipcMain.handle('chatgpt:register-webview', (_event, tabId: string, wcId: number) => {
    tabToWebContentsMap.set(tabId, wcId)
    console.log(`[ipc-handlers] Registered Webview for tab ${tabId} -> wcId ${wcId}`)
    return { success: true }
  })

  ipcMain.handle('chatgpt:unregister-webview', (_event, tabId: string) => {
    tabToWebContentsMap.delete(tabId)
    console.log(`[ipc-handlers] Unregistered Webview for tab ${tabId}`)
    return { success: true }
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
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('new-tab')
      }
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] new-tab error:', error)
      return { success: false, error: error.message }
    }
  })

  // Ask ChatGPT via specific tab
  ipcMain.handle('chatgpt:ask-via-tab', async (_event, tabId: string, prompt: string, accountId: string) => {
    let retryCount = 0
    const maxRetries = 20  // Increased retry attempts
    const retryDelay = 1500 // Delay between retries (ms)
    let webContentsId: number | undefined

    while (retryCount < maxRetries) {
      webContentsId = tabToWebContentsMap.get(tabId)
      if (webContentsId) break
      retryCount++
      console.log(`[ask-via-tab] retry ${retryCount}, waiting ${retryDelay}ms for webview registration...`)
      await new Promise((r) => setTimeout(r, retryDelay))
    }

    console.log(`[ask-via-tab] Tab ${tabId} -> WCID: ${webContentsId} (${retryCount} retries)`)

    if (!webContentsId) {
      console.error('[ask-via-tab] WebContents not found after retries. Registered tabs:', [...tabToWebContentsMap.keys()])
      console.warn('[ask-via-tab] Falling back to find ChatGPT tab within same account')

      // Account-based fallback: search registered tabs for this account first
      for (const [tId, wcId] of tabToWebContentsMap.entries()) {
        if (tId.startsWith(accountId)) {
          try {
            const wcCandidate = webContents.fromId(wcId)
            const url = wcCandidate?.getURL() || ''
            if (wcCandidate && !wcCandidate.isDestroyed() && (url.includes('chat.openai.com') || url.includes('chatgpt.com'))) {
              webContentsId = wcId
              console.log(`[ask-via-tab] account-based fallback found for tabId=${tId}, WCID=${wcId}`)
              break
            }
          } catch (e) {
            console.error('[ask-via-tab] account-based fallback error:', e)
          }
        }
      }

      if (!webContentsId) {
        console.warn('[ask-via-tab] No account-based ChatGPT tab found, falling back to any ChatGPT tab')
      }

      if (!webContentsId) {
        // URL-based fallback: any ChatGPT tab across accounts
        webContentsId = findWebContentsIdByUrl('chat.openai.com') || findWebContentsIdByUrl('chat.openai.com')
      }

      // Direct mapping fallback for that tabId
      const directWcId = tabToWebContentsMap.get(tabId)
      if (directWcId) {
        try {
          const wc2 = webContents.fromId(directWcId)
          if (
            wc2 &&
            !wc2.isDestroyed() &&
            (wc2.getURL().includes('chat.openai.com') || wc2.getURL().includes('chatgpt.com'))
          ) {
            webContentsId = directWcId
            console.log(`[ask-via-tab] direct mapping fallback accepted for ChatGPT tabId=${tabId}, WCID=${webContentsId}`)
          }
        } catch (e) {
          console.error('[ask-via-tab] direct mapping check failed:', e)
        }
      }

      // Final fallback: first registered mapping
      if (!webContentsId && tabToWebContentsMap.size > 0) {
        const [fallbackTabId, fallbackWcId] = [...tabToWebContentsMap.entries()][0]
        webContentsId = fallbackWcId
        console.log(`[ask-via-tab] final fallback to first mapping: tabId=${fallbackTabId}, WCID=${fallbackWcId}`)
      }

      console.log(`[ask-via-tab] post-fallback Tab ${tabId} -> WCID: ${webContentsId}`)
    }

    if (!webContentsId) {
      return { success: false, error: 'No active ChatGPT tabs found' }
    }

    try {
      const wc = webContents.fromId(webContentsId)
      if (!wc || wc.isDestroyed()) {
        return { success: false, error: 'WebContents is destroyed' }
      }

      // allow webview to settle
      await new Promise((r) => setTimeout(r, 1000))

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
            return new Promise((resolve) => {
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

  // Legacy register/unregister (if used)
  ipcMain.on('register-webview', (_event, tabId, webContentsId) => {
    tabToWebContentsMap.set(tabId, webContentsId)
  })
  ipcMain.on('unregister-webview', (_event, tabId: string) => {
    tabToWebContentsMap.delete(tabId)
  })

  // Storage handlers
  ipcMain.handle('storage:get', async (_event, key: string) => {
    try {
      const store = await storePromise
      const value = store.get(key)
      return { success: true, value }
    } catch (error: any) {
      console.error('storage:get error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
    try {
      const store = await storePromise
      await store.set(key, value)
      return { success: true }
    } catch (error: any) {
      console.error('storage:set error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('storage:remove', async (_event, key: string) => {
    try {
      const store = await storePromise
      await store.delete(key)
      return { success: true }
    } catch (error: any) {
      console.error('storage:remove error:', error)
      return { success: false, error: error.message }
    }
  })

  // Sync Google OAuth session
  ipcMain.handle('sync-google-session', async (_event, idToken: string) => {
    try {
      await session.defaultSession.cookies.set({
        url: 'https://google.com',
        name: 'idToken',
        value: idToken,
      })
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] sync-google-session error:', error)
      return { success: false, error: error.message }
    }
  })

  // Clear Google OAuth session
  ipcMain.handle('clear-google-session', async () => {
    try {
      // No-op for now
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] clear-google-session error:', error)
      return { success: false, error: error.message }
    }
  })

  // Periodic per-account ChatGPT tab monitor
  setInterval(() => {
    const accountToTabs: Record<string, string[]> = {}
    for (const [tabId] of tabToWebContentsMap.entries()) {
      const accountId = tabId.slice(0, 36)
      accountToTabs[accountId] = accountToTabs[accountId] || []
      accountToTabs[accountId].push(tabId)
    }
    for (const [accountId, tabs] of Object.entries(accountToTabs)) {
      const activeChatTabs = tabs.filter((tid) => {
        const wcId = tabToWebContentsMap.get(tid)!
        const wc = webContents.fromId(wcId)
        return (
          wc &&
          !wc.isDestroyed() &&
          (wc.getURL().includes('chat.openai.com') || wc.getURL().includes('chatgpt.com'))
        )
      })
      if (activeChatTabs.length) {
        console.log(`[ipc-handlers][monitor][account:${accountId}] Active ChatGPT tabs: ${JSON.stringify(activeChatTabs)}`)
      } else {
        console.log(`[ipc-handlers][monitor][account:${accountId}] No ChatGPT tabs found`)
      }
    }
  }, 1000)
}
