import { app, globalShortcut } from 'electron'
import { createMainWindow, getMainWindow } from './windows/mainWindow'

import { unregisterShortcuts } from './shortcuts'
import { registerIpcHandlers } from './ipc-handlers'
import { electronApp, optimizer } from '@electron-toolkit/utils'

function handleProtocolURL(protocolUrl: string) {
  console.log('[DeepLink] Handling protocol URL:', protocolUrl)
  try {
    const urlObj = new URL(protocolUrl)
    const token = urlObj.searchParams.get('token')
    const accountId = urlObj.searchParams.get('accountId')
    const win = getMainWindow()
    if (token && win && !win.isDestroyed()) {
      win.show()
      // Delay to ensure webContents is ready
      setTimeout(() => {
        if (win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send('oauth-token', token, accountId)
        } else {
          console.warn('[FlexBrowser] Cannot send token, webContents is destroyed')
        }
      }, 300)
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

// GPU flags to avoid rendering issues
app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.setLoginItemSettings({ openAtLogin: true })
  // register custom protocol for deep-link OAuth callback
  app.setAsDefaultProtocolClient('flexbrowser')
  // Handle deep link on first instance launch
  const initialUrl = process.argv.find(arg => arg.startsWith('flexbrowser://auth'))
  if (initialUrl) {
    handleProtocolURL(initialUrl)
  }
  // Register IPC handlers before creating windows
  registerIpcHandlers()
  createMainWindow()
  // Toggle logic with safety checks and delay
  let toggleInProgress = false
  const toggle = () => {
    if (toggleInProgress) return
    toggleInProgress = true

    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      toggleInProgress = false
      return
    }

    try {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      toggleInProgress = false
    }
  }

  globalShortcut.register('Alt+Shift+X', () => setTimeout(toggle, 100))
  globalShortcut.register('Control+Shift+X', () => setTimeout(toggle, 100))

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
