import * as dotenv from 'dotenv'
dotenv.config()

import { app, shell, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const width = Math.floor(screenWidth * 0.3)
  const height = screenHeight
  const x = screenWidth - width
  const y = 0

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    movable: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })

  // Prevent any move attempts
  win.on('will-move', (event) => {
    event.preventDefault()
  })

  // Snap back if movedX
  win.on('move', () => {
    win.setPosition(x, y)
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL as string)
    win.webContents.on('did-fail-load', () => {
      win.loadURL(process.env.ELECTRON_RENDERER_URL as string)
    })
    win.webContents.on('did-finish-load', () => {
      win.blur()
      win.webContents.openDevTools({ mode: 'detach' })
    })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow = win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  createWindow()

  // Toggle visibility with Alt+Shift+X
  globalShortcut.register('Alt+Shift+X', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
  // Also toggle visibility with Ctrl+Shift+X
  globalShortcut.register('Control+Shift+X', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // DevTools & reload shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Open pip window for media URLs
  ipcMain.handle('open-pip-window', (_event, url: string) => {
    const pipWin = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        webviewTag: true
      }
    })
    pipWin.loadURL(url)
    return null
  })
  // Hide main window when opening PIP
  ipcMain.handle('hide-main-window', () => {
    if (mainWindow) mainWindow.hide()
    return null
  })

  // macOS: recreate window on activate
  app.on('activate', () => {
    if (!mainWindow) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll()
    app.quit()
  }
})

// Fallback: ensure window on activate on all platforms
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
