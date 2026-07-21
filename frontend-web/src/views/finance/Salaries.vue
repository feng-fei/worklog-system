<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { financeApi, staffsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Search,
  Plus,
  ChevronRight,
  User,
  Calendar,
  RefreshCw,
  Edit3,
  CheckCircle,
  DollarSign,
  Wallet,
} from 'lucide-vue-next'
import { relativeTime } from '@/lib/utils'

const router = useRouter()

const salaries = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentMonth = ref(new Date().toISOString().slice(0, 7))
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  settled: { label: '已结算', variant: 'success' },
  pending: { label: '未结算', variant: 'warning' },
  unpaid: { label: '未结算', variant: 'warning' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadSalaries = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await financeApi.salaries({
      page: currentPage.value,
      per_page: 20,
      month: currentMonth.value,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || data.list || data.items || []

    if (refresh) {
      salaries.value = list
    } else {
      salaries.value = [...salaries.value, ...list]
    }

    hasMore.value = list.length >= 20
    currentPage.value++
  } catch (e) {
    console.error('加载工资列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/finance/salaries/create')
}

const goToEdit = (id: number) => {
  router.push(`/finance/salaries/${id}/edit`)
}

const onRefresh = () => {
  loadSalaries(true)
}

const handleSettle = async (id: number, e: Event) => {
  e.stopPropagation()
  if (!confirm('确定要结算这笔工资吗？')) return

  try {
    await financeApi.settleSalary(id)
    const salary = salaries.value.find((s) => s.id === id)
    if (salary) {
      salary.status = 'settled'
    }
  } catch (e) {
    console.error('结算工资失败', e)
    alert('结算失败，请重试')
  }
}

const filteredSalaries = computed(() => {
  if (!searchQuery.value) return salaries.value
  const query = searchQuery.value.toLowerCase()
  return salaries.value.filter((s) =>
    (s.staff_name || s.name || '').toLowerCase().includes(query) ||
    (s.position || s.role || '').toLowerCase().includes(query)
  )
})

const totalStats = computed(() => {
  const total = salaries.value.reduce((sum, s) => sum + (Number(s.gross_salary) || Number(s.salary) || 0), 0)
  const settled = salaries.value
    .filter((s) => s.status === 'settled')
    .reduce((sum, s) => sum + (Number(s.net_salary) || Number(s.salary) || 0), 0)
  const pending = salaries.value
    .filter((s) => s.status !== 'settled')
    .reduce((sum, s) => sum + (Number(s.net_salary) || Number(s.salary) || 0), 0)
  return { total, settled, pending }
})

const prevMonth = () => {
  const date = new Date(currentMonth.value + '-01')
  date.setMonth(date.getMonth() - 1)
  currentMonth.value = date.toISOString().slice(0, 7)
  loadSalaries(true)
}

const nextMonth = () => {
  const date = new Date(currentMonth.value + '-01')
  date.setMonth(date.getMonth() + 1)
  currentMonth.value = date.toISOString().slice(0, 7)
  loadSalaries(true)
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-')
  return `${year}年${parseInt(month)}月`
}

onMounted(() => {
  loadSalaries(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="工资管理" show-back>
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="onRefresh"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
      <div class="flex items-center justify-between bg-card rounded-xl px-4 py-3">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          @click="prevMonth"
        >
          <ChevronRight class="h-5 w-5 rotate-180 text-muted-foreground" />
        </button>
        <div class="text-center">
          <p class="text-base font-semibold">{{ formatMonth(currentMonth) }}</p>
        </div>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
          @click="nextMonth"
        >
          <ChevronRight class="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <Card class="p-3 text-center">
          <p class="text-xs text-muted-foreground">应发工资</p>
          <p class="mt-1 text-base font-bold text-foreground">¥{{ totalStats.total.toFixed(2) }}</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xs text-muted-foreground">已结算</p>
          <p class="mt-1 text-base font-bold text-success">¥{{ totalStats.settled.toFixed(2) }}</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xs text-muted-foreground">待结算</p>
          <p class="mt-1 text-base font-bold text-warning">¥{{ totalStats.pending.toFixed(2) }}</p>
        </Card>
      </div>

      <div class="mt-3 relative">
        <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索员工姓名..."
          class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>

    <div class="flex-1 space-y-3 px-4 pb-6">
      <div v-if="loading && salaries.length === 0" class="py-12 text-center text-muted-foreground">
        <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredSalaries.length === 0" class="py-12 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search class="h-8 w-8 text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">暂无工资记录</p>
        <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加工资</p>
      </div>

      <template v-else>
        <Card
          v-for="salary in filteredSalaries"
          :key="salary.id"
          class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
          @click="goToEdit(salary.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User class="h-5 w-5" />
              </div>
              <div>
                <p class="font-semibold">{{ salary.staff_name || salary.name || '未命名员工' }}</p>
                <p class="text-xs text-muted-foreground">{{ salary.position || salary.role || '' }}</p>
              </div>
            </div>
            <Badge :variant="getStatusInfo(salary.status).variant as any" size="sm">
              {{ getStatusInfo(salary.status).label }}
            </Badge>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-lg bg-muted/50 p-3">
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign class="h-3.5 w-3.5" />
                应发工资
              </div>
              <p class="mt-1 text-base font-semibold text-foreground">
                ¥{{ (salary.gross_salary || salary.salary || 0).toFixed(2) }}
              </p>
            </div>
            <div class="rounded-lg bg-muted/50 p-3">
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet class="h-3.5 w-3.5" />
                实发工资
              </div>
              <p class="mt-1 text-base font-semibold text-success">
                ¥{{ (salary.net_salary || salary.salary || 0).toFixed(2) }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span class="text-xs text-muted-foreground">
              {{ salary.month || currentMonth }}
            </span>
            <div class="flex items-center gap-2">
              <button
                v-if="salary.status !== 'settled'"
                class="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors"
                @click="handleSettle(salary.id, $event)"
              >
                <CheckCircle class="h-3.5 w-3.5" />
                结算
              </button>
              <button
                class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                @click.stop="goToEdit(salary.id)"
              >
                <Edit3 class="h-3.5 w-3.5" />
                编辑
              </button>
            </div>
          </div>
        </Card>

        <div v-if="hasMore && !loading" class="py-4 text-center">
          <button
            class="text-sm text-primary"
            @click="loadSalaries()"
          >
            加载更多
          </button>
        </div>

        <div v-if="loading && salaries.length > 0" class="py-4 text-center text-sm text-muted-foreground">
          <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
          加载中...
        </div>
      </template>
    </div>

    <button
      class="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90"
      @click="goToCreate"
    >
      <Plus class="h-7 w-7" />
    </button>
  </div>
</template>
