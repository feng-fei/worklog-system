<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  User,
  Settings,
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
  Wallet,
  FileText,
  Users,
  Building2,
  Package,
  Moon,
  Sun,
  Monitor,
  Info,
  Shield,
  Palette,
} from 'lucide-vue-next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import { toast } from '@/components/ui/toast/useToast'
import { statisticsApi } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const { themeMode, setTheme } = useTheme()

const stats = ref({
  month_records: 0,
  month_output: 0,
  completion_rate: 0,
})

const useMock = import.meta.env.DEV

const displayName = computed(() => {
  return userStore.user?.staff_name || userStore.user?.username || '管理员'
})

const roleLabel = computed(() => {
  return userStore.isAdmin ? '超级管理员' : '普通员工'
})

const avatarFallback = computed(() => {
  return displayName.value.charAt(0)
})

const menuGroups = ref([
  {
    title: '常用功能',
    items: [
      { label: '我的工单', icon: FileText, badge: '12', route: '/records' },
      { label: '客户管理', icon: Building2, badge: undefined, route: '/customers' },
      { label: '物料管理', icon: Package, badge: undefined, route: '/materials' },
      { label: '团队成员', icon: Users, badge: undefined, route: '/staff' },
    ],
  },
  {
    title: '设置',
    items: [
      { label: '消息通知', icon: Bell, badge: '3', route: '/notifications' },
      { label: '账号安全', icon: Shield, badge: undefined, route: '/settings/security' },
      { label: '外观设置', icon: Palette, badge: undefined, action: 'theme' },
      { label: '关于我们', icon: Info, badge: undefined, route: '/about' },
      { label: '帮助与反馈', icon: HelpCircle, badge: undefined, route: '/help' },
    ],
  },
])

const themeOptions = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const currentTheme = computed(() => themeOptions.find(t => t.value === themeMode.value) || themeOptions[2])

const handleLogout = () => {
  userStore.logout()
  toast('已退出登录', { type: 'success' })
  router.push('/login')
}

const goToRoute = (route: string) => {
  router.push(route)
}

const handleMenuItemClick = (item: any) => {
  if (item.action === 'theme') {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(themeMode.value as any)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setTheme(nextMode)
    toast(`已切换为${nextMode === 'light' ? '浅色' : nextMode === 'dark' ? '深色' : '跟随系统'}模式`, { type: 'success' })
  } else if (item.route) {
    goToRoute(item.route)
  }
}

const getMenuItemIcon = (item: any) => {
  if (item.action === 'theme') {
    return currentTheme.value.icon
  }
  return item.icon
}

const getMenuItemBadge = (item: any) => {
  if (item.action === 'theme') {
    return currentTheme.value.label
  }
  return item.badge
}

onMounted(async () => {
  if (!useMock) {
    try {
      const res = await statisticsApi.dashboard()
      stats.value = res.data
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  } else {
    stats.value = {
      month_records: 128,
      month_output: 8.6,
      completion_rate: 98,
    }
  }
})
</script>

<template>
  <div class="pb-4">
    <div class="bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-5 pt-8 pb-16 -mx-4 -mt-4 mb-4 safe-area-top">
      <div class="flex items-center gap-4">
        <Avatar class="w-16 h-16 border-2 border-white/30 shadow-lg">
          <AvatarFallback class="bg-white/20 text-white text-lg font-semibold">{{ avatarFallback }}</AvatarFallback>
        </Avatar>
        <div class="flex-1">
          <h2 class="text-xl font-bold text-white">{{ displayName }}</h2>
          <p class="text-sm text-white/80 mt-0.5">{{ userStore.user?.username }} · {{ roleLabel }}</p>
        </div>
        <button
          class="p-2 rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors tap-highlight-transparent"
          @click="router.push('/settings')"
        >
          <Settings class="w-5 h-5" />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-4 mt-6">
        <div class="text-center">
          <p class="text-2xl font-bold text-white">{{ stats.month_records }}</p>
          <p class="text-xs text-white/70 mt-0.5">本月工单</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-white">¥{{ stats.month_output }}w</p>
          <p class="text-xs text-white/70 mt-0.5">本月产值</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-white">{{ stats.completion_rate }}%</p>
          <p class="text-xs text-white/70 mt-0.5">完成率</p>
        </div>
      </div>
    </div>

    <div class="space-y-4 -mt-10 relative z-10">
      <div v-for="group in menuGroups" :key="group.title" class="space-y-1">
        <h3 class="text-xs font-medium text-muted-foreground px-1 mb-1">{{ group.title }}</h3>
        <div class="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
          <button
            v-for="(item, idx) in group.items"
            :key="item.label"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors tap-highlight-transparent',
              idx !== group.items.length - 1 && 'border-b border-border'
            ]"
            @click="handleMenuItemClick(item)"
          >
            <div class="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <component :is="getMenuItemIcon(item)" class="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <span class="flex-1 text-left text-sm font-medium text-foreground">{{ item.label }}</span>
            <span
              v-if="getMenuItemBadge(item)"
              :class="[
                'px-2 py-0.5 rounded-full text-xs font-medium',
                item.badge ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
              ]"
            >
              {{ getMenuItemBadge(item) }}
            </span>
            <ChevronRight class="w-4 h-4 text-muted-foreground/50" />
          </button>
        </div>
      </div>

      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-card rounded-2xl shadow-sm border border-border text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors tap-highlight-transparent"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4" />
        <span class="text-sm font-medium">退出登录</span>
      </button>

      <p class="text-center text-xs text-muted-foreground pt-2">
        工单管理系统 v1.0.0
      </p>
    </div>
  </div>
</template>
