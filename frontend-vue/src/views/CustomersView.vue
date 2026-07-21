<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Building2, Phone, MapPin, ChevronRight, Filter, RefreshCw, Loader2, AlertCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
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
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
  }
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
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10 safe-area-top">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索客户名称/联系人/电话"
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
          @click="router.push('/create-customer')"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 space-y-2.5 scroll-container" @scroll="handleScroll">
        <div v-if="loading && customers.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && customers.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div
            v-for="customer in customers"
            :key="customer.id"
            class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
            @click="goToDetail(customer.id)"
          >
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Building2 class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-foreground text-[15px] truncate">{{ customer.short_name || customer.name }}</h3>
                  <span v-if="customer.level" :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getLevelBadge(customer.level)]">
                    {{ customer.level === 'vip' ? 'VIP' : '普通' }}
                  </span>
                </div>
                <div v-if="customer.contact_person || customer.contact_name || customer.phone || customer.contact_phone" class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ customer.contact_person || customer.contact_name || '' }} {{ (customer.contact_person || customer.contact_name) && (customer.phone || customer.contact_phone) ? '·' : '' }} {{ customer.contact_phone || customer.phone || '' }}</span>
                </div>
                <div v-if="customer.address" class="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ customer.address }}</span>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-muted-foreground/50 shrink-0 mt-2" />
            </div>
            <div v-if="customer.record_count !== undefined || customer.last_service || customer.created_at" class="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div class="flex items-center gap-4 text-xs">
                <span v-if="customer.record_count !== undefined" class="text-muted-foreground">
                  工单数 <span class="font-semibold text-foreground">{{ customer.record_count }}</span>
                </span>
                <span v-if="customer.last_service" class="text-muted-foreground">
                  最近服务 <span class="font-medium text-foreground">{{ formatDate(customer.last_service) }}</span>
                </span>
                <span v-else-if="customer.created_at" class="text-muted-foreground">
                  创建于 <span class="font-medium text-foreground">{{ formatDate(customer.created_at) }}</span>
                </span>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && customers.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && customers.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">🏢</div>
            <p class="text-muted-foreground text-sm">暂无客户</p>
          </div>
        </template>
      </div>
    </PullRefresh>
  </div>
</template>
