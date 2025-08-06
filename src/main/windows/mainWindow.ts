import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): void {
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

  win.on('will-move', (event) => event.preventDefault())
  win.on('move', () => win.setPosition(x, y))

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL as string)
    win.webContents.on('did-fail-load', () =>
      win.loadURL(process.env.ELECTRON_RENDERER_URL as string)
    )
    win.webContents.on('did-finish-load', () => {
      win.blur()
      win.webContents.openDevTools({ mode: 'detach' })
    })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle failed loads in main window to ignore aborted navigations
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode !== -3) {
      console.error(`MainWindow failed to load ${validatedURL}: ${errorDescription} (${errorCode})`)
    }
  })
  // Use render-process-gone on webContents instead of deprecated crashed event
  win.webContents.on('render-process-gone', (_event: Electron.Event, details: Electron.RenderProcessGoneDetails) => {
    console.error('Render process gone:', details)
  })
  mainWindow = win
}
