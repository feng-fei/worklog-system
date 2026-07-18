<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { financeApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Search,
  Plus,
  User,
  Calendar,
  RefreshCw,
  Trash2,
  FileText,
  Building2,
  Link2,
  Receipt,
  Edit,
} from 'lucide-vue-next'
import { relativeTime } from '@/lib/utils'

const router = useRouter()

const expenses = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterCategory = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)
const categories = ref<any[]>([])

const loadCategories = async () => {
  try {
    const res = await financeApi.expenseCategories({ page_size: 50 })
    const data = res.data
    categories.value = data.list || data.categories || data.items || data.records || []
  } catch (e) {
    console.error('加载支出分类失败', e)
  }
}

const loadExpenses = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await financeApi.expenses({
      page: currentPage.value,
      page_size: 20,
      category_id: filterCategory.value !== 'all' ? filterCategory.value : undefined,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || data.list || data.items || []

    if (refresh) {
      expenses.value = list
    } else {
      expenses.value = [...expenses.value, ...list]
    }

    hasMore.value = list.length >= 20
    currentPage.value++
  } catch (e) {
    console.error('加载支出记录失败', e)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/finance/expenses/create')
}

const goToEdit = (id: number) => {
  router.push(`/finance/expenses/${id}/edit`)
}

const onRefresh = () => {
  loadExpenses(true)
}

const handleDelete = async (id: number, e: Event) => {
  e.stopPropagation()
  if (!confirm('确定要删除这条支出记录吗？')) return

  try {
    await financeApi.deleteExpense(id)
    expenses.value = expenses.value.filter((e) => e.id !== id)
  } catch (e) {
    console.error('删除支出记录失败', e)
    alert('删除失败，请重试')
  }
}

const filteredExpenses = computed(() => {
  if (!searchQuery.value) return expenses.value
  const query = searchQuery.value.toLowerCase()
  return expenses.value.filter((e) =>
    (e.category_name || e.category || '').toLowerCase().includes(query) ||
    (e.handler || e.staff_name || '').toLowerCase().includes(query) ||
    (e.remark || e.note || '').toLowerCase().includes(query) ||
    (e.customer_name || '').toLowerCase().includes(query) ||
    (e.project_name || '').toLowerCase().includes(query)
  )
})

const getCategoryName = (categoryId: string | number) => {
  const cat = categories.value.find((c) => c.id === categoryId)
  return cat?.name || cat?.category_name || '未分类'
}

const getInvoiceStatusInfo = (val: any) => {
  if (val === true || val === 'invoiced') {
    return { label: '已开票', variant: 'success' }
  }
  if (val === false || val === 'uninvoiced' || val === null || val === undefined) {
    return { label: '未开票', variant: 'warning' }
  }
  if (val === 'no_invoice') {
    return { label: '无需发票', variant: 'secondary' }
  }
  return { label: '未开票', variant: 'warning' }
}

onMounted(() => {
  loadCategories()
  loadExpenses(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="支出记录" show-back>
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
      <div class="relative">
        <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索支出分类、经办人、客户、项目..."
          class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          @keyup.enter="loadExpenses(true)"
        />
      </div>

      <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
          :class="filterCategory === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          @click="filterCategory = 'all'; loadExpenses(true)"
        >
          全部
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
          :class="filterCategory === cat.id
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          @click="filterCategory = cat.id; loadExpenses(true)"
        >
          {{ cat.name || cat.category_name }}
        </button>
      </div>
    </div>

    <div class="flex-1 space-y-3 px-4 pb-6">
      <div v-if="loading && expenses.length === 0" class="py-12 text-center text-muted-foreground">
        <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredExpenses.length === 0" class="py-12 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search class="h-8 w-8 text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">暂无支出记录</p>
        <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮创建新支出</p>
      </div>

      <template v-else>
        <Card
          v-for="expense in filteredExpenses"
          :key="expense.id"
          class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
          @click="router.push(`/finance/expenses/${expense.id}/edit`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" size="sm">
                {{ expense.category_name || expense.category || getCategoryName(expense.category_id) }}
              </Badge>
              <Badge :variant="getInvoiceStatusInfo(expense.is_invoiced).variant as any" size="sm">
                <Receipt class="h-3 w-3 mr-1" />
                {{ getInvoiceStatusInfo(expense.is_invoiced).label }}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-destructive">
                -¥{{ Number(expense.amount).toFixed(2) }}
              </span>
            </div>
          </div>

          <div class="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <div class="flex items-center gap-2">
              <Calendar class="h-4 w-4 flex-shrink-0" />
              <span>{{ expense.expense_date || expense.created_at?.split('T')[0] || '未知日期' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <User class="h-4 w-4 flex-shrink-0" />
              <span class="truncate">{{ expense.handler || expense.staff_name || '未指定经办人' }}</span>
            </div>
            <div v-if="expense.customer_name" class="flex items-center gap-2">
              <Building2 class="h-4 w-4 flex-shrink-0" />
              <span class="truncate">{{ expense.customer_name }}</span>
            </div>
            <div v-if="expense.project_name" class="flex items-center gap-2">
              <Link2 class="h-4 w-4 flex-shrink-0" />
              <span class="truncate">{{ expense.project_name }}</span>
            </div>
            <div v-if="expense.remark || expense.note" class="flex items-start gap-2">
              <FileText class="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span class="line-clamp-2">{{ expense.remark || expense.note }}</span>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span class="text-xs text-muted-foreground">{{ relativeTime(expense.created_at) }}</span>
            <div class="flex items-center gap-3">
              <button
                class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                @click.stop="goToEdit(expense.id)"
              >
                <Edit class="h-3.5 w-3.5" />
                编辑
              </button>
              <button
                class="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                @click="handleDelete(expense.id, $event)"
              >
                <Trash2 class="h-3.5 w-3.5" />
                删除
              </button>
            </div>
          </div>
        </Card>

        <div v-if="hasMore && !loading" class="py-4 text-center">
          <button
            class="text-sm text-primary"
            @click="loadExpenses()"
          >
            加载更多
          </button>
        </div>

        <div v-if="loading && expenses.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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
