<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { initTheme } from '@/composables/useTheme'
import Toaster from '@/components/ui/toast/Toaster.vue'

const userStore = useUserStore()

onMounted(() => {
  initTheme()
  userStore.initAuth()
})
</script>

<template>
  <div v-if="userStore.isInitializing" class="min-h-screen flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-muted-foreground">加载中...</p>
    </div>
  </div>
  <RouterView v-else />
  <Toaster />
</template>
