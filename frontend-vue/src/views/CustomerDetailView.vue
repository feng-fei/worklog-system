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
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { customersApi } from '@/api'

const route = useRoute()
const router = useRouter()

const customerId = computed(() => Number(route.params.id))
const loading = ref(true)

const mockCustomer = {
  id: 1,
  name: '华信科技有限公司',
  short_name: '华信科技',
  level: 'vip',
  contact_person: '张经理',
  contact_phone: '13800138001',
  address: '北京市朝阳区建国路88号华信大厦',
  email: 'contact@huaxin.com',
  created_at: '2025-03-15',
  record_count: 28,
  completed_count: 25,
  total_amount: 128500,
  last_service: '2026-07-18',
  remark: '重要客户，需优先服务',
  recentRecords: [
    { id: 1, record_no: 'GD20260718001', title: '12层空调安装', status: 'in_progress', status_label: '进行中', created_at: '今天 09:30' },
    { id: 2, record_no: 'WX20260715002', title: '消防系统年检', status: 'completed', status_label: '已完成', created_at: '7月15日' },
    { id: 3, record_no: 'GD20260710005', title: '网络布线工程', status: 'completed', status_label: '已完成', created_at: '7月10日' },
  ],
}

const useMock = import.meta.env.DEV
const customer = ref(mockCustomer as any)

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  }
  return colors[status] || colors.pending
}

const goBack = () => {
  router.back()
}

const goToRecord = (id: number) => {
  router.push(`/record/${id}`)
}

const handleCall = () => {
  if (customer.value.contact_phone) {
    window.location.href = `tel:${customer.value.contact_phone}`
  }
}

onMounted(async () => {
  if (!useMock) {
    try {
      const res = await customersApi.get(customerId.value)
      customer.value = res.data
    } catch (e) {
      console.error('Failed to load customer:', e)
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
  }
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
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-muted-foreground text-sm">加载中...</div>
      </div>

      <div v-else class="p-4 space-y-4">
        <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 class="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 class="text-lg font-bold">{{ customer.name }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-amber-900">
                    VIP 客户
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
            <div class="text-center">
              <p class="text-2xl font-bold">{{ customer.record_count }}</p>
              <p class="text-xs text-white/70 mt-0.5">总工单</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold">{{ customer.completed_count }}</p>
              <p class="text-xs text-white/70 mt-0.5">已完成</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold">¥{{ (customer.total_amount / 10000).toFixed(1) }}万</p>
              <p class="text-xs text-white/70 mt-0.5">累计产值</p>
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
              <span class="text-sm text-foreground font-medium">{{ customer.contact_person }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <button
              class="w-full flex items-center justify-between tap-highlight-transparent"
              @click="handleCall"
            >
              <div class="flex items-center gap-2.5 text-sm">
                <Phone class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">联系电话</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-sm text-primary font-medium">{{ customer.contact_phone }}</span>
                <span class="text-xs text-primary">拨打</span>
              </div>
            </button>

            <div class="h-px bg-border/60" />

            <div class="flex items-start justify-between">
              <div class="flex items-start gap-2.5 text-sm">
                <MapPin class="w-4 h-4 text-muted-foreground mt-0.5" />
                <span class="text-muted-foreground">地址</span>
              </div>
              <span class="text-sm text-foreground font-medium text-right max-w-[60%]">{{ customer.address }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary" />
            服务信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">创建时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ customer.created_at }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">最近服务</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ customer.last_service }}</span>
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

          <div class="space-y-2">
            <button
              v-for="record in customer.recentRecords"
              :key="record.id"
              class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors tap-highlight-transparent text-left"
              @click="goToRecord(record.id)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-muted-foreground">{{ record.record_no }}</span>
                </div>
                <p class="text-sm font-medium text-foreground truncate">{{ record.title }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span :class="['px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(record.status)]">
                  {{ record.status_label }}
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
