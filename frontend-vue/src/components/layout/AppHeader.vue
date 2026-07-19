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
    class="hidden md:flex md:items-center md:justify-between md:h-14 md:px-6 md:border-b md:border-border md:bg-background/80 md:backdrop-blur-xl md:sticky md:top-0 md:z-30"
  >
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-semibold">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        class="relative"
        @click="goToNotifications"
      >
        <Bell class="w-5 h-5" />
        <span class="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
      </Button>

      <ThemeSwitcher />

      <Button
        variant="ghost"
        class="gap-2 pl-2 pr-3"
        @click="goToProfile"
      >
        <Avatar class="w-7 h-7">
          <AvatarFallback class="text-xs">{{ userInitial }}</AvatarFallback>
        </Avatar>
        <span class="text-sm font-medium hidden lg:inline">
          {{ userStore.user?.staff_name || '用户' }}
        </span>
      </Button>
    </div>
  </header>
</template>
