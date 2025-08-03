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

interface DownloadItem {
  id: string
  name: string
  status: 'downloading' | 'completed' | 'failed'
}

interface DownloadDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DownloadDrawer: React.FC<DownloadDrawerProps> = ({ open, onOpenChange }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([
    { id: '1', name: 'file1.zip', status: 'downloading' },
    { id: '2', name: 'document.pdf', status: 'completed' },
    { id: '3', name: 'video.mp4', status: 'failed' }
  ])

  const cancelDownload = (id: string) => {
    setDownloads(downloads.filter((item) => item.id !== id))
  }

  const openFile = (name: string) => {
    console.log(`Opening ${name}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-[400px]">
        <div className="flex flex-col h-full bg-background text-foreground">
          <SheetHeader className="flex items-center justify-between p-4 border-b">
            <SheetTitle>Downloads</SheetTitle>
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
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downloads.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                    <TableCell>
                      {item.status === 'downloading' && (
                        <Button variant="ghost" size="sm" onClick={() => cancelDownload(item.id)}>
                          Cancel
                        </Button>
                      )}
                      {item.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => openFile(item.name)}>
                          Open
                        </Button>
                      )}
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

export default DownloadDrawer
