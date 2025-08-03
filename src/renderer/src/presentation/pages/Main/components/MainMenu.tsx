import React, { useState } from 'react'
import useAccountStore from '../../../../store/useAccountStore'
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
  // Account sign-in
  const activeAccountId = useAccountStore((state) => state.activeAccountId)
  const accounts = useAccountStore((state) => state.accounts)
  const addTab = useAccountStore((state) => state.addTab)
  const setActiveTab = useAccountStore((state) => state.setActiveTab)
  const setToken = useAccountStore((state) => state.setToken)
  // current signed-in account
  const activeAccount = accounts.find((acc) => acc.id === activeAccountId)
  // display email if OAuth token set, else display account name or Sign In
  const displayLabel = activeAccount?.token
    ? activeAccount.token
    : activeAccount
      ? activeAccount.name
      : 'Sign In'

  const handleSignIn = async () => {
    if (!activeAccountId) return
    try {
      const token = await window.api.auth.loginGoogle(activeAccountId)
      if (typeof token === 'string') {
        setToken(activeAccountId, token)
      }
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      onOpenChange(false)
    }
  }

  const [view, setView] = useState<'main' | 'history'>('main')

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(val) => {
        // keep open when switching to history view
        if (view === 'history' && !val) return
        onOpenChange(val)
      }}
    >
      {/* Invisible trigger, controlled externally */}
      <DropdownMenuTrigger asChild>
        <div />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64 p-1 bg-background">
        {view === 'main' ? (
          <>
            <DropdownMenuLabel className="px-2 py-1 font-semibold">
              Sync and save data
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={!activeAccount ? handleSignIn : undefined}
            >
              {activeAccount ? activeAccount.name : 'Sign In'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

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
              onClick={() => setView('history')}
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
