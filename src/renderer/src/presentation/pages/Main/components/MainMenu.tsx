import React, { useState } from 'react'
import History from './MainMenu/History'
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
  const [view, setView] = useState<'main' | 'history'>('main')

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(val) => {
        if (view === 'history' && !val) return
        onOpenChange(val)
      }}
    >
      <DropdownMenuTrigger asChild>
        <div />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64 p-1 bg-background">
        {view === 'main' ? (
          <>
            <DropdownMenuLabel className="px-2 py-1 font-semibold">Tab và cửa sổ</DropdownMenuLabel>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.tab.newTab()
                onOpenChange(false)
              }}
            >
              New tab
              <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="px-2 py-1 font-semibold">
              Truy cập nhanh
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="px-2 py-1"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setView('history')
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
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="px-2 py-1 font-semibold">
              Trang và nội dung
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.page.print()
                onOpenChange(false)
              }}
            >
              Print…
              <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.page.save()
                onOpenChange(false)
              }}
            >
              Save page as…
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.page.find()
                onOpenChange(false)
              }}
            >
              Find in page…
              <DropdownMenuShortcut>Ctrl+F</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.page.translate()
                onOpenChange(false)
              }}
            >
              Translate page…
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
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                window.api.app.quit()
              }}
            >
              Quit
              <DropdownMenuShortcut>Ctrl+Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="px-2 py-1 font-semibold">History</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <History />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
