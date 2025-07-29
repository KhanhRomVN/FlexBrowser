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
    // Determine embed URL for YouTube or direct video
    let pipUrl = url
    if (/youtu\.be/.test(url) || /youtube\.com/.test(url)) {
      try {
        const u = new URL(url)
        const vid = u.searchParams.get('v') || u.pathname.split('/').pop()
        if (vid) {
          pipUrl = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1`
        }
      } catch {}
    }
    // Render media in minimal HTML wrapper with close button
    const isVideo = /\.(mp4|webm|ogg)$/i.test(url)
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body { margin:0; padding:0; width:100%; height:100%; background:black; overflow:hidden; }
  #close-btn {
    position:fixed; top:8px; right:8px;
    display:flex; align-items:center; justify-content:center;
    width:32px; height:32px; background:rgba(255,69,58,0.8);
    border:none; border-radius:16px; cursor:pointer; opacity:1;
    pointer-events:auto;
    transition:opacity 0.2s, background 0.2s;
    z-index:1002;
  }
  #media {
    width:100%; height:100%; object-fit:contain;
    z-index:1001; /* below close button */
  }
  #close-btn:hover { background:rgba(255,69,58,1); }
  #close-btn svg { width:16px; height:16px; fill:white; }
  #media { width:100%; height:100%; object-fit:contain; }
  iframe#media { border:none; }
</style>
</head>
<body>
<button id="close-btn" title="Close">
<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
${
  isVideo
    ? `<video id="media" src="${url}" autoplay controls></video>`
    : `<iframe id="media" src="${pipUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>`
}
<script>
  document.getElementById('close-btn').addEventListener('click', () => window.close());
  const media = document.getElementById('media');
  if(media && media.tagName==='VIDEO') {
    media.onloadedmetadata = () => window.resizeTo(media.videoWidth, media.videoHeight);
  }
</script>
</body>
</html>`
    pipWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    pipWin.webContents.on('did-finish-load', () => {
      if (!isVideo) pipWin.setAspectRatio(16 / 9)
    })
    return null
  })
  // Hide main window when opening PIP
  ipcMain.handle('hide-main-window', () => {
    if (mainWindow) mainWindow.hide()
    return null
  })

  // Show main window when exiting fullscreen
  ipcMain.handle('show-main-window', () => {
    if (mainWindow) mainWindow.show()
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
