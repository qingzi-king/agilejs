/*
 * @Description: vite配置
 * @Author: qingzi.wang
 * @Date: 2024-02-04 10:53:22
 * @LastEditTime: 2025-04-25 18:27:39
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5187,
    proxy: {
      // 跨域处理
      // '/v1': {
      //   target: 'http://172.16.103.40:8001',
      //   changeOrigin: true
      // }
    }
  },
  build: {
    minify: process.env.NODE_ENV === 'development' ? false : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          lodash: ['lodash']
        }
      }
    }
  },
  resolve: {
    // 配置路径别名
    alias: {
      '@': join(__dirname, 'src')
    }
  }
})
