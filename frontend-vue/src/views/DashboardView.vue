<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClipboardList, Wrench, Building2, Bell,
  TrendingUp, Clock, CheckCircle2,
  Calendar, ChevronRight, DollarSign, Users, Package,
} from 'lucide-vue-next'

const router = useRouter()

const stats = ref([
  { label: '今日工单', value: '12', trend: '+3', icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
  { label: '待处理', value: '5', trend: '+1', icon: Clock, color: 'from-amber-500 to-orange-500' },
  { label: '已完成', value: '7', trend: '+2', icon: CheckCircle2, color: 'from-emerald-500 to-green-600' },
  { label: '本月产值', value: '¥28.6w', trend: '+12%', icon: TrendingUp, color: 'from-violet-500 to-purple-600' },
])

const quickActions = ref([
  { label: '新建工单', icon: Wrench, color: 'bg-blue-500', route: '/create' },
  { label: '客户管理', icon: Building2, color: 'bg-emerald-500', route: '/customers' },
  { label: '消息通知', icon: Bell, color: 'bg-amber-500', route: '/notifications' },
  { label: '物料管理', icon: Package, color: 'bg-violet-500', route: '/materials' },
])

const recentRecords = ref([
  {
    id: 1,
    record_no: 'GD20260718001',
    type: '施工单',
    title: '某大厦12层空调安装',
    staff: '张三 · 3人团队',
    status: '进行中',
    status_type: 'progress',
    time: '预计今天 18:00 完成',
  },
  {
    id: 2,
    record_no: 'WX20260718003',
    type: '维修单',
    title: '3号机组故障排查',
    staff: '李四 · 紧急维修',
    status: '待接单',
    status_type: 'pending',
    time: '30分钟前发布',
  },
])

const goToRecord = (id: number) => {
  router.push(`/record/${id}`)
}

const goToRoute = (route: string) => {
  router.push(route)
}
</script>

<template>
  <div class="space-y-5 pb-4">
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">数据概览</h2>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="relative overflow-hidden rounded-2xl bg-card p-4 shadow-sm border border-border active:scale-[0.97] transition-transform cursor-pointer"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <p class="text-xs text-muted-foreground font-medium">{{ stat.label }}</p>
              <p class="text-2xl font-bold text-foreground tracking-tight">{{ stat.value }}</p>
            </div>
            <div :class="['p-2.5 rounded-xl bg-gradient-to-br', stat.color]">
              <component :is="stat.icon" class="w-5 h-5 text-white" />
            </div>
          </div>
          <div class="mt-2 flex items-center text-xs">
            <span class="text-emerald-500 font-medium">{{ stat.trend }}</span>
            <span class="text-muted-foreground ml-1">较昨日</span>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">快捷入口</h2>
      <div class="grid grid-cols-4 gap-3">
        <button
          v-for="action in quickActions"
          :key="action.label"
          class="flex flex-col items-center gap-2 active:scale-95 transition-transform tap-highlight-transparent"
          @click="goToRoute(action.route)"
        >
          <div :class="[action.color, 'w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shadow-black/10']">
            <component :is="action.icon" class="w-6 h-6 text-white" />
          </div>
          <span class="text-xs font-medium text-foreground">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium text-muted-foreground">今日工单</h2>
        <button
          class="flex items-center text-xs text-primary font-medium tap-highlight-transparent"
          @click="router.push('/records')"
        >
          查看全部
          <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>
      <div class="space-y-3">
        <button
          v-for="record in recentRecords"
          :key="record.id"
          class="w-full bg-card rounded-2xl p-4 shadow-sm border border-border text-left active:scale-[0.98] transition-transform"
          @click="goToRecord(record.id)"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1.5 flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {{ record.type }}
                </span>
                <span class="text-xs text-muted-foreground truncate">{{ record.record_no }}</span>
              </div>
              <h3 class="font-semibold text-foreground text-base truncate">{{ record.title }}</h3>
              <p class="text-sm text-muted-foreground truncate">{{ record.staff }}</p>
            </div>
            <span
              :class="[
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2',
                record.status_type === 'pending'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : record.status_type === 'progress'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              ]"
            >
              {{ record.status }}
            </span>
          </div>
          <div class="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <Calendar class="w-3.5 h-3.5" />
              <span>{{ record.time }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
