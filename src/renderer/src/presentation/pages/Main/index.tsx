import React, { useEffect, useState } from 'react'
import '../../../styles.css'
import useAccountStore from '../../../store/useAccountStore'
import type { Tab } from '../../../store/useAccountStore'
import TabBar from './components/TabBar'
import WebviewContainer from '../../../components/Container/WebviewContainer'
import BottomSidebar from './components/BottomSidebar'
import Code from './components/Code'
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
  const [showCode, setShowCode] = useState(false)
  const [initEmail, setInitEmail] = useState('')

  // Migrate legacy localStorage to file-based storage on first load
  useEffect(() => {
    const migrateStorage = async () => {
      try {
        const existing = await window.api.storage.getItem('account_store')
        if (!existing) {
          const legacy = localStorage.getItem('account_store')
          if (legacy) {
            await window.api.storage.setItem('account_store', legacy)
            localStorage.removeItem('account_store')
          }
        }
      } catch (e) {
        console.error('[MainPage] Storage migration failed', e)
      }
    }
    migrateStorage()
  }, [])
  useEffect(() => {
    if (accounts.length === 0) {
      setShowInit(true)
    }
  }, [accounts.length])

  // Listen for OAuth token from embedded auth window or deep link
  useEffect(() => {
    window.api.auth.onOauthToken(async (token: string, deepAccountId?: string) => {
      // Determine target account: deep link override or current
      if (!activeAccountId && !deepAccountId) return
      const acctId = deepAccountId ?? activeAccountId!
      try {
        // Decode JWT payload for profile
        const payload = JSON.parse(atob(token.split('.')[1]))
        const { name, picture, email } = payload as {
          name: string
          picture: string
          email?: string
        }
        // Update account store and sync session cookie
        updateAccount(acctId, {
          isSignedIn: true,
          idToken: token,
          name,
          picture,
          email
        })
        // If deep link, switch active account
        if (deepAccountId) {
          setActiveAccount(deepAccountId)
        }
        await window.api.session.syncGoogle(token)
      } catch (e) {
        console.error('[MainPage] Failed to handle OAuth token', e)
      }
    })
  }, [activeAccountId, updateAccount, setActiveAccount])

  // Sync Google session on active account change (fallback)
  useEffect(() => {
    if (
      activeAccountId &&
      accounts.some((acc) => acc.id === activeAccountId && acc.isSignedIn && acc.idToken)
    ) {
      const account = accounts.find((acc) => acc.id === activeAccountId)!
      window.api.session.syncGoogle(account.idToken!)
    }
  }, [activeAccountId, accounts])
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

  if (showCode) {
    return (
      <div className="flex flex-col w-full h-screen">
        <Code onClose={() => setShowCode(false)} />
      </div>
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

      <BottomSidebar onOpenCode={() => setShowCode(true)} />
    </div>
  )
}

export default MainPage
