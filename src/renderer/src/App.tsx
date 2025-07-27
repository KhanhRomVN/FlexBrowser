import React, { useEffect, useState } from 'react'
import './styles.css'
import useAccountStore from './store/useAccountStore'
import TabBar from './presentation/pages/Main/components/TabBar'
import WebviewContainer from './components/Container/WebviewContainer'
import BottomSidebar from './presentation/pages/Main/components/BottomSidebar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'

const App: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    addAccount,
    addTab,
    setActiveAccount,
    setActiveTab,
    deleteTab
  } = useAccountStore()

  const url = 'https://www.google.com'
  const isElectron = !!(window as any).process?.versions?.electron

  // First-run state
  const [showInit, setShowInit] = useState(accounts.length === 0)
  const [initName, setInitName] = useState('')

  // If store becomes empty, ensure init flow shows
  useEffect(() => {
    if (accounts.length === 0) {
      setShowInit(true)
    }
  }, [accounts.length])

  const confirmInitial = () => {
    if (!initName.trim()) return
    const id = crypto.randomUUID()
    addAccount({
      id,
      name: initName.trim(),
      avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
      token: ''
    })
    setActiveAccount(id)
    const hostname = new URL(url).hostname
    addTab(id, {
      id: `${id}-tab`,
      title: hostname,
      url,
      icon: `https://www.google.com/s2/favicons?domain=${hostname}`
    })
    setActiveTab(id, `${id}-tab`)
    setShowInit(false)
  }

  // Render initial account creation dialog on first run
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
            />
          </div>
          <DialogFooter>
            <Button className="rounded-[8px]" onClick={confirmInitial}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Normal app UI
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const tabs = activeAccount?.tabs ?? []
  const activeTabId = activeAccount?.activeTabId ?? tabs[0]?.id ?? ''

  // Handlers
  const handleTabChange = (tabId: string) => {
    if (activeAccountId) {
      setActiveTab(activeAccountId, tabId)
    }
  }
  const handleDeleteTab = (tabId: string) => {
    if (activeAccountId) {
      deleteTab(activeAccountId, tabId)
    }
  }
  const handleNewTab = () => {
    if (!activeAccountId) return
    const newTabId = crypto.randomUUID()
    const defaultUrl = 'https://www.google.com'
    const hostname = new URL(defaultUrl).hostname
    addTab(activeAccountId, {
      id: newTabId,
      title: hostname,
      url: defaultUrl,
      icon: `https://www.google.com/s2/favicons?domain=${hostname}`
    })
    setActiveTab(activeAccountId, newTabId)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col flex-1 pb-14">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onDeleteTab={handleDeleteTab}
          onNewTab={handleNewTab}
        />
        <WebviewContainer
          url={tabs.find((tab) => tab.id === activeTabId)?.url || url}
          isElectron={isElectron}
        />
      </div>
      <BottomSidebar />
    </div>
  )
}

export default App
