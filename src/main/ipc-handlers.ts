import { app, ipcMain, BrowserWindow } from 'electron'
import {
  GOOGLE_CLIENT_ID,
  REDIRECT_URI,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL
} from './config/env'
import crypto from 'crypto'
import http from 'http'
import { deletePassword } from 'keytar'
// Removed node-fetch import; using global fetch available in Node.js >=18
import { openPipWindow } from './windows/pipWindow'
import { getMainWindow } from './windows/mainWindow'

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  // Google OAuth2 login: exchange code for tokens and fetch user profile
  ipcMain.handle(
    'login-google',
    async (
      _event,
      accountId: string
    ): Promise<{
      idToken: string
      profile: { name: string; picture: string; email?: string }
    }> => {
      console.log('[FlexBrowser] login-google invoked for accountId:', accountId)
      // PKCE setup
      const { code_verifier, code_challenge } = (() => {
        const base64URLEncode = (buf: Buffer) =>
          buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        const verifier = base64URLEncode(crypto.randomBytes(32))
        const challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest())
        return { code_verifier: verifier, code_challenge: challenge }
      })()

      // Build correct OAuth URL with initial "?"
      const authUrl = [
        `${GOOGLE_AUTH_URL}?client_id=${GOOGLE_CLIENT_ID}`,
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
        'response_type=code',
        'scope=openid%20email%20profile',
        `code_challenge=${code_challenge}`,
        'code_challenge_method=S256'
      ].join('&')

      // Hide main window during OAuth
      getMainWindow()?.hide()
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: { nodeIntegration: false }
      })
      authWindow.loadURL(authUrl)

      return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
          try {
            if (!req.url) {
              res.writeHead(400)
              res.end('Bad request')
              return
            }
            const urlObj = new URL(req.url, REDIRECT_URI)
            const code = urlObj.searchParams.get('code')
            if (!code) {
              res.writeHead(404)
              res.end('No code')
              return
            }

            console.log(`[IPC] Received OAuth code: ${code}`)
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(
              '<html><body><h2>Authentication successful. You may close this window.</h2></body></html>'
            )

            // Close out
            authWindow.close()
            getMainWindow()?.show()
            server.close()

            // Exchange code for tokens
            console.log(`[IPC] Exchanging code for tokens`)
            const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
                code_verifier
              })
            })
            const tokenJson = (await tokenRes.json()) as {
              access_token: string
              id_token: string
            }
            console.log('[IPC] Token JSON:', tokenJson)

            // Fetch user profile
            console.log(`[IPC] Fetching user info`)
            const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
              headers: {
                Authorization: `Bearer ${tokenJson.access_token}`
              }
            })
            const userInfoJson = (await userInfoRes.json()) as {
              name: string
              picture: string
              email?: string
            }
            console.log('[IPC] User profile:', userInfoJson)

            resolve({
              idToken: tokenJson.id_token,
              profile: userInfoJson
            })
          } catch (err) {
            console.error('[IPC] OAuth error:', err)
            reject(err)
          }
        })

        const port = parseInt(new URL(REDIRECT_URI).port, 10) || 3000
        console.log(`[IPC] Listening for OAuth callback on port ${port}`)
        server.listen(port)
      })
    }
  )

  // Logout handler: delete stored refresh token
  ipcMain.handle('logout-google', async (_event, accountId: string) => {
    await deletePassword('FlexBrowser', accountId)
    return true
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('open-pip-window', async (_event, url: string, currentTime?: number) => {
    await openPipWindow(url, currentTime)
    return null
  })

  ipcMain.handle('hide-main-window', () => {
    const win = getMainWindow()
    if (win) win.hide()
    return null
  })

  ipcMain.on('move-pip-window', (event, x: number, y: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setPosition(Math.round(x), Math.round(y))
  })

  ipcMain.handle('show-main-window', () => {
    const win = getMainWindow()
    if (win) win.show()
    return null
  })

  ipcMain.on('close-pip', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.close()
  })

  ipcMain.handle('app-quit', () => {
    app.quit()
  })
}
