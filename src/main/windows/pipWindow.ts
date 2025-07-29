import { BrowserWindow } from 'electron'
import { join } from 'path'

export async function openPipWindow(url: string, currentTime?: number): Promise<void> {
  let mediaSrc = url
  let mediaTime = currentTime || 0
  const isYouTube = /youtu\.be/.test(url) || /youtube\.com/.test(url)

  if (!isYouTube && !/\.(mp4|webm|ogg)$/i.test(url)) {
    const extractWin = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    await extractWin.loadURL(url)
    try {
      const res: { src: string; currentTime: number } | null = await extractWin.webContents
        .executeJavaScript(`
        (function() {
          const v = document.querySelector('video');
          if (!v) return null;
          return { src: v.currentSrc || v.src, currentTime: v.currentTime };
        })()
      `)
      if (res) {
        mediaSrc = res.src
        mediaTime = res.currentTime
      }
    } catch {}
    extractWin.destroy()
  }

  let pipUrl = mediaSrc
  if (isYouTube) {
    try {
      const u = new URL(url)
      const vid = u.searchParams.get('v') || u.pathname.split('/').pop()
      if (vid) {
        pipUrl =
          'https://www.youtube.com/embed/' +
          vid +
          '?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&start=' +
          Math.floor(mediaTime)
      }
    } catch {}
  }

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'html, body {margin:0;padding:0;width:100%;height:100%;background:black;overflow:hidden;}' +
    'video#media, iframe#media {width:100%;height:100%;object-fit:contain;border:none;}' +
    '</style></head><body><video id="media" src="' +
    pipUrl +
    '" autoplay></video></body></html>'

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

  pipWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  pipWin.webContents.on('did-finish-load', () => {
    pipWin.setAspectRatio(16 / 9)
  })
}
