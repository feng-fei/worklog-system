<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  CheckCheck,
  Bell,
  AlertTriangle,
  FileText,
  UserPlus,
  MessageSquare,
  Settings,
  ChevronRight,
} from 'lucide-vue-next'
import { notificationsApi } from '@/api'
import { useList } from '@/composables/useList'

const router = useRouter()
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'system', label: '系统' },
]

const mockNotifications = [
  {
    id: 1,
    type: 'order',
    title: '新工单指派',
    content: '您有一条新的维修工单待处理：3号机组故障排查',
    is_read: false,
    created_at: '10分钟前',
    record_id: 2,
  },
  {
    id: 2,
    type: 'urgent',
    title: '紧急提醒',
    content: '工单 GD20260718001 今天到期，请尽快处理',
    is_read: false,
    created_at: '30分钟前',
    record_id: 1,
  },
  {
    id: 3,
    type: 'system',
    title: '系统通知',
    content: '系统将于今晚22:00-23:00进行维护升级，请提前做好准备',
    is_read: false,
    created_at: '1小时前',
  },
  {
    id: 4,
    type: 'order',
    title: '工单状态更新',
    content: '您负责的工单 GD20260716008 已完成验收',
    is_read: true,
    created_at: '今天 10:30',
    record_id: 4,
  },
  {
    id: 5,
    type: 'customer',
    title: '新客户添加',
    content: '天宇电子科技 已添加为新客户，联系人：周工',
    is_read: true,
    created_at: '今天 09:15',
  },
  {
    id: 6,
    type: 'system',
    title: '密码安全提醒',
    content: '您的密码已使用超过90天，建议及时更换',
    is_read: true,
    created_at: '昨天',
  },
]

const useMock = import.meta.env.DEV

const {
  list: notifications,
  loading,
  refreshing,
  finished,
  loadList,
  refresh,
  loadMore,
  params,
} = useList({
  fetchFn: notificationsApi.list,
  defaultParams: { page_size: 20 },
  immediate: false,
})

const displayNotifications = computed(() => {
  if (useMock) {
    let list = mockNotifications
    if (activeTab.value === 'unread') {
      list = list.filter(n => !n.is_read)
    } else if (activeTab.value === 'system') {
      list = list.filter(n => n.type === 'system')
    }
    return list
  }
  return notifications.value
})

const unreadCount = computed(() => {
  if (useMock) {
    return mockNotifications.filter(n => !n.is_read).length
  }
  return notifications.value.filter((n: any) => !n.is_read).length
})

const getTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    order: FileText,
    urgent: AlertTriangle,
    system: Settings,
    customer: UserPlus,
    message: MessageSquare,
  }
  return icons[type] || Bell
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    order: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    urgent: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    system: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
    customer: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    message: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  }
  return colors[type] || colors.system
}

const handleTabChange = (key: string) => {
  activeTab.value = key
  if (!useMock) {
    params.type = key === 'all' ? undefined : key
    refresh()
  }
}

const handleMarkAllRead = async () => {
  if (useMock) {
    mockNotifications.forEach(n => n.is_read = true)
    return
  }
  try {
    await notificationsApi.readAll()
    refresh()
  } catch (e) {
    console.error('Failed to mark all read:', e)
  }
}

const handleNotificationClick = async (notification: any) => {
  if (!notification.is_read && !useMock) {
    try {
      await notificationsApi.read(notification.id)
    } catch (e) {
      console.error('Failed to mark read:', e)
    }
  }

  if (notification.record_id) {
    router.push(`/record/${notification.record_id}`)
  }
}

const goBack = () => {
  router.back()
}

const handleScroll = (e: Event) => {
  if (useMock) return
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}

onMounted(() => {
  if (!useMock) {
    loadList(true)
  }
})
</script>

<template>
  <div class="min-h-screen-safe bg-background flex flex-col">
    <header class="fixed top-0 left-0 right-0 z-40 safe-area-top bg-background/80 backdrop-blur-xl border-b border-border">
      <div class="flex items-center justify-between h-12 px-3">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent"
            @click="goBack"
          >
            <ArrowLeft class="w-5 h-5 text-foreground" />
          </button>
          <h1 class="text-base font-semibold truncate">消息通知</h1>
        </div>
        <button
          v-if="unreadCount > 0"
          class="flex items-center gap-1 text-xs text-primary font-medium px-2.5 py-1.5 rounded-full hover:bg-primary/10 transition-colors tap-highlight-transparent"
          @click="handleMarkAllRead"
        >
          <CheckCheck class="w-3.5 h-3.5" />
          全部已读
        </button>
      </div>

      <div class="px-3 pb-2">
        <div class="flex gap-1 bg-muted rounded-xl p-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              'flex-1 py-1.5 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            ]"
            @click="handleTabChange(tab.key)"
          >
            {{ tab.label }}
            <span
              v-if="tab.key === 'unread' && unreadCount > 0"
              class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground"
            >
              {{ unreadCount }}
            </span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto pt-[84px] safe-area-top pb-4 safe-area-bottom">
      <div class="px-4 py-3 space-y-2" @scroll="handleScroll">
        <button
          v-for="notification in displayNotifications"
          :key="notification.id"
          class="w-full bg-card rounded-2xl p-4 shadow-sm border transition-all text-left active:scale-[0.985] tap-highlight-transparent"
          :class="notification.is_read ? 'border-border opacity-70' : 'border-primary/20'"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex items-start gap-3">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', getTypeColor(notification.type)]">
              <component :is="getTypeIcon(notification.type)" class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-1">
                <h3 class="font-semibold text-foreground text-sm truncate">
                  {{ notification.title }}
                  <span
                    v-if="!notification.is_read"
                    class="inline-block w-2 h-2 ml-1.5 rounded-full bg-destructive align-middle"
                  />
                </h3>
              </div>
              <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{{ notification.content }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-muted-foreground">{{ notification.created_at }}</span>
                <ChevronRight class="w-4 h-4 text-muted-foreground/50" />
              </div>
            </div>
          </div>
        </button>

        <div v-if="!useMock && loading && !refreshing" class="py-4 text-center text-sm text-muted-foreground">
          加载中...
        </div>

        <div v-if="!useMock && finished && displayNotifications.length > 0" class="py-6 text-center text-sm text-muted-foreground">
          — 没有更多了 —
        </div>

        <div v-if="!useMock && !loading && displayNotifications.length === 0" class="py-20 text-center">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Bell class="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p class="text-muted-foreground text-sm">暂无消息</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
