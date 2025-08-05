import React, { useState } from 'react'
import AddAccountDialog from './BottomSidebar/AddAccountDialog'
import Drawer from 'react-modern-drawer'
import 'react-modern-drawer/dist/index.css'
import { Avatar, AvatarFallback } from '../../../../components/ui/avatar'
import { Button } from '../../../../components/ui/button'
import { ArrowRight, X, Trash2 } from 'lucide-react'
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dlgName, setDlgName] = useState('')
  const [dlgGuest, setDlgGuest] = useState(false)
  const [dlgEmail, setDlgEmail] = useState('')

  // central confirm handler to avoid stale closures
  const handleConfirmAdd = () => {
    if (!dlgName.trim()) return
    const id = window.crypto.randomUUID()
    addAccount({
      id,
      name: dlgName.trim(),
      email: dlgGuest ? undefined : dlgEmail.trim(),
      guest: dlgGuest
    })
    setActiveAccount(id)
    // add initial blank tab so account isn't auto-deleted
    const tabId = `${id}-tab`
    addTab(id, {
      id: tabId,
      title: 'New Tab',
      url: 'about:blank',
      icon: ''
    })
    setActiveTab(id, tabId)
    setDlgName('')
    setDlgEmail('')
    setDlgGuest(false)
    setDialogOpen(false)
  }

  const handleCloseDrawer = () => {
    onOpenChange(false)
  }

  // individual guest add removed; use AddAccountDialog for all new accounts

  return (
    <Drawer
      open={open}
      direction="right"
      size={350}
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
                    <AvatarFallback>{acc.name ? acc.name.charAt(0) : ''}</AvatarFallback>
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
          <Button
            className="w-full mt-2"
            onClick={() => {
              onOpenChange(false)
              setDialogOpen(true)
            }}
          >
            Add Account
          </Button>
          <AddAccountDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            name={dlgName}
            setName={setDlgName}
            guest={dlgGuest}
            setGuest={setDlgGuest}
            email={dlgEmail}
            setEmail={setDlgEmail}
            confirmAdd={handleConfirmAdd}
          />
        </div>
      </div>
    </Drawer>
  )
}

export default AccountManagerDrawer
