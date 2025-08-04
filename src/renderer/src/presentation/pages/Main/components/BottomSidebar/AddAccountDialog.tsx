import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../../../components/ui/dialog'
import { Input } from '../../../../../components/ui/input'
import { Checkbox } from '../../../../../components/ui/checkbox'
import { Button } from '../../../../../components/ui/button'
import useAccountStore from '../../../../../store/useAccountStore'

interface AddAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  setName: (name: string) => void
  guest: boolean
  setGuest: (g: boolean) => void
  email: string
  setEmail: (email: string) => void
  confirmAdd: () => void
}

const AddAccountDialog: React.FC<AddAccountDialogProps> = ({
  open,
  onOpenChange,
  name,
  setName,
  guest,
  setGuest,
  email,
  setEmail,
  confirmAdd
}) => {
  const accounts = useAccountStore((s) => s.accounts)
  const maxReached = accounts.length >= 9

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            className="rounded-[8px]"
          />
          <label className="flex items-center space-x-2">
            <Checkbox
              checked={guest}
              onCheckedChange={(val) => setGuest(Boolean(val))}
              className="rounded-[8px]"
            />
            <span>Guest Session</span>
          </label>
          {!guest && (
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[8px]"
            />
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={confirmAdd}
            disabled={maxReached}
            className={`rounded-[8px] w-full transition-colors ${
              maxReached
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-primary hover:text-primary-foreground'
            }`}
          >
            {maxReached ? 'Limit Reached (9)' : 'Add Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddAccountDialog
