<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Building2, Phone, MapPin, ChevronRight, Filter } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { customersApi } from '@/api'
import { useList } from '@/composables/useList'

const router = useRouter()
const searchQuery = ref('')

const mockCustomers = [
  {
    id: 1,
    name: '华信科技有限公司',
    short_name: '华信科技',
    contact_person: '张经理',
    contact_phone: '13800138001',
    address: '北京市朝阳区建国路88号',
    record_count: 28,
    last_service: '2026-07-18',
    level: 'vip',
  },
  {
    id: 2,
    name: '瑞丰工厂',
    short_name: '瑞丰工厂',
    contact_person: '李主任',
    contact_phone: '13900139002',
    address: '上海市浦东新区张江高科技园区',
    record_count: 15,
    last_service: '2026-07-17',
    level: 'normal',
  },
  {
    id: 3,
    name: '恒达地产集团',
    short_name: '恒达地产',
    contact_person: '王总',
    contact_phone: '13700137003',
    address: '广州市天河区珠江新城',
    record_count: 42,
    last_service: '2026-07-15',
    level: 'vip',
  },
  {
    id: 4,
    name: '科创大厦物业管理处',
    short_name: '科创大厦',
    contact_person: '赵主管',
    contact_phone: '13600136004',
    address: '深圳市南山区科技园',
    record_count: 33,
    last_service: '2026-07-14',
    level: 'normal',
  },
  {
    id: 5,
    name: '世纪购物中心',
    short_name: '世纪购物中心',
    contact_person: '孙经理',
    contact_phone: '13500135005',
    address: '成都市锦江区春熙路',
    record_count: 19,
    last_service: '2026-07-12',
    level: 'normal',
  },
  {
    id: 6,
    name: '天宇电子科技',
    short_name: '天宇电子',
    contact_person: '周工',
    contact_phone: '13400134006',
    address: '杭州市余杭区未来科技城',
    record_count: 8,
    last_service: '2026-07-10',
    level: 'normal',
  },
]

const useMock = import.meta.env.DEV

const {
  list: customers,
  loading,
  refreshing,
  finished,
  loadList,
  refresh,
  loadMore,
  params,
} = useList({
  fetchFn: customersApi.list,
  defaultParams: { page_size: 20 },
  immediate: false,
})

const displayCustomers = computed(() => {
  if (useMock) {
    if (!searchQuery.value) return mockCustomers
    const q = searchQuery.value.toLowerCase()
    return mockCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.short_name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.contact_phone.includes(q)
    )
  }
  return customers.value
})

const getLevelBadge = (level: string) => {
  if (level === 'vip') {
    return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
  }
  return 'bg-muted text-muted-foreground'
}

const handleSearch = () => {
  if (!useMock) {
    params.search = searchQuery.value
    refresh()
  }
}

const goToDetail = (id: number) => {
  router.push(`/customer/${id}`)
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
            placeholder="搜索客户名称/联系人/电话"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @keyup.enter="handleSearch"
          />
        </div>
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

    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" @scroll="handleScroll">
      <div
        v-for="customer in displayCustomers"
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
              <h3 class="font-semibold text-foreground text-[15px] truncate">{{ customer.name }}</h3>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', getLevelBadge(customer.level)]">
                {{ customer.level === 'vip' ? 'VIP' : '普通' }}
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Phone class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ customer.contact_person }} · {{ customer.contact_phone }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ customer.address }}</span>
            </div>
          </div>
          <ChevronRight class="w-4 h-4 text-muted-foreground/50 shrink-0 mt-2" />
        </div>
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div class="flex items-center gap-4 text-xs">
            <span class="text-muted-foreground">
              工单数 <span class="font-semibold text-foreground">{{ customer.record_count }}</span>
            </span>
            <span class="text-muted-foreground">
              最近服务 <span class="font-medium text-foreground">{{ customer.last_service }}</span>
            </span>
          </div>
        </div>
      </div>

      <div v-if="!useMock && loading && !refreshing" class="py-4 text-center text-sm text-muted-foreground">
        加载中...
      </div>

      <div v-if="!useMock && finished && displayCustomers.length > 0" class="py-6 text-center text-sm text-muted-foreground">
        — 没有更多了 —
      </div>

      <div v-if="!useMock && !loading && displayCustomers.length === 0" class="py-16 text-center">
        <div class="text-5xl mb-3">🏢</div>
        <p class="text-muted-foreground text-sm">暂无客户</p>
      </div>
    </div>
  </div>
</template>
