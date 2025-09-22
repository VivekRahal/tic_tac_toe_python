import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // Allow Cloudflare Tunnel (or other reverse proxy) hostnames
    allowedHosts: [
      'zinc-transform-judge-remaining.trycloudflare.com',
      '.trycloudflare.com',
    ],
    host: true, // listen on all addresses (useful for tunnels)
  },
})
