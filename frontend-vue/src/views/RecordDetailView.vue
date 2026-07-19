<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MoreVertical, MapPin, User, Calendar, Clock, Phone, FileText, Loader2, AlertCircle, Package, DollarSign, CheckCircle, Wrench, Image as ImageIcon, Edit, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { recordsApi } from '@/api'
import type { WorkRecord } from '@/types'

const route = useRoute()
const router = useRouter()
const recordId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const record = ref<WorkRecord | null>(null)

const typeLabels: Record<string, string> = {
  construction: '施工单',
  maintenance: '维保单',
  repair: '维修单',
  inspection: '巡检单',
}

const typeColorCls: Record<string, string> = {
  construction: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  maintenance: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  repair: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  inspection: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
}

const statusLabels: Record<string, string> = {
  pending: '待接单',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}

const statusColorCls: Record<string, string> = {
  pending: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
}

const paymentLabels: Record<string, string> = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
  monthly: '月结',
}

const paymentColorCls: Record<string, string> = {
  unpaid: 'text-red-500',
  partial: 'text-amber-500',
  paid: 'text-emerald-500',
  monthly: 'text-blue-500',
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '待定'
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const fetchDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    record.value = await recordsApi.get(recordId)
  } catch (e: any) {
    error.value = e.response?.data?.error || '获取工单详情失败'
    console.error('获取工单详情失败', e)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/records')
  }
}

const primaryButton = computed(() => {
  if (!record.value) return null
  switch (record.value.status) {
    case 'pending':
      return { label: '开始施工', action: 'start' }
    case 'in_progress':
      return { label: '完成工单', action: 'complete' }
    default:
      return null
  }
})

const handleAction = async (action: string) => {
  if (!record.value) return
  try {
    if (action === 'start') {
      await recordsApi.updateStatus(recordId, 'in_progress')
      record.value.status = 'in_progress'
    } else if (action === 'complete') {
      await recordsApi.updateStatus(recordId, 'completed')
      record.value.status = 'completed'
    }
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

const mockPhotos = [
  'https://picsum.photos/400/300?random=1',
  'https://picsum.photos/400/300?random=2',
  'https://picsum.photos/400/300?random=3',
  'https://picsum.photos/400/300?random=4',
  'https://picsum.photos/400/300?random=5',
  'https://picsum.photos/400/300?random=6',
]

onMounted(fetchDetail)
</script>

<template>
  <div class="min-h-screen-safe bg-muted/30 flex flex-col">
    <div class="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-2 md:h-14 md:px-6 lg:px-8">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="flex-1 text-center font-semibold text-foreground text-base md:text-lg -ml-10 md:-ml-0">
          工单详情
        </h1>
        <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent">
          <MoreVertical class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center text-center px-4">
      <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <button class="text-sm text-primary font-medium" @click="fetchDetail">重试</button>
    </div>

    <div v-else-if="record" class="flex-1 overflow-y-auto">
      <div class="px-4 py-4 md:px-6 lg:px-8 md:py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div class="lg:col-span-2 space-y-4 md:space-y-6">
            <Card class="shadow-sm border-border overflow-hidden">
              <CardContent class="p-5 md:p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', typeColorCls[record.record_type] || typeColorCls.construction]">
                      {{ typeLabels[record.record_type] || record.record_type }}
                    </span>
                    <span class="text-xs text-muted-foreground">{{ record.order_no }}</span>
                  </div>
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', statusColorCls[record.status] || statusColorCls.pending]">
                    {{ statusLabels[record.status] || record.status }}
                  </span>
                </div>
                <h2 class="text-xl md:text-2xl font-bold text-foreground mb-4">{{ record.customer_name }}</h2>
                <div class="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <span class="text-sm text-muted-foreground">费用总额</span>
                    <p class="text-xl md:text-2xl font-bold text-foreground mt-1">¥{{ (record.total_fee || 0).toFixed(2) }}</p>
                  </div>
                  <div v-if="record.payment_status">
                    <span class="text-sm text-muted-foreground">付款状态</span>
                    <p :class="['text-base font-semibold mt-1', paymentColorCls[record.payment_status] || '']">
                      {{ paymentLabels[record.payment_status] || record.payment_status }}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <User class="w-4 h-4 text-primary" /> 客户信息
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0 space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    <User class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-muted-foreground">客户名称</p>
                    <p class="text-sm font-medium text-foreground truncate">{{ record.customer_name }}</p>
                  </div>
                </div>
                <div v-if="record.contact_person" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <Phone class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-muted-foreground">联系人</p>
                    <p class="text-sm font-medium text-foreground truncate">
                      {{ record.contact_person }}<span v-if="record.contact_phone"> · {{ record.contact_phone }}</span>
                    </p>
                  </div>
                </div>
                <div v-if="record.address" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center shrink-0">
                    <MapPin class="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-muted-foreground">施工地址</p>
                    <p class="text-sm font-medium text-foreground">{{ record.address }}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <Calendar class="w-4 h-4 text-primary" /> 时间安排
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0 space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
                    <Calendar class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div class="flex-1 flex justify-between items-center">
                    <p class="text-sm text-muted-foreground">创建时间</p>
                    <p class="text-sm font-medium text-foreground">{{ formatDate(record.created_at) }}</p>
                  </div>
                </div>
                <div v-if="record.appointment_date" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <Clock class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div class="flex-1 flex justify-between items-center">
                    <p class="text-sm text-muted-foreground">预约时间</p>
                    <p class="text-sm font-medium text-foreground">{{ formatDate(record.appointment_date) }}</p>
                  </div>
                </div>
                <div v-if="record.completed_at" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                    <CheckCircle class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div class="flex-1 flex justify-between items-center">
                    <p class="text-sm text-muted-foreground">完成时间</p>
                    <p class="text-sm font-medium text-foreground">{{ formatDate(record.completed_at) }}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <Wrench class="w-4 h-4 text-primary" /> 施工人员
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0">
                <p class="text-sm text-foreground">{{ record.staff_name || '未分配' }}</p>
              </CardContent>
            </Card>

            <div v-if="record.fault_phenomenon || record.fault_judgment || record.process_result || record.remark" class="space-y-4 md:space-y-6">
              <Card v-if="record.fault_phenomenon" class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <FileText class="w-4 h-4 text-primary" /> 故障现象
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0">
                  <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ record.fault_phenomenon }}</p>
                </CardContent>
              </Card>

              <Card v-if="record.fault_judgment" class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <FileText class="w-4 h-4 text-primary" /> 故障判断
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0">
                  <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ record.fault_judgment }}</p>
                </CardContent>
              </Card>

              <Card v-if="record.process_result" class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <FileText class="w-4 h-4 text-primary" /> 处理结果
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0">
                  <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ record.process_result }}</p>
                </CardContent>
              </Card>

              <Card v-if="record.remark" class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <FileText class="w-4 h-4 text-primary" /> 备注
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0">
                  <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ record.remark }}</p>
                </CardContent>
              </Card>
            </div>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <ImageIcon class="w-4 h-4 text-primary" /> 现场照片
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 md:gap-3">
                  <div
                    v-for="(photo, idx) in mockPhotos"
                    :key="idx"
                    class="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <img :src="photo" alt="" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div class="space-y-4 md:space-y-6">
            <div class="hidden lg:block space-y-4">
              <Card class="shadow-sm border-border sticky top-20">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold">操作</CardTitle>
                </CardHeader>
                <CardContent class="pt-0 space-y-3">
                  <Button
                    variant="outline"
                    class="w-full h-11"
                    @click="router.push(`/record/${recordId}/edit`)"
                  >
                    <Edit class="w-4 h-4 mr-2" />
                    编辑工单
                  </Button>
                  <Button
                    v-if="primaryButton"
                    class="w-full h-11"
                    @click="handleAction(primaryButton.action)"
                  >
                    {{ primaryButton.label }}
                  </Button>
                </CardContent>
              </Card>

              <Card v-if="record.labour_fee || record.material_fee || record.travel_fee || record.other_fee" class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <DollarSign class="w-4 h-4 text-primary" /> 费用明细
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0 space-y-2">
                  <div v-if="record.labour_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">人工费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.labour_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.material_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">物料费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.material_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.travel_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">差旅费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.travel_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.other_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">其他费用</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.other_fee.toFixed(2) }}</span>
                  </div>
                  <div class="flex items-center justify-between pt-3 mt-2 border-t border-border/50">
                    <span class="text-sm font-semibold text-foreground">合计</span>
                    <span class="text-lg font-bold text-foreground">¥{{ (record.total_fee || 0).toFixed(2) }}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div v-if="record.labour_fee || record.material_fee || record.travel_fee || record.other_fee" class="lg:hidden">
              <Card class="shadow-sm border-border">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <DollarSign class="w-4 h-4 text-primary" /> 费用明细
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0 space-y-2">
                  <div v-if="record.labour_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">人工费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.labour_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.material_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">物料费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.material_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.travel_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">差旅费</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.travel_fee.toFixed(2) }}</span>
                  </div>
                  <div v-if="record.other_fee" class="flex items-center justify-between py-1.5">
                    <span class="text-sm text-muted-foreground">其他费用</span>
                    <span class="text-sm font-medium text-foreground">¥{{ record.other_fee.toFixed(2) }}</span>
                  </div>
                  <div class="flex items-center justify-between pt-3 mt-2 border-t border-border/50">
                    <span class="text-sm font-semibold text-foreground">合计</span>
                    <span class="text-lg font-bold text-foreground">¥{{ (record.total_fee || 0).toFixed(2) }}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div class="h-24 md:hidden"></div>
      </div>
    </div>

    <div v-if="record" class="lg:hidden sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border p-4 safe-area-bottom">
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1 h-12 rounded-xl text-sm font-medium"
          @click="router.push(`/record/${recordId}/edit`)"
        >
          编辑
        </Button>
        <Button
          v-if="primaryButton"
          class="flex-1 h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          @click="handleAction(primaryButton.action)"
        >
          {{ primaryButton.label }}
        </Button>
      </div>
    </div>
  </div>
</template>
