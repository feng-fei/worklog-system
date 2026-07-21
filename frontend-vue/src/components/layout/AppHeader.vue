<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bell,
  Search,
  Plus,
  ChevronDown,
  User,
  Settings,
  LogOut,
  ClipboardList,
  CheckSquare,
  Users,
  FolderKanban,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const showHeader = computed(() => {
  return route.meta?.showHeader !== false
})

const pageTitle = computed(() => {
  return (route.meta?.title as string) || ''
})

const userInitial = computed(() => {
  if (!userStore.user?.staff_name) return 'U'
  return userStore.user.staff_name.charAt(0).toUpperCase()
})

const searchQuery = ref('')
const showNewMenu = ref(false)
const showUserMenu = ref(false)
const newMenuRef = ref<HTMLElement | null>(null)
const userMenuRef = ref<HTMLElement | null>(null)

const newMenuItems = [
  { path: '/create', name: '新建工单', icon: ClipboardList },
  { path: '/pending-create', name: '新建待办', icon: CheckSquare },
  { path: '/customer-create', name: '新建客户', icon: Users },
  { path: '/create-project', name: '新建项目', icon: FolderKanban },
]

const handleSearch = () => {
  router.push('/records')
}

const goToNotifications = () => {
  router.push('/notifications')
}

const goToProfile = () => {
  showUserMenu.value = false
  router.push('/profile')
}

const goToSettings = () => {
  showUserMenu.value = false
  router.push('/profile')
}

const handleLogout = () => {
  showUserMenu.value = false
  userStore.logout()
  router.push('/login')
}

const navigateToNew = (path: string) => {
  showNewMenu.value = false
  router.push(path)
}

const handleClickOutside = (event: MouseEvent) => {
  if (newMenuRef.value && !newMenuRef.value.contains(event.target as Node)) {
    showNewMenu.value = false
  }
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header
    class="hidden lg:flex lg:items-center lg:justify-between lg:h-14 lg:px-6 lg:border-b lg:border-border lg:bg-background/80 lg:backdrop-blur-xl lg:sticky lg:top-0 lg:z-30 relative shrink-0"
  >
    <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-60" />
    
    <div class="flex items-center gap-2">
      <h1 v-if="showHeader" class="text-lg font-semibold">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-2">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="搜索工单、客户、项目..."
          class="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
          @keyup.enter="handleSearch"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        class="relative hover:text-primary transition-colors"
        @click="goToNotifications"
      >
        <Bell class="w-5 h-5" />
        <span class="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
      </Button>

      <div ref="newMenuRef" class="relative">
        <Button
          class="gap-1.5 h-9"
          @click.stop="showNewMenu = !showNewMenu"
        >
          <Plus class="w-4 h-4" />
          <span class="text-sm font-medium">新建</span>
          <ChevronDown class="w-4 h-4" :class="{ 'rotate-180': showNewMenu }" />
        </Button>

        <div
          v-if="showNewMenu"
          class="absolute right-0 top-full mt-1.5 w-48 py-1.5 bg-popover border border-border rounded-lg shadow-lg shadow-black/5 z-50 origin-top-right animate-in fade-in-0 zoom-in-95"
        >
          <button
            v-for="item in newMenuItems"
            :key="item.path"
            class="flex items-center gap-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            @click="navigateToNew(item.path)"
          >
            <component :is="item.icon" class="w-4 h-4 text-muted-foreground" />
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>

      <ThemeSwitcher />

      <div ref="userMenuRef" class="relative">
        <Button
          variant="ghost"
          class="gap-2 pl-2 pr-3 hover:bg-muted/60 transition-all duration-200"
          @click.stop="showUserMenu = !showUserMenu"
        >
          <Avatar class="w-7 h-7 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <AvatarFallback class="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">{{ userInitial }}</AvatarFallback>
          </Avatar>
          <span class="text-sm font-medium">
            {{ userStore.user?.staff_name || '用户' }}
          </span>
          <ChevronDown class="w-4 h-4 text-muted-foreground" :class="{ 'rotate-180': showUserMenu }" />
        </Button>

        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-1.5 w-48 py-1.5 bg-popover border border-border rounded-lg shadow-lg shadow-black/5 z-50 origin-top-right animate-in fade-in-0 zoom-in-95"
        >
          <div class="px-3 py-2 border-b border-border">
            <p class="text-sm font-medium text-popover-foreground">
              {{ userStore.user?.staff_name || '用户' }}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              {{ userStore.user?.username || '' }}
            </p>
          </div>
          <button
            class="flex items-center gap-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            @click="goToProfile"
          >
            <User class="w-4 h-4 text-muted-foreground" />
            <span>我的</span>
          </button>
          <button
            class="flex items-center gap-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            @click="goToSettings"
          >
            <Settings class="w-4 h-4 text-muted-foreground" />
            <span>设置</span>
          </button>
          <div class="my-1 border-t border-border" />
          <button
            class="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
