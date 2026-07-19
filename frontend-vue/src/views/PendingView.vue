<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Clock, AlertTriangle, ChevronRight, Loader2, AlertCircle } from 'lucide-vue-next'
import { pendingApi } from '@/api'
import { useList } from '@/composables/useList'
import type { PendingWork } from '@/types'

const router = useRouter()

const {
  list: pendingList,
  loading,
  refreshing,
  loadingMore,
  finished,
  error,
  refresh,
  loadMore,
  loadList,
} = useList<PendingWork>({
  fetchFn: pendingApi.list,
  defaultParams: { per_page: 20 },
  immediate: false,
})

loadList(true)

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  normal: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
  low: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
}

const priorityLabels: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '处理中',
  completed: '已完成',
  cancelled: '已取消',
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
  }
}

const getIcon = (priority: string) => {
  if (priority === 'high' || priority === 'urgent') return AlertTriangle
  return Clock
}

const urgentCount = computed(() => pendingList.value.filter(p => p.priority === 'high' || p.priority === 'urgent').length)
const pendingCount = computed(() => pendingList.value.filter(p => p.status === 'pending').length)

const goToDetail = (id: number) => {
  router.push(`/pending/${id}`)
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto px-4 py-3" @scroll="handleScroll">
      <div v-if="loading && pendingList.length === 0" class="flex items-center justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else-if="error && pendingList.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
      </div>

      <template v-else>
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="bg-card rounded-2xl p-3 text-center shadow-sm border border-border">
            <p class="text-2xl font-bold text-red-500">{{ urgentCount }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">紧急</p>
          </div>
          <div class="bg-card rounded-2xl p-3 text-center shadow-sm border border-border">
            <p class="text-2xl font-bold text-amber-500">{{ pendingCount }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">待处理</p>
          </div>
          <div class="bg-card rounded-2xl p-3 text-center shadow-sm border border-border">
            <p class="text-2xl font-bold text-foreground">{{ pendingList.length }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">总计</p>
          </div>
        </div>

        <div class="space-y-2">
          <h2 class="text-sm font-medium text-muted-foreground px-1 mb-1">待办列表</h2>
          <div v-if="pendingList.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">🔔</div>
            <p class="text-muted-foreground text-sm">暂无待办</p>
          </div>
          <div v-else class="space-y-2.5">
            <div
              v-for="item in pendingList"
              :key="item.id"
              class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
              @click="goToDetail(item.id)"
            >
              <div class="flex items-start gap-3">
                <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', priorityColors[item.priority] || priorityColors.normal]">
                  <component :is="getIcon(item.priority)" class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="['text-xs font-medium border px-2 py-0.5 rounded-full', priorityColors[item.priority] || priorityColors.normal]">
                      {{ priorityLabels[item.priority] || item.priority }}
                    </span>
                    <span class="text-xs text-muted-foreground">{{ formatDate(item.created_at) }}</span>
                  </div>
                  <h3 class="font-semibold text-foreground text-sm truncate">{{ item.title }}</h3>
                  <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.customer_name }} · {{ item.work_content || item.staff_name }}</p>
                </div>
                <ChevronRight class="w-4 h-4 text-muted-foreground/50 shrink-0 mt-2" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
          加载中...
        </div>

        <div v-if="finished && pendingList.length > 0" class="py-6 text-center text-sm text-muted-foreground">
          — 没有更多了 —
        </div>
      </template>
    </div>
  </div>
</template>
