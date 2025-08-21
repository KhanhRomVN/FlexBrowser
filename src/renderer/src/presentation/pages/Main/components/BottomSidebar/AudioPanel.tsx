import React, { useEffect, useState } from 'react'
import { useGlobalAudioStore } from '../../../../../store/useGlobalAudioStore'
import { Popover, PopoverTrigger, PopoverContent } from '../../../../../components/ui/popover'
import { Button } from '../../../../../components/ui/button'
import { Volume2, VolumeX, Trash2, Film, Bug } from 'lucide-react'

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
  const [isDebugMode, setIsDebugMode] = useState(false)
  const audioStates = useGlobalAudioStore((state) => state.audioStates)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  // Update timestamp when audio states change
  useEffect(() => {
    setLastUpdate(Date.now())
  }, [audioStates])

  const allAudioStates = Object.entries(audioStates)
  const playingStates = allAudioStates.filter(([_, state]) => state.isPlaying)
  const totalTabs = allAudioStates.length
  const playingCount = playingStates.length

  // Force re-render every few seconds for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStates = useGlobalAudioStore.getState().audioStates
      setLastUpdate(Date.now())
    }, 3000)

    return () => clearInterval(interval)
  }, [playingTabs])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-[8px] relative ${
            playingCount > 0 ? 'bg-green-500/20 text-green-400' : 'hover:bg-accent/50'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          {playingCount > 0 && (
            <span className="ml-1 text-xs bg-green-500 text-white rounded-full px-1 min-w-[16px] text-center">
              {playingCount}
            </span>
          )}
          {isDebugMode && (
            <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full px-1">
              D
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto">
        {/* Debug Toggle */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <h3 className="text-sm font-semibold">Audio Control Panel</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDebugMode(!isDebugMode)}
            className="h-6 w-6 p-0"
          >
            <Bug className="h-3 w-3" />
          </Button>
        </div>

        {/* Status Summary */}
        <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
          <div>Total tabs: {totalTabs}</div>
          <div>Playing: {playingCount}</div>
          <div>Last update: {new Date(lastUpdate).toLocaleTimeString()}</div>
        </div>

        {/* Debug Information */}
        {isDebugMode && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded border">
            <h4 className="text-xs font-semibold mb-2">Debug Information</h4>

            <div className="space-y-2 text-xs">
              <div>
                <strong>Props playingTabs:</strong> {playingTabs.length}
                {playingTabs.map(([tabId, state]) => (
                  <div key={tabId} className="ml-2 text-green-600">
                    • {tabId.slice(-8)}: {state.title}
                  </div>
                ))}
              </div>

              <div>
                <strong>Store audioStates:</strong> {Object.keys(audioStates).length}
                {Object.entries(audioStates).map(([tabId, state]) => (
                  <div
                    key={tabId}
                    className={`ml-2 ${state.isPlaying ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    • {tabId.slice(-8)}: {state.isPlaying ? '▶️' : '⏸️'} {state.title}
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t">
                <strong>Discrepancy Check:</strong>
                {playingTabs.length !== playingCount && (
                  <div className="text-red-600">
                    ⚠️ Mismatch: Props={playingTabs.length}, Store={playingCount}
                  </div>
                )}
                {playingTabs.length === playingCount && playingCount > 0 && (
                  <div className="text-green-600">✅ Counts match</div>
                )}
                {playingTabs.length === 0 && playingCount === 0 && (
                  <div className="text-gray-500">ℹ️ No audio detected</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Playing Media List */}
        {playingCount === 0 ? (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground mb-2">No audio playing</div>
            {isDebugMode && totalTabs > 0 && (
              <div className="text-xs text-muted-foreground">
                {totalTabs} tab(s) being monitored
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {playingStates.map(([tabId, state]) => {
              const el = document.getElementById(`webview-${tabId}`) as any
              const isMuted = el?.isAudioMuted?.() ?? false

              return (
                <div
                  key={tabId}
                  className="flex items-center gap-2 p-2 bg-accent/10 rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={state.title}>
                      {state.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={state.url}>
                      {new URL(state.url).hostname}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-green-500 text-white px-1 rounded">Playing</span>
                      {isDebugMode && (
                        <span className="text-xs bg-blue-500 text-white px-1 rounded">
                          {tabId.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMute(tabId)}
                      title={isMuted ? 'Unmute' : 'Mute'}
                      className="h-8 w-8 p-0"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4 text-red-500" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pauseTab(tabId)}
                      title="Pause"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openFullscreen(state.url, tabId)}
                      title="Picture-in-Picture"
                      className="h-8 w-8 p-0"
                    >
                      <Film className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Actions */}
        {playingCount > 0 && (
          <div className="mt-4 pt-3 border-t flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playingStates.forEach(([tabId]) => pauseTab(tabId))}
              className="flex-1"
            >
              Pause All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playingStates.forEach(([tabId]) => toggleMute(tabId))}
              className="flex-1"
            >
              Mute All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default AudioPanel
