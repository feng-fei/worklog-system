<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Inbox,
} from 'lucide-vue-next'
import { relativeTime, formatDate } from '@/lib/utils'
import { usePullRefresh } from '@/composables/useList'

const notifications = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const containerRef = ref<HTMLElement | null>(null)

const loadNotifications = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await systemApi.notifications({
      page: currentPage.value,
      page_size: 20,
    })

    const data = res.data
    const list = data.records || data.list || data.items || []

    if (refresh) {
      notifications.value = list
    } else {
      notifications.value = [...notifications.value, ...list]
    }

    hasMore.value = list.length >= 20
    currentPage.value++
  } catch (e) {
    console.error('加载通知列表失败', e)
  } finally {
    loading.value = false
  }
}

const { isRefreshing, pullDistance } = usePullRefresh(containerRef, {
  onRefresh: () => loadNotifications(true),
})

const handleRead = async (item: any) => {
  if (item.is_read) return

  try {
    await systemApi.readNotification(item.id)
    item.is_read = true
  } catch (e) {
    console.error('标记已读失败', e)
  }
}

const handleReadAll = async () => {
  try {
    await systemApi.readAllNotifications()
    notifications.value.forEach((item) => {
      item.is_read = true
    })
  } catch (e) {
    console.error('全部已读失败', e)
  }
}

const unreadCount = () => {
  return notifications.value.filter((n) => !n.is_read).length
}

onMounted(() => {
  loadNotifications(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="消息通知" show-back>
      <template #right>
        <button
          class="flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary hover:bg-accent active:bg-accent/80 transition-colors"
          @click="handleReadAll"
        >
          <CheckCheck class="h-4 w-4" />
          全部已读
        </button>
      </template>
    </MobileHeader>

    <div
      ref="containerRef"
      class="flex-1 overflow-y-auto"
    >
      <div
        class="flex items-center justify-center text-sm text-muted-foreground transition-all"
        :style="{ height: isRefreshing ? '50px' : `${pullDistance}px` }"
      >
        <RefreshCw v-if="isRefreshing" class="h-5 w-5 animate-spin" />
        <span v-else-if="pullDistance > 0">下拉刷新</span>
      </div>

      <div class="space-y-3 px-4 pb-6">
        <div v-if="loading && notifications.length === 0" class="py-12 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>

        <div v-else-if="notifications.length === 0" class="py-12 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Inbox class="h-8 w-8 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground">暂无通知</p>
        </div>

        <template v-else>
          <Card
            v-for="item in notifications"
            :key="item.id"
            class="p-4 cursor-pointer transition-all active:scale-[0.99]"
            :class="{ 'opacity-60': item.is_read }"
            @click="handleRead(item)"
          >
            <div class="flex items-start gap-3">
              <div class="relative flex-shrink-0">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell class="h-5 w-5" />
                </div>
                <span
                  v-if="!item.is_read"
                  class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-destructive ring-2 ring-background"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h4 class="font-semibold truncate">
                    {{ item.title || item.name || '系统通知' }}
                  </h4>
                  <span class="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {{ relativeTime(item.created_at) }}
                  </span>
                </div>
                <p class="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {{ item.content || item.message || '' }}
                </p>
                <p class="mt-2 text-xs text-muted-foreground">
                  {{ formatDate(item.created_at, 'YYYY-MM-DD HH:mm') }}
                </p>
              </div>
            </div>
          </Card>

          <div v-if="hasMore && !loading" class="py-4 text-center">
            <button
              class="text-sm text-primary"
              @click="loadNotifications()"
            >
              加载更多
            </button>
          </div>

          <div v-if="loading && notifications.length > 0" class="py-4 text-center text-sm text-muted-foreground">
            <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
            加载中...
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
