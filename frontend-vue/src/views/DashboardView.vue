<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList, Wrench, Building2, Bell,
  TrendingUp, Clock, CheckCircle2,
  Calendar, ChevronRight, Package, Loader2, AlertCircle,
} from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
    { label: '工单总数', value: s.month_count || 0, trend: '', icon: ClipboardList, color: 'from-blue-500 to-blue-600', glowColor: 'shadow-blue-500/30', suffix: '' },
    { label: '待处理', value: s.pending_count || 0, trend: s.overdue_pending ? `${s.overdue_pending}逾期` : '', icon: Clock, color: 'from-amber-500 to-orange-500', glowColor: 'shadow-amber-500/30', suffix: '' },
    { label: '客户数', value: s.customer_count || 0, trend: '', icon: Building2, color: 'from-emerald-500 to-green-600', glowColor: 'shadow-emerald-500/30', suffix: '' },
    { label: '本月产值', value: s.month_total || 0, trend: s.month_profit >= 0 ? '盈利' : '亏损', icon: TrendingUp, color: 'from-violet-500 to-purple-600', glowColor: 'shadow-violet-500/30', prefix: '¥' },
  ]
})

const quickActions = [
  { label: '新建工单', icon: Wrench, color: 'from-blue-500 to-blue-600', shadowColor: 'shadow-blue-500/30', route: '/create' },
  { label: '客户管理', icon: Building2, color: 'from-emerald-500 to-green-600', shadowColor: 'shadow-emerald-500/30', route: '/customers' },
  { label: '消息通知', icon: Bell, color: 'from-amber-500 to-orange-500', shadowColor: 'shadow-amber-500/30', route: '/notifications' },
  { label: '物料管理', icon: Package, color: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/30', route: '/materials' },
]

const typeLabels: Record<string, string> = {
  construction: '施工单',
  maintenance: '维保单',
  repair: '维修单',
  inspection: '巡检单',
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待接单', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  in_progress: { label: '进行中', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  completed: { label: '已完成', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  cancelled: { label: '已取消', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
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
  <div class="space-y-5 md:space-y-6 pb-4 md:pb-6 md:px-6 lg:px-8 md:py-6 relative">
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
    <div class="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <button class="text-sm text-primary font-medium" @click="loadData">重试</button>
    </div>

    <template v-else>
      <div class="space-y-2 md:space-y-3 relative z-10">
        <h2 class="text-sm font-medium text-muted-foreground">数据概览</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div
            v-for="stat in statCards"
            :key="stat.label"
            class="relative overflow-hidden rounded-2xl border border-border bg-card cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            :class="stat.glowColor.replace('shadow-', 'hover:shadow-').replace('/30', '/25')"
          >
            <div class="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div class="p-4 md:p-5 relative">
              <div class="flex items-start justify-between">
                <div class="space-y-1 md:space-y-2">
                  <p class="text-xs text-muted-foreground font-medium">{{ stat.label }}</p>
                  <p class="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                    {{ formatValue(stat.value, stat.prefix, stat.suffix) }}
                  </p>
                </div>
                <div :class="['p-2.5 md:p-3 rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl', stat.color, stat.glowColor]">
                  <component :is="stat.icon" class="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </div>
              <div v-if="stat.trend" class="mt-2 md:mt-3 flex items-center text-xs">
                <span :class="stat.trend.includes('逾期') || stat.trend === '亏损'
                  ? 'text-red-500 font-medium'
                  : 'text-emerald-500 font-medium'">
                  {{ stat.trend }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3 md:space-y-4 relative z-10">
        <h2 class="text-sm font-medium text-muted-foreground">快捷入口</h2>
        <div class="grid grid-cols-4 md:grid-cols-4 gap-3 md:gap-4">
          <button
            v-for="action in quickActions"
            :key="action.label"
            class="flex flex-col items-center gap-2 md:gap-3 active:scale-95 transition-all duration-300 hover:-translate-y-1 group tap-highlight-transparent"
            @click="goToRoute(action.route)"
          >
            <div :class="['w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 bg-gradient-to-br', action.color, action.shadowColor]">
              <component :is="action.icon" class="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <span class="text-xs md:text-sm font-medium text-foreground">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 relative z-10">
        <Card class="overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-50" />
          <CardHeader class="pb-3 md:pb-4">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-medium text-muted-foreground">最近工单</CardTitle>
              <button
                class="flex items-center text-xs text-primary font-medium tap-highlight-transparent hover:underline"
                @click="router.push('/records')"
              >
                查看全部
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div v-if="recentRecords.length === 0" class="text-center py-8 text-sm text-muted-foreground">
              暂无工单
            </div>
            <div v-else class="space-y-3">
              <button
                v-for="record in recentRecords"
                :key="record.id"
                class="w-full bg-card rounded-xl p-3 md:p-4 border border-border text-left transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 group"
                @click="goToRecord(record.id)"
              >
                <div class="flex items-start justify-between">
                  <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {{ typeLabels[record.record_type] || record.record_type }}
                      </span>
                      <span class="text-xs text-muted-foreground truncate">{{ record.order_no }}</span>
                    </div>
                    <h3 class="font-semibold text-foreground text-sm md:text-base truncate">{{ record.customer_name }}</h3>
                    <p class="text-xs md:text-sm text-muted-foreground truncate">{{ record.staff_name || '未分配' }}</p>
                  </div>
                  <span
                    v-if="statusMap[record.status]"
                    :class="[
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2 border',
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
          </CardContent>
        </Card>

        <Card class="overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50" />
          <CardHeader class="pb-3 md:pb-4">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-medium text-muted-foreground">待办事项</CardTitle>
              <button
                class="flex items-center text-xs text-primary font-medium tap-highlight-transparent hover:underline"
                @click="router.push('/pending')"
              >
                查看全部
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-3">
              <div class="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-300 cursor-pointer group">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Clock class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">今日待处理工单</p>
                  <p class="text-xs text-muted-foreground mt-0.5">共 3 项需要处理</p>
                </div>
                <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">3</span>
              </div>

              <div class="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300 cursor-pointer group">
                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Calendar class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">明日预约工单</p>
                  <p class="text-xs text-muted-foreground mt-0.5">已安排 5 项预约</p>
                </div>
                <span class="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">5</span>
              </div>

              <div class="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer group">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">本周已完成</p>
                  <p class="text-xs text-muted-foreground mt-0.5">已完成 12 项工单</p>
                </div>
                <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">12</span>
              </div>

              <div class="flex items-start gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300 cursor-pointer group">
                <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Bell class="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-foreground">未读消息</p>
                  <p class="text-xs text-muted-foreground mt-0.5">系统通知和提醒</p>
                </div>
                <span class="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">8</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
