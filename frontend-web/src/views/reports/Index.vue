<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import { statisticsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  ChevronRight,
  DollarSign,
  PieChart,
  UserPlus,
  UserCheck,
  RefreshCw,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'

const toggleSidebar = inject('toggleSidebar', () => {})
const userStore = useUserStore()
const isAdmin = computed(() => userStore.user?.role === 'admin')

const timeRange = ref<'week' | 'month' | 'year'>('month')
const loading = ref(true)

const workStats = ref({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  monthNew: 0,
  monthCompleted: 0,
})

const financeStats = ref({
  monthIncome: 0,
  monthExpense: 0,
  monthProfit: 0,
  pendingReceivable: 0,
})

const customerStats = ref({
  total: 0,
  monthNew: 0,
})

const staffStats = ref({
  total: 0,
  ranking: [] as any[],
})

const typeDistribution = ref({
  construction: 0,
  maintenance: 0,
  inspection: 0,
})

const customerRanking = ref<any[]>([])
const growthRate = ref(0)
const currentPeriod = ref(0)
const lastPeriod = ref(0)

const timeRanges = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年' },
] as const

const loadStatistics = async () => {
  loading.value = true
  try {
    const res = await statisticsApi.statistics({ range: timeRange.value })
    const data = res.data

    workStats.value = {
      total: data.total_records || 0,
      pending: data.pending_records || 0,
      inProgress: data.in_progress_records || 0,
      completed: data.completed_records || 0,
      monthNew: data.month_new_records || 0,
      monthCompleted: data.month_completed_records || 0,
    }

    financeStats.value = {
      monthIncome: data.month_income || 0,
      monthExpense: data.month_expense || 0,
      monthProfit: data.month_profit || 0,
      pendingReceivable: data.pending_receivable || 0,
    }

    customerStats.value = {
      total: data.total_customers || 0,
      monthNew: data.month_new_customers || 0,
    }

    staffStats.value = {
      total: data.total_staffs || 0,
      ranking: data.staff_ranking || [],
    }

    typeDistribution.value = {
      construction: data.construction_count || 0,
      maintenance: data.maintenance_count || 0,
      inspection: data.inspection_count || 0,
    }

    customerRanking.value = data.customer_ranking || []
    growthRate.value = data.growth_rate || 0
    currentPeriod.value = data.current_period || 0
    lastPeriod.value = data.last_period || 0
  } catch (e) {
    console.error('加载统计数据失败', e)
  } finally {
    loading.value = false
  }
}

const formatMoney = (amount: number) => {
  if (amount >= 10000) {
    return `¥${(amount / 10000).toFixed(2)}万`
  }
  return `¥${amount.toFixed(0)}`
}

const getGrowthText = () => {
  if (growthRate.value > 0) {
    return `较上期增长 ${(growthRate.value * 100).toFixed(1)}%`
  } else if (growthRate.value < 0) {
    return `较上期下降 ${(Math.abs(growthRate.value) * 100).toFixed(1)}%`
  }
  return '较上期持平'
}

const getTotalTypeCount = () => {
  return typeDistribution.value.construction + typeDistribution.value.maintenance + typeDistribution.value.inspection
}

const getTypePercentage = (count: number) => {
  const total = getTotalTypeCount()
  if (total === 0) return 0
  return (count / total) * 100
}

const getMaxRankCount = () => {
  if (staffStats.value.ranking.length === 0) return 1
  return Math.max(...staffStats.value.ranking.map(s => s.record_count || 0), 1)
}

const changeTimeRange = (range: 'week' | 'month' | 'year') => {
  timeRange.value = range
  loadStatistics()
}

onMounted(() => {
  loadStatistics()
})
</script>

<template>
  <div class="min-h-full bg-background">
    <MobileHeader title="统计报表" :showMenu="true" @menu-click="toggleSidebar">
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="loadStatistics"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="px-4 py-4">
      <div class="flex gap-2 mb-4">
        <button
          v-for="range in timeRanges"
          :key="range.key"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="timeRange === range.key
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          @click="changeTimeRange(range.key)"
        >
          {{ range.label }}
        </button>
      </div>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <RefreshCw class="h-10 w-10 animate-spin text-primary mb-4" />
        <p class="text-muted-foreground">加载统计数据中...</p>
      </div>

      <template v-else>
        <Card class="p-4 mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">本期工单数</p>
              <p class="mt-1 text-3xl font-bold text-foreground">{{ currentPeriod }}</p>
              <div class="mt-2 flex items-center gap-1 text-sm">
                <component
                  :is="growthRate >= 0 ? TrendingUp : TrendingDown"
                  :class="growthRate >= 0 ? 'text-success' : 'text-destructive'"
                  class="h-4 w-4"
                />
                <span :class="growthRate >= 0 ? 'text-success' : 'text-destructive'">
                  {{ getGrowthText() }}
                </span>
              </div>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <BarChart3 class="h-8 w-8" />
            </div>
          </div>
        </Card>

        <div class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <ClipboardList class="h-5 w-5 text-primary" />
            工单统计
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">工单总数</p>
                  <p class="mt-1 text-2xl font-bold text-foreground">{{ workStats.total }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">待办</p>
                  <p class="mt-1 text-2xl font-bold text-destructive">{{ workStats.pending }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Clock class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">进行中</p>
                  <p class="mt-1 text-2xl font-bold text-warning">{{ workStats.inProgress }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <PlayCircle class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">已完成</p>
                  <p class="mt-1 text-2xl font-bold text-success">{{ workStats.completed }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月新增</p>
                  <p class="mt-1 text-2xl font-bold text-info">{{ workStats.monthNew }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                  <ArrowUpRight class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月完成</p>
                  <p class="mt-1 text-2xl font-bold text-success">{{ workStats.monthCompleted }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <ArrowDownRight class="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div v-if="isAdmin" class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Wallet class="h-5 w-5 text-success" />
            财务统计
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月收入</p>
                  <p class="mt-1 text-2xl font-bold text-success">{{ formatMoney(financeStats.monthIncome) }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <TrendingUp class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月支出</p>
                  <p class="mt-1 text-2xl font-bold text-destructive">{{ formatMoney(financeStats.monthExpense) }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <TrendingDown class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月利润</p>
                  <p class="mt-1 text-2xl font-bold" :class="financeStats.monthProfit >= 0 ? 'text-success' : 'text-destructive'">
                    {{ formatMoney(financeStats.monthProfit) }}
                  </p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg" :class="financeStats.monthProfit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'">
                  <DollarSign class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">待收款</p>
                  <p class="mt-1 text-2xl font-bold text-warning">{{ formatMoney(financeStats.pendingReceivable) }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <PieChart class="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Building2 class="h-5 w-5 text-info" />
            客户统计
          </h3>
          <div class="grid grid-cols-2 gap-3">
            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">客户总数</p>
                  <p class="mt-1 text-2xl font-bold text-foreground">{{ customerStats.total }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                  <Building2 class="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">本月新增</p>
                  <p class="mt-1 text-2xl font-bold text-info">{{ customerStats.monthNew }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                  <UserPlus class="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Users class="h-5 w-5 text-warning" />
            员工统计
          </h3>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <Card class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs text-muted-foreground">在职员工</p>
                  <p class="mt-1 text-2xl font-bold text-foreground">{{ staffStats.total }}</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <UserCheck class="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          <Card class="overflow-hidden">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <h4 class="font-medium flex items-center gap-2">
                <Award class="h-4 w-4 text-warning" />
                本月完成排行
              </h4>
              <Badge variant="secondary" size="sm">TOP {{ staffStats.ranking.length }}</Badge>
            </div>

            <div v-if="staffStats.ranking.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </div>

            <div v-else class="p-4 space-y-3">
              <div
                v-for="(staff, index) in staffStats.ranking.slice(0, 5)"
                :key="staff.staff_name || index"
                class="flex items-center gap-3"
              >
                <div
                  class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  :class="[
                    index === 0 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                    index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-secondary text-muted-foreground'
                  ]"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-sm font-medium truncate">{{ staff.staff_name || '未知' }}</p>
                    <span class="text-sm font-semibold text-primary">{{ staff.record_count || 0 }}单</span>
                  </div>
                  <div class="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="[
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-primary'
                      ]"
                      :style="{ width: `${Math.max(((staff.record_count || 0) / getMaxRankCount()) * 100, 5)}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card class="mb-4 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h4 class="font-medium flex items-center gap-2">
              <BarChart3 class="h-4 w-4 text-primary" />
              工单类型分布
            </h4>
          </div>
          <div class="p-4 space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">施工单</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold">{{ typeDistribution.construction }}</span>
                  <span class="text-xs text-muted-foreground ml-1">单</span>
                </div>
              </div>
              <div class="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-500"
                  :style="{ width: `${getTypePercentage(typeDistribution.construction)}%` }"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">维修单</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold">{{ typeDistribution.maintenance }}</span>
                  <span class="text-xs text-muted-foreground ml-1">单</span>
                </div>
              </div>
              <div class="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full bg-warning rounded-full transition-all duration-500"
                  :style="{ width: `${getTypePercentage(typeDistribution.maintenance)}%` }"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">巡检单</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold">{{ typeDistribution.inspection }}</span>
                  <span class="text-xs text-muted-foreground ml-1">单</span>
                </div>
              </div>
              <div class="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  class="h-full bg-info rounded-full transition-all duration-500"
                  :style="{ width: `${getTypePercentage(typeDistribution.inspection)}%` }"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card class="mb-6 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h4 class="font-medium flex items-center gap-2">
              <Building2 class="h-4 w-4 text-primary" />
              客户工单TOP 5
            </h4>
          </div>

          <div v-if="customerRanking.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            暂无数据
          </div>

          <div v-else class="divide-y divide-border">
            <div
              v-for="(customer, index) in customerRanking.slice(0, 5)"
              :key="customer.customer_name || index"
              class="flex items-center gap-3 px-4 py-3"
            >
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                :class="[
                  index === 0 ? 'bg-primary/10 text-primary' :
                  'bg-secondary text-muted-foreground'
                ]"
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ customer.customer_name || '未知客户' }}</p>
                <p class="text-xs text-muted-foreground">{{ formatMoney(customer.total_amount || 0) }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="font-semibold text-primary">{{ customer.record_count || 0 }}</p>
                <p class="text-xs text-muted-foreground">单</p>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </Card>
      </template>
    </div>
  </div>
</template>
