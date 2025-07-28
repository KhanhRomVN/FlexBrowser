import React from 'react'
import { X } from 'lucide-react'

interface FullscreenVideoOverlayProps {
  fullscreenVideo: { url: string; tabId: string } | null
  closeFullscreen: () => void
}

const FullscreenVideoOverlay: React.FC<FullscreenVideoOverlayProps> = ({
  fullscreenVideo,
  closeFullscreen
}) => {
  if (!fullscreenVideo) return null
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <button onClick={closeFullscreen} className="absolute top-4 right-4 text-white z-50">
        <X className="h-6 w-6" />
      </button>
      <video src={fullscreenVideo.url} controls autoPlay className="max-w-full max-h-full" />
    </div>
  )
}

export default FullscreenVideoOverlay
