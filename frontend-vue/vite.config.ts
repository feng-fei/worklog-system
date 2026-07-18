import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { viteMockServe } from 'vite-plugin-mock'
import { resolve } from 'node:path'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  return {
    base: isDev ? '/' : '/m/',
    plugins: [
      vue(),
      viteMockServe({
        mockPath: 'mock',
        enable: isDev,
        logger: true,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: '工单管理系统',
          short_name: '工单',
          description: '瑞易智能工单调度、报修待办、工资与统计管理系统',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait',
          start_url: isDev ? '/?source=pwa' : '/m/?source=pwa',
          scope: isDev ? '/' : '/m/',
          lang: 'zh-CN',
          categories: ['business', 'productivity', 'utilities'],
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
    },
  }
})
