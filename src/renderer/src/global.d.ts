import React from 'react'
import { WebviewTag } from 'electron'
declare module '@dnd-kit/modifiers'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<WebviewTag>, WebviewTag> & {
        src?: string
        allowpopups?: boolean | string
        nodeintegration?: boolean | string
        webpreferences?: string
      }
      ERR: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id: number
        type: string
      }
    }
  }

  interface Window {
    api: {
      chatgpt: {
        /** Ask via existing ChatGPT tab */
        askViaTab: (tabId: string, prompt: string, accountId: string) => Promise<{ success: boolean; response: string; error?: string }>
        /** Register a WebView for a tab */
        registerWebview: (tabId: string, webContentsId: number) => void
        /** Unregister a WebView for a tab */
        unregisterWebview: (tabId: string) => void
      }
      storage: {
        getItem(key: string): Promise<string | null>
        setItem(key: string, value: string): Promise<unknown>
        removeItem(key: string): Promise<unknown>
      }
      getPath(name: string): string
      session: any
      ipc: any
      history: any
      app: {
        quit: () => Promise<void>
      }
      zoom: {
        setLevel: (level: number) => Promise<void>
      }
      tab: {
        newTab: () => Promise<void>
      }
      page: {
        print: () => Promise<void>
        save: () => Promise<void>
        find: () => Promise<void>
        translate: () => Promise<void>
      }
      auth: {
        baseUrl: any
        /** Returns idToken and profile (name, picture, email) */
        loginGoogle: (accountId: string) => Promise<{
          idToken: string
          profile: { name: string; picture: string; email?: string }
        }>
        /** Listen for OAuth token from embedded auth window */
        onOauthToken: (callback: (token: string) => void) => void
        logoutGoogle: (accountId: string) => Promise<boolean>
      }
      /** DevTools control exposed by preload */
      devtools: {
        openWebview(): unknown
        /** Open DevTools for the main window */
        open: () => void
      }
      show: {
        main: () => Promise<void>
      }
      hide: {
        main: () => Promise<void>
      }
      pip: {
        open: (url: string, currentTime?: number) => Promise<void>
      }
      getVideoInfoForPip: () => { src: string; currentTime: number } | null
      getCwd: () => string
    }
  }
}

export { }

// DnD Kit modules (no bundled types)
declare module '@dnd-kit/core'
declare module '@dnd-kit/sortable'
declare module '@dnd-kit/utilities'
