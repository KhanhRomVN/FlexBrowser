const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');

let sidebarWindow;

function createSidebar() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  sidebarWindow = new BrowserWindow({
    width: 800,
    height: height,
    x: width - 800,
    y: 0,
    frame: false,
    transparent: true,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  sidebarWindow.loadFile(path.join(__dirname, 'sidebar.html'));
  // Debug: open devtools
  sidebarWindow.webContents.openDevTools();
  sidebarWindow.once('ready-to-show', () => {
    sidebarWindow.show();
  });
}

app.whenReady().then(() => {
  createSidebar();

  globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (sidebarWindow.isVisible()) {
      sidebarWindow.hide();
    } else {
      sidebarWindow.show();
    }
  });

  // Handle close from renderer
  ipcMain.on('close-sidebar', () => {
    sidebarWindow.hide();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSidebar();
  }
});