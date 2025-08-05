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
import { useGlobalAudioStore } from '../../../store/useGlobalAudioStore'
import { Checkbox } from '../../../components/ui/checkbox'

const MainPage: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    addAccount,
    updateAccount,
    addTab,
    setActiveAccount,
    setActiveTab,
    deleteTab,
    reorderTabs
  } = useAccountStore()

  const clearAudioState = useGlobalAudioStore((state) => state.clearAudioState)

  // Always load the local New Tab extension page
  const defaultUrl = `file://${(window as any).api.getCwd()}/src/extensions/FlexBookmark/src/content/newtab/newtab.html`

  const [showInit, setShowInit] = useState(accounts.length === 0)
  const [initName, setInitName] = useState('')
  const [initGuest, setInitGuest] = useState(false)
  const [initEmail, setInitEmail] = useState('')

  useEffect(() => {
    if (accounts.length === 0) {
      setShowInit(true)
    }
  }, [accounts.length])

  const confirmInitial = () => {
    const name = initName.trim()
    if (!name) return

    const accountId = window.crypto.randomUUID()
    addAccount({
      id: accountId,
      name,
      email: initGuest ? undefined : initEmail.trim(),
      guest: initGuest,
      lastUsed: new Date().toISOString()
    })
    setActiveAccount(accountId)

    // create initial bookmarks tab
    const newTabId = `${accountId}-${window.crypto.randomUUID()}`
    addTab(accountId, {
      id: newTabId,
      title: 'Bookmarks',
      url: defaultUrl,
      icon: ''
    })
    setActiveTab(accountId, newTabId)
    setShowInit(false)

    // Auto sign-in for non-guest users
    if (!initGuest) {
      setTimeout(() => {
        window.api.auth
          .loginGoogle(accountId)
          .then(({ idToken, profile }) => {
            updateAccount(accountId, {
              isSignedIn: true,
              idToken,
              picture: profile.picture,
              name: profile.name,
              email: profile.email
            })
          })
          .catch(console.error)
      }, 1000)
    }
  }

  const handleNewTab = () => {
    if (!activeAccountId) return
    const newTabId = `${activeAccountId}-${window.crypto.randomUUID()}`
    addTab(activeAccountId, {
      id: newTabId,
      title: 'Bookmarks',
      url: defaultUrl,
      icon: ''
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
    if (activeAccountId) reorderTabs(activeAccountId, newTabs)
  }

  const tabs = accounts.find((acc) => acc.id === activeAccountId)?.tabs || []
  const activeTabId = accounts.find((acc) => acc.id === activeAccountId)?.activeTabId || ''
  const activeUrl = tabs.find((t) => t.id === activeTabId)?.url || defaultUrl

  // Show account creation dialog if no accounts
  if (showInit) {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome</DialogTitle>
            <DialogDescription>Enter your account name to get started.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={initName}
              onChange={(e) => setInitName(e.target.value)}
            />
            <label className="flex items-center space-x-2">
              <Checkbox checked={initGuest} onCheckedChange={(val: boolean) => setInitGuest(val)} />
              <span>Guest Session</span>
            </label>
            {!initGuest && (
              <Input
                placeholder="Email"
                value={initEmail}
                onChange={(e) => setInitEmail(e.target.value)}
              />
            )}
          </div>
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
        <WebviewContainer url={activeUrl} isElectron={true} tabId={activeTabId} />
      </div>

      <BottomSidebar />
    </div>
  )
}

export default MainPage
