<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Bell, Search, Menu } from 'lucide-vue-next'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

interface Props {
  title?: string
  showBack?: boolean
  showSearch?: boolean
  showNotification?: boolean
  showMenu?: boolean
  showTheme?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: false,
  showSearch: false,
  showNotification: false,
  showMenu: false,
  showTheme: false,
})

const route = useRoute()
const router = useRouter()

const headerTitle = computed(() => {
  if (props.title) return props.title
  return (route.meta?.title as string) || ''
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-40 safe-area-top bg-background/80 backdrop-blur-xl border-b border-border/50">
    <div class="flex items-center justify-between h-12 px-3">
      <div class="flex items-center gap-2 min-w-0">
        <button
          v-if="showBack"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="text-base font-semibold truncate">{{ headerTitle }}</h1>
      </div>

      <div class="flex items-center gap-0.5">
        <button
          v-if="showSearch"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
        >
          <Search class="w-5 h-5 text-foreground" />
        </button>
        <button
          v-if="showNotification"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent relative"
        >
          <Bell class="w-5 h-5 text-foreground" />
          <span class="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <ThemeSwitcher v-if="showTheme" />
        <button
          v-if="showMenu"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
        >
          <Menu class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  </header>
</template>
