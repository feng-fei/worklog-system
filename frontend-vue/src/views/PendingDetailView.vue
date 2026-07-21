<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  MoreVertical,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  Link2,
  Check,
  X,
  Phone,
  RefreshCw,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { pendingApi } from '@/api'
import type { PendingWork } from '@/types'

const route = useRoute()
const router = useRouter()

const pendingId = computed(() => Number(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const completing = ref(false)
const pending = ref<PendingWork | null>(null)

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    normal: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  }
  return colors[priority] || colors.normal
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    low: '低优先级',
    normal: '普通',
    high: '高优先级',
    urgent: '紧急',
  }
  return labels[priority] || '普通'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-900',
  }
  return colors[status] || colors.pending
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return labels[status] || '待处理'
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const goBack = () => {
  router.back()
}

const goToRecord = () => {
  if (pending.value?.related_record_id) {
    router.push(`/record/${pending.value.related_record_id}`)
  }
}

const fetchPending = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await pendingApi.get(pendingId.value)
    pending.value = data
  } catch (e) {
    error.value = '加载失败，请重试'
    console.error('Failed to load pending:', e)
  } finally {
    loading.value = false
  }
}

const handleComplete = async () => {
  if (!pending.value) return
  completing.value = true
  try {
    await pendingApi.complete(pendingId.value)
    pending.value.status = 'completed'
  } catch (e) {
    alert('操作失败，请重试')
  } finally {
    completing.value = false
  }
}

const isCompleted = computed(() => pending.value?.status === 'completed')

onMounted(() => {
  fetchPending()
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
          <h1 class="text-base font-semibold truncate">待办详情</h1>
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

      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 px-4">
        <AlertCircle class="w-12 h-12 text-destructive mb-4" />
        <div class="text-muted-foreground text-sm mb-4">{{ error }}</div>
        <Button @click="fetchPending">
          <RefreshCw class="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>

      <div v-else-if="pending" class="p-4 space-y-4">
        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-bold text-foreground leading-tight">{{ pending.title }}</h2>
            </div>
            <span :class="['px-2.5 py-1 rounded-full text-xs font-medium border shrink-0', getPriorityColor(pending.priority)]">
              {{ getPriorityLabel(pending.priority) }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(pending.status)]">
              <span
                :class="[
                  'w-1.5 h-1.5 rounded-full',
                  pending.status === 'pending' ? 'bg-red-500' : pending.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
                ]"
              />
              {{ getStatusLabel(pending.status) }}
            </span>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText class="w-4 h-4 text-primary" />
            待办内容
          </h3>
          <p class="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {{ pending.work_content || '暂无内容' }}
          </p>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <User class="w-4 h-4 text-primary" />
            客户联系信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <User class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">客户名称</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ pending.customer_name || '-' }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <User class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">联系人</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ pending.contact_name || '-' }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Phone class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">联系电话</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ pending.contact_phone || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary" />
            时间信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Clock class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">创建时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ formatDateTime(pending.created_at) }}</span>
            </div>

            <div v-if="pending.reminder_date" class="h-px bg-border/60" />

            <div v-if="pending.reminder_date" class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <AlertCircle class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">提醒时间</span>
              </div>
              <span class="text-sm font-medium text-destructive">{{ formatDateTime(pending.reminder_date) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <User class="w-4 h-4 text-primary" />
            负责人
          </h3>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User class="w-5 h-5 text-primary" />
              </div>
              <div>
                <div class="text-sm font-medium text-foreground">{{ pending.staff_name || '-' }}</div>
                <div class="text-xs text-muted-foreground">负责人</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="pending.related_record_id" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Link2 class="w-4 h-4 text-primary" />
            关联工单
          </h3>

          <button
            class="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors tap-highlight-transparent"
            @click="goToRecord"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText class="w-5 h-5 text-primary" />
              </div>
              <div class="text-left">
                <div class="text-sm font-medium text-foreground">工单 #{{ pending.related_record_id }}</div>
                <div class="text-xs text-muted-foreground">点击查看详情</div>
              </div>
            </div>
            <ArrowLeft class="w-4 h-4 text-muted-foreground rotate-180" />
          </button>
        </div>
      </div>
    </main>

    <div class="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom">
      <div class="flex gap-3">
        <Button
          v-if="!isCompleted"
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
        >
          <X class="w-4 h-4 mr-2" />
          延期申请
        </Button>
        <Button
          v-if="!isCompleted"
          class="flex-1 h-12 rounded-xl text-base font-semibold"
          :disabled="completing"
          @click="handleComplete"
        >
          <Check class="w-4 h-4 mr-2" />
          {{ completing ? '处理中...' : '标记完成' }}
        </Button>
        <Button
          v-else
          class="flex-1 h-12 rounded-xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
          disabled
        >
          <CheckCircle2 class="w-4 h-4 mr-2" />
          已完成
        </Button>
      </div>
    </div>
  </div>
</template>
