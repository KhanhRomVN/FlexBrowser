import React from 'react'
import { WebviewTag } from 'electron'

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
