<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { initTheme } from '@/composables/useTheme'
import Toaster from '@/components/ui/toast/Toaster.vue'

const userStore = useUserStore()

onMounted(() => {
  initTheme()
  userStore.initFromStorage()
})
</script>

<template>
  <RouterView />
  <Toaster />
</template>
