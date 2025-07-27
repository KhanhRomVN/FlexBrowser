import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import useAccountStore from '../../store/useAccountStore'

const BottomSidebar: React.FC = () => {
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
    addAccount,
    addTab,
    setActiveTab,
    deleteAccount
  } = useAccountStore()

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [guest, setGuest] = React.useState(false)
  const url = 'https://www.google.com'

  const confirmAdd = () => {
    if (!name) return
    const id = crypto.randomUUID()
    addAccount({
      id,
      name,
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
    setIsDialogOpen(false)
    setName('')
    setGuest(false)
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-background border-t flex items-center justify-between px-3 z-50">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-[8px]">
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
          <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto bg-popover text-popover-foreground shadow-md rounded-md p-1">
            <div className="px-3 py-2 font-semibold">Accounts Manager</div>
            {accounts.map((acc, idx) => (
              <DropdownMenuItem
                key={acc.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <span className="w-6 text-gray-500">{idx + 1}.</span>
                  <Avatar className="w-8 h-8 mx-2 rounded-[8px]">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-[8px]"
                        onClick={() => deleteAccount(acc.id)}
                      >
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-[8px]"
                        onClick={() => setActiveAccount(acc.id)}
                      >
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
              </DropdownMenuItem>
            ))}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>Enter account details below</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export default BottomSidebar
