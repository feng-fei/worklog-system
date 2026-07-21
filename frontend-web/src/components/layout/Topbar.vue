<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Bell, PanelLeft, User, Settings, LogOut, ChevronRight } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { systemApi } from '@/api'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'

interface Props {
  sidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sidebarCollapsed: false,
})

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const userStore = useUserStore()
const router = useRouter()
const userMenuOpen = ref(false)
const searchOpen = ref(false)
const unreadCount = ref(0)

const pageTitle = computed(() => {
  return route.meta.title || '页面'
})

const menuGroupMap: Record<string, { label: string; path?: string } | null> = {
  '/records': { label: '工单中心' },
  '/pending': { label: '工单中心' },
  '/projects': { label: '工单中心' },
  '/templates': { label: '工单中心' },
  '/customers': { label: '客户管理' },
  '/customer-equipments': { label: '客户管理' },
  '/maintenance-plans': { label: '客户管理' },
  '/materials': { label: '物料管理' },
  '/staffs': null,
  '/finance': { label: '财务中心' },
  '/settings': { label: '系统管理' },
  '/calendar': null,
  '/reports': null,
  '/profile': null,
}

const breadcrumbs = computed(() => {
  const title = route.meta.title as string
  if (!title) return []
  
  const paths: { label: string; path?: string }[] = []
  
  if (route.path !== '/dashboard') {
    paths.push({ label: '工作台', path: '/dashboard' })
  }
  
  const pathSegments = route.path.split('/').filter(Boolean)
  let currentPath = ''
  let groupLabel: { label: string; path?: string } | undefined
  
  for (const segment of pathSegments) {
    currentPath += '/' + segment
    if (menuGroupMap[currentPath]) {
      groupLabel = menuGroupMap[currentPath]
      break
    }
  }
  
  if (groupLabel && groupLabel.label) {
    paths.push({ label: groupLabel.label, path: groupLabel.path })
  }
  
  paths.push({ label: title })
  return paths
})

const loadUnreadCount = async () => {
  try {
    const res = await systemApi.unreadCount()
    unreadCount.value = res.data?.count || 0
  } catch (e) {
    console.error('获取未读消息数失败', e)
  }
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}

const goToNotifications = () => {
  router.push('/pending')
}

const closeMenus = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#user-menu-container')) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  loadUnreadCount()
  document.addEventListener('click', closeMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenus)
})
</script>

<template>
  <header class="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-lg">
    <div class="flex h-full items-center justify-between px-6">
      <div class="flex items-center gap-4 min-w-0">
        <button
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          @click="emit('toggle-sidebar')"
        >
          <PanelLeft class="h-5 w-5" />
        </button>

        <div class="flex items-center gap-2 text-sm text-muted-foreground min-w-0 overflow-hidden">
          <template v-for="(crumb, index) in breadcrumbs" :key="index">
            <ChevronRight v-if="index > 0" class="h-4 w-4 flex-shrink-0" />
            <span
              v-if="crumb.path"
              class="hover:text-foreground cursor-pointer transition-colors truncate"
              @click="router.push(crumb.path)"
            >
              {{ crumb.label }}
            </span>
            <span
              v-else
              :class="index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''"
              class="truncate"
            >
              {{ crumb.label }}
            </span>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          title="搜索"
        >
          <Search class="h-5 w-5" />
        </button>

        <ThemeSwitcher />

        <button
          class="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          title="消息通知"
          @click="goToNotifications"
        >
          <Bell class="h-5 w-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <div id="user-menu-container" class="relative ml-2">
          <button
            class="flex items-center gap-3 border-l border-border pl-4"
            @click="toggleUserMenu"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {{ userStore.user?.staff_name?.charAt(0).toUpperCase() || userStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <div class="hidden flex-col md:flex text-left">
              <span class="text-sm font-medium text-foreground">
                {{ userStore.user?.staff_name || userStore.user?.username || '用户' }}
              </span>
              <span class="text-xs text-muted-foreground">
                {{ userStore.user?.role === 'admin' ? '管理员' : '员工' }}
              </span>
            </div>
          </button>

          <div
            v-if="userMenuOpen"
            class="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md z-50"
          >
            <div class="px-3 py-2 border-b border-border">
              <p class="text-sm font-medium">
                {{ userStore.user?.staff_name || userStore.user?.username || '用户' }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{ userStore.user?.role === 'admin' ? '管理员' : '员工' }}
              </p>
            </div>
            <div class="p-1">
              <button
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                @click="router.push('/profile'); userMenuOpen = false"
              >
                <User class="h-4 w-4" />
                <span>个人中心</span>
              </button>
              <button
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                @click="router.push('/settings'); userMenuOpen = false"
              >
                <Settings class="h-4 w-4" />
                <span>系统设置</span>
              </button>
              <div class="my-1 h-px bg-border"></div>
              <button
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                @click="handleLogout"
              >
                <LogOut class="h-4 w-4" />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
