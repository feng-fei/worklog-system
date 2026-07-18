<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import SidebarDrawer from '@/components/layout/SidebarDrawer.vue'

const route = useRoute()
const hideBottomNav = computed(() => route.meta.hideBottomNav === true)

const showSidebar = ref(false)

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

provide('toggleSidebar', toggleSidebar)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <main
      class="flex-1 overflow-y-auto pb-safe"
      :class="{ 'pb-20': !hideBottomNav, 'pb-0': hideBottomNav }"
    >
      <RouterView />
    </main>
    <BottomNav v-if="!hideBottomNav" />
    <SidebarDrawer v-model="showSidebar" />
  </div>
</template>
