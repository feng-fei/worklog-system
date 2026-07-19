<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Filter, RefreshCw, Loader2, AlertCircle, ChevronDown, LayoutGrid, List } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { recordsApi } from '@/api'
import { useList } from '@/composables/useList'
import type { WorkRecord } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const showFilters = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')

const tabs = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待处理', status: 'pending' },
  { key: 'progress', label: '进行中', status: 'in_progress' },
  { key: 'done', label: '已完成', status: 'completed' },
]

const {
  list: records,
  loading,
  refreshing,
  loadingMore,
  finished,
  error,
  loadList,
  refresh,
  loadMore,
  params,
} = useList<WorkRecord>({
  fetchFn: recordsApi.list,
  defaultParams: { per_page: 20 },
  immediate: false,
})

loadList(true)

const typeLabels: Record<string, string> = {
  construction: '施工单',
  maintenance: '维保单',
  repair: '维修单',
  inspection: '巡检单',
}

const typeColorCls: Record<string, string> = {
  construction: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  maintenance: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  repair: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  inspection: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
}

const statusLabels: Record<string, string> = {
  pending: '待接单',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

const statusColorCls: Record<string, string> = {
  pending: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

    if (isToday) return `今天 ${time}`
    if (isYesterday) return `昨天 ${time}`
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`
  } catch {
    return dateStr
  }
}

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
  router.push(`/record/${id}`)
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
    <div class="px-4 py-3 md:px-6 lg:px-8 md:py-4 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
      <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div class="flex items-center gap-2 flex-1">
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
            class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground hover:bg-muted/80 transition-colors active:scale-95"
            @click="refresh"
          >
            <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
          </button>
          <button
            class="md:hidden p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
            @click="showFilters = !showFilters"
          >
            <Filter :class="['w-4 h-4', showFilters && 'text-primary']" />
          </button>
        </div>

        <div class="hidden md:flex items-center gap-3">
          <div class="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
            <button
              :class="[
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              ]"
              @click="viewMode = 'list'"
            >
              <List class="w-4 h-4" />
            </button>
            <button
              :class="[
                'p-2 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
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
          showFilters ? 'max-h-96 mt-3 md:mt-0' : 'max-h-0 md:max-h-none md:mt-3'
        ]"
      >
        <div class="flex flex-wrap gap-2 md:gap-2">
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
    </div>

    <PullRefresh @refresh="refresh">
      <div class="flex-1 overflow-y-auto px-4 py-3 md:px-6 lg:px-8 md:py-4" @scroll="handleScroll">
        <div v-if="loading && records.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && records.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              v-for="record in records"
              :key="record.id"
              class="shadow-sm border-border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 group"
              @click="goToDetail(record.id)"
            >
              <CardContent class="p-4">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', typeColorCls[record.record_type] || typeColorCls.construction]">
                    {{ typeLabels[record.record_type] || record.record_type }}
                  </span>
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusColorCls[record.status] || statusColorCls.pending]">
                    {{ statusLabels[record.status] || record.status }}
                  </span>
                </div>
                <h3 class="font-semibold text-foreground text-base mb-1 truncate">{{ record.customer_name }}</h3>
                <p class="text-xs text-muted-foreground mb-2">{{ record.order_no }}</p>
                <p v-if="record.address" class="text-sm text-muted-foreground mb-3 line-clamp-2 h-10">{{ record.address }}</p>
                <div class="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <span>{{ record.staff_name || '未分配' }}</span>
                  <span v-if="record.total_fee > 0" class="font-medium text-foreground">
                    ¥{{ record.total_fee.toFixed(0) }}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div v-else class="hidden md:block">
            <div class="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-border bg-muted/30">
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">工单编号</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">客户名称</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">类型</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">状态</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">负责人</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">创建时间</th>
                      <th class="text-right text-xs font-medium text-muted-foreground px-4 py-3">费用</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="record in records"
                      :key="record.id"
                      class="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                      @click="goToDetail(record.id)"
                    >
                      <td class="px-4 py-3 text-sm text-muted-foreground font-mono">{{ record.order_no }}</td>
                      <td class="px-4 py-3">
                        <p class="text-sm font-medium text-foreground truncate max-w-[200px]">{{ record.customer_name }}</p>
                        <p v-if="record.address" class="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{{ record.address }}</p>
                      </td>
                      <td class="px-4 py-3">
                        <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', typeColorCls[record.record_type] || typeColorCls.construction]">
                          {{ typeLabels[record.record_type] || record.record_type }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', statusColorCls[record.status] || statusColorCls.pending]">
                          {{ statusLabels[record.status] || record.status }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-sm text-muted-foreground">{{ record.staff_name || '未分配' }}</td>
                      <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDate(record.created_at) }}</td>
                      <td class="px-4 py-3 text-sm font-medium text-foreground text-right">
                        {{ record.total_fee > 0 ? '¥' + record.total_fee.toFixed(0) : '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && records.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && records.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">📋</div>
            <p class="text-muted-foreground text-sm">暂无工单</p>
          </div>
        </template>
      </div>
    </PullRefresh>
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
