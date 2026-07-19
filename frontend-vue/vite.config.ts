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
        includeAssets: ['favicon.svg'],
        manifest: {
          name: '工单管理系统',
          short_name: '工单',
          description: '瑞易智能工单调度、报修待办、工资与统计管理系统',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait',
          start_url: isDev ? '/?source=pwa' : '/m/?source=pwa',
          scope: isDev ? '/' : '/m/',
          lang: 'zh-CN',
          dir: 'ltr',
          categories: ['business', 'productivity', 'utilities'],
          prefer_related_applications: false,
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,json}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https?:\/\/.*\/uploads\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'upload-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
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
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
