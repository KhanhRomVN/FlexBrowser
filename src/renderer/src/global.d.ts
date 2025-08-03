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
      app: any
      zoom: any
      tab: any
      page: any
      auth: any
      show: any
      pip: {
        open: (url: string) => Promise<void>
      }
      hide: {
        main: () => Promise<void>
      }
    }
  }
}

export {}

// DnD Kit modules (no bundled types)
declare module '@dnd-kit/core'
declare module '@dnd-kit/sortable'
declare module '@dnd-kit/utilities'
