import { app, ipcMain, BrowserWindow, session } from 'electron'
import path from 'path'
import { openPipWindow } from './windows/pipWindow'
import { getMainWindow } from './windows/mainWindow'

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  ipcMain.on('ping', () => { })

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
  // Google session sync handlers
  ipcMain.handle('sync-google-session', async (_event, idToken: string) => {
    const sess = session.defaultSession;
    const cookie = {
      url: 'https://google.com',
      name: 'SID',
      value: idToken,
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      expirationDate: Math.floor(new Date().setFullYear(new Date().getFullYear() + 1) / 1000)
    };
    await sess.cookies.set(cookie);
    return null;
  });

  ipcMain.handle('clear-google-session', async () => {
    const sess = session.defaultSession;
    await sess.cookies.remove('https://google.com', 'SID');
    return null;
  });
  // Open DevTools for main window from renderer
  ipcMain.on('devtools-open', (_event) => {
    const win = getMainWindow()
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  });

  // Open a dedicated OAuth BrowserWindow for embedded sign-in
  ipcMain.handle('open-auth-window', (_event, oauthUrl: string) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        partition: 'persist:default'
      }
    });
    authWindow.loadURL(oauthUrl);
    // Open DevTools for the OAuth window to inspect popup-block issues
    authWindow.webContents.openDevTools({ mode: 'detach' });
    return null;
  });
}
