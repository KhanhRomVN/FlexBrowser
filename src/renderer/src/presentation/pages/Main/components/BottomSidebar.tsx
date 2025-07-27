import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../components/ui/avatar'
import { Button } from '../../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../../components/ui/dialog'
import { Sheet, SheetContent } from '../../../../components/ui/sheet'
import { Input } from '../../../../components/ui/input'
import { Checkbox } from '../../../../components/ui/checkbox'
import useAccountStore from '../../../../store/useAccountStore'
import { Menu } from 'lucide-react'
import AccountManagerPage from '../../../../presentation/pages/AccountManager'

const BottomSidebar: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccount, addAccount, addTab, setActiveTab } =
    useAccountStore()

  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [name, setName] = React.useState('')
  const [guest, setGuest] = React.useState(false)
  const [showAccountManager, setShowAccountManager] = React.useState(false)

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
    setShowAddDialog(false)
    setName('')
    setGuest(false)
  }

  return (
    <>
      {/* Account Manager Sheet */}
      <Sheet open={showAccountManager} onOpenChange={setShowAccountManager}>
        <SheetContent side="right" className="p-0 w-[400px]">
          <AccountManagerPage onClose={() => setShowAccountManager(false)} />
        </SheetContent>
      </Sheet>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Enter account details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="flex items-center space-x-2">
              <Checkbox checked={guest} onCheckedChange={(val) => setGuest(!!val)} />
              <span>Guest Session</span>
            </label>
          </div>
          <DialogFooter>
            <Button onClick={confirmAdd} className="rounded-[8px]">
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Sidebar Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-background flex items-center justify-between px-3 z-50">
        {/* Avatars */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-1">
          {accounts.slice(0, 10).map((acc) => (
            <Avatar
              key={acc.id}
              className={`w-8 h-8 rounded-[8px] cursor-pointer transition-transform ${
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
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowAccountManager(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-[8px]"
            onClick={() => setShowAddDialog(true)}
          >
            +
          </Button>
        </div>
      </div>
    </>
  )
}

export default BottomSidebar
