<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const pageTitle = computed(() => {
  return (route.meta?.title as string) || ''
})

const userInitial = computed(() => {
  if (!userStore.user?.staff_name) return 'U'
  return userStore.user.staff_name.charAt(0).toUpperCase()
})

const goToNotifications = () => {
  router.push('/notifications')
}

const goToProfile = () => {
  router.push('/profile')
}
</script>

<template>
  <header
    class="hidden md:flex md:items-center md:justify-between md:h-14 md:px-6 md:border-b md:border-border md:bg-background/80 md:backdrop-blur-xl md:sticky md:top-0 md:z-30 relative"
  >
    <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-60" />
    
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-semibold">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        class="relative hover:text-primary transition-colors"
        @click="goToNotifications"
      >
        <Bell class="w-5 h-5" />
        <span class="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
      </Button>

      <ThemeSwitcher />

      <Button
        variant="ghost"
        class="gap-2 pl-2 pr-3 hover:bg-muted/60 transition-all duration-200"
        @click="goToProfile"
      >
        <Avatar class="w-7 h-7 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          <AvatarFallback class="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">{{ userInitial }}</AvatarFallback>
        </Avatar>
        <span class="text-sm font-medium hidden lg:inline">
          {{ userStore.user?.staff_name || '用户' }}
        </span>
      </Button>
    </div>
  </header>
</template>
