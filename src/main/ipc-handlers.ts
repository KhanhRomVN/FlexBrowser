import { app, ipcMain, BrowserWindow, shell } from 'electron'
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

  // Open URL in external system browser
  ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url)
    return null
  })

  ipcMain.handle('app-quit', () => {
    app.quit()
  })
}
