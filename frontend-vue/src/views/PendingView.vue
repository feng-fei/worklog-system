<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Bell, Clock, AlertTriangle, ChevronRight, Loader2, AlertCircle, Plus, X, LayoutGrid, List, Filter, CheckSquare } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { pendingApi } from '@/api'
import { useList } from '@/composables/useList'
import type { PendingWork } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const showFilters = ref(true)
const viewMode = ref<'grid' | 'list'>('grid')

onMounted(() => {
  if (window.innerWidth >= 768) {
    viewMode.value = 'list'
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  handleSearch()
}

watch(searchQuery, () => {
  debouncedSearch()
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

const tabs = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待处理', status: 'pending' },
  { key: 'in_progress', label: '处理中', status: 'in_progress' },
  { key: 'completed', label: '已完成', status: 'completed' },
]

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
  params,
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

const statusColorCls: Record<string, string> = {
  pending: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10',
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
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
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

const handleTabChange = (key: string) => {
  activeTab.value = key
  const tab = tabs.find(t => t.key === key)
  if (tab) {
    if (tab.status) {
      params.status = tab.status
    } else {
      delete (params as any).status
    }
  }
  refresh()
}

const handleSearch = () => {
  if (searchQuery.value) {
    params.keyword = searchQuery.value
  } else {
    delete (params as any).keyword
  }
  refresh()
}

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
  <div class="flex flex-col h-full relative">
    <div class="sticky top-0 z-20 safe-area-top">
      <div class="px-4 py-3 md:px-6 lg:px-8 md:py-4 border-b border-border backdrop-blur-xl bg-background/80">
        <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div class="flex items-center gap-2 flex-1">
            <div class="relative flex-1 group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                v-model="searchQuery"
                placeholder="搜索待办标题/内容/客户"
                class="pl-9 pr-20 h-10 text-sm rounded-xl bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 transition-all"
                @keyup.enter="handleSearch"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  v-if="searchQuery"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  @click="clearSearch"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <button
                  class="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
                  @click="handleSearch"
                >
                  <Search class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              class="p-2.5 rounded-xl bg-muted/30 border border-border text-foreground hover:bg-muted/60 transition-all duration-300 active:scale-95 hover:border-primary/30"
              @click="refresh"
            >
              <Loader2 :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
            </button>
            <button
              class="md:hidden p-2.5 rounded-xl bg-muted/30 border border-border text-foreground active:scale-95 transition-all duration-300 hover:border-primary/30"
              :class="showFilters && 'border-primary/50 text-primary'"
              @click="showFilters = !showFilters"
            >
              <Filter :class="['w-4 h-4', showFilters && 'text-primary']" />
            </button>
          </div>

          <div class="hidden md:flex items-center gap-3">
            <div class="flex gap-1.5 bg-muted/30 p-1 rounded-xl border border-border">
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'list' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'list'"
              >
                <List class="w-4 h-4" />
              </button>
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'grid' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'grid'"
              >
                <LayoutGrid class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          :class="[
            'overflow-hidden transition-all duration-300 md:overflow-visible',
            showFilters ? 'max-h-96 mt-3 md:mt-3' : 'max-h-0 md:max-h-none md:mt-3'
          ]"
        >
          <div class="flex gap-2 md:gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:pb-0 scrollbar-hide">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shrink-0',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-primary-foreground shadow-lg shadow-orange-500/25'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border hover:border-primary/30'
              ]"
              @click="handleTabChange(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 pb-28 md:px-6 lg:px-8 md:py-4 md:pb-6 scroll-container" @scroll="handleScroll">
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

          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              v-for="item in pendingList"
              :key="item.id"
              class="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/25 group border-border/80"
              @click="goToDetail(item.id)"
            >
              <CardContent class="p-4">
                <div class="flex items-start justify-between gap-2 mb-3">
                  <span :class="['px-2 py-0.5 rounded-md text-[11px] font-medium border', priorityColors[item.priority] || priorityColors.normal]">
                    {{ priorityLabels[item.priority] || item.priority }}
                  </span>
                  <span :class="['px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', statusColorCls[item.status] || statusColorCls.pending]">
                    {{ statusLabels[item.status] || item.status }}
                  </span>
                </div>
                <h3 class="font-semibold text-foreground text-sm mb-2 line-clamp-2">{{ item.title }}</h3>
                <p class="text-xs text-muted-foreground mb-3 line-clamp-2">{{ item.customer_name }} · {{ item.work_content || item.staff_name }}</p>
                <div class="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <div class="flex items-center gap-1">
                    <component :is="getIcon(item.priority)" class="w-3.5 h-3.5" />
                    <span>{{ formatDate(item.created_at) }}</span>
                  </div>
                  <ChevronRight class="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div v-else>
            <div class="rounded-2xl border border-border overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-border bg-muted/20">
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">优先级</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">标题</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">客户</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">状态</th>
                      <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">负责人</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in pendingList"
                      :key="item.id"
                      class="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                      @click="goToDetail(item.id)"
                    >
                      <td class="px-4 py-3">
                        <span :class="['px-2 py-0.5 rounded-full text-xs font-medium border', priorityColors[item.priority] || priorityColors.normal]">
                          {{ priorityLabels[item.priority] || item.priority }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <p class="text-sm font-medium text-foreground truncate max-w-[200px] group-hover:text-primary transition-colors">{{ item.title }}</p>
                        <p v-if="item.work_content" class="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5 md:hidden">{{ item.work_content }}</p>
                      </td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[150px]">{{ item.customer_name || '-' }}</td>
                      <td class="px-4 py-3">
                        <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', statusColorCls[item.status] || statusColorCls.pending]">
                          {{ statusLabels[item.status] || item.status }}
                        </span>
                      </td>
                      <td class="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground">{{ item.staff_name || '-' }}</td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{{ formatDate(item.created_at) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && pendingList.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <EmptyState
            v-if="!loading && pendingList.length === 0"
            :icon="CheckSquare"
            title="暂无待办"
            description="当前没有待办事项，点击下方按钮创建新的待办"
            action-text="新建待办"
            @action="router.push('/pending-create')"
          />
        </template>
      </div>
    </PullRefresh>

    <button
      class="fixed right-4 bottom-20 md:bottom-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5"
      @click="router.push('/pending-create')"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
