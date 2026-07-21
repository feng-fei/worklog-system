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
  unreadCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: false,
  showSearch: false,
  showNotification: false,
  showMenu: false,
  showTheme: false,
  unreadCount: 0,
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
  <header class="relative z-40 safe-area-top bg-background/80 backdrop-blur-xl border-b border-border/50 shrink-0">
    <div class="flex items-center justify-between h-12 px-3">
      <div class="flex items-center gap-2 min-w-0">
        <button
          v-if="showBack"
          class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="text-base font-semibold truncate">{{ headerTitle }}</h1>
      </div>

      <div class="flex items-center gap-0.5">
        <button
          v-if="showSearch"
          class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
          @click="router.push('/records')"
        >
          <Search class="w-5 h-5 text-foreground" />
        </button>
        <button
          v-if="showNotification"
          class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent relative"
          @click="router.push('/notifications')"
        >
          <Bell class="w-5 h-5 text-foreground" />
          <span
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>
        <ThemeSwitcher v-if="showTheme" />
        <button
          v-if="showMenu"
          class="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
        >
          <Menu class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  </header>
</template>
