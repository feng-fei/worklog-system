<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList, Wrench, Building2, Bell,
  TrendingUp, Clock, CheckCircle2,
  Calendar, ChevronRight, Package, Loader2, AlertCircle,
} from 'lucide-vue-next'
import { statisticsApi, recordsApi, pendingApi } from '@/api'
import type { DashboardStats, WorkRecord, PendingWork } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const stats = ref<DashboardStats | null>(null)
const recentRecords = ref<WorkRecord[]>([])

const statCards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: '工单总数', value: s.month_count || 0, trend: '', icon: ClipboardList, color: 'from-blue-500 to-blue-600', suffix: '' },
    { label: '待处理', value: s.pending_count || 0, trend: s.overdue_pending ? `${s.overdue_pending}逾期` : '', icon: Clock, color: 'from-amber-500 to-orange-500', suffix: '' },
    { label: '客户数', value: s.customer_count || 0, trend: '', icon: Building2, color: 'from-emerald-500 to-green-600', suffix: '' },
    { label: '本月产值', value: s.month_total || 0, trend: s.month_profit >= 0 ? '盈利' : '亏损', icon: TrendingUp, color: 'from-violet-500 to-purple-600', prefix: '¥' },
  ]
})

const quickActions = [
  { label: '新建工单', icon: Wrench, color: 'bg-blue-500', route: '/create' },
  { label: '客户管理', icon: Building2, color: 'bg-emerald-500', route: '/customers' },
  { label: '消息通知', icon: Bell, color: 'bg-amber-500', route: '/notifications' },
  { label: '物料管理', icon: Package, color: 'bg-violet-500', route: '/materials' },
]

const typeLabels: Record<string, string> = {
  construction: '施工单',
  maintenance: '维保单',
  repair: '维修单',
  inspection: '巡检单',
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待接单', cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  in_progress: { label: '进行中', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  completed: { label: '已完成', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  cancelled: { label: '已取消', cls: 'bg-slate-500/10 text-slate-500' },
}

const formatValue = (val: number, prefix = '', suffix = '') => {
  if (val >= 10000) return `${prefix}${(val / 10000).toFixed(1)}w${suffix}`
  return `${prefix}${val}${suffix}`
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const [dashData, recordsData] = await Promise.all([
      statisticsApi.dashboard(),
      recordsApi.list({ page: 1, per_page: 5 }),
    ])
    stats.value = dashData
    recentRecords.value = recordsData.records || []
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载数据失败'
    console.error('Dashboard load error:', e)
  } finally {
    loading.value = false
  }
}

const goToRecord = (id: number) => {
  router.push(`/record/${id}`)
}

const goToRoute = (route: string) => {
  router.push(route)
}

onMounted(loadData)
</script>

<template>
  <div class="space-y-5 pb-4">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <button class="text-sm text-primary font-medium" @click="loadData">重试</button>
    </div>

    <template v-else>
      <div class="space-y-2">
        <h2 class="text-sm font-medium text-muted-foreground">数据概览</h2>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="stat in statCards"
            :key="stat.label"
            class="relative overflow-hidden rounded-2xl bg-card p-4 shadow-sm border border-border"
          >
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground font-medium">{{ stat.label }}</p>
                <p class="text-2xl font-bold text-foreground tracking-tight">
                  {{ formatValue(stat.value, stat.prefix, stat.suffix) }}
                </p>
              </div>
              <div :class="['p-2.5 rounded-xl bg-gradient-to-br', stat.color]">
                <component :is="stat.icon" class="w-5 h-5 text-white" />
              </div>
            </div>
            <div v-if="stat.trend" class="mt-2 flex items-center text-xs">
              <span :class="stat.trend.includes('逾期') || stat.trend === '亏损'
                ? 'text-red-500 font-medium'
                : 'text-emerald-500 font-medium'">
                {{ stat.trend }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">快捷入口</h2>
        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="action in quickActions"
            :key="action.label"
            class="flex flex-col items-center gap-2 active:scale-95 transition-transform tap-highlight-transparent"
            @click="goToRoute(action.route)"
          >
            <div :class="[action.color, 'w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shadow-black/10']">
              <component :is="action.icon" class="w-6 h-6 text-white" />
            </div>
            <span class="text-xs font-medium text-foreground">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted-foreground">最近工单</h2>
          <button
            class="flex items-center text-xs text-primary font-medium tap-highlight-transparent"
            @click="router.push('/records')"
          >
            查看全部
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
        <div v-if="recentRecords.length === 0" class="text-center py-8 text-sm text-muted-foreground">
          暂无工单
        </div>
        <div v-else class="space-y-3">
          <button
            v-for="record in recentRecords"
            :key="record.id"
            class="w-full bg-card rounded-2xl p-4 shadow-sm border border-border text-left active:scale-[0.98] transition-transform"
            @click="goToRecord(record.id)"
          >
            <div class="flex items-start justify-between">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {{ typeLabels[record.record_type] || record.record_type }}
                  </span>
                  <span class="text-xs text-muted-foreground truncate">{{ record.order_no }}</span>
                </div>
                <h3 class="font-semibold text-foreground text-base truncate">{{ record.customer_name }}</h3>
                <p class="text-sm text-muted-foreground truncate">{{ record.staff_name || '未分配' }}</p>
              </div>
              <span
                v-if="statusMap[record.status]"
                :class="[
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2',
                  statusMap[record.status].cls,
                ]"
              >
                {{ statusMap[record.status].label }}
              </span>
            </div>
            <div class="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <div class="flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5" />
                <span>{{ formatDate(record.created_at) }}</span>
              </div>
              <div v-if="record.total_fee > 0" class="font-medium text-foreground">
                ¥{{ record.total_fee.toFixed(0) }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
