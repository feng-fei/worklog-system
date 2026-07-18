<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recordsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import {
  MapPin,
  User,
  Phone,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Image,
  Edit,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Share2,
  Printer,
  MoreHorizontal,
  Users,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Building,
  CreditCard,
} from 'lucide-vue-next'
import { formatDate, formatDateTime, relativeTime, formatCurrency } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const recordId = computed(() => Number(route.params.id))
const record = ref<any>(null)
const loading = ref(true)
const showActionMenu = ref(false)
const selectedPhotoIndex = ref<number | null>(null)

const statusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  dispatched: { label: '已派单', variant: 'info' },
  in_progress: { label: '进行中', variant: 'info' },
  callback: { label: '待回访', variant: 'warning' },
  settlement: { label: '待结算', variant: 'secondary' },
  completed: { label: '已完成', variant: 'success' },
  rework: { label: '返工中', variant: 'warning' },
  unable: { label: '无法维修', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const paymentStatusMap: Record<string, { label: string; variant: string }> = {
  unpaid: { label: '未收款', variant: 'destructive' },
  partial: { label: '部分收款', variant: 'warning' },
  paid: { label: '已收款', variant: 'success' },
  monthly: { label: '月结', variant: 'info' },
}

const recordTypeMap: Record<string, { label: string; icon: any }> = {
  construction: { label: '施工', icon: Building },
  maintenance: { label: '维修', icon: Wrench },
  install: { label: '安装', icon: Wrench },
  inspection: { label: '巡检', icon: CheckCircle2 },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const getPaymentStatusInfo = (status: string) => {
  return paymentStatusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const getTypeInfo = (type: string) => {
  return recordTypeMap[type] || { label: type || '工单', icon: FileText }
}

const loadRecord = async () => {
  loading.value = true
  try {
    const res = await recordsApi.get(recordId.value)
    record.value = res.data
  } catch (e) {
    console.error('加载工单详情失败', e)
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('确定要删除这个工单吗？')) return
  try {
    await recordsApi.delete(recordId.value)
    router.back()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}

const handleExportPdf = async () => {
  try {
    const res = await recordsApi.exportPdf(recordId.value)
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `工单_${record.value?.order_no || recordId.value}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出PDF失败', e)
    alert('导出失败，请重试')
  }
}

const handleEdit = () => {
  showActionMenu.value = false
  router.push(`/records/${recordId.value}/edit`)
}

const handleShare = async () => {
  showActionMenu.value = false
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    alert('链接已复制到剪贴板')
  } catch (e) {
    console.error('复制失败', e)
    alert('复制失败，请手动复制链接')
  }
}

const handleToggleStatus = async () => {
  if (!record.value) return
  const newStatus = record.value.status === 'completed' ? 'in_progress' : 'completed'
  const confirmText = newStatus === 'completed' ? '确定要标记为已完成吗？' : '确定要重新打开吗？'
  if (!confirm(confirmText)) return
  try {
    await recordsApi.update(recordId.value, { status: newStatus })
    record.value.status = newStatus
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value
}

const openPhotoPreview = (index: number) => {
  selectedPhotoIndex.value = index
}

const closePhotoPreview = () => {
  selectedPhotoIndex.value = null
}

const getPhotoList = () => {
  return record.value?.photos || record.value?.work_photos || []
}

const prevPhoto = () => {
  if (selectedPhotoIndex.value === null) return
  const len = getPhotoList().length
  if (len === 0) return
  selectedPhotoIndex.value = (selectedPhotoIndex.value - 1 + len) % len
}

const nextPhoto = () => {
  if (selectedPhotoIndex.value === null) return
  const len = getPhotoList().length
  if (len === 0) return
  selectedPhotoIndex.value = (selectedPhotoIndex.value + 1) % len
}

const feeItems = computed(() => {
  if (!record.value?.fee_items || record.value.fee_items.length === 0) {
    const items: any[] = []
    if (record.value?.labor_fee > 0) items.push({ type: '人工费', typeKey: 'labor', amount: record.value.labor_fee })
    if (record.value?.material_fee > 0) items.push({ type: '材料费', typeKey: 'material', amount: record.value.material_fee })
    if (record.value?.transport_fee > 0) items.push({ type: '交通费', typeKey: 'transport', amount: record.value.transport_fee })
    if (record.value?.equipment_fee_total > 0) items.push({ type: '设备费', typeKey: 'equipment', amount: record.value.equipment_fee_total })
    if (record.value?.meal_fee > 0) items.push({ type: '餐饮费', typeKey: 'meal', amount: record.value.meal_fee })
    if (record.value?.accommodation_fee > 0) items.push({ type: '住宿费', typeKey: 'accommodation', amount: record.value.accommodation_fee })
    if (record.value?.other_fee > 0) items.push({ type: '其他费用', typeKey: 'other', amount: record.value.other_fee })
    return items
  }
  return record.value.fee_items.map((item: any) => ({
    type: item.type || '费用',
    typeKey: item.type,
    desc: item.desc || '',
    qty: item.qty,
    unit: item.unit,
    price: item.price,
    amount: item.subtotal || (item.qty && item.price ? item.qty * item.price : 0),
  }))
})

const regularFeeItems = computed(() => {
  const materialTypes = ['material', 'equipment', '材料费', '设备费']
  return feeItems.value.filter(item => !materialTypes.includes(item.typeKey) && !materialTypes.includes(item.type))
})

const materialFeeItems = computed(() => {
  const materialTypes = ['material', 'equipment', '材料费', '设备费']
  return feeItems.value.filter(item => materialTypes.includes(item.typeKey) || materialTypes.includes(item.type))
})

const staffList = computed(() => {
  if (record.value?.staff_names && record.value.staff_names.length > 0) {
    return record.value.staff_names.filter((n: string) => n && n.trim())
  }
  if (record.value?.staff_name) {
    return [record.value.staff_name]
  }
  return []
})

onMounted(() => {
  loadRecord()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- 移动端顶部导航 -->
    <div class="lg:hidden">
      <div class="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent transition-colors"
          @click="router.back()"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="text-lg font-semibold">工单详情</h1>
        <div class="relative">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent transition-colors"
            @click="toggleActionMenu"
          >
            <MoreHorizontal class="h-5 w-5" />
          </button>
          <div
            v-if="showActionMenu"
            class="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-xl"
          >
            <button
              class="flex w-full items-center gap-3 px-4 py-3 text-base hover:bg-muted transition-colors text-left"
              @click="handleEdit"
            >
              <Edit class="h-5 w-5" />
              编辑工单
            </button>
            <button
              class="flex w-full items-center gap-3 px-4 py-3 text-base hover:bg-muted transition-colors text-left"
              @click="handleExportPdf"
            >
              <Printer class="h-5 w-5" />
              打印/导出PDF
            </button>
            <button
              class="flex w-full items-center gap-3 px-4 py-3 text-base hover:bg-muted transition-colors text-left"
              @click="handleShare"
            >
              <Share2 class="h-5 w-5" />
              分享链接
            </button>
            <button
              class="flex w-full items-center gap-3 px-4 py-3 text-base hover:bg-muted transition-colors text-left text-destructive"
              @click="handleDelete"
            >
              <Trash2 class="h-5 w-5" />
              删除工单
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p class="text-base">加载中...</p>
      </div>
    </div>

    <!-- 工单内容 -->
    <template v-else-if="record">
      <div class="flex-1 overflow-y-auto pb-24 lg:pb-8">
        <!-- PC端顶部操作栏 -->
        <div class="hidden lg:block sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div class="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button
                class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent transition-colors"
                @click="router.back()"
              >
                <ArrowLeft class="h-5 w-5" />
              </button>
              <h1 class="text-xl font-semibold">工单详情</h1>
            </div>
            <div class="flex items-center gap-3">
              <Button variant="outline" @click="handleShare">
                <Share2 class="h-4 w-4 mr-2" />
                分享
              </Button>
              <Button variant="outline" @click="handleExportPdf">
                <Printer class="h-4 w-4 mr-2" />
                打印
              </Button>
              <Button variant="outline" @click="handleEdit">
                <Edit class="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button @click="handleToggleStatus">
                <CheckCircle v-if="record.status !== 'completed'" class="h-4 w-4 mr-2" />
                {{ record.status === 'completed' ? '重新打开' : '标记完成' }}
              </Button>
            </div>
          </div>
        </div>

        <div class="mx-auto max-w-7xl p-4 lg:p-6">
          <!-- 顶部工单编号和状态卡片 -->
          <Card class="mb-6 overflow-hidden">
            <div class="bg-gradient-to-r from-primary to-primary/80 p-6 lg:p-8 text-primary-foreground">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <component :is="getTypeInfo(record.record_type).icon" class="h-6 w-6" />
                    <span class="text-base opacity-90">{{ getTypeInfo(record.record_type).label }}工单</span>
                  </div>
                  <h2 class="text-2xl lg:text-3xl font-bold tracking-tight">
                    {{ record.order_no || '#' + record.id }}
                  </h2>
                  <p class="mt-2 text-base opacity-80">
                    创建于 {{ formatDateTime(record.created_at) }} ({{ relativeTime(record.created_at) }})
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge variant="outline" class="bg-white/20 text-white border-white/30 text-base px-4 py-1.5">
                    {{ getStatusInfo(record.status).label }}
                  </Badge>
                  <Badge variant="outline" class="bg-white/20 text-white border-white/30 text-base px-4 py-1.5">
                    {{ getPaymentStatusInfo(record.payment_status).label }}
                  </Badge>
                </div>
              </div>
            </div>

            <!-- 工作标题/内容摘要 -->
            <div class="p-6 lg:p-8 border-b border-border">
              <h3 class="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText class="h-5 w-5 text-primary" />
                工单标题
              </h3>
              <p class="text-xl lg:text-2xl font-medium leading-relaxed text-foreground">
                {{ record.title || record.work_content?.slice(0, 50) || '无标题' }}
              </p>
            </div>
          </Card>

          <!-- 两栏布局 (PC端) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 左侧主内容 -->
            <div class="lg:col-span-2 space-y-6">
              <!-- 客户信息 -->
              <Card class="p-6">
                <h3 class="text-xl font-semibold mb-5 flex items-center gap-2">
                  <User class="h-6 w-6 text-primary" />
                  客户信息
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div class="flex items-start gap-3">
                    <Building class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-muted-foreground mb-1">客户名称</p>
                      <p class="text-lg font-medium">{{ record.customer_name || '-' }}</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <User class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-muted-foreground mb-1">联系人</p>
                      <p class="text-lg font-medium">{{ record.contact_name || record.contact_person || '-' }}</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <Phone class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-muted-foreground mb-1">联系电话</p>
                      <p class="text-lg font-medium">
                        <a v-if="record.customer_phone || record.contact_phone" :href="'tel:' + (record.customer_phone || record.contact_phone)" class="text-primary hover:underline">
                          {{ record.customer_phone || record.contact_phone }}
                        </a>
                        <span v-else>-</span>
                      </p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3 md:col-span-2">
                    <MapPin class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-muted-foreground mb-1">工作地址</p>
                      <p class="text-lg font-medium leading-relaxed">{{ record.work_address || '-' }}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- 工作内容 -->
              <Card class="p-6">
                <h3 class="text-xl font-semibold mb-5 flex items-center gap-2">
                  <FileText class="h-6 w-6 text-primary" />
                  工作内容
                </h3>

                <!-- 施工内容 / 故障描述 -->
                <div class="space-y-6">
                  <div v-if="record.record_type === 'repair'">
                    <h4 class="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertCircle class="h-5 w-5 text-orange-500" />
                      故障描述
                    </h4>
                    <div class="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 p-5">
                      <p class="text-lg leading-relaxed whitespace-pre-wrap">
                        {{ record.fault_description || record.work_content || '暂无故障描述' }}
                      </p>
                    </div>
                  </div>

                  <div v-else>
                    <h4 class="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <FileText class="h-5 w-5 text-blue-500" />
                      工作内容
                    </h4>
                    <div class="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-5">
                      <p class="text-lg leading-relaxed whitespace-pre-wrap">
                        {{ record.work_content || '暂无工作内容' }}
                      </p>
                    </div>
                  </div>

                  <div v-if="record.fault_diagnosis">
                    <h4 class="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Wrench class="h-5 w-5 text-purple-500" />
                      故障诊断
                    </h4>
                    <div class="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 p-5">
                      <p class="text-lg leading-relaxed whitespace-pre-wrap">{{ record.fault_diagnosis }}</p>
                    </div>
                  </div>

                  <div v-if="record.repair_process">
                    <h4 class="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Wrench class="h-5 w-5 text-green-500" />
                      维修/施工过程
                    </h4>
                    <div class="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 p-5">
                      <p class="text-lg leading-relaxed whitespace-pre-wrap">{{ record.repair_process }}</p>
                    </div>
                  </div>

                  <div v-if="record.remark">
                    <h4 class="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <FileText class="h-5 w-5 text-gray-500" />
                      备注信息
                    </h4>
                    <div class="rounded-xl bg-muted/50 p-5">
                      <p class="text-lg leading-relaxed whitespace-pre-wrap">{{ record.remark }}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- 图片附件 -->
              <Card v-if="(record.photos && record.photos.length > 0) || (record.work_photos && record.work_photos.length > 0)" class="p-6">
                <h3 class="text-xl font-semibold mb-5 flex items-center gap-2">
                  <Image class="h-6 w-6 text-primary" />
                  现场照片
                  <span class="text-base font-normal text-muted-foreground">
                    ({{ (record.photos || record.work_photos || []).length }}张)
                  </span>
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div
                    v-for="(photo, index) in (record.photos || record.work_photos || [])"
                    :key="index"
                    class="aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                    @click="openPhotoPreview(index)"
                  >
                    <img
                      :src="photo.url || photo"
                      class="h-full w-full object-cover"
                      :alt="'现场照片 ' + (index + 1)"
                      loading="lazy"
                    />
                  </div>
                </div>
              </Card>

              <!-- 图片预览弹窗 -->
              <div
                v-if="selectedPhotoIndex !== null"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                @click="closePhotoPreview"
              >
                <button
                  class="absolute top-4 right-4 text-white/80 hover:text-white p-2"
                  @click.stop="closePhotoPreview"
                >
                  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <button
                  class="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 bg-white/10 rounded-full"
                  @click.stop="prevPhoto"
                >
                  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 bg-white/10 rounded-full"
                  @click.stop="nextPhoto"
                >
                  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <img
                  :src="getPhotoList()[selectedPhotoIndex]?.url || getPhotoList()[selectedPhotoIndex]"
                  class="max-h-[90vh] max-w-[90vw] object-contain"
                  :alt="'照片预览'"
                  @click.stop
                />
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-base">
                  {{ selectedPhotoIndex + 1 }} / {{ getPhotoList().length }}
                </div>
              </div>
            </div>

            <!-- 右侧信息栏 -->
            <div class="space-y-6">
              <!-- 时间和人员信息 -->
              <Card class="p-6">
                <h3 class="text-xl font-semibold mb-5 flex items-center gap-2">
                  <Clock class="h-6 w-6 text-primary" />
                  时间与人员
                </h3>
                <div class="space-y-5">
                  <div class="flex items-start gap-3">
                    <Calendar class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">工作日期</p>
                      <p class="text-lg font-medium">{{ record.work_date ? formatDate(record.work_date) : '-' }}</p>
                    </div>
                  </div>
                  <div v-if="record.start_time || record.end_time" class="flex items-start gap-3">
                    <Clock class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">工作时间</p>
                      <p class="text-lg font-medium">
                        {{ record.start_time || '--:--' }} ~ {{ record.end_time || '--:--' }}
                      </p>
                    </div>
                  </div>
                  <div v-if="record.work_hours" class="flex items-start gap-3">
                    <Clock class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">工时</p>
                      <p class="text-lg font-medium">{{ record.work_hours }} 小时</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <Users class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">负责人员</p>
                      <div class="flex flex-wrap gap-2 mt-1">
                        <span
                          v-for="(name, idx) in staffList"
                          :key="idx"
                          class="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-base font-medium"
                        >
                          {{ name }}
                        </span>
                        <span v-if="staffList.length === 0" class="text-lg text-muted-foreground">-</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <User class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">创建人</p>
                      <p class="text-lg font-medium">{{ record.created_by || '-' }}</p>
                    </div>
                  </div>
                  <div v-if="record.updated_at" class="flex items-start gap-3">
                    <Clock class="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-sm text-muted-foreground mb-1">更新时间</p>
                      <p class="text-base">{{ formatDateTime(record.updated_at) }}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- 费用信息 -->
              <Card class="p-6">
                <h3 class="text-xl font-semibold mb-5 flex items-center gap-2">
                  <DollarSign class="h-6 w-6 text-primary" />
                  费用明细
                </h3>

                <div v-if="regularFeeItems.length > 0" class="mb-6">
                  <h4 class="text-sm font-medium text-muted-foreground mb-3">常规费用</h4>
                  <div class="space-y-3">
                    <div
                      v-for="(item, idx) in regularFeeItems"
                      :key="'regular-' + idx"
                      class="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p class="text-base font-medium">{{ item.type }}</p>
                        <p v-if="item.desc" class="text-sm text-muted-foreground">{{ item.desc }}</p>
                        <p v-if="item.qty && item.price" class="text-sm text-muted-foreground">
                          {{ item.qty }}{{ item.unit || '' }} × ¥{{ item.price }}
                        </p>
                      </div>
                      <p class="text-lg font-semibold">{{ formatCurrency(item.amount) }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="materialFeeItems.length > 0" class="mb-6">
                  <h4 class="text-sm font-medium text-muted-foreground mb-3">设备材料费用</h4>
                  <div class="space-y-3">
                    <div
                      v-for="(item, idx) in materialFeeItems"
                      :key="'material-' + idx"
                      class="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p class="text-base font-medium">{{ item.type }}</p>
                        <p v-if="item.desc" class="text-sm text-muted-foreground">{{ item.desc }}</p>
                        <p v-if="item.qty && item.price" class="text-sm text-muted-foreground">
                          {{ item.qty }}{{ item.unit || '' }} × ¥{{ item.price }}
                        </p>
                      </div>
                      <p class="text-lg font-semibold">{{ formatCurrency(item.amount) }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="record.tax_type === 'tax' && record.tax_amount > 0" class="flex items-center justify-between py-3 border-b border-border">
                  <p class="text-base">税费 ({{ ((record.tax_rate || 0.03) * 100).toFixed(0) }}%)</p>
                  <p class="text-lg font-semibold">{{ formatCurrency(record.tax_amount) }}</p>
                </div>

                <div class="mt-5 pt-5 border-t-2 border-border">
                  <div class="flex items-center justify-between">
                    <span class="text-lg font-semibold">总计金额</span>
                    <span class="text-3xl font-bold text-primary">
                      {{ formatCurrency(record.amount || record.total_fee || 0) }}
                    </span>
                  </div>
                  <div v-if="record.paid_amount > 0" class="mt-3 flex items-center justify-between text-base">
                    <span class="text-muted-foreground">已收款</span>
                    <span class="font-medium text-green-600 dark:text-green-400">
                      {{ formatCurrency(record.paid_amount) }}
                    </span>
                  </div>
                  <div v-if="record.payment_status !== 'paid'" class="mt-2 flex items-center justify-between text-base">
                    <span class="text-muted-foreground">待收款</span>
                    <span class="font-medium text-orange-600 dark:text-orange-400">
                      {{ formatCurrency((record.amount || record.total_fee || 0) - (record.paid_amount || 0)) }}
                    </span>
                  </div>
                </div>

                <div class="mt-5 flex items-center gap-2">
                  <CreditCard class="h-5 w-5 text-muted-foreground" />
                  <Badge :variant="getPaymentStatusInfo(record.payment_status).variant as any" class="text-sm">
                    {{ getPaymentStatusInfo(record.payment_status).label }}
                  </Badge>
                </div>
              </Card>

              <!-- 移动端底部操作按钮占位 (实际按钮固定在底部) -->
              <div class="lg:hidden h-4"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端底部操作按钮 -->
      <div class="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4 pb-safe z-40">
        <div class="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" size="lg" class="flex-1" @click="router.back()">
            <ArrowLeft class="h-5 w-5 mr-1" />
            返回
          </Button>
          <Button variant="outline" size="lg" class="flex-1" @click="handleEdit">
            <Edit class="h-5 w-5 mr-1" />
            编辑
          </Button>
          <Button size="lg" class="flex-1" @click="handleToggleStatus">
            <CheckCircle v-if="record.status !== 'completed'" class="h-5 w-5 mr-1" />
            {{ record.status === 'completed' ? '重新打开' : '完成' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
