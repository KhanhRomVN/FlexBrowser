import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const reactPlugin = require('@vitejs/plugin-react')

export default defineConfig({
  main: {
    // Exclude node-fetch from the bundle so we use the built-in global fetch
    plugins: [externalizeDepsPlugin({ include: ['node-fetch'] })],
    build: {
      target: 'node16',
      watch: {}
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      target: 'node16',
      watch: {}
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [reactPlugin()],
    server: {
      hmr: true,
      watch: {
        usePolling: true
      }
    }
  }
})
