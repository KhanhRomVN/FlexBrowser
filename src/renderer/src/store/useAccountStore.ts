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
  email?: string
  tabs: Tab[]
  activeTabId: string | null
  guest: boolean
  lastUsed: string
  isSignedIn?: boolean
  idToken?: string
  picture?: string
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
  setActiveAccount: (id: string | null) => void
  deleteAccount: (id: string) => void
  addTab: (accountId: string, tab: Tab) => void
  setActiveTab: (accountId: string, tabId: string) => void
  deleteTab: (accountId: string, tabId: string) => void
  reorderTabs: (accountId: string, newTabs: Tab[]) => void
  updateTab: (accountId: string, tabId: string, updates: Partial<Tab>) => void
  updateAccount: (id: string, updates: Partial<Account>) => void
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

      setActiveAccount: (id: string | null) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, lastUsed: new Date().toISOString() } : acc
          ),
          activeAccountId: id
        })),

      deleteAccount: (id) =>
        set((state) => {
          const accounts = state.accounts.filter((acc) => acc.id !== id)
          const activeAccountId = state.activeAccountId === id ? null : state.activeAccountId
          return { accounts, activeAccountId }
        }),

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

      deleteTab: (accountId, tabId) =>
        set((state) => ({
          accounts: state.accounts.map((acc) => {
            if (acc.id !== accountId) return acc
            const newTabs = acc.tabs.filter((t) => t.id !== tabId)
            let newActiveTabId = acc.activeTabId
            if (acc.activeTabId === tabId && newTabs.length > 0) {
              newActiveTabId = newTabs[newTabs.length - 1].id
            } else if (newTabs.length === 0) {
              newActiveTabId = null
            }
            return { ...acc, tabs: newTabs, activeTabId: newActiveTabId }
          })
        })),

      reorderTabs: (accountId, newTabs) =>
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
                  tabs: acc.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t))
                }
              : acc
          )
        })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
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
