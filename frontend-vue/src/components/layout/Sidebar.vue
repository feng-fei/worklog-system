<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  Users,
  Package,
  FolderKanban,
  UserCircle,
  BarChart3,
  User,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const menuItems = [
  { path: '/dashboard', name: '工作台', icon: LayoutDashboard },
  { path: '/records', name: '工单', icon: ClipboardList },
  { path: '/pending', name: '待办', icon: Bell },
  { path: '/customers', name: '客户', icon: Users },
  { path: '/materials', name: '物料', icon: Package },
  { path: '/projects', name: '项目', icon: FolderKanban },
  { path: '/staffs', name: '团队', icon: UserCircle },
  { path: '/statistics', name: '统计', icon: BarChart3 },
  { path: '/profile', name: '我的', icon: User },
]

const isActive = (path: string) => {
  return route.path.startsWith(path)
}

const userInitial = computed(() => {
  if (!userStore.user?.staff_name) return 'U'
  return userStore.user.staff_name.charAt(0).toUpperCase()
})

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <aside
    class="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-60 md:border-r md:border-sidebar-border md:bg-sidebar"
  >
    <div class="flex items-center h-14 px-4 border-b border-sidebar-border">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <LayoutDashboard class="w-5 h-5" />
        </div>
        <span class="font-semibold text-sidebar-foreground">工单管理</span>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
      <button
        v-for="item in menuItems"
        :key="item.path"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="
          isActive(item.path)
            ? 'bg-primary text-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        "
        @click="navigateTo(item.path)"
      >
        <component :is="item.icon" class="w-5 h-5 shrink-0" />
        <span>{{ item.name }}</span>
      </button>
    </nav>

    <div class="p-3 border-t border-sidebar-border">
      <div
        class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors"
        @click="navigateTo('/profile')"
      >
        <Avatar class="w-9 h-9">
          <AvatarFallback>{{ userInitial }}</AvatarFallback>
        </Avatar>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-sidebar-foreground truncate">
            {{ userStore.user?.staff_name || '用户' }}
          </p>
          <p class="text-xs text-sidebar-foreground/60 truncate">
            {{ userStore.user?.username || '' }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
