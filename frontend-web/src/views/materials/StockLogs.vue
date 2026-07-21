<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { materialsApi } from '@/api'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import PullRefresh from '@/components/business/PullRefresh.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Search,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  SlidersHorizontal,
  ClipboardList,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-vue-next'

const route = useRoute()
const { isDesktop } = useResponsive()

const stockLogs = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterType = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)
const materialId = computed(() => route.params.id ? Number(route.params.id) : undefined)

const logTypeMap: Record<string, { label: string; variant: string; icon: any }> = {
  in: { label: '入库', variant: 'success', icon: ArrowDownCircle },
  out: { label: '出库', variant: 'destructive', icon: ArrowUpCircle },
  adjust: { label: '调整', variant: 'default', icon: SlidersHorizontal },
}

const getLogType = (type: string) => {
  return logTypeMap[type] || logTypeMap.adjust
}

const formatQuantity = (item: any) => {
  const qty = item.quantity || 0
  if (item.log_type === 'in') {
    return `+${qty}`
  } else if (item.log_type === 'out') {
    return `-${qty}`
  } else {
    return `±${qty}`
  }
}

const getQuantityClass = (logType: string) => {
  if (logType === 'in') {
    return 'text-green-600 dark:text-green-400'
  } else if (logType === 'out') {
    return 'text-red-600 dark:text-red-400'
  } else {
    return 'text-blue-600 dark:text-blue-400'
  }
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'YYYY-MM-DD HH:mm')
}

const loadStockLogs = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      per_page: 20,
      log_type: filterType.value !== 'all' ? filterType.value : undefined,
    }

    if (materialId.value) {
      params.material_id = materialId.value
    }

    const res = await materialsApi.stockLogs(params)

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = data.per_page || 20

    if (refresh) {
      stockLogs.value = list
    } else {
      stockLogs.value = [...stockLogs.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载库存日志失败', e)
  } finally {
    loading.value = false
  }
}

const onRefresh = () => {
  return loadStockLogs(true)
}

const filteredLogs = computed(() => {
  if (!searchQuery.value) return stockLogs.value
  const query = searchQuery.value.toLowerCase()
  return stockLogs.value.filter((log) =>
    (log.material_name || '').toLowerCase().includes(query) ||
    (log.related_no || '').toLowerCase().includes(query) ||
    (log.operator || '').toLowerCase().includes(query)
  )
})

const typeFilters = [
  { key: 'all', label: '全部' },
  { key: 'in', label: '入库' },
  { key: 'out', label: '出库' },
  { key: 'adjust', label: '调整' },
]

onMounted(() => {
  loadStockLogs(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">库存变动日志</h1>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索物料名称、关联单号、操作人..."
                class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadStockLogs(true)"
              />
            </div>
            <select
              v-model="filterType"
              class="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              @change="loadStockLogs(true)"
            >
              <option v-for="t in typeFilters" :key="t.key" :value="t.key">
                {{ t.label }}
              </option>
            </select>
            <button
              class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
              @click="onRefresh"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              刷新
            </button>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div v-if="loading && stockLogs.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredLogs.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardList class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无库存变动记录</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>变动数量</TableHead>
                  <TableHead>变动前库存</TableHead>
                  <TableHead>变动后库存</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>总价</TableHead>
                  <TableHead>关联单据</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="log in filteredLogs"
                  :key="log.id"
                >
                  <TableCell>
                    <span class="font-medium">{{ log.material_name || '-' }}</span>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getLogType(log.log_type).variant as any" size="sm">
                      {{ getLogType(log.log_type).label }}
                    </Badge>
                  </TableCell>
                  <TableCell :class="getQuantityClass(log.log_type)">
                    <span class="font-semibold">{{ formatQuantity(log) }}</span>
                  </TableCell>
                  <TableCell>{{ log.stock_before ?? '-' }}</TableCell>
                  <TableCell>{{ log.stock_after ?? '-' }}</TableCell>
                  <TableCell>¥{{ log.unit_price?.toFixed?.(2) || '0.00' }}</TableCell>
                  <TableCell>¥{{ log.total_price?.toFixed?.(2) || '0.00' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ log.related_no || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ log.operator || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatDateTime(log.created_at) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="border-t border-border p-4 text-center">
              <button
                class="text-sm text-primary hover:underline"
                @click="loadStockLogs()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && stockLogs.length > 0" class="border-t border-border p-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="库存变动日志" :showBack="true">
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
            placeholder="搜索物料名称、关联单号、操作人..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            @keyup.enter="loadStockLogs(true)"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="t in typeFilters"
            :key="t.key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterType === t.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterType = t.key; loadStockLogs(true)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && stockLogs.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredLogs.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardList class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无库存变动记录</p>
          </div>

          <template v-else>
            <Card
              v-for="log in filteredLogs"
              :key="log.id"
              class="p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ log.material_name || '-' }}
                  </span>
                  <Badge :variant="getLogType(log.log_type).variant as any" size="sm">
                    {{ getLogType(log.log_type).label }}
                  </Badge>
                </div>
                <span :class="getQuantityClass(log.log_type)" class="font-bold text-lg">
                  {{ formatQuantity(log) }}
                </span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">变动前: {{ log.stock_before ?? '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">变动后: {{ log.stock_after ?? '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Minus class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">单价: ¥{{ log.unit_price?.toFixed?.(2) || '0.00' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Minus class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">总价: ¥{{ log.total_price?.toFixed?.(2) || '0.00' }}</span>
                </div>
              </div>

              <div v-if="log.related_no" class="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">关联单据: {{ log.related_no }}</span>
              </div>

              <div class="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <User class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ log.operator || '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Clock class="h-4 w-4 flex-shrink-0" />
                  <span>{{ formatDateTime(log.created_at) }}</span>
                </div>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadStockLogs()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && stockLogs.length > 0" class="py-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </div>
      </PullRefresh>
    </template>
  </div>
</template>
