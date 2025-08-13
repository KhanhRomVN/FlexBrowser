import React, { useEffect } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '../../../../../components/ui/popover'
import { Button } from '../../../../../components/ui/button'
import { Volume2, VolumeX, Trash2, Film } from 'lucide-react'

interface AudioState {
  title: string
  url: string
}

interface AudioPanelProps {
  playingTabs: [string, AudioState][]
  toggleMute: (tabId: string) => void
  pauseTab: (tabId: string) => void
  openFullscreen: (url: string, tabId: string) => void
}

const AudioPanel: React.FC<AudioPanelProps> = ({
  playingTabs,
  toggleMute,
  pauseTab,
  openFullscreen
}) => {
  useEffect(() => {
    console.log('[AudioPanel][useEffect] playingTabs:', playingTabs)
  }, [playingTabs])
  console.log('[AudioPanel] playingTabs (render):', playingTabs)
  return (
    <Popover onOpenChange={(open) => console.log('[AudioPanel] Popover open:', open)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-[8px]">
          <Volume2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-80 overflow-y-auto">
        {playingTabs.length === 0 && <p className="text-sm text-center">No audio playing</p>}
        {playingTabs.map(([tabId, state]) => {
          console.log('[AudioPanel] rendering tab:', tabId, state)
          const el = document.getElementById(`webview-${tabId}`) as any
          console.log(`[AudioPanel] element for tab ${tabId}:`, el)
          const isMuted = el?.isAudioMuted?.() ?? false
          console.log(`[AudioPanel] isMuted for tab ${tabId}:`, isMuted)
          return (
            <div key={tabId} className="flex items-center justify-between mb-2">
              <div className="truncate max-w-[60%]">
                <p className="text-sm font-medium truncate">{state.title}</p>
                <p className="text-xs text-muted-foreground truncate">{state.url}</p>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => toggleMute(tabId)}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => pauseTab(tabId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openFullscreen(state.url, tabId)}
                >
                  <Film className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

export default AudioPanel
