<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Building2,
  MapPin,
  User,
  Calendar,
  FileText,
  ChevronRight,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { customersApi } from '@/api'
import type { Customer, WorkRecord } from '@/types'

const route = useRoute()
const router = useRouter()

const customerId = computed(() => Number(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const customer = ref<Customer | null>(null)
const records = ref<WorkRecord[]>([])

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateStr
  }
}

const getRecordTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    construction: '施工',
    maintenance: '维保',
    repair: '维修',
    inspection: '巡检',
  }
  return labels[type] || type
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-900',
  }
  return colors[status] || colors.pending
}

const fetchCustomer = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await customersApi.get(customerId.value)
    customer.value = res.customer
    records.value = res.records || []
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
    console.error('Failed to load customer:', e)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const goToRecord = (id: number) => {
  router.push(`/record/${id}`)
}

const handleCall = () => {
  if (customer.value?.phone) {
    window.location.href = `tel:${customer.value.phone}`
  }
}

onMounted(() => {
  fetchCustomer()
})
</script>

<template>
  <div class="min-h-screen-safe bg-background flex flex-col">
    <header class="fixed top-0 left-0 right-0 z-40 safe-area-top bg-background/80 backdrop-blur-xl border-b border-border">
      <div class="flex items-center justify-between h-12 px-3">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent"
            @click="goBack"
          >
            <ArrowLeft class="w-5 h-5 text-foreground" />
          </button>
          <h1 class="text-base font-semibold truncate">客户详情</h1>
        </div>
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent">
          <MoreVertical class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto pt-12 safe-area-top pb-24 safe-area-bottom">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-primary mb-3" />
        <div class="text-muted-foreground text-sm">加载中...</div>
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-center px-6">
        <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" size="sm" @click="fetchCustomer">
          <RefreshCw class="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>

      <div v-else-if="customer" class="p-4 space-y-4">
        <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 class="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 class="text-lg font-bold">{{ customer.name }}</h2>
                <p class="text-sm text-white/70 mt-1">{{ customer.short_name }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <User class="w-4 h-4 text-primary" />
            联系信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <User class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">联系人</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ customer.contact_name || '-' }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <button
              v-if="customer.phone"
              class="w-full flex items-center justify-between tap-highlight-transparent"
              @click="handleCall"
            >
              <div class="flex items-center gap-2.5 text-sm">
                <Phone class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">电话</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-sm text-primary font-medium">{{ customer.phone }}</span>
                <span class="text-xs text-primary">拨打</span>
              </div>
            </button>
            <div v-else class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Phone class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">电话</span>
              </div>
              <span class="text-sm text-foreground font-medium">-</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-start justify-between">
              <div class="flex items-start gap-2.5 text-sm">
                <MapPin class="w-4 h-4 text-muted-foreground mt-0.5" />
                <span class="text-muted-foreground">地址</span>
              </div>
              <span class="text-sm text-foreground font-medium text-right max-w-[60%]">{{ customer.address || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary" />
            基本信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">创建时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ formatDate(customer.created_at) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText class="w-4 h-4 text-primary" />
              最近工单
            </h3>
            <button
              class="text-xs text-primary font-medium flex items-center gap-0.5 tap-highlight-transparent"
              @click="router.push('/records')"
            >
              查看全部
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <div v-if="records.length === 0" class="text-center py-8">
            <FileText class="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p class="text-sm text-muted-foreground">暂无工单记录</p>
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="record in records"
              :key="record.id"
              class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors tap-highlight-transparent text-left"
              @click="goToRecord(record.id)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-muted-foreground">{{ record.order_no }}</span>
                  <span class="text-xs text-muted-foreground">·</span>
                  <span class="text-xs text-muted-foreground">{{ getRecordTypeLabel(record.record_type) }}</span>
                </div>
                <p class="text-sm font-medium text-foreground truncate">{{ record.fault_description || record.remark || getRecordTypeLabel(record.record_type) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap', getStatusColor(record.status)]">
                  {{ getStatusLabel(record.status) }}
                </span>
                <ChevronRight class="w-4 h-4 text-muted-foreground/50 shrink-0" />
              </div>
            </button>
          </div>
        </div>

        <div v-if="customer.remark" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText class="w-4 h-4 text-primary" />
            备注
          </h3>
          <p class="text-sm text-foreground/80 leading-relaxed">{{ customer.remark }}</p>
        </div>
      </div>
    </main>

    <div class="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom">
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
        >
          <Edit class="w-4 h-4 mr-2" />
          编辑
        </Button>
        <Button
          class="flex-1 h-12 rounded-xl text-base font-semibold"
          @click="router.push('/create')"
        >
          <FileText class="w-4 h-4 mr-2" />
          新建工单
        </Button>
      </div>
    </div>
  </div>
</template>
