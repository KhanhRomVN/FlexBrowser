import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../components/ui/avatar'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Checkbox } from '../../../../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../../components/ui/dialog'
import useAccountStore from '../../../../store/useAccountStore'
import { Menu, Settings, X, Music, Film, Volume2, VolumeX, Trash2 } from 'lucide-react'
import AccountManagerDrawer from './AccountManagerDrawer'
import SettingDrawer from './SettingDrawer'
import { Popover, PopoverTrigger, PopoverContent } from '../../../../components/ui/popover'
import { useGlobalAudioStore } from '../../../../store/useGlobalAudioStore'

const BottomSidebar: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    deleteAccount,
    addAccount,
    addTab,
    setActiveTab
  } = useAccountStore()
  // Audio panel state and actions
  const audioStates = useGlobalAudioStore((state) => state.audioStates)
  const clearAudioState = useGlobalAudioStore((state) => state.clearAudioState)
  const playingTabs = Object.entries(audioStates).filter(([_, s]) => s.isPlaying)

  // Helpers for controlling webview
  const toggleMute = (tabId: string) => {
    const el = document.getElementById(`webview-${tabId}`) as any
    if (el?.isAudioMuted && el?.setAudioMuted) {
      const newMuted = !el.isAudioMuted()
      el.setAudioMuted(newMuted)
    }
  }
  const pauseTab = (tabId: string) => {
    const el = document.getElementById(`webview-${tabId}`) as any
    if (el?.executeJavaScript) {
      el.executeJavaScript(`document.querySelectorAll('video, audio').forEach(el => el.pause());`)
    }
    clearAudioState(tabId)
  }

  // Fullscreen video popup state & handlers
  const [fullscreenVideo, setFullscreenVideo] = React.useState<{
    url: string
    tabId: string
  } | null>(null)

  const openFullscreen = (url: string, tabId: string) => {
    // Pause any in-app playing tabs
    Object.keys(audioStates).forEach((tid) => pauseTab(tid))
    window.api.hide.main()
    setFullscreenVideo({ url, tabId })
  }

  const closeFullscreen = () => {
    if (!fullscreenVideo) return
    const { tabId } = fullscreenVideo
    const el = document.getElementById(`webview-${tabId}`) as any
    el?.executeJavaScript?.(`document.querySelectorAll('video,audio').forEach(el => el.play());`)
    setActiveTab(activeAccountId!, tabId)
    window.api.show.main()
    setFullscreenVideo(null)
  }
  const [showSettings, setShowSettings] = React.useState(false)
  const [avatarToDelete, setAvatarToDelete] = React.useState<string | null>(null)

  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [name, setName] = React.useState('')
  const [guest, setGuest] = React.useState(false)
  const [showAccountManager, setShowAccountManager] = React.useState(false)

  const url = 'https://www.google.com'

  const confirmAdd = () => {
    if (!name.trim()) return
    const id = crypto.randomUUID()
    addAccount({
      id,
      name: name.trim(),
      avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
      token: '',
      guest,
      lastUsed: new Date().toISOString()
    })
    setActiveAccount(id)
    const tabId = `${id}-tab`
    const hostname = new URL(url).hostname
    addTab(id, {
      id: tabId,
      title: hostname,
      url,
      icon: `https://www.google.com/s2/favicons?domain=${hostname}`
    })
    setActiveTab(id, tabId)
    setShowAddDialog(false)
    setName('')
    setGuest(false)
  }

  return (
    <>
      {/* Fullscreen Video Dialog */}
      {/* Fullscreen Video Overlay */}
      {fullscreenVideo && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button onClick={closeFullscreen} className="absolute top-4 right-4 text-white z-50">
            <X className="h-6 w-6" />
          </button>
          <video src={fullscreenVideo.url} controls autoPlay className="max-w-full max-h-full" />
        </div>
      )}
      {/* Account Manager Drawer */}
      <AccountManagerDrawer open={showAccountManager} onOpenChange={setShowAccountManager} />
      {/* Settings Drawer */}
      <SettingDrawer open={showSettings} onOpenChange={setShowSettings} />

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Enter account details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[8px]"
            />
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={guest}
                onCheckedChange={(val) => setGuest(!!val)}
                className="rounded-[8px]"
              />
              <span>Guest Session</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={confirmAdd}
              className="rounded-[8px] w-full hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Sidebar Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-background flex items-center justify-between px-3 z-50">
        {/* Avatars */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-1">
          {accounts.slice(0, 10).map((acc) => (
            <div key={acc.id} className="relative">
              <Avatar
                className={`w-8 h-8 rounded-[8px] cursor-pointer transition-colors ${
                  activeAccountId === acc.id
                    ? 'bg-primary text-primary-foreground scale-110'
                    : 'opacity-80 hover:bg-primary hover:text-primary-foreground'
                }`}
                onClick={() => setActiveAccount(acc.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setAvatarToDelete(acc.id)
                }}
              >
                <AvatarImage src={acc.avatarUrl} alt={acc.name} />
                <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {avatarToDelete === acc.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 bg-background rounded-full"
                  onClick={() => {
                    setAvatarToDelete(null)
                    deleteAccount(acc.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowAccountManager(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-6 w-6" />
          </Button>
          {/* Audio panel */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-[8px]">
                <Music className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 max-h-80 overflow-y-auto">
              {playingTabs.length === 0 && <p className="text-sm text-center">No audio playing</p>}
              {playingTabs.map(([tabId, state]) => {
                // determine mute status
                const el = document.getElementById(`webview-${tabId}`) as any
                const isMuted = el?.isAudioMuted?.() ?? false
                return (
                  <div key={tabId} className="flex items-center justify-between mb-2">
                    <div className="truncate max-w-[60%]">
                      <p className="text-sm font-medium truncate">{state.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{state.url}</p>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleMute(tabId)}>
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => pauseTab(tabId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {(/\.(mp4|webm|ogg)/.test(state.url) || /youtube\.com/.test(state.url)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openFullscreen(state.url, tabId)}
                        >
                          <Film className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  )
}

export default BottomSidebar
