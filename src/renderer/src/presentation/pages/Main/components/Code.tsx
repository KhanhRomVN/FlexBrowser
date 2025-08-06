import React from 'react'
import { X, Settings, History as HistoryIcon, Plus } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../../components/ui/select'

interface CodeProps {
  onClose?: () => void
}

const Code: React.FC<CodeProps> = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center space-x-3">
          <Plus className="w-5 h-5 cursor-pointer hover:text-primary" />
          <Settings className="w-5 h-5 cursor-pointer hover:text-primary" />
          <HistoryIcon className="w-5 h-5 cursor-pointer hover:text-primary" />
        </div>
        <X className="w-5 h-5 cursor-pointer hover:text-destructive" onClick={onClose} />
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">{/* Chat messages will render here */}</div>
      {/* Input area */}
      <div className="flex items-center p-4 border-t border-border space-x-2">
        <Select>
          <SelectTrigger className="w-32">
            <div className="flex items-center justify-between px-2 py-1">Model</div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Type your message..." className="flex-1" />
        <Button variant="default">Send</Button>
      </div>
    </div>
  )
}

export default Code
