import React, { useState, useEffect } from 'react'
import useAccountStore from '../../../../store/useAccountStore'
import { useGlobalAudioStore } from '../../../../store/useGlobalAudioStore'
import { User, MoreHorizontal, ArrowLeft, ArrowRight, RotateCw, Search } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import AccountManagerDrawer from './AccountManagerDrawer'
import SettingDrawer from './SettingDrawer'
import AvatarList from './BottomSidebar/AvatarList'
import AddAccountDialog from './BottomSidebar/AddAccountDialog'
import { MainMenu } from './MainMenu'
import AudioPanel from './BottomSidebar/AudioPanel'
import { Input } from '../../../../components/ui/input'

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

  // auto-remove accounts that have no tabs and reassign active account
  useEffect(() => {
    // list remaining accounts with at least one tab
    const remaining = accounts.filter((acc) => acc.tabs.length > 0)
    // delete accounts with no tabs
    accounts.forEach((acc) => {
      if (acc.tabs.length === 0) {
        deleteAccount(acc.id)
      }
    })
    // if active account removed or has no tabs, pick the last remaining
    if (!remaining.some((acc) => acc.id === activeAccountId) && remaining.length > 0) {
      setActiveAccount(remaining[remaining.length - 1].id)
    }
  }, [accounts, deleteAccount, activeAccountId, setActiveAccount])
  const audioStates = useGlobalAudioStore((s) => s.audioStates)
  const clearAudioState = useGlobalAudioStore((s) => s.clearAudioState)
  const playingTabs = Object.entries(audioStates).filter(([_, s]) => s.isPlaying)

  const [showSettings, setShowSettings] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [name, setName] = useState('')
  const [guest, setGuest] = useState(false)
  const [showAccountManager, setShowAccountManager] = useState(false)
  const [avatarToDelete, setAvatarToDelete] = useState<string | null>(null)
  const [showMainMenu, setShowMainMenu] = useState(false)

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

  const openFullscreen = async (url: string, tabId: string) => {
    // Pause any playing media first
    Object.keys(audioStates).forEach((tid) => pauseTab(tid))
    const webview = document.getElementById(`webview-${tabId}`) as any
    let currentTime = 0
    // extract video source from webview for custom PiP
    let mediaSrc = url
    if (webview?.executeJavaScript) {
      try {
        const srcResult = await webview.executeJavaScript(`
          (function() {
            const v = document.querySelector('video');
            return v ? (v.currentSrc || v.src) : null;
          })();
        `)
        if (srcResult) mediaSrc = srcResult
      } catch (e) {
        console.error('Error fetching video src for PiP:', e)
      }
      try {
        currentTime = await webview.executeJavaScript(`
          (function() {
            const vid = document.querySelector('video')
            return vid ? vid.currentTime : 0
          })();
        `)
      } catch (error) {
        console.error('Error fetching currentTime for PiP:', error)
      }
    }
    // Hide main window before entering PiP (builtin or custom)
    // @ts-ignore
    window.api.hide.main()

    try {
      // Try built-in PiP first
      const usedBuiltIn = await webview.executeJavaScript(`
        (async () => {
          const vid = document.querySelector("video");
          if (!vid) return false;
          vid.currentTime = ${currentTime};
          await vid.play().catch(() => {});
          if (vid.requestPictureInPicture) {
            await vid.requestPictureInPicture().catch(() => {});
            return true;
          }
          return false;
        })()
      `)
      // If built-in PiP succeeded, register exit handler and return
      if (usedBuiltIn) {
        // @ts-ignore
        await webview.executeJavaScript(`
          (function() {
            const v = document.querySelector("video");
            if (v && document.pictureInPictureEnabled) {
              v.addEventListener("leavepictureinpicture", () => { window.api.show.main(); });
            }
          })();
        `)
        return
      } else {
        // Fallback to custom PiP window
        window.api.hide.main()
        // @ts-ignore
        window.api.pip.open(mediaSrc, currentTime)
      }
    } catch (error) {
      console.error('PiP fullscreen failed:', error)
      window.api.hide.main()
      // @ts-ignore
      window.api.pip.open(mediaSrc, currentTime)
    }
  }
  const [searchQuery, setSearchQuery] = useState('')
  const goBack = () => {
    const acc = accounts.find((acc) => acc.id === activeAccountId)
    const tabId = acc?.activeTabId
    if (!tabId) return
    const el = document.getElementById(`webview-${tabId}`) as any
    if (el?.goBack) el.goBack()
  }
  const goForward = () => {
    const acc = accounts.find((acc) => acc.id === activeAccountId)
    const tabId = acc?.activeTabId
    if (!tabId) return
    const el = document.getElementById(`webview-${tabId}`) as any
    if (el?.goForward) el.goForward()
  }
  const reload = () => {
    const acc = accounts.find((acc) => acc.id === activeAccountId)
    const tabId = acc?.activeTabId
    if (!tabId) return
    const el = document.getElementById(`webview-${tabId}`) as any
    if (el?.reload) el.reload()
  }
  const handleSearch = (value: string) => {
    const acc = accounts.find((acc) => acc.id === activeAccountId)
    const tabId = acc?.activeTabId
    if (!tabId) return
    const el = document.getElementById(`webview-${tabId}`) as any
    el?.loadURL && el.loadURL(value)
  }

  return (
    <>
      <MainMenu open={showMainMenu} onOpenChange={setShowMainMenu} />
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
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-[#18171c] shadow-[0_-4px_8px_-2px_#0a9abb] flex items-center justify-between px-2 z-50">
        <div className="flex items-center space-x-2">
          <AvatarList
            accounts={accounts}
            activeAccountId={activeAccountId}
            setActiveAccount={setActiveAccount}
            avatarToDelete={avatarToDelete}
            setAvatarToDelete={setAvatarToDelete}
            deleteAccount={deleteAccount}
          />
          <Button variant="ghost" size="icon" className="rounded-[8px]" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-[8px]" onClick={goForward}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-[8px]" onClick={reload}>
            <RotateCw className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Search in tab..."
              className="w-36"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => handleSearch(searchQuery)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowAccountManager(true)}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowMainMenu(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
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
