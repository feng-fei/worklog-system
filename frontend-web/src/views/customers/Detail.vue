<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi, recordsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  MapPin,
  User,
  Phone,
  Calendar,
  FileText,
  Edit,
  ClipboardList,
  AlertCircle,
  ChevronRight,
  Receipt,
  Building2,
  CreditCard,
  Landmark,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const customerId = computed(() => Number(route.params.id))
const customer = ref<any>(null)
const overview = ref<any>(null)
const recentRecords = ref<any[]>([])
const loading = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '合作中', variant: 'success' },
  paused: { label: '已暂停', variant: 'secondary' },
}

const recordStatusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const getRecordStatusInfo = (status: string) => {
  return recordStatusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const hasInvoiceInfo = computed(() => {
  if (!customer.value) return false
  return !!(customer.value.invoice_title || customer.value.tax_number || 
           customer.value.bank_name || customer.value.bank_account ||
           customer.value.invoice_address || customer.value.invoice_phone)
})

const loadCustomer = async () => {
  loading.value = true
  try {
    const [customerRes, overviewRes, recordsRes] = await Promise.all([
      customersApi.get(customerId.value),
      customersApi.overview(customerId.value).catch(() => null),
      recordsApi.list({ customer_id: customerId.value, page_size: 5, sort: '-created_at' }).catch(() => null),
    ])

    customer.value = customerRes.data?.customer || customerRes.data
    if (overviewRes) {
      overview.value = overviewRes.data
    }
    if (recordsRes) {
      const data = recordsRes.data
      recentRecords.value = data.records || data.list || data.items || []
    }
  } catch (e) {
    console.error('加载客户详情失败', e)
  } finally {
    loading.value = false
  }
}

const goToEdit = () => {
  router.push(`/customers/${customerId.value}/edit`)
}

const goToRecordDetail = (id: number) => {
  router.push(`/records/${id}`)
}

onMounted(() => {
  loadCustomer()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      title="客户详情"
      show-back
    >
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="goToEdit"
        >
          <Edit class="h-5 w-5" />
        </button>
      </template>
    </MobileHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p>加载中...</p>
      </div>
    </div>

    <template v-else-if="customer">
      <div class="flex-1 overflow-y-auto pb-32">
        <div class="bg-gradient-to-r from-primary to-primary/80 px-5 py-6 text-primary-foreground">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-xl font-bold">
                {{ customer.name || customer.customer_name || '客户详情' }}
              </h1>
              <p v-if="customer.contact_name || customer.contact_person" class="mt-1 text-sm opacity-80">
                联系人: {{ customer.contact_name || customer.contact_person }}
              </p>
            </div>
            <Badge variant="outline" class="bg-white/20 text-white border-white/30">
              {{ getStatusInfo(customer.status).label }}
            </Badge>
          </div>
          <p class="mt-2 text-sm opacity-80">
            创建于 {{ relativeTime(customer.created_at) }}
          </p>
        </div>

        <div class="space-y-4 p-4">
          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <User class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3">
                <User class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">客户名称</p>
                  <p class="font-medium">{{ customer.name || customer.customer_name || '-' }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <User class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">联系人</p>
                    <p class="font-medium">{{ customer.contact_name || customer.contact_person || '-' }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Phone class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">联系电话</p>
                    <p class="font-medium">{{ customer.phone || customer.contact_phone || '-' }}</p>
                  </div>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <MapPin class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">地址</p>
                  <p class="font-medium">{{ customer.address || '-' }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <Calendar class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">创建时间</p>
                    <p class="font-medium">{{ formatDate(customer.created_at, 'YYYY-MM-DD') || '-' }}</p>
                  </div>
                </div>
              </div>
              <div v-if="customer.remark || customer.notes" class="flex items-start gap-3">
                <FileText class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">备注</p>
                  <p class="font-medium">{{ customer.remark || customer.notes || '-' }}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card v-if="hasInvoiceInfo" class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Receipt class="h-5 w-5 text-primary" />
              开票信息
            </h3>
            <div class="space-y-3 text-sm">
              <div v-if="customer.invoice_title" class="flex items-start gap-3">
                <Building2 class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">发票抬头</p>
                  <p class="font-medium">{{ customer.invoice_title }}</p>
                </div>
              </div>
              <div v-if="customer.tax_number" class="flex items-start gap-3">
                <CreditCard class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">税号</p>
                  <p class="font-medium font-mono">{{ customer.tax_number }}</p>
                </div>
              </div>
              <div v-if="customer.bank_name" class="flex items-start gap-3">
                <Landmark class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">开户银行</p>
                  <p class="font-medium">{{ customer.bank_name }}</p>
                </div>
              </div>
              <div v-if="customer.bank_account" class="flex items-start gap-3">
                <CreditCard class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">银行账号</p>
                  <p class="font-medium font-mono">{{ customer.bank_account }}</p>
                </div>
              </div>
              <div v-if="customer.invoice_address" class="flex items-start gap-3">
                <MapPin class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">注册地址</p>
                  <p class="font-medium">{{ customer.invoice_address }}</p>
                </div>
              </div>
              <div v-if="customer.invoice_phone" class="flex items-start gap-3">
                <Phone class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p class="text-muted-foreground">开票电话</p>
                  <p class="font-medium">{{ customer.invoice_phone }}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <ClipboardList class="h-5 w-5 text-primary" />
              统计概览
            </h3>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-xl bg-muted/50 p-3">
                <p class="text-2xl font-bold text-foreground">{{ overview?.stats?.total_records || overview?.total_records || 0 }}</p>
                <p class="mt-1 text-xs text-muted-foreground">总工单数</p>
              </div>
              <div class="rounded-xl bg-muted/50 p-3">
                <p class="text-2xl font-bold text-warning">{{ overview?.stats?.pending_count || overview?.pending_records || overview?.pending_count || 0 }}</p>
                <p class="mt-1 text-xs text-muted-foreground">待办工单</p>
              </div>
              <div class="rounded-xl bg-muted/50 p-3">
                <p class="text-2xl font-bold text-success">{{ overview?.stats?.completed_count || overview?.completed_records || overview?.completed_count || 0 }}</p>
                <p class="mt-1 text-xs text-muted-foreground">已完成</p>
              </div>
            </div>
          </Card>

          <Card class="p-5">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-semibold">
                <FileText class="h-5 w-5 text-primary" />
                最近工单
              </h3>
              <button
                v-if="recentRecords.length > 0"
                class="text-xs text-primary"
                @click="router.push('/records')"
              >
                查看全部
              </button>
            </div>
            <div v-if="recentRecords.length === 0" class="py-6 text-center text-sm text-muted-foreground">
              暂无工单记录
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="record in recentRecords"
                :key="record.id"
                class="flex items-center justify-between rounded-xl bg-muted/30 p-3 active:bg-muted/50 transition-colors cursor-pointer"
                @click="goToRecordDetail(record.id)"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-sm font-medium">
                      {{ record.order_no || '#' + record.id }}
                    </span>
                    <Badge :variant="getRecordStatusInfo(record.status).variant as any" size="sm">
                      {{ getRecordStatusInfo(record.status).label }}
                    </Badge>
                  </div>
                  <p class="mt-1 truncate text-xs text-muted-foreground">
                    {{ record.work_content?.slice(0, 30) || record.title || '无标题' }}
                  </p>
                </div>
                <ChevronRight class="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
