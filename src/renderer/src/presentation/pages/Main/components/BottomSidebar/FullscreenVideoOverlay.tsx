import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { X, Play, Pause } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'

interface FullscreenVideoOverlayProps {
  fullscreenVideo: { url: string; tabId: string } | null
  closeFullscreen: () => void
}

const FullscreenVideoOverlay: React.FC<FullscreenVideoOverlayProps> = ({
  fullscreenVideo,
  closeFullscreen
}) => {
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!fullscreenVideo) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [fullscreenVideo, closeFullscreen])

  if (!fullscreenVideo) return null

  const { url } = fullscreenVideo
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  let youtubeId: string | null = null
  if (isYouTube) {
    if (url.includes('youtu.be/')) {
      youtubeId = url.split('youtu.be/')[1]
    } else {
      youtubeId = new URL(url).searchParams.get('v')
    }
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
      <button onClick={closeFullscreen} className="absolute top-4 right-4 text-white z-[1010]">
        <X className="h-6 w-6" />
      </button>

      {isYouTube && youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          allow="autoplay; fullscreen"
          frameBorder="0"
          className="max-w-full max-h-full"
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          muted
          className="max-w-full max-h-full"
          onLoadedMetadata={(e) => {
            const vid = e.currentTarget
            vid.muted = false
          }}
          ref={(el) => {
            if (el) {
              el.onpause = () => setIsPaused(true)
              el.onplay = () => setIsPaused(false)
            }
          }}
        />
      )}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 z-[1010]">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => {
            const videoEl = document.querySelector('video')
            if (videoEl) {
              videoEl.paused ? videoEl.play() : videoEl.pause()
            }
          }}
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button variant="destructive" size="icon" onClick={closeFullscreen}>
          <X className="h-5 w-5 mr-1" /> Close
        </Button>
      </div>
    </div>,
    document.body
  )
}

export default FullscreenVideoOverlay
