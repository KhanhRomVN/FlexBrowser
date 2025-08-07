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
        sameSite: 'lax',
        expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 1 week
      })
      console.log(`[ipc-handlers] Cookie set successfully for ${domain}`)
    } catch (error: any) {
      console.error(`[ipc-handlers] Failed to set cookie for ${domain}:`, error)
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
    })
    if (tokens.length === 0) return

    // Sync into the hidden chat window's partition
    const chatSession = session.fromPartition('persist:chatgpt-session')
    const cookie = tokens[0]
    await chatSession.cookies.set({
      url: `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate
    })
    console.log('[ipc-handlers] ChatGPT session synced successfully')
  } catch (error: any) {
    console.error('[ipc-handlers] Failed to sync ChatGPT session:', error)
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
import { getMainWindow } from './windows/mainWindow'

// ChatGPT hidden background window
let chatWindow: BrowserWindow | null = null
const ensureChatWindow = async (): Promise<BrowserWindow> => {
  console.log('[ensureChatWindow] Starting chat window initialization')

  if (!chatWindow || chatWindow.isDestroyed()) {
    console.log('[ensureChatWindow] Creating new chatWindow')
    chatWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        partition: 'persist:chatgpt-session',
        nodeIntegration: false
      }
    })

    // Handle new windows (popups)
    chatWindow.webContents.setWindowOpenHandler((details) => {
      console.log(`[windowOpenHandler] Requested new window for: ${details.url}`)

      if (details.url.includes('accounts.google.com')) {
        console.log('[windowOpenHandler] Redirecting Google auth to external browser')
        shell.openExternal(details.url)
      } else if (details.url.includes('openai.com') || details.url.includes('chatgpt.com')) {
        console.log(`[windowOpenHandler] Loading in chatWindow: ${details.url}`)
        chatWindow?.loadURL(details.url)
      } else {
        console.log(`[windowOpenHandler] Opening externally: ${details.url}`)
        shell.openExternal(details.url)
      }

      return { action: 'deny' }
    })
  }

  // Check if already logged in
  const currentURL = chatWindow.webContents.getURL()
  if (currentURL.startsWith('https://chat.openai.com') ||
    currentURL.startsWith('https://chatgpt.com')) {
    console.log('[ensureChatWindow] Already on ChatGPT, checking login status')
    const isLoggedIn = await chatWindow.webContents.executeJavaScript(`
      document.querySelector('button[data-testid="send-button"]') !== null
    `)

    if (isLoggedIn) {
      console.log('[ensureChatWindow] User is already logged in')
      return chatWindow
    }
  }

  // Load ChatGPT URL
  console.log('[ensureChatWindow] Loading ChatGPT URL')
  await chatWindow.loadURL('https://chatgpt.com')

  // Wait for login state
  console.log('[ensureChatWindow] Checking login state...')
  const loginState = await chatWindow.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const MAX_CHECKS = 30; // 30 * 500ms = 15 seconds timeout
      let checks = 0;
      
      const checkLoginState = () => {
        checks++;
        
        // Check if logged in
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (sendButton) {
          return resolve('LOGGED_IN');
        }
        
        // Check if login button exists
        const selectorLogin = 'button[data-testid="mobile-login-button"], button[data-testid="login-button"]';
        const loginButton = document.querySelector(selectorLogin);
        if (loginButton) {
          return resolve('LOGIN_REQUIRED');
        }
        
        if (checks >= MAX_CHECKS) {
          return resolve('TIMEOUT');
        }
        
        setTimeout(checkLoginState, 500);
      };
      
      checkLoginState();
    });
  `)

  console.log(`[ensureChatWindow] Login state: ${loginState}`)

  if (loginState === 'LOGIN_REQUIRED') {
    console.log('[ensureChatWindow] Clicking login button')
    await chatWindow.webContents.executeJavaScript(`
      (() => {
        const selectorBtn = 'button[data-testid="mobile-login-button"], button[data-testid="login-button"]';
        const btn = document.querySelector(selectorBtn);
        if (btn) btn.click();
        return !!btn;
      })();
    `)

    // Wait for auth page to load
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Click Google login if available
    const googleLoginClicked = await chatWindow.webContents.executeJavaScript(`
      (() => {
        const selectorGoogle = 'button[data-provider="google"], button[data-dd-action-name="Continue with Google"]';
        const googleBtn = document.querySelector(selectorGoogle);
        if (googleBtn) {
          googleBtn.click();
          return true;
        }
        return false;
      })();
    `)

    console.log(`[ensureChatWindow] Google login clicked: ${googleLoginClicked}`)

    if (!googleLoginClicked) {
      throw new Error('GOOGLE_LOGIN_BUTTON_NOT_FOUND')
    }

    // Wait for login completion
    console.log('[ensureChatWindow] Waiting for login completion...')
    const loginResult = await chatWindow.webContents.executeJavaScript(`
      new Promise(resolve => {
        const MAX_CHECKS = 30;
        let tries = 0;
        
        const check = () => {
          tries++;
          const sendButton = document.querySelector('button[data-testid="send-button"]');
          
          if (sendButton) {
            resolve('LOGGED_IN');
          } else if (tries >= MAX_CHECKS) {
            resolve('LOGIN_TIMEOUT');
          } else {
            setTimeout(check, 1000);
          }
        };
        
        check();
      });
    `)

    console.log(`[ensureChatWindow] Login result: ${loginResult}`)

    if (loginResult !== 'LOGGED_IN') {
      throw new Error('LOGIN_FAILED: ' + loginResult)
    }
  }

  console.log('[ensureChatWindow] Chat window ready')
  return chatWindow
}

export function registerIpcHandlers(): void {
  // Simple ping handler
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
      if (win && !win.isDestroyed()) {
        win.hide()
      }
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

  ipcMain.handle('chatgpt:ask', async (_event, prompt: string) => {
    console.log('[chatgpt:ask] Received prompt:', prompt)

    try {
      const win = await ensureChatWindow()
      console.log('[chatgpt:ask] Chat window ready')

      // Start new chat
      console.log('[chatgpt:ask] Starting new chat')
      await win.webContents.executeJavaScript(`
        (() => {
          try {
            // Try desktop version
            const newChatBtn = document.querySelector('a[href="/"]')
            if (newChatBtn) {
              newChatBtn.click()
              return true
            }
            
            // Try mobile version
            const mobileMenuBtn = document.querySelector('button[data-testid="mobile-menu-button"]')
            if (mobileMenuBtn) {
              mobileMenuBtn.click()
              setTimeout(() => {
                const mobileNewChat = document.querySelector('a[href="/"]')
                if (mobileNewChat) mobileNewChat.click()
              }, 500)
              return true
            }
            
            return false
          } catch (e) {
            console.error('New chat error:', e)
            return false
          }
        })()
      `)

      // Wait for new chat to initialize
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Enter prompt
      console.log('[chatgpt:ask] Entering prompt')
      await win.webContents.executeJavaScript(`
        (() => {
          try {
            const selector = 'textarea#prompt-textarea, textarea[data-id="root"], [contenteditable="true"]';
            const textarea = document.querySelector(selector);
            
            if (textarea) {
              // For contenteditable div
              if (textarea.contentEditable === 'true') {
                textarea.innerHTML = ${JSON.stringify(prompt)}
                const event = new Event('input', { bubbles: true })
                textarea.dispatchEvent(event)
              } 
              // For textarea
              else {
                textarea.value = ${JSON.stringify(prompt)}
                textarea.dispatchEvent(new Event('input', { bubbles: true }))
              }
              return true
            }
            return false
          } catch (e) {
            console.error('Prompt input error:', e)
            return false
          }
        })()
      `)

      // Send prompt
      console.log('[chatgpt:ask] Sending prompt')
      await win.webContents.executeJavaScript(`
        (() => {
          try {
            const sendBtn = document.querySelector('button[data-testid="send-button"]')
            if (sendBtn) {
              sendBtn.click()
              return true
            }
            return false
          } catch (e) {
            console.error('Send button error:', e)
            return false
          }
        })()
      `)

      // Wait for response
      console.log('[chatgpt:ask] Waiting for response...')
      const response = await win.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const MAX_WAIT = 300 // 300 * 1s = 5 minutes
          let waitCount = 0
          
          const checkResponse = () => {
            waitCount++
            
            // Find the stop button (indicates streaming in progress)
            const stopButton = document.querySelector('button[data-testid="stop-button"]')
            
            // Get all messages
            const messages = document.querySelectorAll('.markdown')
            
            if (!stopButton && messages.length > 0) {
              // Return last message
              resolve(messages[messages.length - 1].innerText)
            } else if (waitCount >= MAX_WAIT) {
              resolve('RESPONSE_TIMEOUT')
            } else {
              setTimeout(checkResponse, 1000)
            }
          }
          
          checkResponse()
        })
      `)

      if (response === 'RESPONSE_TIMEOUT') {
        throw new Error('RESPONSE_TIMEOUT')
      }

      console.log('[chatgpt:ask] Received response')
      return { success: true, response }

    } catch (error: any) {
      console.error('ChatGPT ask error:', error)
      return { success: false, error: error.message }
    }
  })

  // Sync ChatGPT session handler
  ipcMain.handle('chatgpt:sync-session', async () => {
    try {
      await syncChatGPTSession()
      return { success: true }
    } catch (error: any) {
      console.error('[ipc-handlers] chatgpt:sync-session error:', error)
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
    } catch (error: any) {
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
  })

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
  })

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
  })

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
  })

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
      setTimeout(() => {
        app.quit()
      }, 100)
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
      const validPaths = ['home', 'appData', 'userData', 'temp', 'desktop', 'documents', 'downloads']
      if (!validPaths.includes(name)) {
        event.returnValue = null
        return
      }
      event.returnValue = app.getPath(name as any)
    } catch (error) {
      console.error('Failed to get path:', error)
    }
  })

  app.on('before-quit', () => {
    console.log('App is about to quit, cleaning up...')
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.close()
    }
  })
}