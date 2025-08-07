import { app, ipcMain, BrowserWindow, shell, session } from 'electron'
import * as path from 'path'
// Utility to fetch cookies from the default session for a given domain
export async function getCookiesForDomain(domain: string) {
  return session.defaultSession.cookies.get({ domain })
}

// Sync Google session token as a cookie across ChatGPT domains
export async function syncGoogleSession(idToken: string): Promise<void> {
  const domains = ['chat.openai.com', 'openai.com', 'chatgpt.com']
  for (const domain of domains) {
    try {
      await session.defaultSession.cookies.set({
        url: `https://${domain}`,
        name: '__Secure-next-auth.session-token',
        value: idToken,
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });
      console.log(`[ipc-handlers] Cookie set successfully for ${domain}`);
    } catch (error: any) {
      console.error(`[ipc-handlers] Failed to set cookie for ${domain}:`, error);
    }
  }
}
// Sync ChatGPT session token across the hidden background window's partition
async function syncChatGPTSession(): Promise<void> {
  try {
    // Retrieve existing ChatGPT session-token cookie
    const tokens = await session.defaultSession.cookies.get({
      domain: 'chat.openai.com',
      name: '__Secure-next-auth.session-token'
    });
    if (tokens.length === 0) return;
    // Sync into the hidden chat window’s partition
    const chatSession = session.fromPartition('persist:chatgpt-session');
    const cookie = tokens[0];
    await chatSession.cookies.set({
      url: `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite
    });
    console.log('[ipc-handlers] ChatGPT session synced successfully');
  } catch (error: any) {
    console.error('[ipc-handlers] Failed to sync ChatGPT session:', error);
  }
}

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
    // fetch existing cookies for ChatGPT domain
    const cookies = await getCookiesForDomain('chat.openai.com');

    // create a dedicated persistent session partition
    chatWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload/index.js'),
        contextIsolation: true,
        partition: 'persist:chatgpt-session'
      }
    });

    // sync cookies into the new partition’s session
    const newSession = session.fromPartition('persist:chatgpt-session');
    for (const cookie of cookies) {
      // skip cookies without valid domain
      if (!cookie.domain) continue;
      // Accept domains starting with "." by stripping the dot
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      try {
        await newSession.cookies.set({
          url: cookie.secure ? `https://${cookie.domain}` : `http://${cookie.domain}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite
        });
      } catch (error: any) {
        console.error(`[ipc-handlers] Failed to sync cookie ${cookie.name} for domain ${cookie.domain}:`, error);
      }
    }

    console.log('[ipc-handlers] chatWindow created, loading URL with synced session...');
    await syncChatGPTSession();
    await chatWindow.loadURL('https://chat.openai.com');
    console.log('[ipc-handlers] loadURL completed, checking network status and waiting for prompt-textarea...');
    // Network connectivity check
    const isOnline = await chatWindow.webContents.executeJavaScript(`navigator.onLine`, true);
    if (!isOnline) {
      throw new Error('NETWORK_OFFLINE');
    }
    // Handle potential login redirects
    await chatWindow.webContents.executeJavaScript(`
      if (window.location.href.includes('auth0')) {
        window.location.href = 'https://chat.openai.com';
      }
    `, true);
    const status = await chatWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const MAX_ATTEMPTS = 50;
        let attempts = 0;
        const checkCondition = () => {
          attempts++;
          const textarea = document.querySelector('textarea#prompt-textarea, textarea[data-id="root"]');
          const loginButton = document.querySelector('button[data-provider="google"], button[data-testid="login-button"]');
          if (textarea) {
            console.log('[ipc-handlers] prompt-textarea found');
            resolve('READY');
          } else if (loginButton) {
            console.log('[ipc-handlers] Login required');
            resolve('LOGIN_REQUIRED');
          } else if (attempts >= MAX_ATTEMPTS) {
            // Diagnostic info before timeout
            const bodyContent = document.body.innerText.substring(0, 200);
            console.warn('[ipc-handlers] Body content snapshot:', bodyContent);
            const errorState = document.querySelector('.error')?.innerText || 'UNKNOWN_STATE';
            resolve('TIMEOUT:' + errorState);
          } else {
            setTimeout(checkCondition, 500);
          }
        };
        checkCondition();
      });
    `, true);
    if (status === 'LOGIN_REQUIRED') {
      console.log('[ipc-handlers] Login required in hidden window, clicking login button');
      await chatWindow.webContents.executeJavaScript(`
        const btn = document.querySelector('button[data-dd-action-name="Continue with Google"], button[data-testid="welcome-login-button"], button[data-testid="mobile-login-button"]');
        if (btn) btn.click();
      `, true);
      // Wait for login flow to complete
      await new Promise((res) => setTimeout(res, 5000));
    }
    if (status.startsWith('TIMEOUT')) {
      throw new Error('ELEMENT_TIMEOUT');
    }
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
    // Try multiple selectors for the new chat button
    const selectors = [
      'a[href="/"]', // New homepage
      'button:has(svg[aria-label="New chat"])', // SVG icon button
      'div[data-testid="new-chat-button"]', // Data test ID
      'a[href="/chat"]'
    ];
    
    let link;
    for (const selector of selectors) {
      link = document.querySelector(selector);
      if (link) break;
    }
    
    if (!link) return reject('NEW_CHAT_LINK_NOT_FOUND');
    link.click();
    resolve('NEW_CHAT_CLICKED');
  });
`, true);
      console.log('[chatgpt:ask] newChatResult:', newChatResult);
      // stabilization delay after navigation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user is logged into ChatGPT UI
      const isLoggedIn = await win.webContents.executeJavaScript(`
        !!document.querySelector('button[data-testid="send-button"]')
      `, true);
      if (!isLoggedIn) {
        console.warn('[ipc-handlers] ChatGPT hidden window not signed in, proceeding anyway');
      }
      // Record initial conversation turns count
      const initialCount: number = await win.webContents.executeJavaScript(
        `document.querySelectorAll('[data-testid^="conversation-turn-"]').length`,
        true
      )
      console.log('[chatgpt:ask] Initial turn count:', initialCount)
      // Inject prompt using retry logic for textarea injection
      await win.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const MAX_ATTEMPTS = 10;
          let attempts = 0;

          const tryInject = () => {
            attempts++;
            const textarea = document.querySelector('textarea#prompt-textarea') ||
                              document.querySelector('textarea');

            if (textarea) {
              textarea.value = ${JSON.stringify(prompt)};
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              resolve('SUCCESS');
            } else if (attempts < MAX_ATTEMPTS) {
              setTimeout(tryInject, 500);
            } else {
              reject('TEXTAREA_NOT_FOUND');
            }
          };

          tryInject();
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

  // Sync ChatGPT session handler
  ipcMain.handle('chatgpt:sync-session', async () => {
    try {
      await syncChatGPTSession();
      return { success: true };
    } catch (error: any) {
      console.error('[ipc-handlers] chatgpt:sync-session error:', error);
      return { success: false, error: error.message };
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
      const store: any = await storePromise
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
      const store: any = await storePromise
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
      const store: any = await storePromise
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
      // perform session syncing
      await syncGoogleSession(idToken)
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
