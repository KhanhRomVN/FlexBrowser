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
}) => (
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="rounded-[8px]"
        />
        <label className="flex items-center space-x-2">
          <Checkbox
            checked={guest}
            onCheckedChange={(val: boolean) => setGuest(val)}
            className="rounded-[8px]"
          />
          <span>Guest Session</span>
        </label>
        {!guest && (
          <Input
            placeholder="Email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="rounded-[8px]"
          />
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={confirmAdd}
          className="rounded-[8px] w-full hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Add Account
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default AddAccountDialog
