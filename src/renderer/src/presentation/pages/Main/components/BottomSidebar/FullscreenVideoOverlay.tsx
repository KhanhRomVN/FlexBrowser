import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogClose
} from '../../../../../components/ui/dialog'
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
    setIsPaused(false)
  }, [fullscreenVideo])

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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && closeFullscreen()}>
      + <DialogOverlay className="fixed inset-0 bg-black/75 z-[1000]" />
      <DialogContent className="relative z-[1001] bg-black p-0 max-w-3xl w-full max-h-screen mx-auto">
        <div className="relative">
          <DialogClose asChild>
            <button className="absolute top-3 right-3 text-white z-10">
              <X className="h-6 w-6" />
            </button>
          </DialogClose>

          {isYouTube && youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              allow="autoplay; fullscreen"
              frameBorder="0"
              className="w-full h-[60vh]"
            />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              muted
              className="w-full h-[60vh] bg-black"
              onLoadedMetadata={(e) => {
                e.currentTarget.muted = false
              }}
              ref={(el) => {
                if (el) {
                  el.onpause = () => setIsPaused(true)
                  el.onplay = () => setIsPaused(false)
                }
              }}
            />
          )}

          <div className="flex justify-center items-center bg-black py-2 space-x-4">
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
            <DialogClose asChild>
              <Button variant="destructive" size="icon">
                <X className="h-5 w-5 mr-1" /> Close
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FullscreenVideoOverlay
