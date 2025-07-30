import { BrowserWindow, BrowserView } from 'electron'
import { join } from 'path'
import { getMainWindow } from './mainWindow'

export async function openPipWindow(url: string, currentTime?: number): Promise<void> {
  let mediaSrc = url
  let mediaTime = currentTime ?? 0
  const isYouTube = /youtu\\.be/.test(url) || /youtube\\.com/.test(url)
  const isNetflix = /netflix\\.com/.test(url)
  const isPrimeVideo = /primevideo\\.com/.test(url)
  const isDisneyPlus = /disneyplus\\.com/.test(url)

  // Extract video info via preload API for non-YouTube/non-static URLs
  if (!isYouTube && !/\\.(mp4|webm|ogg)$/i.test(url)) {
    try {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        const result: { src: string; currentTime: number } | null =
          await mainWindow.webContents.executeJavaScript(
            'window.api.getVideoInfoForPip && window.api.getVideoInfoForPip()'
          )
        if (result) {
          mediaSrc = result.src
          mediaTime = result.currentTime
        }
      }
    } catch (e) {
      console.error('[pipWindow] video info extraction failed:', e)
    }
  }

  // Adjust URL for known providers
  let pipUrl = mediaSrc
  if (isNetflix) {
    pipUrl = url.replace('/watch/', '/player/')
  } else if (isPrimeVideo) {
    pipUrl = url.replace('/detail/', '/play/')
  } else if (isDisneyPlus) {
    pipUrl = url.replace('/video/', '/player/')
  } else if (isYouTube) {
    try {
      const u = new URL(url)
      const vid = u.searchParams.get('v') || u.pathname.split('/').pop()
      if (vid) {
        pipUrl =
          `https://www.youtube.com/embed/${vid}` +
          `?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&start=${Math.floor(mediaTime)}`
      }
    } catch {
      // ignore invalid URL
    }
  }

  // Hide main window
  const mainWin = getMainWindow()
  if (mainWin) mainWin.hide()

  // Create PiP window
  const pipWin = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    focusable: true,
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Embed video view
  const view = new BrowserView({
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  pipWin.setBrowserView(view)
  view.setBounds({ x: 0, y: 0, width: 400, height: 300 })
  view.setAutoResize({ width: true, height: true })

  // Once content loaded, inject CSS, play and PiP then show window
  view.webContents.once('did-finish-load', async () => {
    try {
      const pipCSS = [
        'body { margin:0; padding:0; display:flex !important; align-items:center !important; justify-content:center !important; overflow:hidden !important; background:black !important; }',
        '*:not(video){ visibility:hidden !important; opacity:0 !important; width:0 !important; height:0 !important; display:none !important; }',
        'video { position:fixed !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:contain !important; z-index:9999 !important; }'
      ].join('\\n')
      await view.webContents.insertCSS(pipCSS)
      await view.webContents.executeJavaScript(
        '(async () => {' +
          'const v = document.querySelector("video");' +
          'if (v) {' +
          'v.currentTime = ' +
          mediaTime +
          ';' +
          'try { v.play(); } catch {}' +
          'if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {' +
          'v.requestPictureInPicture().catch(() => {});' +
          '}' +
          '}' +
          '})();'
      )
    } catch (e) {
      console.error('[pipWindow] playback/PiP error:', e)
    } finally {
      pipWin.show()
    }
  })

  // Load URL
  await view.webContents.loadURL(pipUrl)

  // Close/restore logic
  pipWin.on('blur', () => pipWin.close())
  pipWin.on('close', () => {
    if (mainWin) mainWin.show()
  })
}
