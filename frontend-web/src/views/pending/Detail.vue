<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pendingApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Tag,
  Flag,
  ArrowRightCircle,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const { isMobile } = useResponsive()
const route = useRoute()
const router = useRouter()
const toggleSidebar = inject('toggleSidebar', () => {})

const loading = ref(true)
const pending = ref<any>(null)

const statusMap: Record<string, { label: string; variant: string; icon: any }> = {
  pending: { label: '待办工单', variant: 'warning', icon: Clock },
  in_progress: { label: '进行中', variant: 'info', icon: Clock },
  completed: { label: '已完成', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: '已取消', variant: 'secondary', icon: AlertCircle },
  transferred: { label: '已转工单', variant: 'info', icon: ArrowRightCircle },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary', icon: Clock }
}

const priorityMap: Record<string, { label: string; variant: string }> = {
  low: { label: '低', variant: 'secondary' },
  normal: { label: '普通', variant: 'secondary' },
  high: { label: '高', variant: 'warning' },
  urgent: { label: '紧急', variant: 'destructive' },
}

const getPriorityInfo = (priority: string) => {
  return priorityMap[priority] || { label: priority || '普通', variant: 'secondary' }
}

const loadDetail = async () => {
  loading.value = true
  try {
    const res = await pendingApi.get(Number(route.params.id))
    pending.value = res.data
  } catch (e: any) {
    alert(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <!-- 移动端视图 -->
  <template v-if="isMobile">
    <div class="flex min-h-full flex-col bg-background">
      <MobileHeader title="待办详情" :showBack="true">
        <template #right>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="loadDetail"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </template>
      </MobileHeader>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>
      </div>

      <template v-else-if="pending">
        <div class="flex-1 space-y-4 p-4 pb-6">
          <!-- 标题和状态 -->
          <Card class="p-4">
            <div class="flex items-start justify-between gap-3">
              <h1 class="text-lg font-semibold flex-1">
                {{ pending.title || '无标题' }}
              </h1>
              <Badge :variant="getStatusInfo(pending.status).variant as any">
                {{ getStatusInfo(pending.status).label }}
              </Badge>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Tag class="h-4 w-4" />
                {{ pending.todo_type || '待办' }}
              </span>
              <span class="flex items-center gap-1">
                <Flag class="h-4 w-4" />
                {{ getPriorityInfo(pending.priority).label }}优先级
              </span>
              <span class="flex items-center gap-1">
                <Clock class="h-4 w-4" />
                {{ relativeTime(pending.created_at) }}
              </span>
            </div>
          </Card>

          <!-- 客户信息 -->
          <Card class="p-4">
            <h3 class="mb-3 font-medium">客户信息</h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3">
                <User class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div class="flex-1">
                  <p class="font-medium">{{ pending.customer_name || '-' }}</p>
                </div>
              </div>
              <div v-if="pending.contact_name || pending.contact_phone" class="flex items-start gap-3">
                <Phone class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div class="flex-1">
                  <p>{{ pending.contact_name || '联系人未填写' }}</p>
                  <p v-if="pending.contact_phone" class="text-muted-foreground">{{ pending.contact_phone }}</p>
                </div>
              </div>
              <div v-if="pending.work_address" class="flex items-start gap-3">
                <MapPin class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <p class="flex-1">{{ pending.work_address }}</p>
              </div>
              <div v-if="pending.staff_name" class="flex items-start gap-3">
                <User class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div class="flex-1">
                  <p class="text-muted-foreground">负责人</p>
                  <p>{{ pending.staff_name }}</p>
                </div>
              </div>
            </div>
          </Card>

          <!-- 日期信息 -->
          <Card class="p-4">
            <h3 class="mb-3 font-medium">日期信息</h3>
            <div class="space-y-3 text-sm">
              <div v-if="pending.reminder_date" class="flex items-center gap-3">
                <Calendar class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div class="flex-1">
                  <p class="text-muted-foreground">提醒日期</p>
                  <p class="font-medium">{{ formatDate(pending.reminder_date, 'YYYY-MM-DD') }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <Clock class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div class="flex-1">
                  <p class="text-muted-foreground">创建时间</p>
                  <p>{{ formatDate(pending.created_at, 'YYYY-MM-DD HH:mm') }}</p>
                </div>
              </div>
            </div>
          </Card>

          <!-- 工作内容 -->
          <Card v-if="pending.work_content" class="p-4">
            <h3 class="mb-3 font-medium">工作内容</h3>
            <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ pending.work_content }}</p>
          </Card>

          <!-- 返回按钮 -->
          <div class="pt-4">
            <Button variant="outline" class="w-full" @click="router.back()">
              <ArrowLeft class="h-4 w-4 mr-2" />
              返回列表
            </Button>
          </div>
        </div>
      </template>
    </div>
  </template>

  <!-- 桌面端视图 -->
  <template v-else>
    <div class="mx-auto w-full max-w-4xl p-6">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button variant="outline" size="sm" @click="router.back()">
            <ArrowLeft class="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 class="text-2xl font-bold">待办详情</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              ID: {{ route.params.id }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="loadDetail">
            <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
            刷新
          </Button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>
      </div>

      <template v-else-if="pending">
        <div class="grid grid-cols-3 gap-6">
          <div class="col-span-2 space-y-6">
            <!-- 基本信息 -->
            <Card class="overflow-hidden">
              <div class="border-b border-border px-6 py-4">
                <h2 class="font-semibold">基本信息</h2>
              </div>
              <div class="p-6 space-y-4">
                <div>
                  <label class="text-sm text-muted-foreground">标题</label>
                  <p class="mt-1 text-lg font-medium">{{ pending.title || '无标题' }}</p>
                </div>
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="text-sm text-muted-foreground">状态</label>
                    <div class="mt-1">
                      <Badge :variant="getStatusInfo(pending.status).variant as any">
                        {{ getStatusInfo(pending.status).label }}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label class="text-sm text-muted-foreground">类型</label>
                    <p class="mt-1">{{ pending.todo_type || '待办' }}</p>
                  </div>
                  <div>
                    <label class="text-sm text-muted-foreground">优先级</label>
                    <div class="mt-1">
                      <Badge :variant="getPriorityInfo(pending.priority).variant as any">
                        {{ getPriorityInfo(pending.priority).label }}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="text-sm text-muted-foreground">工作内容</label>
                  <p class="mt-1 whitespace-pre-wrap leading-relaxed">{{ pending.work_content || '-' }}</p>
                </div>
              </div>
            </Card>
          </div>

          <div class="space-y-6">
            <!-- 客户信息 -->
            <Card class="overflow-hidden">
              <div class="border-b border-border px-6 py-4">
                <h2 class="font-semibold">客户信息</h2>
              </div>
              <div class="p-6 space-y-4 text-sm">
                <div>
                  <label class="text-muted-foreground">客户名称</label>
                  <p class="mt-1 font-medium">{{ pending.customer_name || '-' }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground">联系人</label>
                  <p class="mt-1">{{ pending.contact_name || '-' }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground">联系电话</label>
                  <p class="mt-1">{{ pending.contact_phone || '-' }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground">工作地址</label>
                  <p class="mt-1">{{ pending.work_address || '-' }}</p>
                </div>
                <div v-if="pending.staff_name">
                  <label class="text-muted-foreground">负责人</label>
                  <p class="mt-1">{{ pending.staff_name }}</p>
                </div>
              </div>
            </Card>

            <!-- 时间信息 -->
            <Card class="overflow-hidden">
              <div class="border-b border-border px-6 py-4">
                <h2 class="font-semibold">时间信息</h2>
              </div>
              <div class="p-6 space-y-4 text-sm">
                <div>
                  <label class="text-muted-foreground">提醒日期</label>
                  <p class="mt-1">{{ pending.reminder_date ? formatDate(pending.reminder_date, 'YYYY-MM-DD') : '-' }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground">创建时间</label>
                  <p class="mt-1">{{ pending.created_at ? formatDate(pending.created_at, 'YYYY-MM-DD HH:mm') : '-' }}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </template>
    </div>
  </template>
</template>
