<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  FileText,
  RefreshCw,
  User,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  Settings,
} from 'lucide-vue-next'
import { formatDate } from '@/lib/utils'

const logs = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const hasMore = ref(true)
const selectedLog = ref<any>(null)
const showDetail = ref(false)
const showRetentionModal = ref(false)
const retentionDays = ref(90)
const filterAction = ref('')

const actionMap: Record<string, { label: string; variant: string; icon: any }> = {
  create: { label: '创建', variant: 'success', icon: Plus },
  update: { label: '更新', variant: 'info', icon: Pencil },
  delete: { label: '删除', variant: 'destructive', icon: Trash2 },
  login: { label: '登录', variant: 'default', icon: LogIn },
  logout: { label: '登出', variant: 'secondary', icon: LogOut },
  export: { label: '导出', variant: 'warning', icon: Download },
}

const typeMap: Record<string, string> = {
  work_record: '工单',
  pending_work: '待办',
  customer: '客户',
  staff: '员工',
  project: '项目',
  material: '物料',
  expense: '支出',
  payment: '收款',
  salary: '工资',
}

const getActionInfo = (action: string) => {
  return actionMap[action] || { label: action || '未知', variant: 'secondary', icon: FileText }
}

const getTypeLabel = (type: string) => {
  return typeMap[type] || type || '未知'
}

const loadLogs = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await systemApi.operationLogs({
      page: currentPage.value,
      per_page: 20,
      keyword: searchQuery.value || undefined,
      action: filterAction.value || undefined,
    })

    const data = res.data
    const list = data.records || data.list || data.items || []

    if (refresh) {
      logs.value = list
    } else {
      logs.value = [...logs.value, ...list]
    }

    hasMore.value = list.length >= 20
    currentPage.value++
  } catch (e) {
    console.error('加载操作日志失败', e)
  } finally {
    loading.value = false
  }
}

const onRefresh = () => {
  loadLogs(true)
}

const openDetail = (log: any) => {
  selectedLog.value = log
  showDetail.value = true
}

const closeDetail = () => {
  showDetail.value = false
  selectedLog.value = null
}

const handleRestore = async (log: any) => {
  if (log.action !== 'delete') {
    alert('只有删除操作支持恢复')
    return
  }
  const restorableTypes = ['work_record', 'pending_work', 'customer', 'project']
  if (!restorableTypes.includes(log.target_type)) {
    alert(`暂不支持恢复${getTypeLabel(log.target_type)}类型的数据`)
    return
  }
  if (!confirm(`确定要恢复"${log.target_title || getTypeLabel(log.target_type)}"吗？`)) {
    return
  }
  try {
    await systemApi.restoreOperationLog(log.id)
    alert('恢复成功')
    closeDetail()
    loadLogs(true)
  } catch (e: any) {
    alert(e.response?.data?.error || '恢复失败')
  }
}

const loadRetentionSettings = async () => {
  try {
    const res = await systemApi.getOplogRetention()
    retentionDays.value = res.data.days || 90
  } catch (e) {
    console.error('加载日志保留设置失败', e)
  }
}

const saveRetentionSettings = async () => {
  try {
    await systemApi.setOplogRetention(retentionDays.value)
    alert('设置已保存')
    showRetentionModal.value = false
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

const formatValue = (val: any) => {
  if (val === null || val === undefined || val === '') return '空'
  if (typeof val === 'boolean') return val ? '是' : '否'
  if (Array.isArray(val)) return val.join(', ') || '空'
  return String(val)
}

onMounted(() => {
  loadLogs(true)
  loadRetentionSettings()
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="操作日志" show-back>
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="onRefresh"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
      <div class="relative mb-2">
        <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索操作对象..."
          class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          @keyup.enter="loadLogs(true)"
        />
      </div>
      <div class="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          class="flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filterAction === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
          @click="filterAction = ''; loadLogs(true)"
        >
          全部
        </button>
        <button
          v-for="(info, key) in actionMap"
          :key="key"
          class="flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filterAction === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
          @click="filterAction = key; loadLogs(true)"
        >
          {{ info.label }}
        </button>
        <button
          class="flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors bg-secondary text-secondary-foreground"
          @click="showRetentionModal = true"
        >
          <Settings class="h-4 w-4 inline" />
          设置
        </button>
      </div>
    </div>

    <div class="flex-1 space-y-3 px-4 pb-6">
      <div v-if="loading && logs.length === 0" class="py-12 text-center text-muted-foreground">
        <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
        <p>加载中...</p>
      </div>

      <div v-else-if="logs.length === 0" class="py-12 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText class="h-8 w-8 text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">暂无操作日志</p>
      </div>

      <template v-else>
        <Card
          v-for="log in logs"
          :key="log.id"
          class="p-4 cursor-pointer active:scale-[0.99] transition-transform"
          @click="openDetail(log)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                :class="{
                  'bg-success/10 text-success': log.action === 'create',
                  'bg-info/10 text-info': log.action === 'update',
                  'bg-destructive/10 text-destructive': log.action === 'delete',
                  'bg-muted text-muted-foreground': !['create', 'update', 'delete'].includes(log.action),
                }"
              >
                <component :is="getActionInfo(log.action).icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge :variant="getActionInfo(log.action).variant as any" size="sm">
                    {{ getActionInfo(log.action).label }}
                  </Badge>
                  <Badge variant="outline" size="sm">{{ getTypeLabel(log.target_type) }}</Badge>
                </div>
                <p class="mt-1 font-medium truncate max-w-[200px]">
                  {{ log.target_title || `${getTypeLabel(log.target_type)} #${log.target_id}` }}
                </p>
              </div>
            </div>
            <div v-if="log.action === 'delete'" class="flex-shrink-0">
              <Button variant="ghost" size="sm" @click.stop="handleRestore(log)">
                <RotateCcw class="h-4 w-4 mr-1" />
                恢复
              </Button>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <User class="h-3 w-3" />
              <span>{{ log.user || log.username || '系统' }}</span>
            </div>
            <div class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              <span>{{ formatDate(log.created_at, 'YYYY-MM-DD HH:mm') }}</span>
            </div>
          </div>

          <div v-if="log.changes_summary && log.changes_summary.length > 0" class="mt-3 pt-3 border-t border-border">
            <p class="text-xs text-muted-foreground mb-2">变更内容：</p>
            <div class="space-y-1">
              <div
                v-for="(change, idx) in log.changes_summary.slice(0, 2)"
                :key="idx"
                class="text-xs flex items-center gap-2"
              >
                <span class="text-muted-foreground">{{ change.label }}:</span>
                <span class="text-destructive line-through">{{ formatValue(change.old) }}</span>
                <span>→</span>
                <span class="text-success">{{ formatValue(change.new) }}</span>
              </div>
              <p v-if="log.changes_summary.length > 2" class="text-xs text-primary">
                +{{ log.changes_summary.length - 2 }} 项变更...
              </p>
            </div>
          </div>
        </Card>

        <div v-if="hasMore && !loading" class="py-4 text-center">
          <button
            class="text-sm text-primary"
            @click="loadLogs()"
          >
            加载更多
          </button>
        </div>

        <div v-if="loading && logs.length > 0" class="py-4 text-center text-sm text-muted-foreground">
          <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
          加载中...
        </div>
      </template>
    </div>

    <div v-if="showDetail && selectedLog" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div class="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl bg-card shadow-2xl flex flex-col">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 class="font-semibold">日志详情</h3>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
            @click="closeDetail"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl"
              :class="{
                'bg-success/10 text-success': selectedLog.action === 'create',
                'bg-info/10 text-info': selectedLog.action === 'update',
                'bg-destructive/10 text-destructive': selectedLog.action === 'delete',
                'bg-muted text-muted-foreground': !['create', 'update', 'delete'].includes(selectedLog.action),
              }"
            >
              <component :is="getActionInfo(selectedLog.action).icon" class="h-6 w-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <Badge :variant="getActionInfo(selectedLog.action).variant as any">
                  {{ getActionInfo(selectedLog.action).label }}
                </Badge>
                <Badge variant="outline">{{ getTypeLabel(selectedLog.target_type) }}</Badge>
              </div>
              <p class="mt-1 font-semibold">{{ selectedLog.target_title || `${getTypeLabel(selectedLog.target_type)} #${selectedLog.target_id}` }}</p>
            </div>
          </div>

          <Card class="p-4 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">操作人</span>
              <span class="font-medium">{{ selectedLog.user || '系统' }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">操作时间</span>
              <span class="font-medium">{{ formatDate(selectedLog.created_at, 'YYYY-MM-DD HH:mm:ss') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">对象ID</span>
              <span class="font-medium">#{{ selectedLog.target_id }}</span>
            </div>
          </Card>

          <div v-if="selectedLog.changes_summary && selectedLog.changes_summary.length > 0">
            <h4 class="mb-2 font-medium flex items-center gap-2">
              <Pencil class="h-4 w-4 text-info" />
              变更详情
            </h4>
            <Card class="divide-y divide-border">
              <div
                v-for="(change, idx) in selectedLog.changes_summary"
                :key="idx"
                class="p-3"
              >
                <p class="text-sm font-medium mb-2">{{ change.label }}</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg bg-destructive/10 p-2">
                    <p class="text-xs text-muted-foreground mb-1">变更前</p>
                    <p class="text-sm text-destructive break-all">{{ formatValue(change.old) }}</p>
                  </div>
                  <div class="rounded-lg bg-success/10 p-2">
                    <p class="text-xs text-muted-foreground mb-1">变更后</p>
                    <p class="text-sm text-success break-all">{{ formatValue(change.new) }}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div v-if="selectedLog.action === 'delete'" class="pt-2">
            <Button class="w-full" @click="handleRestore(selectedLog)">
              <RotateCcw class="h-5 w-5 mr-2" />
              恢复此记录
            </Button>
            <p class="mt-2 text-xs text-center text-muted-foreground">
              恢复操作将重新创建被删除的记录
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRetentionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card class="w-full max-w-sm p-5">
        <h3 class="text-lg font-semibold mb-4">日志保留设置</h3>
        <p class="text-sm text-muted-foreground mb-4">选择操作日志的保留时长，过期日志将被自动清理</p>
        <div class="space-y-2 mb-6">
          <label
            v-for="days in [90, 180, 365, 0]"
            :key="days"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="retentionDays === days ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'"
          >
            <input
              type="radio"
              :value="days"
              v-model="retentionDays"
              class="accent-primary"
            />
            <span>{{ days === 0 ? '永久保留' : `${days}天` }}</span>
          </label>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="showRetentionModal = false">
            取消
          </Button>
          <Button class="flex-1" @click="saveRetentionSettings">
            保存
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
