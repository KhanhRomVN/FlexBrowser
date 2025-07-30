import { BrowserWindow, BrowserView } from 'electron'
import { join } from 'path'
import { getMainWindow } from './mainWindow'

// Track current PiP window for cleanup and reuse
let currentPipWin: BrowserWindow | null = null

export async function openPipWindow(url: string, currentTime?: number): Promise<void> {
  // Close any existing PiP before opening a new one
  if (currentPipWin) {
    currentPipWin.close()
    currentPipWin = null
  }

  // Determine source and timing
  let mediaSrc = url
  let mediaTime = currentTime ?? 0
  const isYouTube = /youtu\.be/.test(url) || /youtube\.com/.test(url)
  const isNetflix = /netflix\.com/.test(url)
  const isPrimeVideo = /primevideo\.com/.test(url)
  const isDisneyPlus = /disneyplus\.com/.test(url)

  // Extract actual video URL/time for non-YouTube/static
  if (!isYouTube && !/\.(mp4|webm|ogg)$/i.test(url)) {
    try {
      const main = getMainWindow()
      if (main) {
        const result: { src: string; currentTime: number } | null =
          await main.webContents.executeJavaScript('window.api.getVideoInfoForPip?.()')
        if (result) {
          mediaSrc = result.src
          mediaTime = result.currentTime
        }
      }
    } catch (e) {
      console.error('[pipWindow] video info extraction failed:', e)
    }
  }

  // Build PiP URL
  let pipUrl = mediaSrc
  if (/\.(mp4|webm|ogg)$/i.test(mediaSrc)) {
    // Static file: wrap in minimal HTML for autoplay
    const html = `<!DOCTYPE html><html><body style="margin:0;background:black;"><video src="${mediaSrc}" autoplay playsinline style="width:100%;height:100%;object-fit:contain"></video></body></html>`
    pipUrl = `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`
  } else if (isNetflix) {
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
        pipUrl = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&start=${Math.floor(mediaTime)}`
      }
    } catch {}
  }

  // Defer hiding main until PiP is ready

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
  currentPipWin = pipWin

  // Embed video in BrowserView
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

  view.webContents.once('did-finish-load', async () => {
    try {
      const pipCSS = [
        'body { margin:0; padding:0; display:flex !important; align-items:center !important; justify-content:center !important; overflow:hidden !important; background:black !important; }',
        '*:not(video){ visibility:hidden !important; opacity:0 !important; width:0 !important; height:0 !important; display:none !important; }',
        'video { position:fixed !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:contain !important; z-index:9999 !important; }'
      ].join('\n')
      await view.webContents.insertCSS(pipCSS)
      await view.webContents.executeJavaScript(
        `(async () => {
          const v = document.querySelector("video");
          if (v) {
            v.currentTime = ${mediaTime};
            try { await v.play(); } catch {}
            if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
              await v.requestPictureInPicture().catch(() => {});
            }
          }
        })();`
      )
    } catch (e) {
      console.error('[pipWindow] playback/PiP error:', e)
    } finally {
      pipWin.show()
    }
  })

  // Load content
  await view.webContents.loadURL(pipUrl)

  // Cleanup on blur and close
  pipWin.on('blur', () => pipWin.close())
  pipWin.on('close', () => {
    // After PiP closed: reset reference, show main, pause media
    currentPipWin = null
    const main = getMainWindow()
    if (main) {
      main.show()
      main.webContents.executeJavaScript(
        `document.querySelectorAll('video, audio').forEach(v => v.pause());`
      )
    }
  })
}
