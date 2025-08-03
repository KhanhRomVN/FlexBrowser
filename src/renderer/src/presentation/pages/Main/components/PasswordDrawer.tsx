import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from '../../../../components/ui/sheet'
import { Button } from '../../../../components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../../../../components/ui/table'
import { X, Clipboard, Trash2 } from 'lucide-react'

interface PasswordItem {
  id: string
  site: string
  username: string
  password: string
}

interface PasswordDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PasswordDrawer: React.FC<PasswordDrawerProps> = ({ open, onOpenChange }) => {
  const [passwords, setPasswords] = useState<PasswordItem[]>([
    { id: '1', site: 'example.com', username: 'user1', password: '••••••••' },
    { id: '2', site: 'openai.com', username: 'ai_user', password: '••••••••' },
    { id: '3', site: 'flexbrowser.local', username: 'fb_admin', password: '••••••••' }
  ])

  const copyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd)
    console.log('Password copied')
  }

  const removePassword = (id: string) => {
    setPasswords(passwords.filter((item) => item.id !== id))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-[400px]">
        <div className="flex flex-col h-full bg-background text-foreground">
          <SheetHeader className="flex items-center justify-between p-4 border-b">
            <SheetTitle>Passwords</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passwords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.site}</TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => copyPassword(item.password)}>
                        <Clipboard className="mr-1 h-4 w-4" /> Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removePassword(item.id)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <SheetFooter className="p-4 border-t flex justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default PasswordDrawer
