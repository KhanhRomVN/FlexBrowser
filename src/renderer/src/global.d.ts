import React from 'react'
import { WebviewTag } from 'electron'
declare module '@dnd-kit/modifiers'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<WebviewTag>, WebviewTag> & {
        src?: string
        allowpopups?: boolean
      }
      ERR: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id: number
        type: string
      }
    }
  }

  interface Window {
    api: {
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
        loginGoogle: (accountId: string) => Promise<string>
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

export {}

// DnD Kit modules (no bundled types)
declare module '@dnd-kit/core'
declare module '@dnd-kit/sortable'
declare module '@dnd-kit/utilities'
