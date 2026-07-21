<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Monitor,
  Wrench,
  CalendarClock,
  Building2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
  Plus,
  MapPin,
  Phone,
  Calendar,
  Shield,
  AlertTriangle,
} from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { equipmentsApi, maintenanceApi } from '@/api'
import type { CustomerEquipment, MaintenancePlan } from '@/types'

const router = useRouter()
const activeTab = ref<'equipment' | 'maintenance'>('equipment')
const searchQuery = ref('')
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const error = ref('')
const finished = ref(false)
const page = ref(1)
const perPage = 20

const equipments = ref<CustomerEquipment[]>([])
const maintenancePlans = ref<MaintenancePlan[]>([])
const dueCount = ref(0)
const warrantyExpiringCount = ref(0)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr.substring(0, 10)
  }
}

const currentList = computed(() => {
  if (activeTab.value === 'equipment') return equipments.value
  return maintenancePlans.value
})

const getStatusStyle = (status: string) => {
  const map: Record<string, string> = {
    normal: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    faulty: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    scrapped: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    paused: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    completed: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  }
  return map[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    normal: '正常',
    faulty: '故障',
    scrapped: '已报废',
    active: '执行中',
    paused: '已暂停',
    completed: '已完成',
  }
  return map[status] || status
}

const getCycleText = (type: string, value: number) => {
  const map: Record<string, string> = {
    day: '天',
    week: '周',
    month: '月',
    quarter: '季度',
    year: '年',
  }
  return `每${value}${map[type] || type}`
}

const getPriorityStyle = (priority: string) => {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-red-50 text-red-600',
  }
  return map[priority] || map.normal
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急',
  }
  return map[priority] || '普通'
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

    if (activeTab.value === 'equipment') {
      const res: any = await equipmentsApi.list(params)
      const list = res.records || []
      if (isRefresh) {
        equipments.value = list
        dueCount.value = list.filter(e => e.is_due_maintenance).length
        warrantyExpiringCount.value = list.filter(e => !e.is_warranty).length
      } else {
        equipments.value = [...equipments.value, ...list]
      }
      if (equipments.value.length >= (res.total || 0)) finished.value = true
    } else {
      const res: any = await maintenanceApi.list(params)
      const list = res.records || []
      if (isRefresh) {
        maintenancePlans.value = list
      } else {
        maintenancePlans.value = [...maintenancePlans.value, ...list]
      }
      if (maintenancePlans.value.length >= (res.total || 0)) finished.value = true
    }

    if (!finished.value) page.value++
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
    console.error('加载设备数据失败', e)
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
        <h1 class="text-lg font-bold text-foreground">设备管理</h1>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索设备/保养计划"
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
        <button
          class="p-2.5 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
          @click="router.push('/create-equipment')"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <div v-if="activeTab === 'equipment'" class="grid grid-cols-2 gap-2 mb-2">
        <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-500" />
          <div>
            <div class="text-[10px] text-amber-600 dark:text-amber-400">待保养</div>
            <div class="text-sm font-bold text-amber-700 dark:text-amber-300">{{ dueCount }} 台</div>
          </div>
        </div>
        <div class="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center gap-2">
          <Shield class="w-4 h-4 text-red-500" />
          <div>
            <div class="text-[10px] text-red-600 dark:text-red-400">已过保</div>
            <div class="text-sm font-bold text-red-700 dark:text-red-300">{{ warrantyExpiringCount }} 台</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          :class="['p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5', activeTab === 'equipment' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground']"
          @click="activeTab = 'equipment'"
        >
          <Monitor class="w-4 h-4" />
          <span class="text-xs font-medium">客户设备</span>
        </button>
        <button
          :class="['p-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5', activeTab === 'maintenance' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground']"
          @click="activeTab = 'maintenance'"
        >
          <CalendarClock class="w-4 h-4" />
          <span class="text-xs font-medium">保养计划</span>
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
          <template v-if="activeTab === 'equipment'">
            <div
              v-for="item in equipments"
              :key="item.id"
              class="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
              :class="{ 'border-amber-300 dark:border-amber-700': item.is_due_maintenance }"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Monitor class="w-4 h-4 text-blue-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground text-sm flex items-center gap-1">
                      <span class="truncate">{{ item.brand }} {{ item.model }}</span>
                      <span v-if="item.quantity > 1" class="text-xs text-muted-foreground">x{{ item.quantity }}</span>
                    </div>
                    <div class="text-xs text-muted-foreground flex items-center gap-1">
                      <span v-if="item.equipment_type" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ item.equipment_type }}</span>
                      <span v-if="item.system_type" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ item.system_type }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold', getStatusStyle(item.status)]">
                    {{ getStatusText(item.status) }}
                  </span>
                  <span v-if="item.is_due_maintenance" class="flex items-center gap-0.5 text-[10px] text-amber-600">
                    <AlertTriangle class="w-3 h-3" /> 待保养
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Building2 class="w-3 h-3 shrink-0" />
                <span class="truncate">{{ item.customer_name }}</span>
              </div>
              <div v-if="item.location" class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <MapPin class="w-3 h-3 shrink-0" />
                <span class="truncate">{{ item.location }}</span>
              </div>
              <div v-if="item.serial_no || item.contact_phone" class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span v-if="item.serial_no">SN: {{ item.serial_no }}</span>
                <span v-if="item.contact_phone" class="flex items-center gap-1"><Phone class="w-3 h-3" />{{ item.contact_phone }}</span>
              </div>
              <div v-if="item.next_maintenance || item.warranty_end" class="mt-1.5 pt-1.5 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                <div v-if="item.next_maintenance" class="flex items-center gap-1">
                  <Wrench class="w-3 h-3 text-amber-500" />
                  <span :class="item.is_due_maintenance ? 'text-amber-600 font-medium' : 'text-muted-foreground'">下次: {{ formatDate(item.next_maintenance) }}</span>
                </div>
                <div v-if="item.warranty_end" class="flex items-center gap-1 justify-end">
                  <Shield :class="['w-3 h-3', item.is_warranty ? 'text-emerald-500' : 'text-red-500']" />
                  <span :class="item.is_warranty ? 'text-emerald-600' : 'text-red-600'">保修至: {{ formatDate(item.warranty_end) }}</span>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              v-for="item in maintenancePlans"
              :key="item.id"
              class="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                    <CalendarClock class="w-4 h-4 text-violet-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground text-sm truncate">{{ item.plan_name }}</div>
                    <div class="text-xs text-muted-foreground flex items-center gap-1">
                      <span class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ getCycleText(item.cycle_type, item.cycle_value) }}</span>
                      <span :class="['px-1.5 py-0.5 rounded text-[10px]', getPriorityStyle(item.priority)]">{{ getPriorityText(item.priority) }}</span>
                    </div>
                  </div>
                </div>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold', getStatusStyle(item.status)]">
                  {{ getStatusText(item.status) }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Building2 class="w-3 h-3 shrink-0" />
                <span class="truncate">{{ item.customer_name }}</span>
                <span v-if="item.system_type" class="px-1.5 py-0.5 rounded bg-muted text-[10px]">{{ item.system_type }}</span>
              </div>
              <div v-if="item.staff_name" class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                <Wrench class="w-3 h-3 shrink-0" />
                <span>{{ item.staff_name }}</span>
              </div>
              <div class="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span class="text-muted-foreground flex items-center gap-1">
                  <Calendar class="w-3 h-3" />下次: {{ formatDate(item.next_date) || '-' }}
                </span>
                <span v-if="item.total_count !== undefined" class="text-muted-foreground">已执行 {{ item.total_count }} 次</span>
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
              <template v-if="activeTab === 'equipment'">🖥️</template>
              <template v-else>📅</template>
            </div>
            <p class="text-muted-foreground text-sm">
              <template v-if="activeTab === 'equipment'">暂无客户设备</template>
              <template v-else>暂无保养计划</template>
            </p>
            <button class="mt-3 text-sm text-primary font-medium" @click="router.push('/create-equipment')">
              {{ activeTab === 'equipment' ? '添加设备' : '创建计划' }}
            </button>
          </div>
        </template>
      </div>
    </PullRefresh>
  </div>
</template>
