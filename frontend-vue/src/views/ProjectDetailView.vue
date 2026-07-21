<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  FolderKanban,
  Building2,
  MapPin,
  Phone,
  Calendar,
  User,
  DollarSign,
  FileText,
  CreditCard,
  Wallet,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-vue-next'
import { projectsApi } from '@/api'
import type { Project } from '@/types'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref('')
const project = ref<Project | null>(null)
const workRecords = ref<any[]>([])
const financeOverview = ref<any>(null)
const expenseStats = ref<any>(null)
const salaryStats = ref<any>(null)

const activeTab = ref<'records' | 'expenses' | 'salaries'>('records')

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
  }
}

const formatMoney = (amount?: number) => {
  return `¥${(amount || 0).toLocaleString()}`
}

const statusLabels: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  settled: '已结算',
  cancelled: '已取消',
}

const statusColorCls: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  settled: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
}

const loadProject = async () => {
  loading.value = true
  error.value = ''
  try {
    const res: any = await projectsApi.get(projectId.value)
    project.value = res.project
    workRecords.value = res.work_records || []
    financeOverview.value = res.finance_overview
    expenseStats.value = res.expense_stats
    salaryStats.value = res.salary_stats
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
    console.error('加载项目详情失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProject()
})
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <header class="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-3 gap-2">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
          @click="router.back()"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="text-base font-semibold truncate flex-1">
          {{ project?.name || '项目详情' }}
        </h1>
      </div>
    </header>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <button class="text-sm text-primary font-medium" @click="loadProject">重试</button>
    </div>

    <div v-else-if="project" class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-4">
        <div class="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
              <FolderKanban class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h2 class="font-bold text-foreground text-lg truncate">{{ project.name }}</h2>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', statusColorCls[project.status]]">
                  {{ statusLabels[project.status] }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground">项目编号：{{ project.project_no }}</p>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2 text-muted-foreground">
              <Building2 class="w-4 h-4 shrink-0" />
              <span class="truncate">{{ project.customer_name }}</span>
            </div>
            <div v-if="project.project_address" class="flex items-center gap-2 text-muted-foreground">
              <MapPin class="w-4 h-4 shrink-0" />
              <span class="truncate">{{ project.project_address }}</span>
            </div>
            <div v-if="project.contact_name || project.contact_phone" class="flex items-center gap-2 text-muted-foreground">
              <Phone class="w-4 h-4 shrink-0" />
              <span class="truncate">{{ project.contact_name }} {{ project.contact_name && project.contact_phone ? '·' : '' }} {{ project.contact_phone }}</span>
            </div>
            <div v-if="project.manager" class="flex items-center gap-2 text-muted-foreground">
              <User class="w-4 h-4 shrink-0" />
              <span>负责人：{{ project.manager }}</span>
            </div>
            <div class="flex items-center gap-2 text-muted-foreground">
              <Calendar class="w-4 h-4 shrink-0" />
              <span>{{ formatDate(project.start_date) }} ~ {{ formatDate(project.end_date) }}</span>
            </div>
          </div>
        </div>

        <div v-if="financeOverview" class="grid grid-cols-2 gap-3">
          <div class="bg-card rounded-xl p-3 border border-border">
            <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <FileText class="w-3.5 h-3.5" /> 合同金额
            </div>
            <div class="text-base font-bold text-foreground">{{ formatMoney(financeOverview.contract_amount) }}</div>
          </div>
          <div class="bg-card rounded-xl p-3 border border-border">
            <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CreditCard class="w-3.5 h-3.5" /> 已收款
            </div>
            <div class="text-base font-bold text-emerald-600">{{ formatMoney(financeOverview.receipt_amount) }}</div>
          </div>
          <div class="bg-card rounded-xl p-3 border border-border">
            <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Wallet class="w-3.5 h-3.5" /> 总支出
            </div>
            <div class="text-base font-bold text-amber-600">{{ formatMoney((financeOverview.expense_total || 0) + (financeOverview.salary_total || 0)) }}</div>
          </div>
          <div class="bg-card rounded-xl p-3 border border-border">
            <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign class="w-3.5 h-3.5" /> 毛利
            </div>
            <div class="text-base font-bold" :class="financeOverview.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'">
              {{ formatMoney(financeOverview.gross_profit) }}
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl border border-border overflow-hidden">
          <div class="flex border-b border-border">
            <button
              :class="['flex-1 py-2.5 text-sm font-medium transition-colors', activeTab === 'records' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
              @click="activeTab = 'records'"
            >
              施工记录
              <span class="text-xs ml-1">({{ workRecords.length }})</span>
            </button>
            <button
              :class="['flex-1 py-2.5 text-sm font-medium transition-colors', activeTab === 'expenses' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
              @click="activeTab = 'expenses'"
            >
              费用支出
            </button>
            <button
              :class="['flex-1 py-2.5 text-sm font-medium transition-colors', activeTab === 'salaries' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
              @click="activeTab = 'salaries'"
            >
              人员工资
            </button>
          </div>

          <div v-if="activeTab === 'records'" class="p-3 space-y-2">
            <div
              v-for="record in workRecords"
              :key="record.id"
              class="p-3 rounded-xl bg-muted/30 border border-border/50 active:scale-[0.98] transition-transform"
            >
              <div class="flex items-start justify-between mb-2">
                <span class="text-xs text-muted-foreground">{{ record.record_no }}</span>
                <span class="text-xs text-muted-foreground">{{ formatDate(record.work_date) }}</span>
              </div>
              <p class="text-sm text-foreground line-clamp-2 mb-2">{{ record.work_content }}</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{{ record.staff_names || '未分配' }}</span>
                <span class="font-semibold text-emerald-600">{{ formatMoney(record.total_fee) }}</span>
              </div>
            </div>
            <div v-if="workRecords.length === 0" class="py-8 text-center text-sm text-muted-foreground">
              暂无施工记录
            </div>
          </div>

          <div v-else-if="activeTab === 'expenses'" class="p-3">
            <div v-if="expenseStats" class="mb-4 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-muted-foreground">费用总计</span>
                <span class="text-base font-bold text-amber-600">{{ formatMoney(expenseStats.total) }}</span>
              </div>
              <div v-if="expenseStats.by_type" class="space-y-1.5">
                <div v-for="(amount, type) in expenseStats.by_type" :key="type" class="flex items-center justify-between text-xs">
                  <span class="text-muted-foreground">{{ type }}</span>
                  <span class="text-foreground">{{ formatMoney(amount) }}</span>
                </div>
              </div>
            </div>
            <div class="py-8 text-center text-sm text-muted-foreground">
              费用明细功能开发中...
            </div>
          </div>

          <div v-else-if="activeTab === 'salaries'" class="p-3">
            <div v-if="salaryStats" class="mb-4 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-foreground">工资总计</span>
                <span class="text-base font-bold text-amber-600">{{ formatMoney(salaryStats.total) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">已发放</span>
                <span class="text-emerald-600">{{ formatMoney(salaryStats.paid) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">未发放</span>
                <span class="text-red-500">{{ formatMoney(salaryStats.unpaid) }}</span>
              </div>
            </div>
            <div class="py-8 text-center text-sm text-muted-foreground">
              工资明细功能开发中...
            </div>
          </div>
        </div>

        <div v-if="project.description" class="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 class="text-sm font-semibold text-foreground mb-2">项目描述</h3>
          <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ project.description }}</p>
        </div>

        <div v-if="project.remark" class="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 class="text-sm font-semibold text-foreground mb-2">备注</h3>
          <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ project.remark }}</p>
        </div>

        <div class="h-6" />
      </div>
    </div>
  </div>
</template>
