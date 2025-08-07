import { BrowserWindow, shell, session } from 'electron'
import * as path from 'path'

let chatGPTWindow: BrowserWindow | null = null

export async function ensureChatGPTWindow(idToken?: string): Promise<BrowserWindow> {
  console.log('[ipc-chatGPTWindow] Starting chat window initialization')

  if (!chatGPTWindow || chatGPTWindow.isDestroyed()) {
    console.log('[ipc-chatGPTWindow] Creating new chatGPTWindow')
    chatGPTWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        partition: 'persist:default',
        nodeIntegration: false
      }
    })

    chatGPTWindow.webContents.setWindowOpenHandler((details) => {
      console.log(`[ipc-chatGPTWindow] windowOpen: ${details.url}`)

      if (details.url.includes('accounts.google.com')) {
        console.log('[ipc-chatGPTWindow] Loading Google auth in chatGPTWindow')
        chatGPTWindow?.loadURL(details.url)
      } else if (
        details.url.includes('openai.com') ||
        details.url.includes('chatgpt.com')
      ) {
        console.log(`[ipc-chatGPTWindow] Loading in chatGPTWindow: ${details.url}`)
        chatGPTWindow?.loadURL(details.url)
      } else {
        console.log(`[ipc-chatGPTWindow] Opening externally: ${details.url}`)
        shell.openExternal(details.url)
      }
      return { action: 'deny' }
    })
    // Removed manual session sync; using default session for cookies now
  }

  const currentURL = chatGPTWindow.webContents.getURL()
  if (
    currentURL.startsWith('https://chat.openai.com') ||
    currentURL.startsWith('https://chatgpt.com')
  ) {
    console.log('[ipc-chatGPTWindow] Already on ChatGPT, checking login status')
    const isLoggedIn = await chatGPTWindow.webContents.executeJavaScript(
      `document.querySelector('button[data-testid="send-button"]') !== null`
    )
    if (isLoggedIn) {
      console.log('[ipc-chatGPTWindow] User already logged in')
      return chatGPTWindow
    }
  }

  console.log('[ipc-chatGPTWindow] Loading ChatGPT URL')
  await chatGPTWindow.loadURL('https://chatgpt.com')

  console.log('[ipc-chatGPTWindow] Waiting for login state...')
  const loginState = await chatGPTWindow.webContents.executeJavaScript(`
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

  console.log(`[ipc-chatGPTWindow] Login state: ${loginState}`)
  // Treat TIMEOUT as requiring manual login
  if (loginState === 'LOGIN_REQUIRED' || loginState === 'TIMEOUT') {
    console.warn(`[ipc-chatGPTWindow] Login state is ${loginState}, manual login may be required`)
    console.log('[ipc-chatGPTWindow] Showing window for Google login')
    chatGPTWindow?.show()
    chatGPTWindow?.focus()
    console.log('[ipc-chatGPTWindow] Clicking login')
    await chatGPTWindow.webContents.executeJavaScript(`
      (() => {
        const sel = 'button[data-testid="mobile-login-button"], button[data-testid="login-button"]';
        const btn = document.querySelector(sel);
        if (btn) btn.click();
        return !!btn;
      })();
    `)
    await new Promise((r) => setTimeout(r, 3000))

    const clicked = await chatGPTWindow.webContents.executeJavaScript(`
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

    console.log('[ipc-chatGPTWindow] Google login clicked:', clicked)
    if (!clicked) throw new Error('GOOGLE_LOGIN_BUTTON_NOT_FOUND')

    console.log('[ipc-chatGPTWindow] Awaiting login completion')
    const result = await chatGPTWindow.webContents.executeJavaScript(`
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

  console.log('[ipc-chatGPTWindow] Chat window ready')
  return chatGPTWindow
}