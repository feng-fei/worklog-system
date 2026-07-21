import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'
const themeMode = ref<ThemeMode>('system')

let mediaQuery: MediaQueryList | null = null
let initialized = false

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement
  const isDark = mode === 'dark' || (mode === 'system' && getSystemTheme() === 'dark')
  
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const handleSystemThemeChange = () => {
  if (themeMode.value === 'system') {
    applyTheme('system')
  }
}

export const setTheme = (mode: ThemeMode) => {
  themeMode.value = mode
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
}

export const initTheme = () => {
  if (initialized) return

  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    themeMode.value = saved
  }
  applyTheme(themeMode.value)

  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  }

  initialized = true
}

export const useTheme = () => {
  if (!initialized && typeof window !== 'undefined') {
    initTheme()
  }

  watch(themeMode, (newMode) => {
    applyTheme(newMode)
  })

  return {
    themeMode,
    setTheme,
    initTheme,
  }
}
