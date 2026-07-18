<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Clock, AlertTriangle, ChevronRight } from 'lucide-vue-next'
import { pendingApi } from '@/api'
import { useList } from '@/composables/useList'

const router = useRouter()

const mockPending = [
  {
    id: 1,
    type: '维修待接单',
    title: '3号机组故障排查',
    description: '瑞丰工厂 · 紧急维修',
    created_at: '30分钟前',
    priority: 'high',
    status: 'pending',
  },
  {
    id: 2,
    type: '待审核',
    title: '物料采购申请 #CG20260718',
    description: '张三提交 · 空调铜管 50米',
    created_at: '1小时前',
    priority: 'medium',
    status: 'pending',
  },
  {
    id: 3,
    type: '待确认',
    title: 'GD20260717015 完工确认',
    description: '华信科技 · 网络布线项目',
    created_at: '2小时前',
    priority: 'low',
    status: 'pending',
  },
  {
    id: 4,
    type: '请假审批',
    title: '李四 - 年休假申请',
    description: '7月20日 - 7月22日 · 3天',
    created_at: '今天 08:15',
    priority: 'low',
    status: 'pending',
  },
]

const useMock = import.meta.env.DEV

const {
  list: pendingList,
  loading,
  refreshing,
  finished,
  loadList,
  refresh,
  loadMore,
} = useList({
  fetchFn: pendingApi.list,
  defaultParams: { page_size: 20 },
  immediate: false,
})

const displayList = computed(() => {
  if (useMock) return mockPending
  return pendingList.value
})

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
  low: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
}

const priorityDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
}

const getIcon = (priority: string) => {
  if (priority === 'high') return AlertTriangle
  return Clock
}

const stats = ref([
  { label: '紧急', value: 3, color: 'text-red-600 dark:text-red-400' },
  { label: '待处理', value: 5, color: 'text-amber-600 dark:text-amber-400' },
  { label: '今日', value: 12, color: 'text-foreground' },
])

const goToDetail = (id: number) => {
  router.push(`/pending/${id}`)
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
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto px-4 py-3" @scroll="handleScroll">
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div v-for="stat in stats" :key="stat.label" class="bg-card rounded-2xl p-3 text-center shadow-sm border border-border">
          <p :class="['text-2xl font-bold', stat.color]">{{ stat.value }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ stat.label }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <h2 class="text-sm font-medium text-muted-foreground px-1 mb-1">待办列表</h2>
        <div class="space-y-2.5">
          <div
            v-for="item in displayList"
            :key="item.id"
            class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
            @click="goToDetail(item.id)"
          >
            <div class="flex items-start gap-3">
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', priorityColors[item.priority]]">
                <component :is="getIcon(item.priority)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span :class="['text-xs font-medium border px-2 py-0.5 rounded-full', priorityColors[item.priority]]">
                    {{ item.type }}
                  </span>
                  <span class="text-xs text-muted-foreground">{{ item.created_at }}</span>
                </div>
                <h3 class="font-semibold text-foreground text-sm truncate">{{ item.title }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ item.description }}</p>
              </div>
              <ChevronRight class="w-4 h-4 text-muted-foreground/50 shrink-0 mt-2" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!useMock && loading && !refreshing" class="py-4 text-center text-sm text-muted-foreground">
        加载中...
      </div>

      <div v-if="!useMock && finished && displayList.length > 0" class="py-6 text-center text-sm text-muted-foreground">
        — 没有更多了 —
      </div>

      <div v-if="!useMock && !loading && displayList.length === 0" class="py-16 text-center">
        <div class="text-5xl mb-3">🔔</div>
        <p class="text-muted-foreground text-sm">暂无待办</p>
      </div>
    </div>
  </div>
</template>
