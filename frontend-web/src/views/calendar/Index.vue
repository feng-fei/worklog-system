<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { recordsApi, pendingApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ClipboardList,
  MapPin,
  User,
  RefreshCw,
  Eye,
  CircleDot,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const { isDesktop, isMobile } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})
const router = useRouter()

const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(null)
const calendarData = ref<Record<string, { records: any[]; pendings: any[] }>>({})
const dayRecords = ref<any[]>([])
const dayPendings = ref<any[]>([])
const loading = ref(false)
const dayLoading = ref(false)

const statusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const currentMonthStr = computed(() => {
  return formatDate(currentDate.value, 'YYYY年MM月')
})

const currentMonthParam = computed(() => {
  return formatDate(currentDate.value, 'YYYY-MM')
})

const todayStr = computed(() => {
  return formatDate(new Date(), 'YYYY-MM-DD')
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  
  const days: { date: Date; day: number; isCurrentMonth: boolean; dateStr: string }[] = []
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    days.push({
      date,
      day,
      isCurrentMonth: false,
      dateStr: formatDate(date, 'YYYY-MM-DD'),
    })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    days.push({
      date,
      day: i,
      isCurrentMonth: true,
      dateStr: formatDate(date, 'YYYY-MM-DD'),
    })
  }
  
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      day: i,
      isCurrentMonth: false,
      dateStr: formatDate(date, 'YYYY-MM-DD'),
    })
  }
  
  return days
})

const loadCalendarData = async () => {
  loading.value = true
  try {
    const res = await recordsApi.calendar({ month: currentMonthParam.value })
    const data = res.data || {}
    
    const result: Record<string, { records: any[]; pendings: any[] }> = {}
    
    if (data.records && Array.isArray(data.records)) {
      for (const record of data.records) {
        const dateKey = record.work_date || record.created_at?.split('T')[0]
        if (dateKey) {
          if (!result[dateKey]) {
            result[dateKey] = { records: [], pendings: [] }
          }
          result[dateKey].records.push(record)
        }
      }
    }
    
    if (data.pendings && Array.isArray(data.pendings)) {
      for (const pending of data.pendings) {
        const dateKey = pending.reminder_date || pending.due_date || pending.created_at?.split('T')[0]
        if (dateKey) {
          if (!result[dateKey]) {
            result[dateKey] = { records: [], pendings: [] }
          }
          result[dateKey].pendings.push(pending)
        }
      }
    }
    
    calendarData.value = result
  } catch (e) {
    console.error('加载日历数据失败', e)
    await loadCalendarDataFallback()
  } finally {
    loading.value = false
  }
}

const loadCalendarDataFallback = async () => {
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    
    const [recordsRes, pendingsRes] = await Promise.all([
      recordsApi.list({
        page: 1,
        per_page: 500,
        start_date: formatDate(startDate, 'YYYY-MM-DD'),
        end_date: formatDate(endDate, 'YYYY-MM-DD'),
      }).catch(() => ({ data: { records: [] } })),
      pendingApi.list({
        page: 1,
        per_page: 500,
      }).catch(() => ({ data: [] })),
    ])
    
    const result: Record<string, { records: any[]; pendings: any[] }> = {}
    
    const records = recordsRes.data?.records || (Array.isArray(recordsRes.data) ? recordsRes.data : [])
    for (const record of records) {
      const dateKey = record.work_date || record.created_at?.split('T')[0]
      if (dateKey) {
        if (!result[dateKey]) {
          result[dateKey] = { records: [], pendings: [] }
        }
        result[dateKey].records.push(record)
      }
    }
    
    const pendings = pendingsRes.data?.records || (Array.isArray(pendingsRes.data) ? pendingsRes.data : [])
    for (const pending of pendings) {
      const dateKey = pending.reminder_date || pending.due_date || pending.created_at?.split('T')[0]
      if (dateKey) {
        if (!result[dateKey]) {
          result[dateKey] = { records: [], pendings: [] }
        }
        result[dateKey].pendings.push(pending)
      }
    }
    
    calendarData.value = result
  } catch (e) {
    console.error('加载日历数据（降级）失败', e)
  }
}

const loadDayData = async (date: Date) => {
  selectedDate.value = date
  const dateStr = formatDate(date, 'YYYY-MM-DD')
  const dayData = calendarData.value[dateStr]
  
  dayLoading.value = true
  try {
    const [recordsRes, pendingsRes] = await Promise.all([
      recordsApi.list({
        page: 1,
        per_page: 100,
        date: dateStr,
      }).catch(() => ({ data: { records: [] } })),
      pendingApi.list({
        page: 1,
        per_page: 100,
        date: dateStr,
      }).catch(() => ({ data: [] })),
    ])
    
    dayRecords.value = recordsRes.data?.records || (Array.isArray(recordsRes.data) ? recordsRes.data : [])
    dayPendings.value = pendingsRes.data?.records || (Array.isArray(pendingsRes.data) ? pendingsRes.data : [])
    
    if (dayData) {
      const existingIds = new Set([...dayRecords.value.map(r => r.id), ...dayPendings.value.map(p => p.id)])
      for (const r of dayData.records) {
        if (!existingIds.has(r.id)) dayRecords.value.push(r)
      }
      for (const p of dayData.pendings) {
        if (!existingIds.has(p.id)) dayPendings.value.push(p)
      }
    }
  } catch (e) {
    console.error('加载当日数据失败', e)
    if (dayData) {
      dayRecords.value = dayData.records
      dayPendings.value = dayData.pendings
    }
  } finally {
    dayLoading.value = false
  }
}

const goToPrevMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
  loadCalendarData()
}

const goToNextMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
  loadCalendarData()
}

const goToToday = () => {
  const today = new Date()
  currentDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today
  loadCalendarData()
  loadDayData(today)
}

const isSelectedDate = (dateStr: string) => {
  if (!selectedDate.value) return false
  return formatDate(selectedDate.value, 'YYYY-MM-DD') === dateStr
}

const isToday = (dateStr: string) => {
  return todayStr.value === dateStr
}

const getDayData = (dateStr: string) => {
  return calendarData.value[dateStr] || { records: [], pendings: [] }
}

const goToRecordDetail = (id: number) => {
  router.push(`/records/${id}`)
}

const goToPendingDetail = (id: number) => {
  router.push(`/pending/${id}`)
}

const onRefresh = () => {
  return loadCalendarData()
}

onMounted(async () => {
  await loadCalendarData()
  const today = new Date()
  loadDayData(today)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isMobile">
      <MobileHeader title="日程日历" :showMenu="true" @menu-click="toggleSidebar">
        <template #right>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="onRefresh"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </template>
      </MobileHeader>

      <div class="px-4 py-3">
        <div class="flex items-center justify-between">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToPrevMonth"
          >
            <ChevronLeft class="h-5 w-5" />
          </button>
          
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold">{{ currentMonthStr }}</h2>
            <button
              class="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              @click="goToToday"
            >
              今天
            </button>
          </div>
          
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="goToNextMonth"
          >
            <ChevronRight class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="px-4 pb-4">
        <Card class="p-3">
          <div class="grid grid-cols-7 gap-1 mb-2">
            <div
              v-for="day in weekDays"
              :key="day"
              class="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {{ day }}
            </div>
          </div>
          
          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="day in calendarDays"
              :key="day.dateStr"
              class="aspect-square flex flex-col items-center justify-center rounded-lg relative transition-colors p-1"
              :class="[
                day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                isSelectedDate(day.dateStr) ? 'bg-primary text-primary-foreground' : '',
                !isSelectedDate(day.dateStr) && isToday(day.dateStr) ? 'bg-primary/10 text-primary font-bold' : '',
                !isSelectedDate(day.dateStr) && !isToday(day.dateStr) ? 'hover:bg-accent active:bg-accent/80' : '',
              ]"
              @click="day.isCurrentMonth && loadDayData(day.date)"
            >
              <span class="text-sm">{{ day.day }}</span>
              
              <div
                v-if="day.isCurrentMonth && (getDayData(day.dateStr).records.length > 0 || getDayData(day.dateStr).pendings.length > 0)"
                class="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5"
              >
                <span
                  v-if="getDayData(day.dateStr).records.length > 0"
                  class="text-[10px] font-medium leading-none px-1 rounded-full min-w-[14px] text-center"
                  :class="isSelectedDate(day.dateStr) ? 'bg-primary-foreground/30 text-primary-foreground' : 'bg-primary/15 text-primary'"
                >
                  {{ getDayData(day.dateStr).records.length }}
                </span>
                <span
                  v-if="getDayData(day.dateStr).pendings.length > 0"
                  class="text-[10px] font-medium leading-none px-1 rounded-full min-w-[14px] text-center"
                  :class="isSelectedDate(day.dateStr) ? 'bg-primary-foreground/30 text-primary-foreground' : 'bg-warning/15 text-warning'"
                >
                  {{ getDayData(day.dateStr).pendings.length }}
                </span>
              </div>
            </button>
          </div>
        </Card>
      </div>

      <div v-if="selectedDate" class="flex-1 px-4 pb-6 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CalendarIcon class="h-5 w-5 text-primary" />
            <h3 class="font-semibold">{{ formatDate(selectedDate, 'YYYY年MM月DD日') }}</h3>
          </div>
          <div class="flex gap-2 text-xs">
            <div class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-primary"></span>
              <span class="text-muted-foreground">工单</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-warning"></span>
              <span class="text-muted-foreground">待办</span>
            </div>
          </div>
        </div>

        <div v-if="dayLoading" class="py-8 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-6 w-6 animate-spin opacity-50" />
          <p class="text-sm">加载中...</p>
        </div>

        <template v-else>
          <Card v-if="dayRecords.length > 0" class="overflow-hidden">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <div class="flex items-center gap-2">
                <ClipboardList class="h-4 w-4 text-primary" />
                <h4 class="font-medium text-sm">工单 ({{ dayRecords.length }})</h4>
              </div>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="record in dayRecords"
                :key="record.id"
                class="flex items-start justify-between px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                @click="goToRecordDetail(record.id)"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-sm truncate">{{ record.order_no || '#' + record.id }}</p>
                    <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                      {{ getStatusInfo(record.status).label }}
                    </Badge>
                  </div>
                  <p class="mt-1 text-sm text-muted-foreground truncate">
                    {{ record.work_content?.slice(0, 30) || record.title || '无标题' }}
                  </p>
                  <p v-if="record.customer_name" class="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <User class="h-3 w-3" />
                    {{ record.customer_name }}
                  </p>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </div>
          </Card>

          <Card v-if="dayPendings.length > 0" class="overflow-hidden">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <div class="flex items-center gap-2">
                <Clock class="h-4 w-4 text-warning" />
                <h4 class="font-medium text-sm">待办事项 ({{ dayPendings.length }})</h4>
              </div>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="item in dayPendings"
                :key="item.id"
                class="flex items-start justify-between px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                @click="goToPendingDetail(item.id)"
              >
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">{{ item.title }}</p>
                  <p v-if="item.customer_name" class="mt-1 text-xs text-muted-foreground truncate">
                    {{ item.customer_name }}
                  </p>
                  <p v-if="item.reminder_time" class="mt-1 text-xs text-warning flex items-center gap-1">
                    <CircleDot class="h-3 w-3" />
                    {{ item.reminder_time }}
                  </p>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </div>
          </Card>

          <div v-if="dayRecords.length === 0 && dayPendings.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <CalendarIcon class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">当日暂无安排</p>
            <p class="mt-1 text-sm text-muted-foreground">这一天没有工单和待办事项</p>
          </div>
        </template>
      </div>

      <div v-else class="flex-1 px-4 pb-6">
        <div class="py-12 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CalendarIcon class="h-8 w-8 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground">选择日期查看详情</p>
          <p class="mt-1 text-sm text-muted-foreground">点击日历中的日期查看当天的工单和待办</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mx-auto w-full max-w-7xl p-6">
        <Card class="p-6">
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <h1 class="text-2xl font-semibold">日程日历</h1>
              <div class="flex items-center gap-2 text-sm">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-primary"></span>
                  <span class="text-muted-foreground">工单</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-warning"></span>
                  <span class="text-muted-foreground">待办</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Button variant="outline" size="icon" @click="goToPrevMonth">
                <ChevronLeft class="h-5 w-5" />
              </Button>
              <span class="text-lg font-semibold min-w-[140px] text-center">{{ currentMonthStr }}</span>
              <Button variant="outline" size="icon" @click="goToNextMonth">
                <ChevronRight class="h-5 w-5" />
              </Button>
              <Button variant="outline" @click="goToToday">
                今天
              </Button>
              <Button variant="outline" size="icon" @click="onRefresh">
                <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-7 gap-2 mb-2">
            <div
              v-for="day in weekDays"
              :key="day"
              class="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground"
            >
              {{ day }}
            </div>
          </div>

          <div class="grid grid-cols-7 gap-2">
            <button
              v-for="day in calendarDays"
              :key="day.dateStr"
              class="min-h-[80px] p-2 rounded-lg border text-left transition-all"
              :class="[
                day.isCurrentMonth ? 'bg-card hover:bg-accent/50 border-border' : 'bg-muted/30 border-transparent',
                isSelectedDate(day.dateStr) ? 'ring-2 ring-primary bg-primary/5 border-primary' : '',
                isToday(day.dateStr) && !isSelectedDate(day.dateStr) ? 'border-primary/50' : '',
              ]"
              @click="day.isCurrentMonth && loadDayData(day.date)"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-sm font-medium"
                  :class="[
                    day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    isToday(day.dateStr) ? 'text-primary' : '',
                  ]"
                >
                  {{ day.day }}
                </span>
                <div
                  v-if="day.isCurrentMonth && (getDayData(day.dateStr).records.length > 0 || getDayData(day.dateStr).pendings.length > 0)"
                  class="flex gap-1"
                >
                  <span
                    v-if="getDayData(day.dateStr).records.length > 0"
                    class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {{ getDayData(day.dateStr).records.length }}
                  </span>
                  <span
                    v-if="getDayData(day.dateStr).pendings.length > 0"
                    class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-warning/10 text-warning"
                  >
                    {{ getDayData(day.dateStr).pendings.length }}
                  </span>
                </div>
              </div>
              
              <div v-if="day.isCurrentMonth && getDayData(day.dateStr).records.length > 0" class="mt-2 space-y-1">
                <div
                  v-for="record in getDayData(day.dateStr).records.slice(0, 2)"
                  :key="record.id"
                  class="text-xs truncate text-muted-foreground"
                >
                  · {{ record.work_content?.slice(0, 15) || record.title || '工单' }}
                </div>
                <div
                  v-if="getDayData(day.dateStr).records.length > 2"
                  class="text-xs text-muted-foreground/70"
                >
                  +{{ getDayData(day.dateStr).records.length - 2 }} 更多
                </div>
              </div>
            </button>
          </div>

          <div v-if="selectedDate" class="mt-8 border-t border-border pt-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarIcon class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="font-semibold text-lg">{{ formatDate(selectedDate, 'YYYY年MM月DD日') }}</h3>
                  <p class="text-sm text-muted-foreground">
                    共 {{ dayRecords.length }} 个工单，{{ dayPendings.length }} 个待办
                  </p>
                </div>
              </div>
            </div>

            <div v-if="dayLoading" class="py-8 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>

            <template v-else>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card v-if="dayRecords.length > 0" class="overflow-hidden">
                  <div class="flex items-center justify-between border-b border-border px-5 py-4">
                    <div class="flex items-center gap-2">
                      <ClipboardList class="h-5 w-5 text-primary" />
                      <h4 class="font-semibold">工单列表</h4>
                      <Badge variant="secondary" size="sm">{{ dayRecords.length }}</Badge>
                    </div>
                  </div>
                  <div class="divide-y divide-border max-h-[400px] overflow-y-auto">
                    <div
                      v-for="record in dayRecords"
                      :key="record.id"
                      class="flex items-start justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      @click="goToRecordDetail(record.id)"
                    >
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <p class="font-medium text-sm truncate">{{ record.order_no || '#' + record.id }}</p>
                          <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                            {{ getStatusInfo(record.status).label }}
                          </Badge>
                        </div>
                        <p class="mt-1 text-sm text-muted-foreground truncate">
                          {{ record.work_content || record.title || '无标题' }}
                        </p>
                        <div class="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span v-if="record.customer_name" class="flex items-center gap-1">
                            <User class="h-3 w-3" />
                            {{ record.customer_name }}
                          </span>
                          <span v-if="record.work_address" class="flex items-center gap-1">
                            <MapPin class="h-3 w-3" />
                            {{ record.work_address }}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" @click.stop="goToRecordDetail(record.id)">
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card v-if="dayPendings.length > 0" class="overflow-hidden">
                  <div class="flex items-center justify-between border-b border-border px-5 py-4">
                    <div class="flex items-center gap-2">
                      <Clock class="h-5 w-5 text-warning" />
                      <h4 class="font-semibold">待办事项</h4>
                      <Badge variant="warning" size="sm">{{ dayPendings.length }}</Badge>
                    </div>
                  </div>
                  <div class="divide-y divide-border max-h-[400px] overflow-y-auto">
                    <div
                      v-for="item in dayPendings"
                      :key="item.id"
                      class="flex items-start justify-between px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      @click="goToPendingDetail(item.id)"
                    >
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm">{{ item.title }}</p>
                        <p v-if="item.customer_name" class="mt-1 text-xs text-muted-foreground">
                          {{ item.customer_name }}
                        </p>
                        <p v-if="item.reminder_date || item.reminder_time" class="mt-1 text-xs text-warning flex items-center gap-1">
                          <CircleDot class="h-3 w-3" />
                          {{ item.reminder_time || item.reminder_date }}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" @click.stop="goToPendingDetail(item.id)">
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </div>
                  </div>
                </Card>

                <div v-if="dayRecords.length === 0 && dayPendings.length === 0" class="lg:col-span-2 py-12 text-center">
                  <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <CalendarIcon class="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p class="text-muted-foreground">当日暂无安排</p>
                  <p class="mt-1 text-sm text-muted-foreground">这一天没有工单和待办事项</p>
                </div>
              </div>
            </template>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
