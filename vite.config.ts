import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 代码运行请求转发到本地判题服务
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 30000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('content-bundle')) return 'content'
          if (id.includes('node_modules')) {
            if (id.includes('codemirror') || id.includes('@lezer')) return 'editor'
            if (id.includes('echarts')) return 'charts'
            if (id.includes('markdown-it') || id.includes('highlight.js')) return 'markdown'
            return 'vendor'
          }
        }
      }
    }
  }
})
