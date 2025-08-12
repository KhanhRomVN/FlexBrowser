import { app } from 'electron'

/**
 * Lazy-load a single persistent electron-store instance.
 */
export const storePromise = import('electron-store').then(({ default: Store }) =>
    new Store({
        cwd: app.getPath('userData'),
        name: 'account_store',
        clearInvalidConfig: true,
        watch: false
    })
)   