<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const transitionName = ref('slide-left')
const isKeyboardOpen = ref(false)

let routeDepth = 0
const routeHistory: string[] = []

watch(
  () => route.fullPath,
  (to, from) => {
    if (!from) return

    const toIndex = routeHistory.indexOf(to)
    const fromIndex = routeHistory.indexOf(from)

    if (toIndex > -1 && fromIndex > toIndex) {
      transitionName.value = 'slide-right'
      routeHistory.splice(fromIndex, 1)
    } else {
      transitionName.value = 'slide-left'
      if (toIndex === -1) {
        routeHistory.push(to)
      }
    }

    if (routeHistory.length > 20) {
      routeHistory.shift()
    }
  }
)

const routeMeta = computed(() => route.meta)

const showHeader = computed(() => {
  return routeMeta.value.showHeader !== false
})

const showNav = computed(() => {
  return routeMeta.value.showNav !== false
})

const showSidebar = computed(() => {
  return routeMeta.value.showSidebar !== false
})

const layout = computed(() => {
  return routeMeta.value.layout || 'default'
})

const headerTitle = computed(() => {
  return routeMeta.value.title || ''
})

const isFullLayout = computed(() => layout.value === 'full')
const isEmptyLayout = computed(() => layout.value === 'empty')

const isMobile = () => {
  return window.innerWidth < 768
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const checkKeyboard = () => {
  if (!isMobile()) {
    isKeyboardOpen.value = false
    return
  }

  const vv = window.visualViewport
  if (!vv) return

  const heightDiff = window.innerHeight - vv.height
  isKeyboardOpen.value = heightDiff > 100
}

const handleResize = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(checkKeyboard, 100)
}

onMounted(() => {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    checkKeyboard()
  }
})

onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleResize)
    window.removeEventListener('resize', handleResize)
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="h-screen-safe flex flex-col bg-background">
    <Sidebar v-if="showSidebar && !isEmptyLayout" />

    <div
      class="flex-1 flex flex-col min-h-0"
      :class="{
        'md:pl-20 lg:pl-56': showSidebar && !isEmptyLayout,
      }"
    >
      <AppHeader v-if="!isEmptyLayout" />

      <MobileHeader
        v-if="showHeader && !isEmptyLayout"
        class="md:hidden shrink-0"
        :title="headerTitle"
        :show-notification="route.name === 'dashboard'"
        :show-search="route.name === 'records' || route.name === 'pending'"
        :show-theme="route.name === 'profile'"
      />

      <main
        class="flex-1 min-h-0 overflow-hidden"
        :class="{
          'pb-20 safe-area-bottom md:pb-0': showNav && !isKeyboardOpen && !isEmptyLayout,
        }"
      >
        <RouterView v-slot="{ Component, route: currentRoute }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="currentRoute.fullPath" class="h-full" />
          </transition>
        </RouterView>
      </main>

      <BottomNav v-if="showNav && !isEmptyLayout" :keyboard-open="isKeyboardOpen" class="md:hidden shrink-0" />
    </div>
  </div>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: 100%;
}

@media (min-width: 768px) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    position: static;
    transition: opacity 0.2s ease;
  }

  .slide-left-enter-from,
  .slide-left-leave-to,
  .slide-right-enter-from,
  .slide-right-leave-to {
    opacity: 0;
    transform: none !important;
  }
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
