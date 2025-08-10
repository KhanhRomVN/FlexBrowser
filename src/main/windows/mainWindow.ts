import { BrowserWindow, screen, shell, session } from 'electron'
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
      webviewTag: true,
      webSecurity: true, // Enable web security
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  })

  // Prevent window movement
  win.on('will-move', (event) => event.preventDefault())
  win.on('move', () => {
    if (!win.isDestroyed()) {
      win.setPosition(x, y)
    }
  })

  // Handle external links
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load appropriate content
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL as string)

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // Ignore aborted loads and retry main frame loads in dev
      if (errorCode !== -3 && isMainFrame) {
        console.log('Retrying dev server connection...')
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.loadURL(process.env.ELECTRON_RENDERER_URL as string)
          }
        }, 1000)
      }
    })

    win.webContents.on('did-finish-load', () => {
      if (!win.isDestroyed()) {
        win.blur()
        win.webContents.openDevTools({ mode: 'detach' })
      }
    })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle failed loads in main window with better error filtering
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Ignore common non-critical errors
    const ignoredCodes = [-3, -27, -105, -125] // ERR_ABORTED, ERR_BLOCKED_BY_CLIENT, ERR_NAME_NOT_RESOLVED, ERR_NETWORK_CHANGED

    if (!ignoredCodes.includes(errorCode)) {
      console.error(`MainWindow failed to load ${validatedURL}: ${errorDescription} (${errorCode})`)

      // For main frame failures in production, try to reload
      if (isMainFrame && !is.dev) {
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.reload()
          }
        }, 2000)
      }
    }
  })

  // Use the newer render-process-gone event instead of deprecated 'crashed'
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Main window render process gone:', details)

    // Handle different crash reasons
    const { reason, exitCode } = details

    if (reason === 'crashed' || reason === 'abnormal-exit') {
      console.log('Attempting to reload main window after crash')

      // Small delay before reload attempt
      setTimeout(() => {
        if (!win.isDestroyed()) {
          try {
            win.reload()
          } catch (error) {
            console.error('Failed to reload main window:', error)
            // As a last resort, recreate the window
            if (!win.isDestroyed()) {
              win.close()
              createMainWindow()
            }
          }
        }
      }, 1000)
    }
  })

  // Handle unresponsive window
  win.webContents.on('unresponsive', () => {
    console.warn('Main window became unresponsive')
  })

  win.webContents.on('responsive', () => {
    console.log('Main window became responsive again')
  })

  // Handle certificate errors more gracefully
  win.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    // In development, you might want to ignore certificate errors for localhost
    if (is.dev && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      event.preventDefault()
      callback(true)
    } else {
      // In production, maintain security
      console.warn('Certificate error for:', url, error)
      callback(false)
    }
  })

  // Prevent navigation to external URLs in main window
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowedOrigins = [
      'file://',
      'data:',
    ]

    if (is.dev) {
      allowedOrigins.push('http://localhost:', 'http://127.0.0.1:')
    }

    const isAllowed = allowedOrigins.some(origin => navigationUrl.startsWith(origin))

    if (!isAllowed) {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })

  // Handle window lifecycle
  win.on('closed', () => {
    mainWindow = null
  })

  win.on('ready-to-show', () => {
    if (!win.isDestroyed()) {
      session.defaultSession.cookies.get({ domain: 'chatgpt.com' })
        .catch((error) => {
          console.error('[mainWindow] Failed to get cookies:', error);
        });
      // Don't show immediately, let the app control when to show
    }
  })

  mainWindow = win
}