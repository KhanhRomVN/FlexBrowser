import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from '../../../../components/ui/sheet'
import { Button } from '../../../../components/ui/button'
import { Switch } from '../../../../components/ui/switch'
import { Slider } from '../../../../components/ui/slider'
import { Separator } from '../../../../components/ui/separator'
import { X } from 'lucide-react'

interface SettingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SettingDrawer: React.FC<SettingDrawerProps> = ({ open, onOpenChange }) => {
  // UI/UX
  const [position, setPosition] = React.useState<'left' | 'right' | 'top' | 'bottom'>('right')
  const [widthPct, setWidthPct] = React.useState(30)
  const [autoHide, setAutoHide] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState<'auto' | 'light' | 'dark'>('auto')
  const [transparency, setTransparency] = React.useState(0.8)
  // Hotkeys
  const [hotkeyOpen, setHotkeyOpen] = React.useState(true)
  // Browser
  const [adblock, setAdblock] = React.useState(true)
  // Performance
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(false)
  // Sync & Security
  const [syncEnabled, setSyncEnabled] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-[400px]">
        <div className="flex flex-col h-full bg-background text-foreground">
          <SheetHeader className="flex items-center justify-between p-4 border-b">
            <SheetTitle>Settings</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex items-center justify-center rounded-[8px]"
              >
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* UI/UX */}
            <div>
              <h3 className="text-sm font-medium mb-2">UI / UX</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Default Position</span>
                  <select
                    className="rounded-[8px] border bg-popover px-2 py-1"
                    value={position}
                    onChange={(e) => setPosition(e.target.value as any)}
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Width %</span>
                  <Slider
                    value={[widthPct]}
                    max={100}
                    step={5}
                    onValueChange={(val) => setWidthPct(val[0])}
                    className="w-32"
                  />
                  <span>{widthPct}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-hide on Hover</span>
                  <Switch checked={autoHide} onCheckedChange={setAutoHide} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Theme Mode</span>
                  <select
                    className="rounded-[8px] border bg-popover px-2 py-1"
                    value={darkMode}
                    onChange={(e) => setDarkMode(e.target.value as any)}
                  >
                    <option value="auto">Auto</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
            </div>
            <Separator />

            {/* Hotkeys */}
            <div>
              <h3 className="text-sm font-medium mb-2">Hotkeys</h3>
              <div className="flex items-center justify-between">
                <span>Open FlexBrowser</span>
                <Switch checked={hotkeyOpen} onCheckedChange={setHotkeyOpen} />
              </div>
            </div>
            <Separator />

            {/* Web / Browser */}
            <div>
              <h3 className="text-sm font-medium mb-2">Web / Browser</h3>
              <div className="flex items-center justify-between">
                <span>Ad-block</span>
                <Switch checked={adblock} onCheckedChange={setAdblock} />
              </div>
            </div>
            <Separator />

            {/* Performance */}
            <div>
              <h3 className="text-sm font-medium mb-2">Performance</h3>
              <div className="flex items-center justify-between">
                <span>Always on Top</span>
                <Switch checked={alwaysOnTop} onCheckedChange={setAlwaysOnTop} />
              </div>
            </div>
            <Separator />

            {/* Sync & Security */}
            <div>
              <h3 className="text-sm font-medium mb-2">Sync & Security</h3>
              <div className="flex items-center justify-between">
                <span>Sync & Data</span>
                <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
              </div>
            </div>
          </div>

          <SheetFooter className="p-4 border-t flex justify-end">
            <Button
              variant="secondary"
              className="rounded-[8px]"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default SettingDrawer
