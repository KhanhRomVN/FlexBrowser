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
}

interface AccountState {
  accounts: Account[]
  activeAccountId: string | null
  addAccount: (
    account: Omit<Account, 'tabs' | 'activeTabId' | 'guest'> & { guest?: boolean }
  ) => void
  setActiveAccount: (id: string) => void
  addTab: (accountId: string, tab: Tab) => void
  setActiveTab: (accountId: string, tabId: string) => void
  deleteAccount: (id: string) => void
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
            guest: account.guest ?? false
          }
          return {
            accounts: [...state.accounts, newAccount],
            activeAccountId: newAccount.id
          }
        }),
      setActiveAccount: (id) => set({ activeAccountId: id }),
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
      deleteAccount: (id: string) =>
        set((state) => {
          const accounts = state.accounts.filter((acc) => acc.id !== id)
          const activeAccountId = state.activeAccountId === id ? null : state.activeAccountId
          return { accounts, activeAccountId }
        }),
      renameAccount: (id: string, name: string) =>
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
