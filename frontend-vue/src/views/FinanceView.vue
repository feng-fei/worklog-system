<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Wallet,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  User,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { salariesApi, expensesApi, paymentsApi } from '@/api'
import type { SalaryRecord, Expense, PaymentRecord } from '@/types'

const router = useRouter()
const activeTab = ref<'salaries' | 'expenses' | 'payments'>('salaries')
const searchQuery = ref('')
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const error = ref('')
const finished = ref(false)
const page = ref(1)
const perPage = 20

const salaries = ref<SalaryRecord[]>([])
const expenses = ref<Expense[]>([])
const payments = ref<PaymentRecord[]>([])
const salarySummary = ref({ payable: 0, paid: 0, unpaid: 0 })
const expenseTotal = ref(0)
const paymentTotal = ref(0)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr.substring(0, 10)
  }
}

const formatMoney = (amount?: number) => {
  return `¥${(amount || 0).toLocaleString()}`
}

const currentList = computed(() => {
  if (activeTab.value === 'salaries') return salaries.value
  if (activeTab.value === 'expenses') return expenses.value
  return payments.value
})

const getStatusStyle = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    settled: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    received: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    unpaid: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  }
  return map[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待结算',
    settled: '已结算',
    received: '已收款',
    unpaid: '未收款',
  }
  return map[status] || status
}

const getPaymentMethodText = (method?: string) => {
  const map: Record<string, string> = {
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行转账',
    other: '其他',
  }
  return map[method || ''] || method || ''
}

const getExpenseTypeText = (type?: string) => {
  const map: Record<string, string> = {
    material: '材料',
    tool: '工具',
    transport: '交通',
    food: '餐饮',
    other: '其他',
  }
  return map[type || ''] || type || ''
}

const loadData = async (isRefresh = false) => {
  if (loading.value || loadingMore.value) return
  error.value = ''

  if (isRefresh) {
    refreshing.value = true
    page.value = 1
    finished.value = false
  } else {
    loadingMore.value = true
  }
  loading.value = true

  try {
    const params = {
      keyword: searchQuery.value,
      page: page.value,
      per_page: perPage,
    }

    if (activeTab.value === 'salaries') {
      const res: any = await salariesApi.list(params)
      const list = res.records || []
      if (isRefresh) {
        salaries.value = list
        salarySummary.value = res.summary || { payable: 0, paid: 0, unpaid: 0 }
      } else {
        salaries.value = [...salaries.value, ...list]
      }
      if (salaries.value.length >= (res.total || 0)) finished.value = true
    } else if (activeTab.value === 'expenses') {
      const res: any = await expensesApi.list(params)
      const list = res.records || []
      if (isRefresh) {
        expenses.value = list
        expenseTotal.value = res.total_amount || 0
      } else {
        expenses.value = [...expenses.value, ...list]
      }
      if (expenses.value.length >= (res.total || 0)) finished.value = true
    } else {
      const res: any = await paymentsApi.list(params)
      const list = res.records || []
      if (isRefresh) {
        payments.value = list
        paymentTotal.value = res.total_amount || 0
      } else {
        payments.value = [...payments.value, ...list]
      }
      if (payments.value.length >= (res.total || 0)) finished.value = true
    }

    if (!finished.value) page.value++
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
    console.error('加载财务数据失败', e)
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

const refresh = () => loadData(true)

const loadMore = () => {
  if (!finished.value && !loadingMore.value && !loading.value) {
    loadData(false)
  }
}

let searchTimer: number | null = null
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    refresh()
  }, 300)
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}

watch(activeTab, () => {
  if (currentList.value.length === 0) {
    refresh()
  }
})

onMounted(() => {
  loadData(true)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10 safe-area-top">
      <div class="flex items-center gap-2 mb-2">
        <h1 class="text-lg font-bold text-foreground">财务管理</h1>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索..."
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @input="handleSearch"
          />
        </div>
        <button
          class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
          @click="refresh"
        >
          <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
        </button>
      </div>

      <div v-if="activeTab === 'salaries'" class="grid grid-cols-3 gap-2 mb-2">
        <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-center">
          <div class="text-[10px] text-amber-600 dark:text-amber-400">待发</div>
          <div class="text-sm font-bold text-amber-700 dark:text-amber-300">{{ formatMoney(salarySummary.unpaid) }}</div>
        </div>
        <div class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-center">
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400">已发</div>
          <div class="text-sm font-bold text-emerald-700 dark:text-emerald-300">{{ formatMoney(salarySummary.paid) }}</div>
        </div>
        <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-500/10 text-center">
          <div class="text-[10px] text-slate-600 dark:text-slate-400">总计</div>
          <div class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ formatMoney(salarySummary.payable) }}</div>
        </div>
      </div>
      <div v-else-if="activeTab === 'expenses'" class="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 mb-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-red-600 dark:text-red-400">费用总计</span>
          <span class="text-sm font-bold text-red-700 dark:text-red-300">{{ formatMoney(expenseTotal) }}</span>
        </div>
      </div>
      <div v-else-if="activeTab === 'payments'" class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 mb-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-emerald-600 dark:text-emerald-400">收款总计</span>
          <span class="text-sm font-bold text-emerald-700 dark:text-emerald-300">{{ formatMoney(paymentTotal) }}</span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          :class="['p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5', activeTab === 'salaries' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground']"
          @click="activeTab = 'salaries'"
        >
          <Wallet class="w-4 h-4" />
          <span class="text-xs font-medium">工资</span>
        </button>
        <button
          :class="['p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5', activeTab === 'expenses' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground']"
          @click="activeTab = 'expenses'"
        >
          <ArrowUpRight class="w-4 h-4" />
          <span class="text-xs font-medium">费用</span>
        </button>
        <button
          :class="['p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5', activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground']"
          @click="activeTab = 'payments'"
        >
          <ArrowDownRight class="w-4 h-4" />
          <span class="text-xs font-medium">收款</span>
        </button>
      </div>
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 space-y-2 scroll-container" @scroll="handleScroll">
        <div v-if="loading && currentList.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && currentList.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <template v-if="activeTab === 'salaries'">
            <div
              v-for="item in salaries"
              :key="item.id"
              class="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User class="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div class="font-semibold text-foreground text-sm">{{ item.staff_name }}</div>
                    <div class="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      {{ formatDate(item.work_date) }}
                      <span v-if="item.salary_type" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ item.salary_type }}</span>
                    </div>
                  </div>
                </div>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold', getStatusStyle(item.status)]">
                  {{ getStatusText(item.status) }}
                </span>
              </div>
              <div v-if="item.customer_name" class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Building2 class="w-3 h-3" />
                <span class="truncate">{{ item.customer_name }}</span>
                <span v-if="item.work_content" class="truncate">· {{ item.work_content.substring(0, 20) }}</span>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border/50">
                <span class="text-xs text-muted-foreground">
                  应发 <span class="font-semibold text-foreground">{{ formatMoney(item.payable_amount) }}</span>
                </span>
                <span class="text-xs text-muted-foreground">
                  已发 <span class="font-semibold" :class="item.paid_amount >= item.payable_amount ? 'text-emerald-600' : 'text-amber-600'">{{ formatMoney(item.paid_amount) }}</span>
                </span>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'expenses'">
            <div
              v-for="item in expenses"
              :key="item.id"
              class="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                    <ArrowUpRight class="w-4 h-4 text-red-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground text-sm truncate">{{ item.title || item.category }}</div>
                    <div class="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      {{ formatDate(item.expense_date) }}
                      <span v-if="item.expense_type" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ getExpenseTypeText(item.expense_type) }}</span>
                      <span v-if="item.category" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ item.category }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-base font-bold text-red-600 dark:text-red-400">-{{ formatMoney(item.amount) }}</div>
              </div>
              <div v-if="item.customer_name || item.project_name" class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Building2 class="w-3 h-3" />
                <span class="truncate">{{ item.customer_name }}</span>
                <span v-if="item.project_name" class="truncate">· {{ item.project_name }}</span>
              </div>
              <div v-if="item.handler || item.supplier" class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>{{ item.handler || '' }}</span>
                <span>{{ item.supplier ? '供应商: ' + item.supplier : '' }}</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              v-for="item in payments"
              :key="item.id"
              class="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <ArrowDownRight class="w-4 h-4 text-emerald-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground text-sm truncate">{{ item.customer_name }}</div>
                    <div class="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      {{ formatDate(item.payment_date) }}
                      <span v-if="getPaymentMethodText(item.payment_method)" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ getPaymentMethodText(item.payment_method) }}</span>
                    </div>
                  </div>
                </div>
                <div class="text-base font-bold text-emerald-600 dark:text-emerald-400">+{{ formatMoney(item.amount) }}</div>
              </div>
              <div v-if="item.project_name" class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Building2 class="w-3 h-3" />
                <span class="truncate">{{ item.project_name }}</span>
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>{{ item.received_by || item.handler || '' }}</span>
                <span v-if="item.remark" class="truncate max-w-[60%]">{{ item.remark }}</span>
              </div>
            </div>
          </template>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && currentList.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && currentList.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">
              <template v-if="activeTab === 'salaries'">💼</template>
              <template v-else-if="activeTab === 'expenses'">📤</template>
              <template v-else>📥</template>
            </div>
            <p class="text-muted-foreground text-sm">
              <template v-if="activeTab === 'salaries'">暂无工资记录</template>
              <template v-else-if="activeTab === 'expenses'">暂无费用记录</template>
              <template v-else>暂无收款记录</template>
            </p>
          </div>
        </template>
      </div>
    </PullRefresh>
  </div>
</template>
