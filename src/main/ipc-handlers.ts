import { app, ipcMain, BrowserWindow } from 'electron'
import fetch from 'node-fetch'
import { openPipWindow } from './windows/pipWindow'
import { getMainWindow } from './windows/mainWindow'

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  // Google OAuth2 login: exchange code for tokens and fetch user profile
  const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID'
  const GOOGLE_CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
  const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

  ipcMain.handle('login-google', async (_event, accountId: string) => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: { nodeIntegration: false }
    })
    await authWindow.loadURL(authUrl)
    return new Promise((resolve, reject) => {
      authWindow.webContents.on('will-redirect', async (_e, url) => {
        try {
          const urlObj = new URL(url)
          const code = urlObj.searchParams.get('code')
          if (code) {
            authWindow.close()
            // Exchange auth code for tokens
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
              })
            })
            const tokenJson = (await tokenRes.json()) as { access_token: string; id_token: string }
            // Exchange auth code for tokens
            // Then fetch user profile from Google userinfo endpoint
            const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
              headers: { Authorization: `Bearer ${tokenJson.access_token}` }
            })
            const userInfoJson = (await userInfoRes.json()) as {
              name: string
              picture: string
              email?: string
            }
            resolve({ idToken: tokenJson.id_token, profile: userInfoJson })
          }
        } catch (err) {
          reject(err)
        }
      })
    })
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
