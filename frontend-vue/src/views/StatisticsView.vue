<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ClipboardList, TrendingUp, CreditCard, DollarSign,
  Users, Package, Bell, Receipt, Loader2, AlertCircle, Calendar,
} from 'lucide-vue-next'
import { statisticsApi } from '@/api'
import type { DashboardStats, Expense } from '@/types'

const loading = ref(true)
const error = ref('')
const stats = ref<DashboardStats | null>(null)

const formatWan = (val: number) => {
  if (val >= 10000) return `¥${(val / 10000).toFixed(2)}万`
  return `¥${val.toFixed(2)}`
}

const formatMoney = (val: number) => {
  return `¥${val.toFixed(2)}`
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const getStatCards = () => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: '本月工单', value: s.month_count || 0, icon: ClipboardList, color: 'from-blue-500 to-blue-600', type: 'count' },
    { label: '本月产值', value: s.month_total || 0, icon: TrendingUp, color: 'from-violet-500 to-purple-600', type: 'wan' },
    { label: '本月支出', value: s.month_expense || 0, icon: CreditCard, color: 'from-rose-500 to-red-600', type: 'money' },
    { label: '本月利润', value: s.month_profit || 0, icon: DollarSign, color: 'from-emerald-500 to-green-600', type: 'money' },
    { label: '本月收款', value: s.month_payment || 0, icon: Receipt, color: 'from-amber-500 to-orange-500', type: 'money' },
    { label: '客户总数', value: s.customer_count || 0, icon: Users, color: 'from-cyan-500 to-teal-600', type: 'count' },
    { label: '物料总数', value: s.material_count || 0, icon: Package, color: 'from-indigo-500 to-blue-600', type: 'count' },
    { label: '待办数量', value: s.pending_count || 0, icon: Bell, color: 'from-pink-500 to-rose-600', type: 'count' },
  ]
}

const formatStatValue = (value: number, type: string) => {
  switch (type) {
    case 'wan':
      return formatWan(value)
    case 'money':
      return formatMoney(value)
    default:
      return value.toString()
  }
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await statisticsApi.dashboard()
    stats.value = data
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载数据失败'
    console.error('Statistics load error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="h-full overflow-y-auto overflow-x-hidden px-4 pt-4 pb-4 safe-area-top">
    <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-foreground">统计概览</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <button class="text-sm text-primary font-medium" @click="loadData">重试</button>
    </div>

    <template v-else>
      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">数据统计</h2>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="stat in getStatCards()"
            :key="stat.label"
            class="relative overflow-hidden rounded-2xl bg-card p-4 shadow-sm border border-border"
          >
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground font-medium">{{ stat.label }}</p>
                <p class="text-lg font-bold text-foreground tracking-tight">
                  {{ formatStatValue(stat.value, stat.type) }}
                </p>
              </div>
              <div :class="['p-2.5 rounded-xl bg-gradient-to-br', stat.color]">
                <component :is="stat.icon" class="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">最近支出</h2>
        <div v-if="!stats?.recent_expenses || stats.recent_expenses.length === 0" class="text-center py-8 text-sm text-muted-foreground bg-card rounded-2xl border border-border">
          暂无支出记录
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="expense in stats.recent_expenses"
            :key="expense.id"
            class="bg-card rounded-2xl p-4 shadow-sm border border-border"
          >
            <div class="flex items-start justify-between">
              <div class="space-y-1.5 flex-1 min-w-0">
                <h3 class="font-semibold text-foreground text-base truncate">{{ expense.category_name || expense.category }}</h3>
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar class="w-3.5 h-3.5" />
                  <span>{{ formatDate(expense.expense_date || expense.created_at) }}</span>
                </div>
              </div>
              <span class="text-lg font-bold text-rose-500 shrink-0 ml-2">
                -¥{{ expense.amount.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
    </div>
  </div>
</template>
