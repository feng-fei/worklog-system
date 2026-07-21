<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsApi, recordsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  User,
  Calendar,
  FileText,
  DollarSign,
  Users,
  Edit,
  Building2,
  Clock,
  ClipboardList,
  Wallet,
  UserCog,
  TrendingUp,
  TrendingDown,
  MapPin,
  Phone,
  Plus,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Circle,
  FileImage,
} from 'lucide-vue-next'
import { formatDate, formatCurrency } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => Number(route.params.id))
const project = ref<any>(null)
const loading = ref(true)
const activeTab = ref('info')

const records = ref<any[]>([])
const recordsLoading = ref(false)

const payments = ref<any[]>([])
const expenses = ref<any[]>([])
const financeLoading = ref(false)

const statusMap: Record<string, { label: string; variant: string }> = {
  planning: { label: '规划中', variant: 'secondary' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  paused: { label: '已暂停', variant: 'warning' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

const recordStatusMap: Record<string, { label: string; variant: string; icon: any }> = {
  pending: { label: '待办', variant: 'secondary', icon: Circle },
  dispatched: { label: '已派单', variant: 'warning', icon: Loader2 },
  in_progress: { label: '进行中', variant: 'info', icon: Loader2 },
  completed: { label: '已完成', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: '已取消', variant: 'destructive', icon: Circle },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const getRecordStatusInfo = (status: string) => {
  return recordStatusMap[status] || { label: status || '未知', variant: 'secondary', icon: Circle }
}

const loadProject = async () => {
  loading.value = true
  try {
    const res = await projectsApi.get(projectId.value)
    const data = res.data
    project.value = data.project || data
  } catch (e) {
    console.error('加载项目详情失败', e)
  } finally {
    loading.value = false
  }
}

const loadRecords = async () => {
  if (recordsLoading.value) return
  recordsLoading.value = true
  try {
    const res = await recordsApi.list({ project_id: projectId.value, per_page: 50 })
    const data = res.data
    records.value = data.records || data.list || data.items || []
  } catch (e) {
    console.error('加载工单列表失败', e)
  } finally {
    recordsLoading.value = false
  }
}

const loadFinance = async () => {
  financeLoading.value = true
  try {
    const [payRes, expRes] = await Promise.all([
      recordsApi.payments({ project_id: projectId.value, per_page: 50 }).catch(() => ({ data: { records: [] } })),
      recordsApi.expenses({ project_id: projectId.value, per_page: 50 }).catch(() => ({ data: { records: [] } })),
    ])
    payments.value = payRes.data.records || payRes.data.list || []
    expenses.value = expRes.data.records || expRes.data.list || []
  } catch (e) {
    console.error('加载财务数据失败', e)
  } finally {
    financeLoading.value = false
  }
}

const goToEdit = () => {
  router.push(`/projects/${projectId.value}/edit`)
}

const goToCreateRecord = () => {
  router.push(`/records/create?project_id=${projectId.value}`)
}

const goToRecordDetail = (id: number) => {
  router.push(`/records/${id}`)
}

const getProgress = () => {
  if (!project.value) return 0
  if (project.value.progress !== undefined) return project.value.progress
  if (records.value.length > 0) {
    const completed = records.value.filter(r => r.status === 'completed').length
    return Math.round(completed / records.value.length * 100)
  }
  return 0
}

const financeStats = computed(() => {
  const totalIncome = payments.value.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalExpense = expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
  const contractAmount = project.value?.contract_amount || 0
  const budgetAmount = project.value?.budget_amount || 0
  const recordTotalFee = records.value.reduce((sum, r) => sum + (r.total_fee || 0), 0)
  const recordPaid = records.value.reduce((sum, r) => sum + (r.paid_amount || 0), 0)
  
  return {
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    contractAmount,
    budgetAmount,
    recordTotalFee,
    recordPaid,
    receivable: recordTotalFee - recordPaid,
  }
})

const photos = computed(() => {
  if (!project.value) return []
  const urls: string[] = []
  if (project.value.photos) {
    if (Array.isArray(project.value.photos)) {
      urls.push(...project.value.photos)
    } else if (typeof project.value.photos === 'string') {
      urls.push(...project.value.photos.split(',').filter(Boolean))
    }
  }
  if (project.value.attachments) {
    if (Array.isArray(project.value.attachments)) {
      urls.push(...project.value.attachments)
    } else if (typeof project.value.attachments === 'string') {
      urls.push(...project.value.attachments.split(',').filter(Boolean))
    }
  }
  return urls
})

const completedCount = computed(() => records.value.filter(r => r.status === 'completed').length)
const pendingCount = computed(() => records.value.filter(r => ['pending', 'dispatched', 'in_progress'].includes(r.status)).length)

onMounted(() => {
  loadProject().then(() => {
    loadRecords()
    loadFinance()
  })
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      title="项目详情"
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

    <template v-else-if="project">
      <div class="flex-1 overflow-y-auto pb-6">
        <div class="bg-gradient-to-br from-primary via-primary to-primary/90 px-4 pt-5 pb-8 text-primary-foreground">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h1 class="text-lg font-bold leading-tight">
                {{ project.name || project.project_name || '未命名项目' }}
              </h1>
              <div class="mt-1.5 flex items-center gap-2 text-sm opacity-90">
                <Building2 class="h-3.5 w-3.5" />
                <span class="truncate">{{ project.customer_name || '未指定客户' }}</span>
              </div>
              <div v-if="project.project_no" class="mt-1 text-xs opacity-70">
                项目编号: {{ project.project_no }}
              </div>
            </div>
            <Badge variant="outline" class="bg-white/20 text-white border-white/30 flex-shrink-0 text-xs">
              {{ getStatusInfo(project.status).label }}
            </Badge>
          </div>

          <div class="mt-4">
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="opacity-80">项目进度</span>
              <span class="font-semibold">{{ getProgress() }}%</span>
            </div>
            <div class="h-2 w-full rounded-full bg-white/25 overflow-hidden">
              <div
                class="h-full rounded-full bg-white transition-all duration-500"
                :style="{ width: getProgress() + '%' }"
              ></div>
            </div>
            <div class="mt-2 flex items-center gap-4 text-xs opacity-80">
              <span>已完成 {{ completedCount }}</span>
              <span>进行中 {{ pendingCount }}</span>
              <span>总计 {{ records.length }}</span>
            </div>
          </div>
        </div>

        <div class="px-4 -mt-4">
          <div class="grid grid-cols-2 gap-3">
            <Card class="p-4 rounded-2xl shadow-sm">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10">
                  <TrendingUp class="h-5 w-5 text-success" />
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">总收入</p>
                  <p class="text-lg font-bold text-success">{{ formatCurrency(financeStats.totalIncome) }}</p>
                </div>
              </div>
            </Card>
            <Card class="p-4 rounded-2xl shadow-sm">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                  <TrendingDown class="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">总支出</p>
                  <p class="text-lg font-bold text-destructive">{{ formatCurrency(financeStats.totalExpense) }}</p>
                </div>
              </div>
            </Card>
            <Card class="p-4 rounded-2xl shadow-sm">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Wallet class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">利润</p>
                  <p class="text-lg font-bold" :class="financeStats.profit >= 0 ? 'text-success' : 'text-destructive'">
                    {{ formatCurrency(financeStats.profit) }}
                  </p>
                </div>
              </div>
            </Card>
            <Card class="p-4 rounded-2xl shadow-sm">
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10">
                  <DollarSign class="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">待收款</p>
                  <p class="text-lg font-bold text-warning">{{ formatCurrency(financeStats.receivable) }}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div class="mt-4 px-4">
          <div class="flex gap-1 rounded-xl bg-muted p-1">
            <button
              v-for="tab in [
                { key: 'info', label: '基本信息', icon: FileText },
                { key: 'records', label: '工单', icon: ClipboardList, badge: records.length },
                { key: 'finance', label: '收支', icon: Wallet },
                { key: 'photos', label: '资料', icon: FileImage },
              ]"
              :key="tab.key"
              class="flex-1 relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors"
              :class="activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="h-4 w-4" />
              <span class="hidden sm:inline">{{ tab.label }}</span>
              <span v-if="tab.badge" class="sm:hidden text-xs">({{ tab.badge }})</span>
              <span v-if="tab.badge" class="hidden sm:inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] text-primary">
                {{ tab.badge }}
              </span>
            </button>
          </div>
        </div>

        <div class="px-4 py-4 space-y-4">
          <div v-show="activeTab === 'info'" class="space-y-4">
            <Card class="p-4 rounded-2xl">
              <h3 class="mb-3 flex items-center gap-2 font-semibold text-sm">
                <FileText class="h-4 w-4 text-primary" />
                基本信息
              </h3>
              <div class="space-y-3 text-sm">
                <div class="flex items-start gap-3">
                  <Building2 class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="flex-1">
                    <p class="text-muted-foreground text-xs">客户名称</p>
                    <p class="font-medium">{{ project.customer_name || '-' }}</p>
                  </div>
                </div>
                <div v-if="project.contact_name || project.contact_phone" class="grid grid-cols-2 gap-3">
                  <div class="flex items-start gap-2" v-if="project.contact_name">
                    <User class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-muted-foreground text-xs">联系人</p>
                      <p class="font-medium">{{ project.contact_name }}</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-2" v-if="project.contact_phone">
                    <Phone class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-muted-foreground text-xs">联系电话</p>
                      <p class="font-medium">{{ project.contact_phone }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="project.project_address" class="flex items-start gap-3">
                  <MapPin class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div class="flex-1">
                    <p class="text-muted-foreground text-xs">项目地址</p>
                    <p class="font-medium">{{ project.project_address }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <UserCog class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground text-xs">项目负责人</p>
                    <p class="font-medium">{{ project.manager || project.manager_name || project.staff_name || '-' }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex items-start gap-2">
                    <Calendar class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-muted-foreground text-xs">开始日期</p>
                      <p class="font-medium">{{ project.start_date ? formatDate(project.start_date) : '-' }}</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-2">
                    <Clock class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p class="text-muted-foreground text-xs">预计结束</p>
                      <p class="font-medium">{{ project.end_date ? formatDate(project.end_date) : '-' }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="project.contract_amount || project.budget_amount" class="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div v-if="project.contract_amount">
                    <p class="text-muted-foreground text-xs">合同金额</p>
                    <p class="font-medium text-success">{{ formatCurrency(project.contract_amount) }}</p>
                  </div>
                  <div v-if="project.budget_amount">
                    <p class="text-muted-foreground text-xs">预算金额</p>
                    <p class="font-medium">{{ formatCurrency(project.budget_amount) }}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card v-if="project.description || project.remark" class="p-4 rounded-2xl">
              <h3 class="mb-2 font-semibold text-sm">项目描述</h3>
              <div class="rounded-xl bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {{ project.description || project.remark }}
              </div>
            </Card>
          </div>

          <div v-show="activeTab === 'records'" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <ClipboardList class="h-5 w-5 text-primary" />
                关联工单
                <Badge variant="secondary" size="sm">{{ records.length }}</Badge>
              </h3>
              <Button size="sm" @click="goToCreateRecord">
                <Plus class="h-4 w-4 mr-1" />
                新增
              </Button>
            </div>

            <div v-if="recordsLoading && records.length === 0" class="py-8 text-center text-muted-foreground">
              <div class="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p class="text-sm">加载中...</p>
            </div>

            <div v-else-if="records.length === 0" class="py-10 text-center">
              <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ClipboardList class="h-7 w-7 text-muted-foreground" />
              </div>
              <p class="text-sm text-muted-foreground mb-3">暂无关联工单</p>
              <Button size="sm" @click="goToCreateRecord">
                <Plus class="h-4 w-4 mr-1" />
                添加第一个工单
              </Button>
            </div>

            <template v-else>
              <Card
                v-for="record in records"
                :key="record.id"
                class="p-3.5 cursor-pointer active:scale-[0.99] transition-transform rounded-xl"
                @click="goToRecordDetail(record.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-mono text-muted-foreground">
                        {{ record.order_no || '#' + record.id }}
                      </span>
                      <Badge :variant="getRecordStatusInfo(record.status).variant as any" size="sm">
                        {{ getRecordStatusInfo(record.status).label }}
                      </Badge>
                    </div>
                    <p class="text-sm font-medium line-clamp-1">
                      {{ record.work_content || record.customer_name || '无内容' }}
                    </p>
                    <div class="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{{ record.staff_name || '未分配' }}</span>
                      <span>{{ record.work_date ? formatDate(record.work_date) : '-' }}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p v-if="record.total_fee" class="text-sm font-semibold">{{ formatCurrency(record.total_fee) }}</p>
                    <ChevronRight class="h-5 w-5 text-muted-foreground/50 mt-1 ml-auto" />
                  </div>
                </div>
              </Card>
            </template>
          </div>

          <div v-show="activeTab === 'finance'" class="space-y-4">
            <Card class="p-4 rounded-2xl">
              <h3 class="mb-3 font-semibold text-sm flex items-center gap-2">
                <TrendingUp class="h-4 w-4 text-success" />
                收款记录
              </h3>
              <div v-if="payments.length === 0" class="py-6 text-center text-sm text-muted-foreground">
                暂无收款记录
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="pay in payments"
                  :key="pay.id"
                  class="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p class="text-sm font-medium">{{ formatDate(pay.payment_date) }}</p>
                    <p class="text-xs text-muted-foreground">{{ pay.remark || pay.payment_method || '收款' }}</p>
                  </div>
                  <p class="text-sm font-semibold text-success">+{{ formatCurrency(pay.amount) }}</p>
                </div>
              </div>
            </Card>

            <Card class="p-4 rounded-2xl">
              <h3 class="mb-3 font-semibold text-sm flex items-center gap-2">
                <TrendingDown class="h-4 w-4 text-destructive" />
                支出记录
              </h3>
              <div v-if="expenses.length === 0" class="py-6 text-center text-sm text-muted-foreground">
                暂无支出记录
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="exp in expenses"
                  :key="exp.id"
                  class="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p class="text-sm font-medium">{{ formatDate(exp.expense_date) }}</p>
                    <p class="text-xs text-muted-foreground">{{ exp.category || exp.remark || '支出' }}</p>
                  </div>
                  <p class="text-sm font-semibold text-destructive">-{{ formatCurrency(exp.amount) }}</p>
                </div>
              </div>
            </Card>
          </div>

          <div v-show="activeTab === 'photos'" class="space-y-4">
            <Card class="p-4 rounded-2xl">
              <h3 class="mb-3 font-semibold text-sm flex items-center gap-2">
                <FileImage class="h-4 w-4 text-primary" />
                项目资料
              </h3>
              <div v-if="photos.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                暂无资料图片
              </div>
              <div v-else class="grid grid-cols-3 gap-2">
                <div
                  v-for="(url, idx) in photos"
                  :key="idx"
                  class="aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img :src="url" class="w-full h-full object-cover" :alt="`资料${idx + 1}`" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
