<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

const route = useRoute()
const transitionName = ref('slide-left')

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

const showHeader = computed(() => {
  return route.meta?.showHeader !== false
})

const showNav = computed(() => {
  return route.meta?.showNav !== false
})

const headerTitle = computed(() => {
  return (route.meta?.title as string) || ''
})
</script>

<template>
  <div class="h-screen-safe flex flex-col bg-background">
    <Sidebar />

    <div class="flex-1 md:pl-16 flex flex-col min-h-0">
      <AppHeader />

      <MobileHeader
        v-if="showHeader"
        class="md:hidden shrink-0"
        :title="headerTitle"
        :show-notification="route.name === 'dashboard'"
        :show-search="route.name === 'records' || route.name === 'pending'"
        :show-theme="route.name === 'profile'"
      />

      <main
        class="flex-1 min-h-0 overflow-hidden"
        :class="{
          'pb-20 safe-area-bottom md:pb-0': showNav,
        }"
      >
        <RouterView v-slot="{ Component, route: currentRoute }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="currentRoute.fullPath" class="h-full" />
          </transition>
        </RouterView>
      </main>

      <BottomNav v-if="showNav" class="md:hidden shrink-0" />
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
