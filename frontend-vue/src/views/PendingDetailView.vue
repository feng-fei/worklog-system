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
  Bell,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { pendingApi } from '@/api'

const route = useRoute()
const router = useRouter()

const pendingId = computed(() => Number(route.params.id))
const loading = ref(true)
const completing = ref(false)

const mockPending = {
  id: 1,
  title: '3号机组故障排查',
  description: '3号机组出现异常噪音，需要尽快排查故障原因并修复。',
  priority: 'high',
  priority_label: '高优先级',
  status: 'pending',
  status_label: '待处理',
  created_at: '2026-07-19 09:30',
  due_time: '2026-07-19 18:00',
  creator_name: '王主管',
  record_id: 2,
  record_no: 'WX20260718003',
}

const useMock = import.meta.env.DEV
const pending = ref(mockPending as any)

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  }
  return colors[priority] || colors.medium
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  }
  return colors[status] || colors.pending
}

const goBack = () => {
  router.back()
}

const goToRecord = () => {
  if (pending.value.record_id) {
    router.push(`/record/${pending.value.record_id}`)
  }
}

const handleComplete = async () => {
  if (useMock) {
    pending.value.status = 'completed'
    pending.value.status_label = '已完成'
    return
  }

  completing.value = true
  try {
    await pendingApi.complete(pendingId.value)
    pending.value.status = 'completed'
    pending.value.status_label = '已完成'
  } catch (e) {
    alert('操作失败，请重试')
  } finally {
    completing.value = false
  }
}

const isCompleted = computed(() => pending.value.status === 'completed')

onMounted(async () => {
  if (!useMock) {
    try {
      const res = await pendingApi.get(pendingId.value)
      pending.value = res.data
    } catch (e) {
      console.error('Failed to load pending:', e)
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

      <div v-else class="p-4 space-y-4">
        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-bold text-foreground leading-tight">{{ pending.title }}</h2>
            </div>
            <span :class="['px-2.5 py-1 rounded-full text-xs font-medium border shrink-0', getPriorityColor(pending.priority)]">
              {{ pending.priority_label }}
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
              {{ pending.status_label }}
            </span>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText class="w-4 h-4 text-primary" />
            待办内容
          </h3>
          <p class="text-sm text-foreground/90 leading-relaxed">
            {{ pending.description }}
          </p>
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
              <span class="text-sm text-foreground font-medium">{{ pending.created_at }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <AlertCircle class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">截止时间</span>
              </div>
              <span class="text-sm font-medium text-destructive">{{ pending.due_time }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <User class="w-4 h-4 text-primary" />
            派发信息
          </h3>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User class="w-5 h-5 text-primary" />
              </div>
              <div>
                <div class="text-sm font-medium text-foreground">{{ pending.creator_name }}</div>
                <div class="text-xs text-muted-foreground">派发人</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="pending.record_id" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
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
                <div class="text-sm font-medium text-foreground">{{ pending.record_no }}</div>
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
