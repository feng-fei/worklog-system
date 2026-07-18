<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Filter, RefreshCw, ChevronDown } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { recordsApi } from '@/api'
import { useList } from '@/composables/useList'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待处理', status: 'pending' },
  { key: 'progress', label: '进行中', status: 'in_progress' },
  { key: 'done', label: '已完成', status: 'completed' },
]

const mockRecords = [
  {
    id: 1,
    record_no: 'GD20260718001',
    record_type: 'construction',
    type_label: '施工单',
    title: '某大厦12层空调安装',
    customer_name: '华信科技有限公司',
    status: 'in_progress',
    status_label: '进行中',
    created_at: '今天 09:30',
    staff_name: '张三',
  },
  {
    id: 2,
    record_no: 'WX20260718003',
    record_type: 'repair',
    type_label: '维修单',
    title: '3号机组故障排查',
    customer_name: '瑞丰工厂',
    status: 'pending',
    status_label: '待接单',
    created_at: '30分钟前',
    staff_name: '李四',
  },
  {
    id: 3,
    record_no: 'XM20260717002',
    record_type: 'project',
    type_label: '项目施工',
    title: '产业园一期智能化工程',
    customer_name: '恒达地产',
    status: 'in_progress',
    status_label: '进行中',
    created_at: '昨天 14:20',
    staff_name: '王五团队',
  },
  {
    id: 4,
    record_no: 'GD20260716008',
    record_type: 'construction',
    type_label: '施工单',
    title: 'B栋办公区网络布线',
    customer_name: '科创大厦',
    status: 'completed',
    status_label: '已完成',
    created_at: '7月16日',
    staff_name: '赵六',
  },
  {
    id: 5,
    record_no: 'WX20260715002',
    record_type: 'repair',
    type_label: '维修单',
    title: '消防系统年检维护',
    customer_name: '世纪购物中心',
    status: 'completed',
    status_label: '已完成',
    created_at: '7月15日',
    staff_name: '孙七',
  },
]

const useMock = import.meta.env.DEV

const {
  list: records,
  loading,
  refreshing,
  finished,
  loadList,
  refresh,
  loadMore,
  params,
} = useList({
  fetchFn: recordsApi.list,
  defaultParams: { page_size: 20 },
  immediate: false,
})

const displayRecords = computed(() => {
  if (useMock) {
    let filtered = mockRecords
    if (activeTab.value !== 'all') {
      const tab = tabs.find(t => t.key === activeTab.value)
      if (tab) {
        filtered = filtered.filter(r => r.status === tab.status)
      }
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.record_no.toLowerCase().includes(q)
      )
    }
    return filtered
  }
  return records.value
})

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    construction: 'bg-blue-50 text-blue-700 border-blue-200',
    repair: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    project: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return colors[type] || 'bg-slate-50 text-slate-700 border-slate-200'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700 border-red-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return colors[status] || 'bg-slate-100 text-slate-600 border-slate-200'
}

const handleTabChange = (key: string) => {
  activeTab.value = key
  if (!useMock) {
    const tab = tabs.find(t => t.key === key)
    if (tab) {
      params.status = tab.status || undefined
    }
    refresh()
  }
}

const handleSearch = () => {
  if (!useMock) {
    params.search = searchQuery.value
    refresh()
  }
}

const goToDetail = (id: number) => {
  router.push(`/record/${id}`)
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
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索工单编号/客户/内容"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
          @click="refresh"
        >
          <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
        </button>
        <button class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform">
          <Filter class="w-4 h-4" />
        </button>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="[
            'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            activeTab === tab.key
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          ]"
          @click="handleTabChange(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <PullRefresh :disabled="useMock" @refresh="refresh">
      <div class="scroll-container flex-1 overflow-y-auto px-4 py-3 space-y-3" @scroll="handleScroll">
        <div
          v-for="record in displayRecords"
          :key="record.id"
          class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
          @click="goToDetail(record.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium border', getTypeColor(record.record_type)]">
                  {{ record.type_label }}
                </span>
                <span class="text-xs text-muted-foreground truncate">{{ record.record_no }}</span>
              </div>
              <h3 class="font-semibold text-foreground text-[15px] truncate">{{ record.title }}</h3>
              <p class="text-sm text-muted-foreground mt-1 truncate">{{ record.customer_name }}</p>
              <div class="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                <span>{{ record.staff_name }}</span>
                <span>·</span>
                <span>{{ record.created_at }}</span>
              </div>
            </div>
            <span :class="['px-2.5 py-1 rounded-full text-xs font-medium border shrink-0', getStatusColor(record.status)]">
              {{ record.status_label }}
            </span>
          </div>
        </div>

        <div v-if="!useMock && loadingMore" class="py-4 text-center text-sm text-muted-foreground">
          加载中...
        </div>

        <div v-if="!useMock && finished && displayRecords.length > 0" class="py-6 text-center text-sm text-muted-foreground">
          — 没有更多了 —
        </div>

        <div v-if="!useMock && !loading && displayRecords.length === 0" class="py-16 text-center">
          <div class="text-5xl mb-3">📋</div>
          <p class="text-muted-foreground text-sm">暂无工单</p>
        </div>
      </div>
    </PullRefresh>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
