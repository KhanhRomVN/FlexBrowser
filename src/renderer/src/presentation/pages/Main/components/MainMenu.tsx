import React, { useState } from 'react'
import History from './MainMenu/History'
import Code from './MainMenu/Code'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut
} from '../../../../components/ui/dropdown-menu'
import useAccountStore, { Account } from '../../../../store/useAccountStore'
import { LogOut } from 'lucide-react'

interface MainMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenDownloads?: () => void
  onOpenHistory?: () => void
  onOpenPasswords?: () => void
  onOpenCode?: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({
  open,
  onOpenChange,
  onOpenDownloads,
  onOpenHistory,
  onOpenPasswords,
  onOpenCode
}) => {
  const [view, setView] = useState<'main' | 'history' | 'code'>('main')
  const { activeAccountId, accounts, updateAccount, addTab, setActiveTab } = useAccountStore()
  const activeAccount: Account | null = activeAccountId
    ? (accounts.find((acc) => acc.id === activeAccountId) ?? null)
    : null

  const handleSignIn = () => {
    if (!activeAccountId) return
    window.api.auth
      .loginGoogle(activeAccountId)
      .then(({ idToken, profile }) => {
        updateAccount(activeAccountId, {
          isSignedIn: true,
          idToken,
          name: profile.name,
          picture: profile.picture,
          email: profile.email
        })
        onOpenChange(false)
      })
      .catch((error) => {
        console.error('Login failed:', error)
      })
  }

  const handleLogout = async () => {
    if (!activeAccountId) return
    try {
      await window.api.session.clearGoogle()
      updateAccount(activeAccountId, {
        isSignedIn: false,
        idToken: undefined,
        picture: undefined
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64 p-1 bg-background">
        <DropdownMenuLabel className="px-2 py-1 font-semibold">Account</DropdownMenuLabel>
        {activeAccount && !activeAccount.isSignedIn && (
          <DropdownMenuItem className="px-2 py-1" onClick={handleSignIn}>
            Sign In with Google
          </DropdownMenuItem>
        )}
        {activeAccount?.isSignedIn && (
          <>
            <DropdownMenuItem className="px-2 py-1 flex items-center">
              <img
                src={activeAccount.picture as string}
                alt={activeAccount.name}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span>{activeAccount.name}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="px-2 py-1 flex items-center" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
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
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (activeAccountId) {
                  const newTabId = `${activeAccountId}-${window.crypto.randomUUID()}`
                  addTab(activeAccountId, {
                    id: newTabId,
                    title: 'Code',
                    url: `code://${newTabId}`,
                    icon: '',
                    messages: [],
                    draft: ''
                  })
                  setActiveTab(activeAccountId, newTabId)
                }
                setView('code')
                onOpenCode?.()
                onOpenChange(false)
              }}
            >
              Code
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
            {/* DevTools for debugging */}
            <DropdownMenuItem
              className="px-2 py-1"
              onClick={() => {
                console.log('[Renderer] DevTools menu click')
                window.api.devtools.openWebview()
                onOpenChange(false)
              }}
            >
              DevTools
            </DropdownMenuItem>
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
        ) : view === 'history' ? (
          <>
            <DropdownMenuLabel className="px-2 py-1 font-semibold">History</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <History />
          </>
        ) : (
          <>
            <DropdownMenuLabel className="px-2 py-1 font-semibold">Code</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Code onClose={() => setView('main')} />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
