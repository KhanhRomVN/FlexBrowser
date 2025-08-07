import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      app: {
        quit(): Promise<unknown>
      }
      zoom: {
        setLevel(level: number): Promise<unknown>
      }
      tab: {
        newTab(): Promise<unknown>
      }
      page: {
        print(): Promise<unknown>
        save(): Promise<unknown>
        find(): Promise<unknown>
        translate(): Promise<unknown>
      }
      pip: {
        open(url: string, currentTime?: number): Promise<unknown>
      }
      getVideoInfoForPip(): { src: string; currentTime: number } | null
      auth: {
        /** Initiate Google sign-in for accountId, returns OAuth token and profile */
        loginGoogle(accountId: string): Promise<{
          idToken: string
          profile: { name: string; email?: string; picture?: string }
        }>
        /** Listen for OAuth token (and optional accountId) from main process */
        onOauthToken(callback: (token: string, accountId?: string) => void): void
        /** Logout Google session for accountId */
        logoutGoogle(accountId: string): Promise<unknown>
        /** Base URL for embedded OAuth */
        baseUrl: string
      }
      session: {
        /** Sync Google session cookie */
        syncGoogle(idToken: string): Promise<unknown>
        /** Clear Google session cookie */
        clearGoogle(): Promise<unknown>
      }
      moveWindow(x: number, y: number): void
      hide: {
        main(): Promise<unknown>
      }
      show: {
        main(): Promise<unknown>
      }
      /** DevTools controls */
      devtools: {
        /** Open DevTools for the main window */
        open(): void
        /** Open DevTools for the active WebView */
        openWebview(): void
      }
      storage: {
        getItem(key: string): Promise<string | null>
        setItem(key: string, value: string): Promise<unknown>
        removeItem(key: string): Promise<unknown>
      }
      chatgpt: {
        /** Ask ChatGPT with optional idToken for session sync */
        ask(prompt: string, idToken?: string): Promise<{ success: boolean; response: string; error?: string }>
        syncSession(): Promise<{ success: boolean }>
      }
      getPath(name: string): string
      shell: {
        /** Open URL in external system browser */
        openExternal(url: string): Promise<unknown>
      }
      getCwd(): string
    }
  }
}

export { }
