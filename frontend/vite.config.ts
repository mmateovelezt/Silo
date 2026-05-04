import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  base: './',

  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron-updater', 'electron', 'fs', 'path', 'url', 'dotenv', 'ws',        // 👈 agregar
                'events',    // 👈 agregar
                'stream',    // 👈 agregar
                'http',      // 👈 agregar
                'https',     // 👈 agregar
                'net',       // 👈 agregar
                'tls',       // 👈 agregar 
              ],
              output: {
                format: 'cjs', // 🔥 CLAVE
                entryFileNames: '[name].cjs'
              }
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs'
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true
  }
})
