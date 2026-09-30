import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = (process.env.ONIONMAP_API_PROXY_TARGET || 'http://localhost:3001').replace(/\/$/, '')
const isRemoteApi = apiTarget.startsWith('https://')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
        ...(isRemoteApi ? { headers: { origin: apiTarget } } : {}),
        configure(proxy) {
          if (!isRemoteApi) return

          // The browser connects to local Vite over HTTP. Production cookies remain
          // Secure; only the proxied copy returned to localhost drops that attribute.
          proxy.on('proxyRes', (proxyResponse) => {
            const cookies = proxyResponse.headers['set-cookie']
            if (cookies) {
              proxyResponse.headers['set-cookie'] = cookies.map((cookie) =>
                cookie.replace(/;\s*Secure/gi, ''),
              )
            }
          })
        },
      },
    },
  },
})
