import React from 'react'
import { useGlobalAudioStore } from '../store/useGlobalAudioStore'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Volume2, X } from 'lucide-react'

interface AudioState {
  isPlaying: boolean
  url: string
  title: string
}

const AudioControlOverlay: React.FC = () => {
  const { audioStates, clearAudioState } = useGlobalAudioStore()
  const playingTabs = Object.entries(audioStates).filter(([, state]) => state.isPlaying) as [
    string,
    AudioState
  ][]

  if (playingTabs.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[1000] bg-background/90 backdrop-blur-sm rounded-xl shadow-lg border p-4 w-80 max-h-[60vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Audio Controls</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => playingTabs.forEach(([tabId]) => clearAudioState(tabId))}
        >
          <X size={16} />
        </Button>
      </div>

      {playingTabs.map(([tabId, state]) => (
        <div key={tabId} className="mb-4 last:mb-0 p-3 rounded-lg bg-muted">
          <div className="flex items-center justify-between mb-2">
            <div className="truncate max-w-[70%]">
              <p className="text-sm font-medium truncate">{state.title || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground truncate">{state.url}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => clearAudioState(tabId)}>
              <Volume2 size={16} />
            </Button>
          </div>
          <Slider defaultValue={[100]} max={100} step={1} className="w-full" />
        </div>
      ))}
    </div>
  )
}

export default AudioControlOverlay
