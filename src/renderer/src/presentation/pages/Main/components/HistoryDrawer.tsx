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
import { X } from 'lucide-react'

interface HistoryItem {
  id: string
  title: string
  url: string
  visitDate: string
}

interface HistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ open, onOpenChange }) => {
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', title: 'Example Domain', url: 'https://example.com', visitDate: '2025-08-02 10:23' },
    { id: '2', title: 'OpenAI', url: 'https://openai.com', visitDate: '2025-08-03 09:15' },
    {
      id: '3',
      title: 'FlexBrowser',
      url: 'https://flexbrowser.local',
      visitDate: '2025-08-01 14:45'
    }
  ])

  const clearHistory = () => setHistory([])
  const openUrl = (url: string) => console.log(`Opening ${url}`)
  const removeItem = (id: string) => setHistory(history.filter((item) => item.id !== id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-[400px]">
        <div className="flex flex-col h-full bg-background text-foreground">
          <SheetHeader className="flex items-center justify-between p-4 border-b">
            <SheetTitle>History</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-4">
            <Button variant="ghost" className="mb-4" onClick={clearHistory}>
              Clear All
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>
                      <Button variant="link" onClick={() => openUrl(item.url)}>
                        {item.url}
                      </Button>
                    </TableCell>
                    <TableCell>{item.visitDate}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        Delete
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

export default HistoryDrawer
