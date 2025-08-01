import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Tab {
  id: string
  title: string
  url: string
  icon: string
}

export interface Account {
  id: string
  name: string
  avatarUrl: string
  token: string
  tabs: Tab[]
  activeTabId: string | null
  guest: boolean
  lastUsed: string
}

interface AccountState {
  accounts: Account[]
  activeAccountId: string | null
  addAccount: (
    account: Omit<Account, 'tabs' | 'activeTabId' | 'guest' | 'lastUsed'> & {
      guest?: boolean
      lastUsed?: string
    }
  ) => void
  setActiveAccount: (id: string) => void
  addTab: (accountId: string, tab: Tab) => void
  setActiveTab: (accountId: string, tabId: string) => void
  deleteAccount: (id: string) => void
  deleteTab: (accountId: string, tabId: string) => void
  reorderTabs: (accountId: string, newTabs: Tab[]) => void
  updateTab: (accountId: string, tabId: string, updates: Partial<Tab>) => void
  renameAccount: (id: string, name: string) => void
}

const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      activeAccountId: null,
      addAccount: (account) =>
        set((state) => {
          const newAccount: Account = {
            ...account,
            tabs: [],
            activeTabId: null,
            guest: account.guest ?? false,
            lastUsed: account.lastUsed ?? new Date().toISOString()
          }
          return {
            accounts: [...state.accounts, newAccount],
            activeAccountId: newAccount.id
          }
        }),
      setActiveAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, lastUsed: new Date().toISOString() } : acc
          ),
          activeAccountId: id
        })),
      addTab: (accountId, tab) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === accountId ? { ...acc, tabs: [...acc.tabs, tab] } : acc
          )
        })),
      setActiveTab: (accountId, tabId) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === accountId ? { ...acc, activeTabId: tabId } : acc
          )
        })),
      deleteAccount: (id) =>
        set((state) => {
          const accounts = state.accounts.filter((acc) => acc.id !== id)
          const activeAccountId = state.activeAccountId === id ? null : state.activeAccountId
          return { accounts, activeAccountId }
        }),
      deleteTab: (accountId, tabId) =>
        set((state) => ({
          accounts: state.accounts.map((acc) => {
            if (acc.id !== accountId) return acc
            const newTabs = acc.tabs.filter((tab) => tab.id !== tabId)
            let newActiveTabId = acc.activeTabId
            if (acc.activeTabId === tabId && newTabs.length > 0) {
              newActiveTabId = newTabs[newTabs.length - 1].id
            } else if (newTabs.length === 0) {
              newActiveTabId = null
            }
            return { ...acc, tabs: newTabs, activeTabId: newActiveTabId }
          })
        })),
      reorderTabs: (accountId: string, newTabs: Tab[]) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === accountId ? { ...acc, tabs: newTabs } : acc
          )
        })),
      updateTab: (accountId, tabId, updates) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === accountId
              ? {
                  ...acc,
                  tabs: acc.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
                }
              : acc
          )
        })),
      renameAccount: (id, name) =>
        set((state) => ({
          accounts: state.accounts.map((acc) => (acc.id === id ? { ...acc, name } : acc))
        }))
    }),
    {
      name: 'account_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts.filter((acc) => !acc.guest),
        activeAccountId: state.activeAccountId
      })
    }
  )
)

export default useAccountStore
