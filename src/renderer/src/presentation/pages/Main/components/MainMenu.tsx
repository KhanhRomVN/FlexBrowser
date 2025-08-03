import React from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut
} from '../../../../components/ui/dropdown-menu'

interface MainMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenDownloads?: () => void
  onOpenHistory?: () => void
  onOpenPasswords?: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({
  open,
  onOpenChange,
  onOpenDownloads,
  onOpenHistory,
  onOpenPasswords
}) => {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {/* Invisible trigger, controlled externally */}
      <DropdownMenuTrigger asChild>
        <div />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64 p-1 bg-background">
        <DropdownMenuLabel className="px-2 py-1 font-semibold">
          Sync and save data
        </DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">Sign In</DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">Tab và cửa sổ</DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">
          New tab
          <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">
          New window
          <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">
          New private window
          <DropdownMenuShortcut>Ctrl+Shift+P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">Truy cập nhanh</DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">Bookmarks</DropdownMenuItem>
        <DropdownMenuItem
          className="px-2 py-1"
          onClick={() => {
            onOpenChange(false)
            onOpenHistory?.()
          }}
        >
          History
        </DropdownMenuItem>
        <DropdownMenuItem
          className="px-2 py-1"
          onClick={() => {
            onOpenChange(false)
            onOpenDownloads?.()
          }}
        >
          Downloads
          <DropdownMenuShortcut>Ctrl+Shift+Y</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="px-2 py-1"
          onClick={() => {
            onOpenChange(false)
            onOpenPasswords?.()
          }}
        >
          Passwords
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">
          Extensions and themes
          <DropdownMenuShortcut>Ctrl+Shift+A</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">Trang và nội dung</DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">
          Print…
          <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">
          Save page as…
          <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">
          Find in page…
          <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">Translate page…</DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">Zoom</DropdownMenuLabel>
        <div className="flex items-center justify-between px-2 py-1">
          <span>Zoom out (−)</span>
          <button className="text-sm">−</button>
        </div>
        <div className="flex items-center justify-between px-2 py-1">
          <span>Current zoom (100%)</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1">
          <span>Zoom in (+)</span>
          <button className="text-sm">+</button>
        </div>
        <DropdownMenuItem className="px-2 py-1">
          Full screen
          <DropdownMenuShortcut>⤢</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">
          Cài đặt và công cụ
        </DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">Settings</DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">More tools</DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">
          Trợ giúp và báo lỗi
        </DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">Report broken site</DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-1">Help</DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-1 font-semibold">Thoát</DropdownMenuLabel>
        <DropdownMenuItem className="px-2 py-1">
          Quit
          <DropdownMenuShortcut>Ctrl+Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
