<script setup lang="ts">
import { ref, provide } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import Topbar from '@/components/layout/Topbar.vue'

const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

provide('toggleSidebar', toggleSidebar)
provide('sidebarCollapsed', sidebarCollapsed)
</script>

<template>
  <div class="flex min-h-screen bg-background overflow-x-hidden">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    <div class="flex flex-1 flex-col transition-all duration-300 min-w-0" :class="sidebarCollapsed ? 'pl-16' : 'pl-60'">
      <Topbar :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="toggleSidebar" />
      <main class="flex-1 overflow-y-auto overflow-x-hidden p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
