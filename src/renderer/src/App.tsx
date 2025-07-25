import React, { useState, useEffect, useRef } from 'react'
import './styles.css'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
import useAccountStore, { Account, Tab } from './store/useAccountStore'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Menu } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip'
const App: React.FC = () => {
  // Account store
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    addTab,
    setActiveTab,
    deleteAccount,
    renameAccount
  } = useAccountStore()

  // URL state and webview reference
  const [url] = useState<string>('https://www.google.com')
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const isElectron = !!(window as any).process?.versions?.electron

  // Account creation dialog state
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState<boolean>(false)
  const [newAccountName, setNewAccountName] = useState<string>('')
  const [newAccountIsGuest, setNewAccountIsGuest] = useState<boolean>(false)

  // Confirm adding account
  const confirmAddAccount = () => {
    if (!newAccountName) return
    const id = crypto.randomUUID()
    addAccount({
      id,
      name: newAccountName,
      avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
      token: '',
      guest: newAccountIsGuest
    })
    setActiveAccount(id)
    const tabId = `${id}-tab`
    const hostname = new URL(url).hostname
    const icon = `https://www.google.com/s2/favicons?domain=${hostname}`
    addTab(id, { id: tabId, title: hostname, url, icon })
    setActiveTab(id, tabId)
    setActiveTabId(tabId)
    setIsAccountDialogOpen(false)
    setNewAccountName('')
    setNewAccountIsGuest(false)
  }

  // Initialize default account on first load
  useEffect(() => {
    if (accounts.length === 0) {
      const id = crypto.randomUUID()
      addAccount({
        id,
        name: 'Default',
        avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
        token: '',
        guest: false
      })
      setActiveAccount(id)
      const hostname = new URL(url).hostname
      const icon = `https://www.google.com/s2/favicons?domain=${hostname}`
      addTab(id, { id: id + '-tab', title: hostname, url, icon })
      setActiveTab(id, id + '-tab')
    }
  }, [accounts.length])
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const tabs = activeAccount?.tabs ?? []

  // Track active tab state
  const [activeTabId, setActiveTabId] = useState<string>(
    activeAccount?.activeTabId ?? tabs[0]?.id ?? ''
  )

  useEffect(() => {
    setActiveTabId(activeAccount?.activeTabId ?? tabs[0]?.id ?? '')
  }, [activeAccountId, activeAccount?.activeTabId, tabs])

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
    if (activeAccountId) {
      setActiveTab(activeAccountId, tabId)
    }
  }

  // New tab handler
  const handleNewTab = () => {
    if (!activeAccountId) return
    const newTabId = crypto.randomUUID()
    const defaultUrl = 'https://www.google.com'
    const hostname = new URL(defaultUrl).hostname
    const icon = `https://www.google.com/s2/favicons?domain=${hostname}`
    addTab(activeAccountId, { id: newTabId, title: hostname, url: defaultUrl, icon })
    setActiveTab(activeAccountId, newTabId)
    setActiveTabId(newTabId)
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-full">
      {/* Main pane: URL bar, tabs, view */}
      <div className="flex flex-col flex-1 pb-16 md:pb-0">
        <Tabs value={activeTabId} onValueChange={handleTabChange} className="border-b">
          <TabsList className="bg-gray-100 dark:bg-gray-800">
            {tabs.map((tab: Tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="px-4 py-2 rounded \
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground \
                text-foreground hover:bg-primary/10"
              >
                {activeTabId === tab.id ? (
                  tab.title
                ) : (
                  <img src={tab.icon} className="w-4 h-4" alt={tab.title} />
                )}
              </TabsTrigger>
            ))}
            <button
              onClick={handleNewTab}
              className="px-2 text-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              +
            </button>
          </TabsList>
        </Tabs>
        {/* Webview container: preserve session per account with default fallback */}
        {isElectron ? (
          <div className="flex-1 relative">
            {accounts.length > 0 ? (
              accounts.map((acc) =>
                acc.tabs.map((tab) => (
                  <webview
                    key={`${acc.id}-${tab.id}`}
                    src={tab.url}
                    allowpopups
                    className={`absolute top-0 left-0 w-full h-full ${
                      acc.id === activeAccountId && tab.id === activeTabId ? '' : 'hidden'
                    }`}
                  />
                ))
              )
            ) : (
              <webview
                ref={webviewRef}
                src={url}
                allowpopups
                className="absolute top-0 left-0 w-full h-full"
              />
            )}
          </div>
        ) : (
          <iframe src={url} className="flex-1" style={{ width: '100%', height: '100%' }} />
        )}
      </div>
      {/* Sidebar: account avatars */}
      <ContextMenu.Root>
        <aside className="fixed bottom-0 left-0 right-0 h-16 bg-background text-foreground flex items-center justify-around space-x-4 md:relative md:bottom-auto md:left-auto md:right-auto md:h-auto md:flex-col md:space-x-0 md:space-y-4 md:w-16 py-4">
          {accounts.slice(0, 10).map((acc) => (
            <ContextMenu.Root key={acc.id}>
              <ContextMenu.Trigger asChild>
                <Avatar
                  className="w-10 h-10 cursor-pointer"
                  onClick={() => setActiveAccount(acc.id)}
                >
                  <AvatarImage src={acc.avatarUrl} alt={acc.name} />
                  <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </ContextMenu.Trigger>
              <ContextMenu.Content className="bg-background text-foreground rounded-md shadow-md p-2">
                <ContextMenu.Item
                  className="px-2 py-1 hover:bg-primary/10 rounded"
                  onSelect={() => {
                    const newName = prompt('New name', acc.name)
                    if (newName) renameAccount(acc.id, newName)
                  }}
                >
                  Rename
                </ContextMenu.Item>
                <ContextMenu.Item
                  className="px-2 py-1 hover:bg-primary/10 rounded"
                  onSelect={() => deleteAccount(acc.id)}
                >
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          ))}
          <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
              <button className="w-10 h-10 flex items-center justify-center hover:bg-primary/10 rounded">
                <Menu className="text-foreground" />
              </button>
            </ContextMenu.Trigger>
            <ContextMenu.Content className="bg-background text-foreground rounded-md shadow-md p-2">
              {accounts.map((acc) => (
                <ContextMenu.Item
                  key={acc.id}
                  className="px-2 py-1 hover:bg-primary/10 rounded flex justify-between"
                  onSelect={() => setActiveAccount(acc.id)}
                >
                  {acc.name}
                  {acc.id === activeAccountId && <span>•</span>}
                </ContextMenu.Item>
              ))}
              <ContextMenu.Separator className="my-1 h-px bg-border" />
              <ContextMenu.Item
                className="px-2 py-1 hover:bg-primary/10 rounded"
                onSelect={() => setIsAccountDialogOpen(true)}
              >
                Add Account
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>
        </aside>
      </ContextMenu.Root>
    </div>
  )
}

export default App
