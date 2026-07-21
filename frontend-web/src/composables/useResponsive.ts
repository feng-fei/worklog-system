import { ref, onMounted, onBeforeUnmount } from 'vue'

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

export function useResponsive() {
  const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  let resizeTimer: number | null = null

  const updateScreenWidth = () => {
    screenWidth.value = window.innerWidth
    isMobile.value = screenWidth.value < BREAKPOINTS.md
    isTablet.value = screenWidth.value >= BREAKPOINTS.md && screenWidth.value < BREAKPOINTS.lg
    isDesktop.value = screenWidth.value >= BREAKPOINTS.lg
  }

  const handleResize = () => {
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = window.setTimeout(() => {
      updateScreenWidth()
    }, 100)
  }

  onMounted(() => {
    updateScreenWidth()
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer)
    }
  })

  return {
    screenWidth,
    isMobile,
    isTablet,
    isDesktop,
  }
}
