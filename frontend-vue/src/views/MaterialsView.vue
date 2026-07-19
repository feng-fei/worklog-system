<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Package, Filter, ChevronRight, AlertTriangle, RefreshCw, Loader2, AlertCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { materialsApi } from '@/api'
import { useList } from '@/composables/useList'
import type { Material } from '@/types'

interface MaterialExtended extends Material {
  category_label?: string
}

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

const categoryLabels: Record<string, string> = {
  electrical: '电气',
  hvac: '暖通',
  network: '网络',
  fire: '消防',
}

const {
  list: materials,
  loading,
  refreshing,
  loadingMore,
  finished,
  error,
  loadList,
  refresh,
  loadMore,
  params,
} = useList<MaterialExtended>({
  fetchFn: materialsApi.list,
  defaultParams: { per_page: 20 },
  immediate: false,
})

loadList(true)

const getCategoryLabel = (category?: string) => {
  if (!category) return ''
  return categoryLabels[category] || category
}

const handleCategoryChange = (key: string) => {
  activeCategory.value = key
  if (key === 'all') {
    delete (params as any).category
  } else {
    params.category = key
  }
  refresh()
}

const handleSearch = () => {
  if (searchQuery.value) {
    params.keyword = searchQuery.value
  } else {
    delete (params as any).keyword
  }
  refresh()
}

const goToDetail = (id: number) => {
  router.push(`/material/${id}`)
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索物料名称/编号"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
          @click="refresh"
        >
          <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
        </button>
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
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          ]"
          @click="handleCategoryChange(cat.key)"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <PullRefresh @refresh="refresh">
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" @scroll="handleScroll">
        <div v-if="loading && materials.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && materials.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <button
            v-for="material in materials"
            :key="material.id"
            class="w-full bg-card rounded-2xl p-4 shadow-sm border border-border text-left active:scale-[0.985] transition-all"
            @click="goToDetail(material.id)"
          >
            <div class="flex items-start gap-3">
              <div
                :class="[
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                  material.is_low_stock
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
                    :class="material.is_low_stock ? 'text-red-500 border-red-200 dark:border-red-900 dark:text-red-400' : ''"
                  >
                    <AlertTriangle v-if="material.is_low_stock" class="w-3 h-3 mr-1" />
                    库存 {{ material.stock }}{{ material.unit }}
                  </Badge>
                </div>
                <div class="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                  <span>{{ material.material_no }}</span>
                  <span>·</span>
                  <span>{{ material.category_label || getCategoryLabel(material.category) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-foreground">¥{{ material.unit_price.toFixed(2) }}/{{ material.unit }}</span>
                  <span v-if="material.supplier" class="text-xs text-muted-foreground">{{ material.supplier }}</span>
                </div>
              </div>
            </div>
          </button>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && materials.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && materials.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">📦</div>
            <p class="text-muted-foreground text-sm">暂无物料</p>
          </div>
        </template>
      </div>
    </PullRefresh>
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
