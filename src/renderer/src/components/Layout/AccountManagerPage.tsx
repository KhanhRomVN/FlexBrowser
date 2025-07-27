import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { X } from 'lucide-react'
import useAccountStore from '../../store/useAccountStore'

interface AccountManagerPageProps {
  onClose: () => void
}

const AccountManagerPage: React.FC<AccountManagerPageProps> = ({ onClose }) => {
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    deleteAccount,
    addTab,
    setActiveTab
  } = useAccountStore()

  const [name, setName] = React.useState('')
  const [guest, setGuest] = React.useState(false)
  const url = 'https://www.google.com'

  const confirmAdd = () => {
    if (!name.trim()) return
    const id = crypto.randomUUID()
    addAccount({
      id,
      name: name.trim(),
      avatarUrl: `https://images.unsplash.com/seed/${id}/100x100`,
      token: '',
      guest
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
    setName('')
    setGuest(false)
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Accounts Manager</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {accounts.map((acc, idx) => (
          <div key={acc.id} className="flex items-center justify-between p-3 bg-popover rounded-md">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground">{idx + 1}.</span>
              <Avatar className="w-8 h-8 rounded-[8px]">
                <AvatarImage src={acc.avatarUrl} alt={acc.name} />
                <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm">{acc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {acc.guest ? 'Guest Session' : 'Logged In'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {activeAccountId !== acc.id && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setActiveAccount(acc.id)}>
                    Switch
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            No accounts yet. Use the form below to add one.
          </div>
        )}
      </div>
      <div className="p-4 border-t space-y-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center space-x-2">
          <Checkbox checked={guest} onCheckedChange={(val) => setGuest(!!val)} />
          <span className="text-sm">Guest Session</span>
        </label>
        <Button onClick={confirmAdd} className="w-full">
          Add Account
        </Button>
      </div>
    </div>
  )
}

export default AccountManagerPage
