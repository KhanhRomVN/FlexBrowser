import React, { useState } from 'react'
import useAccountStore from '../../../../store/useAccountStore'
import { useGlobalAudioStore } from '../../../../store/useGlobalAudioStore'
import { Menu, Settings } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import AccountManagerDrawer from './AccountManagerDrawer'
import SettingDrawer from './SettingDrawer'
import AvatarList from './BottomSidebar/AvatarList'
import AddAccountDialog from './BottomSidebar/AddAccountDialog'
import AudioPanel from './BottomSidebar/AudioPanel'
import FullscreenVideoOverlay from './BottomSidebar/FullscreenVideoOverlay'

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
  const audioStates = useGlobalAudioStore((s) => s.audioStates)
  const clearAudioState = useGlobalAudioStore((s) => s.clearAudioState)
  const playingTabs = Object.entries(audioStates).filter(([_, s]) => s.isPlaying)

  const [fullscreenVideo, setFullscreenVideo] = useState<{ url: string; tabId: string } | null>(
    null
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [name, setName] = useState('')
  const [guest, setGuest] = useState(false)
  const [showAccountManager, setShowAccountManager] = useState(false)
  const [avatarToDelete, setAvatarToDelete] = useState<string | null>(null)

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

  const openFullscreen = (url: string, tabId: string) => {
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

  return (
    <>
      <FullscreenVideoOverlay fullscreenVideo={fullscreenVideo} closeFullscreen={closeFullscreen} />
      <AccountManagerDrawer open={showAccountManager} onOpenChange={setShowAccountManager} />
      <SettingDrawer open={showSettings} onOpenChange={setShowSettings} />
      <AddAccountDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        name={name}
        setName={setName}
        guest={guest}
        setGuest={setGuest}
        confirmAdd={confirmAdd}
      />
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-background flex items-center justify-between px-3 z-50">
        <AvatarList
          accounts={accounts}
          activeAccountId={activeAccountId}
          setActiveAccount={setActiveAccount}
          avatarToDelete={avatarToDelete}
          setAvatarToDelete={setAvatarToDelete}
          deleteAccount={deleteAccount}
        />
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
          <AudioPanel
            playingTabs={playingTabs}
            toggleMute={toggleMute}
            pauseTab={pauseTab}
            openFullscreen={openFullscreen}
          />
        </div>
      </div>
    </>
  )
}

export default BottomSidebar
