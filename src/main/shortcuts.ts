import { globalShortcut, BrowserWindow } from 'electron'

/**
 * Register global shortcuts to toggle the main window visibility.
 * @param getMainWindow A function returning the BrowserWindow instance.
 */
export function registerShortcuts(getMainWindow: () => BrowserWindow | null): void {
  const toggle = () => {
    const win = getMainWindow()
    if (win) {
      win.isVisible() ? win.hide() : win.show()
    }
  }

  globalShortcut.register('Alt+Shift+X', toggle)
  globalShortcut.register('Control+Shift+X', toggle)
}

/** 
 * Unregister all global shortcuts.
 */
export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
