import React, { useEffect } from 'react'
import './styles.css'
import useAccountStore from './store/useAccountStore'
import TabBar from './components/Layout/TabBar'
import WebviewContainer from './components/Layout/WebviewContainer'
import BottomSidebar from './components/Layout/BottomSidebar'

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

  // Initialize default account on first load
  useEffect(() => {
    if (accounts.length === 0) {
      const id = crypto.randomUUID()
      addAccount({
        id,
        name: 'Default',
        avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
        token: ''
      })
      setActiveAccount(id)
      const hostname = new URL(url).hostname
      const icon = `https://www.google.com/s2/favicons?domain=${hostname}`
      addTab(id, { id: `${id}-tab`, title: hostname, url, icon })
      setActiveTab(id, `${id}-tab`)
    }
  }, [accounts.length, addAccount, setActiveAccount, addTab, setActiveTab])

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
      <div className="flex flex-col flex-1">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onDeleteTab={handleDeleteTab}
          onNewTab={handleNewTab}
        />
        <WebviewContainer url={url} isElectron={isElectron} />
      </div>
      <BottomSidebar />
    </div>
  )
}

export default App
