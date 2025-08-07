import { BrowserWindow, shell } from 'electron'
import * as path from 'path'
import { syncChatGPTSession } from './cookies'

let chatWindow: BrowserWindow | null = null

export async function ensureChatWindow(idToken?: string): Promise<BrowserWindow> {
  console.log('[ipc-chatWindow] Starting chat window initialization')

  if (!chatWindow || chatWindow.isDestroyed()) {
    console.log('[ipc-chatWindow] Creating new chatWindow')
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

    chatWindow.webContents.setWindowOpenHandler((details) => {
      console.log(`[ipc-chatWindow] windowOpen: ${details.url}`)

      if (details.url.includes('accounts.google.com')) {
        console.log('[ipc-chatWindow] Loading Google auth in chatWindow')
        chatWindow?.loadURL(details.url)
      } else if (
        details.url.includes('openai.com') ||
        details.url.includes('chatgpt.com')
      ) {
        console.log(`[ipc-chatWindow] Loading in chatWindow: ${details.url}`)
        chatWindow?.loadURL(details.url)
      } else {
        console.log(`[ipc-chatWindow] Opening externally: ${details.url}`)
        shell.openExternal(details.url)
      }
      return { action: 'deny' }
    })
    // Forward idToken to chat window for direct Google session sync
    if (idToken) {
      chatWindow?.webContents.once('dom-ready', () => {
        chatWindow?.webContents.send('set-id-token', idToken)
      })
    }
    console.log('[ipc-chatWindow] Syncing ChatGPT session')
    try {
      await syncChatGPTSession()
    } catch (error: any) {
      console.error('[ipc-chatWindow] Session sync failed:', error)
    }
  }

  const currentURL = chatWindow.webContents.getURL()
  if (
    currentURL.startsWith('https://chat.openai.com') ||
    currentURL.startsWith('https://chatgpt.com')
  ) {
    console.log('[ipc-chatWindow] Already on ChatGPT, checking login status')
    const isLoggedIn = await chatWindow.webContents.executeJavaScript(
      `document.querySelector('button[data-testid="send-button"]') !== null`
    )
    if (isLoggedIn) {
      console.log('[ipc-chatWindow] User already logged in')
      return chatWindow
    }
  }

  console.log('[ipc-chatWindow] Loading ChatGPT URL')
  await chatWindow.loadURL('https://chatgpt.com')

  console.log('[ipc-chatWindow] Waiting for login state...')
  const loginState = await chatWindow.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const MAX_CHECKS = 30;
      let checks = 0;
      const check = () => {
        checks++;
        const sendBtn = document.querySelector('button[data-testid="send-button"]');
        if (sendBtn) return resolve('LOGGED_IN');
        const loginBtn = document.querySelector('button[data-testid="mobile-login-button"], button[data-testid="login-button"]');
        if (loginBtn) return resolve('LOGIN_REQUIRED');
        if (checks >= MAX_CHECKS) return resolve('TIMEOUT');
        setTimeout(check, 500);
      };
      check();
    });
  `)

  console.log(`[ipc-chatWindow] Login state: ${loginState}`)
  if (loginState === 'LOGIN_REQUIRED') {
    console.log('[ipc-chatWindow] Showing window for Google login')
    chatWindow?.show()
    chatWindow?.focus()
    console.log('[ipc-chatWindow] Clicking login')
    await chatWindow.webContents.executeJavaScript(`
      (() => {
        const sel = 'button[data-testid="mobile-login-button"], button[data-testid="login-button"]';
        const btn = document.querySelector(sel);
        if (btn) btn.click();
        return !!btn;
      })();
    `)
    await new Promise((r) => setTimeout(r, 3000))

    const clicked = await chatWindow.webContents.executeJavaScript(`
      (async () => {
        const TIMEOUT = 10000;
        const INTERVAL = 500;
        const start = Date.now();
        while (Date.now() - start < TIMEOUT) {
          const btns = Array.from(document.querySelectorAll('button'));
          const g = btns.find(b =>
            b.getAttribute('data-provider') === 'google' ||
            (b.getAttribute('name') === 'intent' && b.getAttribute('value') === 'google') ||
            b.innerText.toLowerCase().includes('google')
          );
          if (g) { g.click(); return true; }
          await new Promise(res => setTimeout(res, INTERVAL));
        }
        return false;
      })();
    `)

    console.log('[ipc-chatWindow] Google login clicked:', clicked)
    if (!clicked) throw new Error('GOOGLE_LOGIN_BUTTON_NOT_FOUND')

    console.log('[ipc-chatWindow] Awaiting login completion')
    const result = await chatWindow.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const MAX = 30; let tries = 0;
        const check = () => {
          tries++;
          if (document.querySelector('button[data-testid="send-button"]')) return resolve('LOGGED_IN');
          if (tries >= MAX) return resolve('LOGIN_TIMEOUT');
          setTimeout(check, 1000);
        };
        check();
      });
    `)
    if (result !== 'LOGGED_IN') throw new Error('LOGIN_FAILED:' + result)
  }

  console.log('[ipc-chatWindow] Chat window ready')
  return chatWindow
}