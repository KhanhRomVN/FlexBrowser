import './config/env'
import { app } from 'electron'
import { createMainWindow, getMainWindow } from './windows/mainWindow'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { registerIpcHandlers } from './ipc-handlers'
import { electronApp, optimizer } from '@electron-toolkit/utils'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  createMainWindow()
  registerShortcuts(getMainWindow)
  registerIpcHandlers()

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  app.on('activate', () => {
    if (!getMainWindow()) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    unregisterShortcuts()
    app.quit()
  }
})

app.on('activate', () => {
  if (!getMainWindow()) createMainWindow()
})
