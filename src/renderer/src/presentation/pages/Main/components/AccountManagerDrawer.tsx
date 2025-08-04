import React, { useState } from 'react'
import crypto from 'crypto'
import Drawer from 'react-modern-drawer'
import 'react-modern-drawer/dist/index.css'
import { Avatar, AvatarFallback } from '../../../../components/ui/avatar'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { ArrowRight, X, Trash2 } from 'lucide-react'
import useAccountStore from '../../../../store/useAccountStore'

interface AccountManagerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AccountManagerDrawer: React.FC<AccountManagerDrawerProps> = ({ open, onOpenChange }) => {
  const { accounts, activeAccountId, setActiveAccount, deleteAccount, addAccount } =
    useAccountStore()
  const [guestName, setGuestName] = useState('')

  const handleCloseDrawer = () => {
    onOpenChange(false)
  }

  const handleAddGuest = () => {
    if (!guestName.trim()) return
    const id = crypto.randomUUID()
    addAccount({ id, name: guestName.trim(), guest: true })
    setActiveAccount(id)
    setGuestName('')
  }

  const handleGoogleSignIn = async () => {
    const id = crypto.randomUUID()
    try {
      const { profile } = await window.api.auth.loginGoogle(id)
      addAccount({ id, name: profile.name, email: profile.email ?? '' })
      setActiveAccount(id)
    } catch (err) {
      console.error('Google login failed:', err)
    } finally {
      window.api.show.main()
    }
  }

  return (
    <Drawer
      open={open}
      direction="right"
      size={300}
      onClose={handleCloseDrawer}
      className="!bg-background"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center">
          <h2 className="text-lg font-semibold">Account Manager</h2>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={handleCloseDrawer}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">No accounts available.</div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-2 bg-popover rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 rounded-[8px]">
                    <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{acc.name}</div>
                    <div className="text-xs">
                      <span>{new Date(acc.lastUsed).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {activeAccountId === acc.id ? (
                    <Button variant="ghost" size="icon" onClick={() => setActiveAccount('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setActiveAccount(acc.id)}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t flex flex-col space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="Guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 rounded-[8px]"
            />
            <Button onClick={handleAddGuest} className="rounded-[8px]">
              Add Guest
            </Button>
          </div>
          <div className="text-center text-xs text-muted-foreground">OR</div>
          <Button className="w-full mt-2" onClick={handleGoogleSignIn}>
            Sign in with Google
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export default AccountManagerDrawer
