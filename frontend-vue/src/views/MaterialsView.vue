<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Package, Filter, ChevronRight, AlertTriangle, TrendingDown } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { materialsApi } from '@/api'
import { useList } from '@/composables/useList'

const router = useRouter()
const searchQuery = ref('')
const activeCategory = ref('all')

const categories = [
  { key: 'all', label: '全部' },
  { key: 'electrical', label: '电气' },
  { key: 'hvac', label: '暖通' },
  { key: 'network', label: '网络' },
  { key: 'fire', label: '消防' },
]

const mockMaterials = [
  {
    id: 1,
    name: '铜管 Φ16mm',
    sku: 'WL-TG-001',
    category: 'hvac',
    category_label: '暖通',
    unit: '米',
    stock: 156,
    min_stock: 50,
    price: 12.5,
    supplier: '华东铜管厂',
    updated_at: '2026-07-18',
  },
  {
    id: 2,
    name: '六类网线 305m/箱',
    sku: 'WL-WL-002',
    category: 'network',
    category_label: '网络',
    unit: '箱',
    stock: 28,
    min_stock: 10,
    price: 380,
    supplier: '安普布线',
    updated_at: '2026-07-17',
  },
  {
    id: 3,
    name: '烟感探测器',
    sku: 'WL-XF-003',
    category: 'fire',
    category_label: '消防',
    unit: '个',
    stock: 8,
    min_stock: 20,
    price: 65,
    supplier: '海湾消防',
    updated_at: '2026-07-15',
  },
  {
    id: 4,
    name: '空气开关 32A',
    sku: 'WL-DQ-004',
    category: 'electrical',
    category_label: '电气',
    unit: '个',
    stock: 120,
    min_stock: 30,
    price: 28,
    supplier: '正泰电器',
    updated_at: '2026-07-14',
  },
  {
    id: 5,
    name: '镀锌线槽 100*50',
    sku: 'WL-DQ-005',
    category: 'electrical',
    category_label: '电气',
    unit: '根',
    stock: 45,
    min_stock: 20,
    price: 45,
    supplier: '联塑管道',
    updated_at: '2026-07-12',
  },
  {
    id: 6,
    name: '空调外机支架',
    sku: 'WL-HV-006',
    category: 'hvac',
    category_label: '暖通',
    unit: '副',
    stock: 62,
    min_stock: 15,
    price: 85,
    supplier: '长虹配件',
    updated_at: '2026-07-10',
  },
]

const useMock = import.meta.env.DEV

const {
  list: materials,
  loading,
  refreshing,
  finished,
  loadList,
  refresh,
  loadMore,
  params,
} = useList({
  fetchFn: materialsApi.list,
  defaultParams: { page_size: 20 },
  immediate: false,
})

const displayMaterials = computed(() => {
  if (useMock) {
    let list = mockMaterials
    if (activeCategory.value !== 'all') {
      list = list.filter(m => m.category === activeCategory.value)
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q)
      )
    }
    return list
  }
  return materials.value
})

const isLowStock = (stock: number, minStock: number) => stock < minStock

const handleCategoryChange = (key: string) => {
  activeCategory.value = key
  if (!useMock) {
    params.category = key === 'all' ? undefined : key
    refresh()
  }
}

const handleSearch = () => {
  if (!useMock) {
    params.search = searchQuery.value
    refresh()
  }
}

const goToDetail = (id: number) => {
  router.push(`/material/${id}`)
}

const handleScroll = (e: Event) => {
  if (useMock) return
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}

onMounted(() => {
  if (!useMock) {
    loadList(true)
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索物料名称/SKU"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform">
          <Filter class="w-4 h-4" />
        </button>
        <button
          class="p-2.5 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          v-for="cat in categories"
          :key="cat.key"
          :class="[
            'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            activeCategory === cat.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          ]"
          @click="handleCategoryChange(cat.key)"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" @scroll="handleScroll">
      <button
        v-for="material in displayMaterials"
        :key="material.id"
        class="w-full bg-card rounded-2xl p-4 shadow-sm border border-border text-left active:scale-[0.985] transition-all"
        @click="goToDetail(material.id)"
      >
        <div class="flex items-start gap-3">
          <div
            :class="[
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              isLowStock(material.stock, material.min_stock)
                ? 'bg-red-500/10 text-red-500 dark:bg-red-950/50 dark:text-red-400'
                : 'bg-violet-500/10 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
            ]"
          >
            <Package class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h3 class="font-semibold text-foreground text-[15px] truncate">{{ material.name }}</h3>
              <Badge
                variant="outline"
                :class="isLowStock(material.stock, material.min_stock) ? 'text-red-500 border-red-200 dark:border-red-900 dark:text-red-400' : ''"
              >
                <AlertTriangle v-if="isLowStock(material.stock, material.min_stock)" class="w-3 h-3 mr-1" />
                库存 {{ material.stock }}{{ material.unit }}
              </Badge>
            </div>
            <div class="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
              <span>{{ material.sku }}</span>
              <span>·</span>
              <span>{{ material.category_label }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-foreground">¥{{ material.price.toFixed(2) }}/{{ material.unit }}</span>
              <span class="text-xs text-muted-foreground">{{ material.supplier }}</span>
            </div>
          </div>
        </div>
      </button>

      <div v-if="!useMock && loading && !refreshing" class="py-4 text-center text-sm text-muted-foreground">
        加载中...
      </div>

      <div v-if="!useMock && finished && displayMaterials.length > 0" class="py-6 text-center text-sm text-muted-foreground">
        — 没有更多了 —
      </div>

      <div v-if="!useMock && !loading && displayMaterials.length === 0" class="py-16 text-center">
        <div class="text-5xl mb-3">📦</div>
        <p class="text-muted-foreground text-sm">暂无物料</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
