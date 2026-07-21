<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Building2, Phone, MapPin, RefreshCw, AlertCircle, X, LayoutGrid, List, Filter, Users } from 'lucide-vue-next'
import Skeleton from '@/components/Skeleton.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { customersApi } from '@/api'
import { useList } from '@/composables/useList'
import type { Customer } from '@/types'

interface CustomerExtended extends Customer {
  contact_person?: string
  contact_phone?: string
  record_count?: number
  last_service?: string
  level?: string
}

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const showFilters = ref(true)
const viewMode = ref<'grid' | 'list'>('grid')

onMounted(() => {
  if (window.innerWidth >= 768) {
    viewMode.value = 'list'
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  handleSearch()
}

watch(searchQuery, () => {
  debouncedSearch()
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

const tabs = [
  { key: 'all', label: '全部', level: '' },
  { key: 'vip', label: 'VIP客户', level: 'vip' },
  { key: 'normal', label: '普通客户', level: 'normal' },
]

const {
  list: customers,
  loading,
  refreshing,
  loadingMore,
  finished,
  error,
  loadList,
  refresh,
  loadMore,
  params,
} = useList<CustomerExtended>({
  fetchFn: customersApi.list,
  defaultParams: { per_page: 20 },
  immediate: false,
})

loadList(true)

const getLevelBadge = (level?: string) => {
  if (level === 'vip') {
    return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
  }
  return 'bg-muted text-muted-foreground'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

    if (isToday) return `今天 ${time}`
    if (isYesterday) return `昨天 ${time}`
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
  }
}

const handleTabChange = (key: string) => {
  activeTab.value = key
  const tab = tabs.find(t => t.key === key)
  if (tab) {
    if (tab.level) {
      params.level = tab.level
    } else {
      delete (params as any).level
    }
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
  router.push(`/customer/${id}`)
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
  <div class="flex flex-col h-full relative">
    <div class="sticky top-0 z-20 safe-area-top">
      <div class="px-4 py-3 md:px-6 lg:px-8 md:py-4 border-b border-border backdrop-blur-xl bg-background/80">
        <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div class="flex items-center gap-2 flex-1">
            <div class="relative flex-1 group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                v-model="searchQuery"
                placeholder="搜索客户名称/联系人/电话"
                class="pl-9 pr-20 h-10 text-sm rounded-xl bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 transition-all"
                @keyup.enter="handleSearch"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  v-if="searchQuery"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  @click="clearSearch"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <button
                  class="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
                  @click="handleSearch"
                >
                  <Search class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              class="p-2.5 rounded-xl bg-muted/30 border border-border text-foreground hover:bg-muted/60 transition-all duration-300 active:scale-95 hover:border-primary/30"
              @click="refresh"
            >
              <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
            </button>
            <button
              class="md:hidden p-2.5 rounded-xl bg-muted/30 border border-border text-foreground active:scale-95 transition-all duration-300 hover:border-primary/30"
              :class="showFilters && 'border-primary/50 text-primary'"
              @click="showFilters = !showFilters"
            >
              <Filter :class="['w-4 h-4', showFilters && 'text-primary']" />
            </button>
          </div>

          <div class="hidden md:flex items-center gap-3">
            <div class="flex gap-1.5 bg-muted/30 p-1 rounded-xl border border-border">
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'list' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'list'"
              >
                <List class="w-4 h-4" />
              </button>
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'grid' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'grid'"
              >
                <LayoutGrid class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          :class="[
            'overflow-hidden transition-all duration-300 md:overflow-visible',
            showFilters ? 'max-h-96 mt-3 md:mt-3' : 'max-h-0 md:max-h-none md:mt-3'
          ]"
        >
          <div class="flex gap-2 md:gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:pb-0 scrollbar-hide">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shrink-0',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-primary-foreground shadow-lg shadow-blue-500/25'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border hover:border-primary/30'
              ]"
              @click="handleTabChange(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 pb-28 md:px-6 lg:px-8 md:py-4 md:pb-6 scroll-container" @scroll="handleScroll">
        <div v-if="loading && customers.length === 0" class="py-3 space-y-2.5">
          <Skeleton mode="card" :rows="5" />
        </div>

        <div v-else-if="error && customers.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              v-for="customer in customers"
              :key="customer.id"
              class="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/25 group border-border/80"
              @click="goToDetail(customer.id)"
            >
              <CardContent class="p-4">
                <div class="flex items-start gap-3 mb-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Building2 class="w-5 h-5 text-white" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold text-foreground text-sm truncate">{{ customer.short_name || customer.name }}</h3>
                    </div>
                    <span v-if="customer.level" :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block mt-1', getLevelBadge(customer.level)]">
                      {{ customer.level === 'vip' ? 'VIP' : '普通' }}
                    </span>
                  </div>
                </div>
                <div v-if="customer.contact_person || customer.contact_name || customer.phone || customer.contact_phone" class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ customer.contact_person || customer.contact_name || '' }} {{ (customer.contact_person || customer.contact_name) && (customer.phone || customer.contact_phone) ? '·' : '' }} {{ customer.contact_phone || customer.phone || '' }}</span>
                </div>
                <div v-if="customer.address" class="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <MapPin class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ customer.address }}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <span v-if="customer.record_count !== undefined">
                    工单 <span class="font-semibold text-foreground">{{ customer.record_count }}</span>
                  </span>
                  <span v-if="customer.last_service" class="truncate">
                    {{ formatDate(customer.last_service) }}
                  </span>
                  <span v-else-if="customer.created_at" class="truncate">
                    {{ formatDate(customer.created_at) }}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div v-else>
            <div class="rounded-2xl border border-border overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-border bg-muted/20">
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">客户名称</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">联系人</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">联系电话</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">等级</th>
                      <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">地址</th>
                      <th class="hidden md:table-cell text-right text-xs font-medium text-muted-foreground px-4 py-3">工单数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="customer in customers"
                      :key="customer.id"
                      class="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                      @click="goToDetail(customer.id)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                            <Building2 class="w-4 h-4 text-white" />
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">{{ customer.short_name || customer.name }}</p>
                            <p v-if="customer.address" class="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5 md:hidden">{{ customer.address }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{{ customer.contact_person || customer.contact_name || '-' }}</td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{{ customer.contact_phone || customer.phone || '-' }}</td>
                      <td class="px-4 py-3">
                        <span v-if="customer.level" :class="['px-2 py-0.5 rounded-full text-xs font-medium', getLevelBadge(customer.level)]">
                          {{ customer.level === 'vip' ? 'VIP' : '普通' }}
                        </span>
                        <span v-else class="text-sm text-muted-foreground">-</span>
                      </td>
                      <td class="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{{ customer.address || '-' }}</td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm font-medium text-foreground text-right">
                        {{ customer.record_count ?? 0 }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && customers.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <EmptyState
            v-if="!loading && customers.length === 0"
            :icon="Users"
            title="暂无客户"
            description="还没有添加任何客户，点击下方按钮创建第一个客户"
            action-text="新建客户"
            @action="router.push('/create-customer')"
          />
        </template>
      </div>
    </PullRefresh>

    <button
      class="fixed right-4 bottom-20 md:bottom-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
      @click="router.push('/create-customer')"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>
  </div>
</template>