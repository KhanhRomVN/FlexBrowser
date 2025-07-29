import React, { useEffect, useState } from 'react'
import '../../../styles.css'
import useAccountStore from '../../../store/useAccountStore'
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
import { Music } from 'lucide-react'
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
    deleteTab
  } = useAccountStore()
  const clearAudioState = useGlobalAudioStore((state) => state.clearAudioState)

  const isElectron = !!(window as any).process?.versions?.electron
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

  if (showInit) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome</DialogTitle>
            <DialogDescription>Please create an account to continue</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Your Name"
              value={initName}
              onChange={(e) => setInitName(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button onClick={confirmInitial}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const activeAccount = accounts.find((a) => a.id === activeAccountId)
  const tabs = activeAccount?.tabs ?? []
  const activeTabId = activeAccount?.activeTabId ?? tabs[0]?.id ?? ''

  const handleTabChange = (tabId: string) => {
    if (activeAccountId) setActiveTab(activeAccountId, tabId)
  }

  const handleDeleteTab = (tabId: string) => {
    if (!activeAccountId) return
    deleteTab(activeAccountId, tabId)
    clearAudioState(tabId)
  }

  const handleNewTab = () => {
    if (!activeAccountId) return
    const newTabId = crypto.randomUUID()
    const host = new URL(DEFAULT_URL).hostname
    addTab(activeAccountId, {
      id: newTabId,
      title: host,
      url: DEFAULT_URL,
      icon: `https://www.google.com/s2/favicons?domain=${host}`
    })
    setActiveTab(activeAccountId, newTabId)
  }

  const activeUrl = tabs.find((t) => t.id === activeTabId)?.url || DEFAULT_URL
  const shouldShowPip =
    /youtube\.com/.test(activeUrl) || /\.(mp4|webm|ogg|mp3|wav)(\?.*)?$/.test(activeUrl)

  return (
    <div className="flex flex-col w-full h-screen">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onDeleteTab={handleDeleteTab}
        onNewTab={handleNewTab}
      />
      <div className="flex-1 h-full overflow-hidden relative">
        <WebviewContainer url={activeUrl} isElectron={isElectron} tabId={activeTabId} />
        {shouldShowPip && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 z-50 bg-red-500 text-white p-3 rounded-full shadow-lg"
            onClick={() =>
              isElectron
                ? window.api.pip.open(activeUrl)
                : window.open(activeUrl, 'pip', 'width=400,height=300,alwaysOnTop=yes')
            }
          >
            <Music className="w-6 h-6" />
          </Button>
        )}
      </div>
      <BottomSidebar />
    </div>
  )
}

export default MainPage
