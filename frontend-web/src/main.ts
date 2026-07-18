import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'
import { useTheme } from './composables/useTheme'

const { initTheme } = useTheme()
initTheme()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA: 新版本可用，刷新以更新')
  },
  onOfflineReady() {
    console.log('PWA: 应用已准备好离线使用')
  },
  onRegistered(r) {
    console.log('PWA: Service Worker 已注册', r)
  },
  onRegisterError(error) {
    console.error('PWA: 注册失败', error)
  },
})
