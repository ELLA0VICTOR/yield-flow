import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function withApiKey(proxy, apiKey) {
  if (!apiKey) {
    return
  }

  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.setHeader('x-lifi-api-key', apiKey)
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.LIFI_API_KEY

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/earn': {
          target: 'https://earn.li.fi',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/earn/, ''),
          configure: (proxy) => withApiKey(proxy, apiKey),
        },
        '/api/quest': {
          target: 'https://li.quest',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/quest/, ''),
          configure: (proxy) => withApiKey(proxy, apiKey),
        },
      },
    },
  }
})
