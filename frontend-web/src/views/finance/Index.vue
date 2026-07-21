<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { financeApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  FileText,
  CreditCard,
  Users,
  Tags,
  ChevronRight,
  RefreshCw,
} from 'lucide-vue-next'
import { relativeTime, formatCurrency } from '@/lib/utils'

const router = useRouter()
const toggleSidebar = inject('toggleSidebar', () => {})

const stats = ref({
  monthIncome: 0,
  monthExpense: 0,
  monthProfit: 0,
  pendingPayment: 0,
})

const recentExpenses = ref<any[]>([])
const recentPayments = ref<any[]>([])
const loading = ref(true)

const loadStats = async () => {
  loading.value = true
  try {
    const [expenseRes, paymentRes] = await Promise.all([
      financeApi.expenseStats(),
      financeApi.paymentStats(),
    ])

    const expenseData = expenseRes.data || {}
    const paymentData = paymentRes.data || {}

    const monthExpense = expenseData.month_total || expenseData.total || 0
    const monthIncome = paymentData.month_total || paymentData.received_total || 0
    const pendingPayment = paymentData.pending_total || paymentData.unreceived_total || 0

    stats.value = {
      monthIncome,
      monthExpense,
      monthProfit: monthIncome - monthExpense,
      pendingPayment,
    }

    recentExpenses.value = expenseData.recent || expenseData.list || []
    recentPayments.value = paymentData.recent || paymentData.list || []
  } catch (e) {
    console.error('加载财务统计失败', e)
  } finally {
    loading.value = false
  }
}

const goToExpenses = () => {
  router.push('/finance/expenses')
}

const goToPayments = () => {
  router.push('/finance/payments')
}

const goToSalaries = () => {
  router.push('/finance/salaries')
}

const goToCategories = () => {
  router.push('/finance/expense-categories')
}

const onRefresh = () => {
  loadStats()
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="财务" :showMenu="true" @menu-click="toggleSidebar">
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="onRefresh"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="flex-1 space-y-4 px-4 pb-6 pt-2">
      <div class="grid grid-cols-2 gap-3">
        <Card class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-muted-foreground">本月收入</p>
              <p class="mt-2 text-xl font-bold text-success">¥{{ formatCurrency(stats.monthIncome) }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <TrendingUp class="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-muted-foreground">本月支出</p>
              <p class="mt-2 text-xl font-bold text-destructive">¥{{ Number(stats.monthExpense).toFixed(2) }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <TrendingDown class="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-muted-foreground">本月利润</p>
              <p class="mt-2 text-xl font-bold" :class="stats.monthProfit >= 0 ? 'text-success' : 'text-destructive'">
                ¥{{ formatCurrency(stats.monthProfit) }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet class="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-muted-foreground">待收款项</p>
              <p class="mt-2 text-xl font-bold text-warning">¥{{ Number(stats.pendingPayment).toFixed(2) }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Clock class="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card class="overflow-hidden">
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 class="font-semibold">快捷入口</h3>
        </div>
        <div class="grid grid-cols-4 gap-2 p-4">
          <button
            class="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToExpenses"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <FileText class="h-6 w-6" />
            </div>
            <span class="text-xs">支出记录</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToPayments"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <CreditCard class="h-6 w-6" />
            </div>
            <span class="text-xs">收款记录</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToSalaries"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users class="h-6 w-6" />
            </div>
            <span class="text-xs">工资管理</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToCategories"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Tags class="h-6 w-6" />
            </div>
            <span class="text-xs">支出分类</span>
          </button>
        </div>
      </Card>

      <Card class="overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4">
          <h3 class="font-semibold">最近支出</h3>
          <button
            class="flex items-center text-sm text-primary"
            @click="goToExpenses"
          >
            查看全部
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <div v-if="loading" class="px-5 py-8 text-center text-sm text-muted-foreground">
          加载中...
        </div>

        <div v-else-if="recentExpenses.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
          暂无支出记录
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="expense in recentExpenses.slice(0, 5)"
            :key="expense.id"
            class="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
            @click="goToExpenses"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium truncate">{{ expense.category_name || expense.category || '未分类' }}</p>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ expense.handler || expense.staff_name || '未指定' }} · {{ relativeTime(expense.created_at || expense.expense_date) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-destructive">-¥{{ formatCurrency(expense.amount) }}</span>
              <ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </div>
      </Card>

      <Card class="overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4">
          <h3 class="font-semibold">最近收款</h3>
          <button
            class="flex items-center text-sm text-primary"
            @click="goToPayments"
          >
            查看全部
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <div v-if="loading" class="px-5 py-8 text-center text-sm text-muted-foreground">
          加载中...
        </div>

        <div v-else-if="recentPayments.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
          暂无收款记录
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="payment in recentPayments.slice(0, 5)"
            :key="payment.id"
            class="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
            @click="goToPayments"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium truncate">{{ payment.customer_name || '未指定客户' }}</p>
                <Badge
                  :variant="payment.status === 'received' ? 'success' : 'warning'"
                  size="sm"
                >
                  {{ payment.status === 'received' ? '已收款' : '待收款' }}
                </Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ relativeTime(payment.created_at || payment.payment_date) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-success">+¥{{ Number(payment.amount).toFixed(2) }}</span>
              <ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
