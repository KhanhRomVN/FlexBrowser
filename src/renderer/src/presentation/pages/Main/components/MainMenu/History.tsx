import React, { ChangeEvent, useEffect, useState } from 'react'
import useAccountStore from '../../../../../store/useAccountStore'
import { Input } from '../../../../../components/ui/input'
import { Button } from '../../../../../components/ui/button'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuShortcut
} from '../../../../../components/ui/dropdown-menu'

interface HistoryItem {
  id: string
  title?: string
  url: string
  lastVisited?: string
}

const History: React.FC = () => {
  // Check signed-in account
  const activeAccountId = useAccountStore((state) => state.activeAccountId)
  const accounts = useAccountStore((state) => state.accounts)
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Fetch history only when signed in with a real synced account
  useEffect(() => {
    console.log('History useEffect activeAccount.token:', activeAccount?.token)
    if (activeAccount?.token) {
      console.log('Fetching history from API...')
      window.api.history
        .list()
        .then((items: HistoryItem[]) => {
          console.log('Fetched history items:', items)
          setHistoryItems(items)
        })
        .catch((err: any) => {
          console.error('Failed to load history:', err)
          setHistoryItems([])
        })
    } else {
      console.log('No activeAccount.token, skipping history fetch.')
    }
  }, [activeAccount?.token])

  const clearHistory = async () => {
    try {
      await window.api.history.clear()
      setHistoryItems([])
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  const filtered = historyItems.filter((item) => {
    const term = searchTerm.toLowerCase()
    return item.title?.toLowerCase().includes(term) || item.url.toLowerCase().includes(term)
  })

  if (!activeAccount?.token) {
    return (
      <div className="px-2 py-1 text-sm text-muted-foreground">
        Please sign in to a real Google account to view history.
      </div>
    )
  }

  return (
    <div className="px-1 py-1 max-h-64 overflow-y-auto">
      <Input
        placeholder="Search history"
        value={searchTerm}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.currentTarget.value)}
        className="mb-2"
      />
      <Button variant="destructive" size="sm" onClick={clearHistory} className="mb-2">
        Delete history
      </Button>
      <DropdownMenuSeparator />
      {filtered.length === 0 ? (
        <div className="px-2 py-1 text-sm text-muted-foreground">No history entries.</div>
      ) : (
        filtered.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="px-2 py-1"
            onClick={() => {
              window.api.history.open(item.url)
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{item.title || item.url}</span>
              <span className="text-xs text-muted-foreground">{item.lastVisited || item.url}</span>
            </div>
            <DropdownMenuShortcut>↗</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))
      )}
    </div>
  )
}

export default History
