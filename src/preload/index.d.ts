import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      pip: {
        open(url: string, currentTime?: number): Promise<unknown>
      }
      moveWindow(x: number, y: number): void
      hide: {
        main(): Promise<unknown>
      }
      show: {
        main(): Promise<unknown>
      }
      getCwd(): string
    }
  }
}
