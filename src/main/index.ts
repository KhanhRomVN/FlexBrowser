import './config/env'
import { app } from 'electron'
import { createMainWindow, getMainWindow } from './windows/mainWindow'

import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { registerIpcHandlers } from './ipc-handlers'
import { electronApp, optimizer } from '@electron-toolkit/utils'

function handleProtocolURL(protocolUrl: string) {
  try {
    console.log('[FlexBrowser] Received protocol URL', protocolUrl)
    const urlObj = new URL(protocolUrl)
    const token = urlObj.searchParams.get('token')
    const win = getMainWindow()
    if (token && win) {
      console.log('[FlexBrowser] Showing main window with OAuth token')
      win.show()
      win.webContents.send('oauth-token', token)
    }
  } catch (e) {
    console.error('[FlexBrowser] Invalid protocol URL', e)
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', (_event, argv) => {
  const url = argv.find(arg => arg.startsWith('flexbrowser://auth'))
  if (url) {
    handleProtocolURL(url)
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleProtocolURL(url)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.setLoginItemSettings({ openAtLogin: true })
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
