import React, { useState, useEffect, useRef } from 'react'
import './styles.css'
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
import { Button } from './components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './components/ui/dropdown-menu'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './components/ui/dialog'
import useAccountStore, { Tab } from './store/useAccountStore'

const App: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    addTab,
    setActiveTab,
    deleteAccount,
    deleteTab
  } = useAccountStore()

  const [url] = useState<string>('https://www.google.com')
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const isElectron = !!(window as any).process?.versions?.electron

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState<boolean>(false)
  const [newAccountName, setNewAccountName] = useState<string>('')
  const [newAccountIsGuest, setNewAccountIsGuest] = useState<boolean>(false)

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
    setIsAccountDialogOpen(false)
    setNewAccountName('')
    setNewAccountIsGuest(false)
  }

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
      addTab(id, { id: `${id}-tab`, title: hostname, url, icon })
      setActiveTab(id, `${id}-tab`)
    }
  }, [accounts.length])

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  const tabs = activeAccount?.tabs ?? []
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
    <div className="flex flex-col w-full h-full">
      {/* Main pane */}
      <div className="flex flex-col flex-1">
        {/* Improved Tabs UI */}
        <div className="flex items-center border-b bg-gray-100 dark:bg-gray-800 px-2">
          <div className="flex-1 flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab: Tab) => (
              <div
                key={tab.id}
                className={`flex items-center px-3 py-2 mr-1 rounded-t-md transition-all ${
                  activeTabId === tab.id
                    ? 'bg-background border-t-2 border-primary'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <img src={tab.icon} className="w-4 h-4 mr-2" alt={tab.title} />
                <span className="text-sm max-w-[120px] truncate">{tab.title}</span>
                <button
                  className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (activeAccountId) {
                      deleteTab(activeAccountId, tab.id)
                    }
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleNewTab}
            className="ml-1 p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Webview */}
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

      {/* Improved Bottom Sidebar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-between px-4">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-1">
          {accounts.slice(0, 10).map((acc) => (
            <Avatar
              key={acc.id}
              className={`w-10 h-10 cursor-pointer transition-transform ${
                activeAccountId === acc.id
                  ? 'ring-2 ring-primary scale-110'
                  : 'opacity-80 hover:opacity-100'
              }`}
              onClick={() => setActiveAccount(acc.id)}
            >
              <AvatarImage src={acc.avatarUrl} alt={acc.name} />
              <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
            <div className="px-3 py-2 font-semibold">Accounts Manager</div>
            {accounts.map((acc, idx) => (
              <div
                key={acc.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <span className="w-6 text-gray-500">{idx + 1}.</span>
                  <Avatar className="w-8 h-8 mx-2">
                    <AvatarImage src={acc.avatarUrl} alt={acc.name} />
                    <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm">{acc.name}</div>
                    <div className="text-xs text-gray-500">
                      {acc.guest ? 'Guest Session' : 'Logged In'}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {activeAccountId !== acc.id && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setActiveAccount(acc.id)}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            <DialogTrigger asChild>
              <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                <div className="flex items-center px-3 py-2 text-primary">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Add New Account</span>
                </div>
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default App
