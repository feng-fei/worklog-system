<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import BottomNav from '@/components/layout/BottomNav.vue'

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
  <div class="min-h-screen-safe bg-background flex flex-col">
    <MobileHeader
      v-if="showHeader"
      :title="headerTitle"
      :show-notification="route.name === 'dashboard'"
      :show-search="route.name === 'records' || route.name === 'pending'"
      :show-theme="route.name === 'profile'"
    />

    <main
      class="flex-1 overflow-y-auto overflow-x-hidden"
      :class="{
        'pt-12 safe-area-top': showHeader,
        'pb-20 safe-area-bottom': showNav,
      }"
    >
      <RouterView v-slot="{ Component, route: currentRoute }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="currentRoute.fullPath" />
        </transition>
      </RouterView>
    </main>

    <BottomNav v-if="showNav" />
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
