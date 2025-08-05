import { app, ipcMain, BrowserWindow } from 'electron'
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
