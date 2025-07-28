import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '../../../../components/ui/sheet'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../components/ui/avatar'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Checkbox } from '../../../../components/ui/checkbox'
import { Trash2, ArrowRight } from 'lucide-react'
import useAccountStore from '../../../../store/useAccountStore'

interface AccountManagerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AccountManagerDrawer: React.FC<AccountManagerDrawerProps> = ({ open, onOpenChange }) => {
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    deleteAccount,
    addAccount,
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
      guest,
      lastUsed: new Date().toISOString()
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-[400px]">
        <div className="flex flex-col h-full bg-background text-foreground">
          <SheetHeader className="flex items-center justify-between p-4 border-b">
            <SheetTitle>Accounts Manager</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {accounts.map((acc, idx) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 bg-popover rounded-md"
              >
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
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">
                No accounts yet. Add one below.
              </div>
            )}
          </div>

          <SheetFooter className="p-4 border-t flex flex-col space-y-3">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[8px]"
            />
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={guest}
                onCheckedChange={(val) => setGuest(!!val)}
                className="rounded-[8px]"
              />
              <span className="text-sm">Guest Session</span>
            </label>
            <Button
              onClick={confirmAdd}
              className="w-full rounded-[8px] hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Add Account
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AccountManagerDrawer
