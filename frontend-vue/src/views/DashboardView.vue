<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList, Wrench, Building2, Bell,
  TrendingUp, Clock, CheckCircle2,
  Calendar, ChevronRight, Package, Loader2, AlertCircle,
  FolderKanban, Wallet, Sparkles, ArrowUpRight,
} from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { statisticsApi, recordsApi, pendingApi } from '@/api'
import type { DashboardStats, WorkRecord, PendingWork } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const stats = ref<DashboardStats | null>(null)
const recentRecords = ref<WorkRecord[]>([])
const recentPending = ref<PendingWork[]>([])

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const todayStr = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

const statCards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: '工单总数', value: s.month_count || 0, trend: '', icon: ClipboardList, bg: 'bg-orange-50 dark:bg-orange-500/10', iconColor: 'text-orange-500', suffix: '', valueColor: 'text-foreground' },
    { label: '待处理', value: s.pending_count || 0, trend: s.overdue_pending ? `${s.overdue_pending}逾期` : '', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600', suffix: '', valueColor: 'text-amber-600 dark:text-amber-400' },
    { label: '客户数', value: s.customer_count || 0, trend: '', icon: Building2, bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600', suffix: '', valueColor: 'text-foreground' },
    { label: '本月产值', value: s.month_total || 0, trend: s.month_profit >= 0 ? `盈利 ¥${s.month_profit.toFixed(0)}` : `亏损 ¥${Math.abs(s.month_profit).toFixed(0)}`, icon: TrendingUp, bg: 'bg-violet-50 dark:bg-violet-500/10', iconColor: 'text-violet-600', prefix: '¥', valueColor: 'text-foreground' },
  ]
})

const quickActions = [
  { label: '新建工单', icon: Wrench, bg: 'bg-gradient-to-br from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30', route: '/create' },
  { label: '项目管理', icon: FolderKanban, bg: 'bg-gradient-to-br from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/30', route: '/projects' },
  { label: '客户管理', icon: Building2, bg: 'bg-gradient-to-br from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30', route: '/customers' },
  { label: '财务管理', icon: Wallet, bg: 'bg-gradient-to-br from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30', route: '/finance' },
  { label: '物料管理', icon: Package, bg: 'bg-gradient-to-br from-cyan-500 to-sky-500', shadow: 'shadow-cyan-500/30', route: '/materials' },
  { label: '消息通知', icon: Bell, bg: 'bg-gradient-to-br from-rose-500 to-pink-500', shadow: 'shadow-rose-500/30', route: '/notifications' },
  { label: '设备管理', icon: Sparkles, bg: 'bg-gradient-to-br from-amber-500 to-yellow-500', shadow: 'shadow-amber-500/30', route: '/equipment' },
  { label: '团队成员', icon: CheckCircle2, bg: 'bg-gradient-to-br from-slate-500 to-slate-600', shadow: 'shadow-slate-500/30', route: '/staffs' },
]

const typeLabels: Record<string, string> = {
  construction: '施工单',
  maintenance: '维保单',
  repair: '维修单',
  inspection: '巡检单',
}

const typeStyles: Record<string, string> = {
  construction: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  maintenance: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  repair: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  inspection: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待接单', cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  in_progress: { label: '进行中', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  cancelled: { label: '已取消', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10' },
}

const priorityMap: Record<string, { label: string; cls: string }> = {
  urgent: { label: '紧急', cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  high: { label: '高', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  normal: { label: '普通', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  low: { label: '低', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10' },
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
    const [dashData, recordsData, pendingData] = await Promise.all([
      statisticsApi.dashboard(),
      recordsApi.list({ page: 1, per_page: 5 }),
      pendingApi.list({ page: 1, per_page: 5 }),
    ])
    stats.value = dashData
    recentRecords.value = recordsData.records || []
    recentPending.value = pendingData.records || []
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
  <div class="h-full overflow-y-auto overflow-x-hidden">
    <div class="min-h-full relative">
    <div class="absolute top-0 left-0 right-0 h-[280px] pointer-events-none overflow-hidden">
      <div class="absolute -top-20 -right-20 w-72 h-72 bg-orange-400/10 rounded-full blur-3xl" />
      <div class="absolute top-10 -left-10 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl" />
      <div class="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-400/8 rounded-full blur-3xl" />
    </div>

    <div class="relative z-10 pb-24 md:pb-8">
      <div class="px-4 md:px-6 lg:px-8 pt-6 pb-4 md:pt-8 md:pb-6">
        <div class="flex items-start justify-between mb-1">
          <div>
            <h1 class="text-[22px] md:text-2xl font-bold text-foreground tracking-tight">
              {{ greeting }}，欢迎回来
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">{{ todayStr }}</p>
          </div>
          <button
            class="p-2.5 rounded-xl bg-card/80 backdrop-blur border border-border shadow-sm hover:shadow-md transition-all active:scale-95"
            @click="router.push('/notifications')"
          >
            <Bell class="w-5 h-5 text-foreground/70" />
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center px-4">
        <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <button class="text-sm text-primary font-medium" @click="loadData">重试</button>
      </div>

      <template v-else>
        <div class="px-4 md:px-6 lg:px-8 mb-5 md:mb-6">
          <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">数据概览</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="(stat, idx) in statCards"
              :key="stat.label"
              class="group relative bg-card rounded-2xl border border-border p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20"
              :style="{ animationDelay: `${idx * 50}ms` }"
              @click="goToRoute(stat.label === '工单总数' ? '/records' : stat.label === '待处理' ? '/pending' : stat.label === '客户数' ? '/customers' : '/finance')"
            >
              <div class="flex items-center gap-3 mb-3">
                <div :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110', stat.bg]">
                  <component :is="stat.icon" :class="['w-5 h-5', stat.iconColor]" />
                </div>
                <span class="text-xs text-muted-foreground font-medium">{{ stat.label }}</span>
              </div>
              <div class="flex items-baseline justify-between">
                <span :class="['text-2xl font-bold tracking-tight', stat.valueColor]">
                  {{ formatValue(stat.value, stat.prefix, stat.suffix) }}
                </span>
                <ArrowUpRight v-if="stat.label === '本月产值'" class="w-4 h-4 text-emerald-500" />
              </div>
              <div v-if="stat.trend" class="mt-1.5">
                <span :class="['text-xs font-medium',
                  stat.trend.includes('逾期') || stat.trend.includes('亏损')
                    ? 'text-red-500'
                    : 'text-emerald-500'
                ]">
                  {{ stat.trend }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="px-4 md:px-6 lg:px-8 mb-5 md:mb-6">
          <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">快捷入口</h2>
          <div class="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
            <button
              v-for="(action, idx) in quickActions"
              :key="action.label"
              class="flex flex-col items-center gap-2 group tap-highlight-transparent"
              :style="{ animationDelay: `${idx * 30}ms` }"
              @click="goToRoute(action.route)"
            >
              <div :class="['w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 group-hover:-translate-y-0.5', action.bg, action.shadow]">
                <component :is="action.icon" class="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span class="text-[11px] md:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{{ action.label }}</span>
            </button>
          </div>
        </div>

        <div class="px-4 md:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <Card class="overflow-hidden border-border/80 hover:border-border transition-colors">
            <CardHeader class="pb-2 px-5 pt-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-400 to-amber-500" />
                  <CardTitle class="text-sm font-semibold text-foreground">最近工单</CardTitle>
                </div>
                <button
                  class="flex items-center text-xs text-primary font-medium hover:underline"
                  @click="router.push('/records')"
                >
                  全部
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent class="pt-0 px-3 pb-3">
              <div v-if="recentRecords.length === 0" class="text-center py-8 text-sm text-muted-foreground">
                暂无工单
              </div>
              <div v-else class="space-y-1">
                <button
                  v-for="record in recentRecords"
                  :key="record.id"
                  class="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  @click="goToRecord(record.id)"
                >
                  <div class="flex items-start gap-3">
                    <div class="w-1 h-10 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', typeStyles[record.record_type] || 'bg-slate-100 text-slate-600']">
                          {{ typeLabels[record.record_type] || record.record_type }}
                        </span>
                        <span class="text-[11px] text-muted-foreground font-mono truncate">{{ record.order_no }}</span>
                      </div>
                      <h3 class="font-medium text-foreground text-sm truncate">{{ record.customer_name }}</h3>
                      <p class="text-[11px] text-muted-foreground mt-0.5 truncate">{{ record.staff_name || '未分配' }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span
                        v-if="statusMap[record.status]"
                        :class="['text-[10px] font-medium px-2 py-0.5 rounded-full', statusMap[record.status].cls]"
                      >
                        {{ statusMap[record.status].label }}
                      </span>
                      <div v-if="record.total_fee > 0" class="text-xs font-semibold text-foreground mt-1.5">
                        ¥{{ record.total_fee.toFixed(0) }}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card class="overflow-hidden border-border/80 hover:border-border transition-colors">
            <CardHeader class="pb-2 px-5 pt-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
                  <CardTitle class="text-sm font-semibold text-foreground">待办事项</CardTitle>
                </div>
                <button
                  class="flex items-center text-xs text-primary font-medium hover:underline"
                  @click="router.push('/pending')"
                >
                  全部
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent class="pt-0 px-3 pb-3">
              <div v-if="recentPending.length === 0" class="text-center py-8 text-sm text-muted-foreground">
                暂无待办
              </div>
              <div v-else class="space-y-1">
                <button
                  v-for="pending in recentPending"
                  :key="pending.id"
                  class="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  @click="router.push(`/pending/${pending.id}`)"
                >
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-foreground truncate">{{ pending.title }}</p>
                      <p class="text-[11px] text-muted-foreground mt-0.5 truncate">{{ pending.customer_name }}</p>
                    </div>
                    <span
                      :class="['text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', priorityMap[pending.priority]?.cls || priorityMap.normal.cls]"
                    >
                      {{ priorityMap[pending.priority]?.label || '普通' }}
                    </span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </template>
    </div>
    </div>
  </div>
</template>
