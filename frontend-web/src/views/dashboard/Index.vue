<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { statisticsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Menu,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ChevronRight,
  Bell,
  Eye,
  Plus,
  Building2,
  Package,
  Wallet,
  DollarSign,
  FileText,
  Briefcase,
  Wrench,
  ShieldAlert,
  BarChart3,
  CreditCard,
  Receipt,
} from 'lucide-vue-next'
import { formatDate, relativeTime, formatCurrency } from '@/lib/utils'

const { isDesktop, isMobile } = useResponsive()
const router = useRouter()
const userStore = useUserStore()
const toggleSidebar = inject('toggleSidebar', () => {})

const stats = ref({
  todayRecords: 0,
  pendingRecords: 0,
  completedRecords: 0,
  pendingWorks: 0,
  monthTotal: 0,
  monthPayment: 0,
  monthExpense: 0,
  monthProfit: 0,
  unpaidAmount: 0,
  unpaidSalary: 0,
  customerCount: 0,
  activeProjectCount: 0,
  materialCount: 0,
  lowStockCount: 0,
  dueMaintenanceCount: 0,
  totalRecords: 0,
})

const recentRecords = ref<any[]>([])
const recentPendings = ref<any[]>([])
const recentPayments = ref<any[]>([])
const recentExpenses = ref<any[]>([])
const topCustomers = ref<any[]>([])
const loading = ref(true)

const loadDashboard = async () => {
  loading.value = true
  try {
    const res = await statisticsApi.dashboard()
    const data = res.data
    stats.value = {
      todayRecords: data.today_count || 0,
      pendingRecords: data.pending_count || 0,
      completedRecords: data.month_count || 0,
      pendingWorks: data.overdue_pending || 0,
      monthTotal: data.month_total || 0,
      monthPayment: data.month_payment || 0,
      monthExpense: data.month_expense || 0,
      monthProfit: data.month_profit || 0,
      unpaidAmount: data.unpaid_amount || 0,
      unpaidSalary: data.unpaid_salary || 0,
      customerCount: data.customer_count || 0,
      activeProjectCount: data.active_project_count || 0,
      materialCount: data.material_count || 0,
      lowStockCount: data.low_stock_count || 0,
      dueMaintenanceCount: data.due_maintenance_count || 0,
      totalRecords: data.total_count || 0,
    }
    recentRecords.value = data.recent_records || data.today_records || []
    recentPendings.value = Array.isArray(data.urgent_pending) ? data.urgent_pending : (data.overdue_pending_list || [])
    recentPayments.value = data.recent_payments || []
    recentExpenses.value = data.recent_expenses || []
    topCustomers.value = data.top_customers || []
  } catch (e) {
    console.error('加载工作台失败', e)
  } finally {
    loading.value = false
  }
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const statusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const goToRecordDetail = (id: number) => {
  router.push(`/records/${id}`)
}

const goToRecordList = () => {
  router.push('/records')
}

const goToPendingList = () => {
  router.push('/pending')
}

const goToCustomerList = () => {
  router.push('/customers')
}

const goToProjectList = () => {
  router.push('/projects')
}

const goToMaterialList = () => {
  router.push('/materials')
}

const goToFinance = () => {
  router.push('/finance')
}

const goToSalary = () => {
  router.push('/finance/salaries')
}

const goToStatistics = () => {
  router.push('/reports')
}

const goToCreateRecord = () => {
  router.push('/records/create')
}

const goToCreateCustomer = () => {
  router.push('/customers/create')
}

const goToCalendar = () => {
  router.push('/calendar')
}

const goToMaintenance = () => {
  router.push('/customers?tab=maintenance')
}

const quickActions = computed(() => [
  { label: '新建工单', icon: ClipboardList, color: 'primary', action: goToCreateRecord },
  { label: '客户管理', icon: Users, color: 'success', action: goToCustomerList },
  { label: '项目管理', icon: Briefcase, color: 'info', action: goToProjectList },
  { label: '待办事项', icon: Clock, color: 'warning', action: goToPendingList },
  { label: '物料管理', icon: Package, color: 'primary', action: goToMaterialList },
  { label: '财务管理', icon: Wallet, color: 'success', action: goToFinance },
  { label: '日程日历', icon: Calendar, color: 'warning', action: goToCalendar },
  { label: '统计报表', icon: BarChart3, color: 'info', action: goToStatistics },
])

const statCards = computed(() => [
  { label: '今日工单', value: stats.value.todayRecords, icon: ClipboardList, color: 'primary', action: goToRecordList },
  { label: '待办工单', value: stats.value.pendingRecords, icon: Clock, color: 'destructive', action: goToRecordList },
  { label: '本月工单', value: stats.value.completedRecords, icon: CheckCircle2, color: 'success', action: goToRecordList },
  { label: '超期待办', value: stats.value.pendingWorks, icon: AlertCircle, color: 'warning', action: goToPendingList },
  { label: '本月收入', value: formatCurrency(stats.value.monthPayment), icon: DollarSign, color: 'success', action: goToFinance, isCurrency: true },
  { label: '本月支出', value: formatCurrency(stats.value.monthExpense), icon: Receipt, color: 'destructive', action: goToFinance, isCurrency: true },
  { label: '未收款', value: formatCurrency(stats.value.unpaidAmount), icon: CreditCard, color: 'warning', action: goToFinance, isCurrency: true },
  { label: '客户总数', value: stats.value.customerCount, icon: Users, color: 'info', action: goToCustomerList },
  { label: '进行中项目', value: stats.value.activeProjectCount, icon: Briefcase, color: 'primary', action: goToProjectList },
  { label: '物料总数', value: stats.value.materialCount, icon: Package, color: 'success', action: goToMaterialList },
  { label: '低库存预警', value: stats.value.lowStockCount, icon: ShieldAlert, color: 'destructive', action: goToMaterialList },
  { label: '待维护设备', value: stats.value.dueMaintenanceCount, icon: Wrench, color: 'warning', action: goToMaintenance },
])

const colorClasses: Record<string, { bg: string; text: string; cardText: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', cardText: 'text-primary' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive', cardText: 'text-destructive' },
  success: { bg: 'bg-success/10', text: 'text-success', cardText: 'text-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', cardText: 'text-warning' },
  info: { bg: 'bg-info/10', text: 'text-info', cardText: 'text-info' },
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="min-h-full">
    <!-- 移动端视图 -->
    <template v-if="isMobile">
      <div class="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-5 pb-16 pt-safe text-primary-foreground">
        <div class="flex items-center justify-between pt-4">
          <div class="flex items-center gap-3">
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30 transition-colors -ml-2"
              @click="toggleSidebar"
            >
              <Menu class="h-5 w-5" />
            </button>
            <div>
              <p class="text-sm opacity-80">{{ greeting() }}，{{ userStore.user?.staff_name || '用户' }}</p>
              <h1 class="mt-1 text-xl font-bold">工作台</h1>
            </div>
          </div>
          <button class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30 transition-colors" @click="goToPendingList">
            <Bell class="h-5 w-5" />
            <span class="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"></span>
          </button>
        </div>

        <p class="mt-2 text-sm opacity-70">
          {{ formatDate(new Date(), 'YYYY年MM月DD日') }}
        </p>
      </div>

      <div class="-mt-10 px-4 pb-4">
        <!-- 统计卡片 - 第一行（4个核心） -->
        <div class="grid grid-cols-2 gap-3">
          <Card class="p-4 cursor-pointer active:scale-[0.98] transition-transform" @click="statCards[0].action">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ statCards[0].label }}</p>
                <p class="mt-2 text-2xl font-bold" :class="colorClasses[statCards[0].color].cardText">{{ statCards[0].value }}</p>
              </div>
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="colorClasses[statCards[0].color].bg + ' ' + colorClasses[statCards[0].color].text">
                <component :is="statCards[0].icon" class="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card class="p-4 cursor-pointer active:scale-[0.98] transition-transform" @click="statCards[1].action">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ statCards[1].label }}</p>
                <p class="mt-2 text-2xl font-bold" :class="colorClasses[statCards[1].color].cardText">{{ statCards[1].value }}</p>
              </div>
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="colorClasses[statCards[1].color].bg + ' ' + colorClasses[statCards[1].color].text">
                <component :is="statCards[1].icon" class="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card class="p-4 cursor-pointer active:scale-[0.98] transition-transform" @click="statCards[2].action">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ statCards[2].label }}</p>
                <p class="mt-2 text-2xl font-bold" :class="colorClasses[statCards[2].color].cardText">{{ statCards[2].value }}</p>
              </div>
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="colorClasses[statCards[2].color].bg + ' ' + colorClasses[statCards[2].color].text">
                <component :is="statCards[2].icon" class="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card class="p-4 cursor-pointer active:scale-[0.98] transition-transform" @click="statCards[3].action">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ statCards[3].label }}</p>
                <p class="mt-2 text-2xl font-bold" :class="colorClasses[statCards[3].color].cardText">{{ statCards[3].value }}</p>
              </div>
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="colorClasses[statCards[3].color].bg + ' ' + colorClasses[statCards[3].color].text">
                <component :is="statCards[3].icon" class="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        <!-- 财务卡片 -->
        <Card class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 class="font-semibold text-sm">财务概览</h3>
            <button class="text-xs text-primary flex items-center" @click="goToFinance">
              详情 <ChevronRight class="h-3 w-3" />
            </button>
          </div>
          <div class="grid grid-cols-2 divide-x divide-border">
            <div class="p-4 cursor-pointer active:bg-accent/50" @click="goToFinance">
              <p class="text-xs text-muted-foreground">本月收入</p>
              <p class="mt-1 text-xl font-bold text-success">{{ formatCurrency(stats.monthPayment) }}</p>
            </div>
            <div class="p-4 cursor-pointer active:bg-accent/50" @click="goToFinance">
              <p class="text-xs text-muted-foreground">本月支出</p>
              <p class="mt-1 text-xl font-bold text-destructive">{{ formatCurrency(stats.monthExpense) }}</p>
            </div>
            <div class="p-4 cursor-pointer active:bg-accent/50 border-t border-border" @click="goToFinance">
              <p class="text-xs text-muted-foreground">本月利润</p>
              <p class="mt-1 text-xl font-bold" :class="stats.monthProfit >= 0 ? 'text-success' : 'text-destructive'">
                {{ formatCurrency(stats.monthProfit) }}
              </p>
            </div>
            <div class="p-4 cursor-pointer active:bg-accent/50 border-t border-border" @click="goToFinance">
              <p class="text-xs text-muted-foreground">未收款</p>
              <p class="mt-1 text-xl font-bold text-warning">{{ formatCurrency(stats.unpaidAmount) }}</p>
            </div>
          </div>
        </Card>

        <!-- 快捷操作 -->
        <Card class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 class="font-semibold">快捷操作</h3>
          </div>
          <div class="grid grid-cols-4 gap-2 p-4">
            <button
              v-for="action in quickActions"
              :key="action.label"
              class="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-accent active:bg-accent/80 transition-colors"
              @click="action.action"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-xl" :class="colorClasses[action.color].bg + ' ' + colorClasses[action.color].text">
                <component :is="action.icon" class="h-6 w-6" />
              </div>
              <span class="text-xs">{{ action.label }}</span>
            </button>
          </div>
        </Card>

        <!-- 业务概览 -->
        <Card class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 class="font-semibold text-sm">业务概览</h3>
          </div>
          <div class="grid grid-cols-3 divide-x divide-border">
            <div class="p-4 text-center cursor-pointer active:bg-accent/50" @click="goToCustomerList">
              <div class="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-info/10 text-info">
                <Users class="h-5 w-5" />
              </div>
              <p class="mt-2 text-lg font-bold text-foreground">{{ stats.customerCount }}</p>
              <p class="text-xs text-muted-foreground">客户总数</p>
            </div>
            <div class="p-4 text-center cursor-pointer active:bg-accent/50" @click="goToProjectList">
              <div class="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase class="h-5 w-5" />
              </div>
              <p class="mt-2 text-lg font-bold text-foreground">{{ stats.activeProjectCount }}</p>
              <p class="text-xs text-muted-foreground">进行中项目</p>
            </div>
            <div class="p-4 text-center cursor-pointer active:bg-accent/50" @click="goToMaterialList">
              <div class="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-success/10 text-success">
                <Package class="h-5 w-5" />
              </div>
              <p class="mt-2 text-lg font-bold text-foreground">{{ stats.materialCount }}</p>
              <p class="text-xs text-muted-foreground">物料总数</p>
            </div>
          </div>
        </Card>

        <!-- 紧急待办 -->
        <Card v-if="recentPendings.length > 0" class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4">
            <h3 class="font-semibold flex items-center gap-2">
              <AlertCircle class="h-5 w-5 text-warning" />
              紧急待办
            </h3>
            <button class="flex items-center text-sm text-primary" @click="goToPendingList">
              全部
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>

          <div class="divide-y divide-border">
            <div
              v-for="item in recentPendings.slice(0, 3)"
              :key="item.id"
              class="flex items-start justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
              @click="router.push(`/pending/${item.id}`)"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">{{ item.title }}</p>
                <p class="mt-1 text-xs text-muted-foreground truncate">
                  {{ item.customer_name || '未指定客户' }}
                </p>
                <p class="mt-1 text-xs text-destructive">
                  提醒: {{ item.reminder_date }}
                </p>
              </div>
              <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        </Card>

        <!-- 最近工单 -->
        <Card class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4">
            <h3 class="font-semibold">最近工单</h3>
            <button class="flex items-center text-sm text-primary" @click="goToRecordList">
              查看全部
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>

          <div v-if="loading" class="px-5 py-8 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-else-if="recentRecords.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
            暂无工单记录
          </div>

          <div v-else class="divide-y divide-border">
            <div
              v-for="record in recentRecords.slice(0, 5)"
              :key="record.id"
              class="flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors cursor-pointer"
              @click="goToRecordDetail(record.id)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium truncate">{{ record.order_no || '#' + record.id }}</p>
                  <Badge variant="secondary" size="sm">
                    {{ record.record_type === 'construction' ? '施工' : '维修' }}
                  </Badge>
                </div>
                <p class="mt-1 text-sm text-muted-foreground truncate">
                  {{ record.customer_name }} · {{ record.work_content?.slice(0, 20) || record.title || '无描述' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ relativeTime(record.created_at || record.work_date) }}
                </p>
              </div>
              <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </Card>

        <!-- 活跃客户 -->
        <Card v-if="topCustomers.length > 0" class="mt-4 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4">
            <h3 class="font-semibold">活跃客户</h3>
            <button class="flex items-center text-sm text-primary" @click="goToCustomerList">
              全部客户
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>

          <div class="divide-y divide-border">
            <div
              v-for="(customer, index) in topCustomers.slice(0, 5)"
              :key="customer.customer_name"
              class="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
              @click="goToCustomerList"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-medium text-sm truncate max-w-[150px]">{{ customer.customer_name }}</p>
                  <p class="text-xs text-muted-foreground">{{ customer.count }} 单</p>
                </div>
              </div>
              <p class="text-sm font-medium text-success">{{ formatCurrency(customer.amount) }}</p>
            </div>
          </div>
        </Card>
      </div>
    </template>

    <!-- 桌面端视图 -->
    <template v-else>
      <div class="mx-auto w-full max-w-7xl p-6">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">{{ greeting() }}，{{ userStore.user?.staff_name || '用户' }}</p>
            <h1 class="mt-1 text-2xl font-bold">工作台</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ formatDate(new Date(), 'YYYY年MM月DD日') }}
            </p>
          </div>
          <Button @click="goToCreateRecord">
            <Plus class="h-4 w-4 mr-2" />
            新建工单
          </Button>
        </div>

        <!-- 核心统计卡片 -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            v-for="card in statCards.slice(0, 4)"
            :key="card.label"
            class="p-5 cursor-pointer hover:shadow-md transition-shadow"
            @click="card.action"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ card.label }}</p>
                <p class="mt-2 text-3xl font-bold" :class="colorClasses[card.color].cardText">{{ card.value }}</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-xl" :class="colorClasses[card.color].bg + ' ' + colorClasses[card.color].text">
                <component :is="card.icon" class="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        <!-- 财务概览 -->
        <Card class="mt-6 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 class="font-semibold text-base">财务概览</h3>
            <Button variant="outline" size="sm" @click="goToFinance">
              查看详情
              <ChevronRight class="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            <div class="p-6 cursor-pointer hover:bg-accent/30 transition-colors" @click="goToFinance">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <TrendingUp class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">本月收入</p>
                  <p class="mt-1 text-2xl font-bold text-success">{{ formatCurrency(stats.monthPayment) }}</p>
                </div>
              </div>
            </div>
            <div class="p-6 cursor-pointer hover:bg-accent/30 transition-colors" @click="goToFinance">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <TrendingDown class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">本月支出</p>
                  <p class="mt-1 text-2xl font-bold text-destructive">{{ formatCurrency(stats.monthExpense) }}</p>
                </div>
              </div>
            </div>
            <div class="p-6 cursor-pointer hover:bg-accent/30 transition-colors" @click="goToFinance">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DollarSign class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">本月利润</p>
                  <p class="mt-1 text-2xl font-bold" :class="stats.monthProfit >= 0 ? 'text-success' : 'text-destructive'">
                    {{ formatCurrency(stats.monthProfit) }}
                  </p>
                </div>
              </div>
            </div>
            <div class="p-6 cursor-pointer hover:bg-accent/30 transition-colors" @click="goToFinance">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <CreditCard class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">未收款</p>
                  <p class="mt-1 text-2xl font-bold text-warning">{{ formatCurrency(stats.unpaidAmount) }}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <!-- 快捷操作 -->
        <Card class="mt-6 overflow-hidden">
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 class="font-semibold text-base">快捷操作</h3>
          </div>
          <div class="grid grid-cols-4 lg:grid-cols-8 gap-3 p-6">
            <button
              v-for="action in quickActions"
              :key="action.label"
              class="flex flex-col items-center gap-3 rounded-xl p-4 hover:bg-accent active:bg-accent/80 transition-colors"
              @click="action.action"
            >
              <div class="flex h-14 w-14 items-center justify-center rounded-xl" :class="colorClasses[action.color].bg + ' ' + colorClasses[action.color].text">
                <component :is="action.icon" class="h-7 w-7" />
              </div>
              <span class="text-sm">{{ action.label }}</span>
            </button>
          </div>
        </Card>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <!-- 左侧：最近工单 -->
          <div class="lg:col-span-2">
            <Card class="overflow-hidden h-full">
              <div class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="font-semibold text-base">最近工单</h3>
                <Button variant="outline" size="sm" @click="goToRecordList">
                  查看全部
                  <ChevronRight class="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div v-if="loading" class="px-6 py-12 text-center text-sm text-muted-foreground">
                加载中...
              </div>

              <div v-else-if="recentRecords.length === 0" class="px-6 py-12 text-center text-sm text-muted-foreground">
                暂无工单记录
              </div>

              <template v-else>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>工单编号</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>客户</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead class="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="record in recentRecords.slice(0, 8)"
                      :key="record.id"
                      clickable
                      @click="goToRecordDetail(record.id)"
                    >
                      <TableCell class="font-medium">
                        {{ record.order_no || '#' + record.id }}
                      </TableCell>
                      <TableCell class="max-w-[200px] truncate">
                        {{ record.work_content || record.title || '无标题' }}
                      </TableCell>
                      <TableCell>{{ record.customer_name || '-' }}</TableCell>
                      <TableCell>
                        <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                          {{ getStatusInfo(record.status).label }}
                        </Badge>
                      </TableCell>
                      <TableCell class="text-muted-foreground">
                        {{ relativeTime(record.created_at || record.work_date) }}
                      </TableCell>
                      <TableCell class="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click.stop="goToRecordDetail(record.id)"
                        >
                          <Eye class="h-4 w-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </template>
            </Card>
          </div>

          <!-- 右侧：待办 + 业务概览 -->
          <div class="space-y-6">
            <!-- 紧急待办 -->
            <Card class="overflow-hidden">
              <div class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="font-semibold text-base flex items-center gap-2">
                  <AlertCircle class="h-5 w-5 text-warning" />
                  紧急待办
                </h3>
                <Button variant="ghost" size="sm" @click="goToPendingList">
                  全部
                </Button>
              </div>

              <div v-if="recentPendings.length === 0" class="px-6 py-8 text-center text-sm text-muted-foreground">
                暂无待办事项
              </div>

              <div v-else class="divide-y divide-border">
                <div
                  v-for="item in recentPendings.slice(0, 5)"
                  :key="item.id"
                  class="flex items-start justify-between px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  @click="router.push(`/pending/${item.id}`)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">{{ item.title }}</p>
                    <p class="mt-1 text-xs text-muted-foreground truncate">
                      {{ item.customer_name || '未指定客户' }}
                    </p>
                    <p class="mt-1 text-xs text-destructive">
                      提醒: {{ item.reminder_date }}
                    </p>
                  </div>
                  <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </div>
            </Card>

            <!-- 业务概览 -->
            <Card class="overflow-hidden">
              <div class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="font-semibold text-base">业务概览</h3>
              </div>
              <div class="grid grid-cols-3 gap-4 p-6">
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToCustomerList">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-info/10 text-info">
                    <Users class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.customerCount }}</p>
                  <p class="text-xs text-muted-foreground mt-1">客户总数</p>
                </div>
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToProjectList">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Briefcase class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.activeProjectCount }}</p>
                  <p class="text-xs text-muted-foreground mt-1">进行中项目</p>
                </div>
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToMaterialList">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-success/10 text-success">
                    <Package class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.materialCount }}</p>
                  <p class="text-xs text-muted-foreground mt-1">物料总数</p>
                </div>
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToMaterialList">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <ShieldAlert class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.lowStockCount }}</p>
                  <p class="text-xs text-muted-foreground mt-1">低库存预警</p>
                </div>
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToMaintenance">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-warning/10 text-warning">
                    <Wrench class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.dueMaintenanceCount }}</p>
                  <p class="text-xs text-muted-foreground mt-1">待维护设备</p>
                </div>
                <div class="text-center cursor-pointer hover:bg-accent/30 rounded-lg p-3 transition-colors" @click="goToRecordList">
                  <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-secondary/10 text-secondary-foreground">
                    <FileText class="h-6 w-6" />
                  </div>
                  <p class="mt-3 text-xl font-bold text-foreground">{{ stats.totalRecords }}</p>
                  <p class="text-xs text-muted-foreground mt-1">工单总数</p>
                </div>
              </div>
            </Card>

            <!-- 活跃客户 -->
            <Card v-if="topCustomers.length > 0" class="overflow-hidden">
              <div class="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 class="font-semibold text-base">活跃客户 TOP5</h3>
                <Button variant="ghost" size="sm" @click="goToCustomerList">
                  全部
                </Button>
              </div>
              <div class="divide-y divide-border">
                <div
                  v-for="(customer, index) in topCustomers"
                  :key="customer.customer_name"
                  class="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  @click="goToCustomerList"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full"
                      :class="index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-primary/10 text-primary'"
                    >
                      <span class="text-sm font-medium">{{ index + 1 }}</span>
                    </div>
                    <div>
                      <p class="font-medium text-sm">{{ customer.customer_name }}</p>
                      <p class="text-xs text-muted-foreground">{{ customer.count }} 单</p>
                    </div>
                  </div>
                  <p class="text-sm font-medium text-success">{{ formatCurrency(customer.amount) }}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
