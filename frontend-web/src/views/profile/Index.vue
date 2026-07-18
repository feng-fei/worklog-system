<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Card from '@/components/ui/Card.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import {
  Lock,
  Bell,
  LogOut,
  ChevronRight,
  User,
  Mail,
  Shield,
  Calendar,
  Sun,
  Moon,
  Monitor,
  Palette,
  History,
  Database,
  Settings as SettingsIcon,
  Users,
} from 'lucide-vue-next'
import { systemApi } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const { isDesktop } = useResponsive()
const { themeMode, setTheme } = useTheme()

const unreadCount = ref(0)

const themeOptions: { value: ThemeMode; label: string; icon: any }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const isAdmin = computed(() => userStore.user?.role === 'admin')

const accountItems = [
  { icon: Lock, label: '修改密码', path: '/settings/change-password' },
  { icon: Bell, label: '消息通知', path: '/settings/notifications', badge: true },
]

const adminItems = computed(() => [
  { icon: Users, label: '员工管理', path: '/staffs' },
  { icon: History, label: '操作日志', path: '/settings/operation-logs' },
  { icon: Database, label: '数据备份', path: '/settings/backup' },
])

const infoItems = computed(() => [
  { icon: User, label: '姓名', value: userStore.user?.staff_name || userStore.user?.username || '-' },
  { icon: Shield, label: '角色', value: userStore.user?.role === 'admin' ? '管理员' : '员工' },
  { icon: Mail, label: '用户名', value: userStore.user?.username || '-' },
  { icon: Calendar, label: '创建时间', value: userStore.user?.created_at ? new Date(userStore.user.created_at).toLocaleDateString() : '-' },
])

const navigateTo = (path: string) => {
  router.push(path)
}

const selectTheme = (mode: ThemeMode) => {
  setTheme(mode)
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    router.push('/login')
  }
}

const loadUnreadCount = async () => {
  try {
    const res = await systemApi.unreadCount()
    unreadCount.value = res.data?.count || 0
  } catch (e) {
    console.error('获取未读消息数失败', e)
  }
}

onMounted(() => {
  loadUnreadCount()
})
</script>

<template>
  <div class="min-h-full bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-3xl px-8 py-6">
        <h1 class="mb-6 text-2xl font-bold text-foreground">个人中心</h1>

        <Card class="mb-6 overflow-hidden">
          <div class="bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-primary-foreground">
            <div class="flex items-center gap-4">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {{ userStore.user?.staff_name?.charAt(0) || userStore.user?.username?.charAt(0) || 'U' }}
              </div>
              <div>
                <h2 class="text-xl font-bold">
                  {{ userStore.user?.staff_name || userStore.user?.username || '用户' }}
                </h2>
                <p class="text-sm opacity-80">
                  {{ userStore.user?.role === 'admin' ? '管理员' : '工作人员' }}
                </p>
              </div>
            </div>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="item in infoItems"
              :key="item.label"
              class="flex items-center justify-between px-6 py-3"
            >
              <div class="flex items-center gap-3 text-muted-foreground">
                <component :is="item.icon" class="h-4 w-4" />
                <span class="text-sm">{{ item.label }}</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ item.value }}</span>
            </div>
          </div>
        </Card>

        <Card class="mb-6 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold">外观设置</h3>
          </div>
          <div class="p-3">
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                class="flex flex-col items-center gap-2 rounded-lg p-3 transition-colors"
                :class="themeMode === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                @click="selectTheme(option.value)"
              >
                <component :is="option.icon" class="h-5 w-5" />
                <span class="text-xs font-medium">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </Card>

        <Card v-if="isAdmin" class="mb-6 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold flex items-center gap-2">
              <SettingsIcon class="h-4 w-4" />
              系统管理
            </h3>
          </div>
          <div
            v-for="(item, index) in adminItems"
            :key="item.label"
            class="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors cursor-pointer"
            :class="{ 'border-b border-border': index < adminItems.length - 1 }"
            @click="navigateTo(item.path)"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <component :is="item.icon" class="h-5 w-5" />
              </div>
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <ChevronRight class="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card class="mb-6 overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 class="font-semibold">账号设置</h3>
          </div>
          <div
            v-for="(item, index) in accountItems"
            :key="item.label"
            class="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors cursor-pointer"
            :class="{ 'border-b border-border': index < accountItems.length - 1 }"
            @click="navigateTo(item.path)"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <component :is="item.icon" class="h-5 w-5" />
              </div>
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="item.badge && unreadCount > 0"
                class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground"
              >
                {{ unreadCount }}
              </span>
              <ChevronRight class="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <button
          class="w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-destructive font-medium transition-colors hover:bg-destructive/10"
          @click="handleLogout"
        >
          <LogOut class="mr-2 inline h-5 w-5" />
          退出登录
        </button>

        <p class="py-8 text-center text-xs text-muted-foreground">
          工单管理系统 v1.0.0
        </p>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="个人中心" :showMenu="true" />

      <div class="px-4 py-4 space-y-4 pb-24">
        <Card class="overflow-hidden">
          <div class="bg-gradient-to-r from-primary to-primary/80 px-5 py-6 text-primary-foreground">
            <div class="flex items-center gap-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                {{ userStore.user?.staff_name?.charAt(0) || userStore.user?.username?.charAt(0) || 'U' }}
              </div>
              <div>
                <h2 class="text-lg font-bold">
                  {{ userStore.user?.staff_name || userStore.user?.username || '用户' }}
                </h2>
                <p class="text-sm opacity-80">
                  {{ userStore.user?.role === 'admin' ? '管理员' : '工作人员' }}
                </p>
              </div>
            </div>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="item in infoItems"
              :key="item.label"
              class="flex items-center justify-between px-5 py-3"
            >
              <div class="flex items-center gap-3 text-muted-foreground">
                <component :is="item.icon" class="h-4 w-4" />
                <span class="text-sm">{{ item.label }}</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ item.value }}</span>
            </div>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Palette class="h-5 w-5" />
              </div>
              <span class="font-medium">主题设置</span>
            </div>
          </div>
          <div class="p-3">
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                class="flex flex-col items-center gap-2 rounded-xl p-3 transition-colors active:scale-95"
                :class="themeMode === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'"
                @click="selectTheme(option.value)"
              >
                <component :is="option.icon" class="h-5 w-5" />
                <span class="text-xs font-medium">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </Card>

        <Card v-if="isAdmin" class="overflow-hidden">
          <div class="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <SettingsIcon class="h-5 w-5" />
            </div>
            <span class="font-medium">系统管理</span>
          </div>
          <div
            v-for="(item, index) in adminItems"
            :key="item.label"
            class="flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors cursor-pointer"
            :class="{ 'border-b border-border': index < adminItems.length - 1 }"
            @click="navigateTo(item.path)"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <component :is="item.icon" class="h-5 w-5" />
              </div>
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <ChevronRight class="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div
            v-for="(item, index) in accountItems"
            :key="item.label"
            class="flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors cursor-pointer"
            :class="{ 'border-b border-border': index < accountItems.length - 1 }"
            @click="navigateTo(item.path)"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <component :is="item.icon" class="h-5 w-5" />
              </div>
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="item.badge && unreadCount > 0"
                class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground"
              >
                {{ unreadCount }}
              </span>
              <ChevronRight class="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <button
          class="w-full rounded-2xl border border-destructive/30 bg-destructive/5 py-4 text-destructive font-medium transition-colors active:bg-destructive/10"
          @click="handleLogout"
        >
          <LogOut class="mr-2 inline h-5 w-5" />
          退出登录
        </button>

        <p class="py-6 text-center text-xs text-muted-foreground">
          工单管理系统 v1.0.0
        </p>
      </div>
    </template>
  </div>
</template>
