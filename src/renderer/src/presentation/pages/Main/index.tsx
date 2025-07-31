// src/renderer/src/presentation/pages/Main/index.tsx

import React, { useEffect, useState } from 'react'
import '../../../styles.css'
import useAccountStore from '../../../store/useAccountStore'
import type { Tab } from '../../../store/useAccountStore'
import TabBar from './components/TabBar'
import WebviewContainer from '../../../components/Container/WebviewContainer'
import BottomSidebar from './components/BottomSidebar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Music, PictureInPicture } from 'lucide-react'
import { useGlobalAudioStore } from '../../../store/useGlobalAudioStore'

const DEFAULT_URL = 'https://www.google.com'

const MainPage: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    addAccount,
    addTab,
    setActiveAccount,
    setActiveTab,
    deleteTab,
    reorderTabs
  } = useAccountStore()
  const clearAudioState = useGlobalAudioStore((state) => state.clearAudioState)

  const isElectron = !!(window as any).process?.versions?.electron
  const [isOpeningPip, setIsOpeningPip] = useState(false)
  const [showInit, setShowInit] = useState(accounts.length === 0)
  const [initName, setInitName] = useState('')

  useEffect(() => {
    if (accounts.length === 0) {
      setShowInit(true)
    }
  }, [accounts.length])

  const confirmInitial = () => {
    const name = initName.trim()
    if (!name) return

    const accountId = crypto.randomUUID()
    addAccount({
      id: accountId,
      name,
      avatarUrl: `https://images.unsplash.com/seed/${accountId}/100x100`,
      token: ''
    })
    setActiveAccount(accountId)

    const host = new URL(DEFAULT_URL).hostname
    const tabId = `${accountId}-tab`
    addTab(accountId, {
      id: tabId,
      title: host,
      url: DEFAULT_URL,
      icon: `https://www.google.com/s2/favicons?domain=${host}`
    })
    setActiveTab(accountId, tabId)
    setShowInit(false)
  }

  const handleNewTab = () => {
    if (!activeAccountId) return
    const newTabId = `${activeAccountId}-${crypto.randomUUID()}`
    addTab(activeAccountId, {
      id: newTabId,
      title: new URL(DEFAULT_URL).hostname,
      url: DEFAULT_URL,
      icon: `https://www.google.com/s2/favicons?domain=${new URL(DEFAULT_URL).hostname}`
    })
    setActiveTab(activeAccountId, newTabId)
  }

  const handleTabChange = (tabId: string) => {
    if (activeAccountId) setActiveTab(activeAccountId, tabId)
  }

  const handleDeleteTab = (tabId: string) => {
    if (activeAccountId) {
      deleteTab(activeAccountId, tabId)
      clearAudioState(tabId)
    }
  }

  const handleReorderTabs = (newTabs: Tab[]) => {
    if (activeAccountId) {
      reorderTabs(activeAccountId, newTabs)
    }
  }

  const tabs = accounts.find((acc) => acc.id === activeAccountId)?.tabs || []
  const activeTabId = accounts.find((acc) => acc.id === activeAccountId)?.activeTabId || ''
  const activeUrl = tabs.find((t) => t.id === activeTabId)?.url || DEFAULT_URL
  const isYouTubeMedia = /youtu\.be/.test(activeUrl) || /youtube\.com/.test(activeUrl)
  const isNetflix = /netflix\.com/.test(activeUrl)
  const isPrimeVideo = /primevideo\.com/.test(activeUrl)
  const isDisneyPlus = /disneyplus\.com/.test(activeUrl)

  const shouldShowPip =
    isElectron &&
    (isYouTubeMedia ||
      isNetflix ||
      isPrimeVideo ||
      isDisneyPlus ||
      /\.(mp4|webm|ogg|mp3|wav)(\?.*)?$/.test(activeUrl))

  // Show account creation dialog if no accounts
  if (showInit) {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome</DialogTitle>
            <DialogDescription>Enter your account name to get started.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="My Account"
            value={initName}
            onChange={(e) => setInitName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={confirmInitial}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="flex flex-col w-full h-screen">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onDeleteTab={handleDeleteTab}
        onNewTab={handleNewTab}
        onReorder={handleReorderTabs}
      />

      <div className="flex-1 h-full overflow-hidden relative">
        <WebviewContainer url={activeUrl} isElectron={isElectron} tabId={activeTabId} />

        {isOpeningPip && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-white text-lg">Preparing video...</div>
          </div>
        )}

        {shouldShowPip && (
          <Button
            size="icon"
            title="Picture-in-Picture"
            variant="ghost"
            className="absolute top-2 right-2 z-50"
            onClick={async () => {
              setIsOpeningPip(true)
              try {
                const webview = document.getElementById(`webview-${activeTabId}`) as any
                const usedBuiltIn = await webview.executeJavaScript(
                  '(async () => { const vid = document.querySelector("video"); if (vid && vid.requestPictureInPicture) { await vid.requestPictureInPicture(); return true; } return false; })()'
                )
                if (!usedBuiltIn) {
                  window.api.pip.open(activeUrl)
                }
              } catch (e) {
                console.error('PiP invocation failed:', e)
                window.api.pip.open(activeUrl)
              } finally {
                setIsOpeningPip(false)
              }
            }}
          >
            <PictureInPicture className="w-6 h-6" />
          </Button>
        )}
      </div>

      <BottomSidebar />
    </div>
  )
}

export default MainPage
