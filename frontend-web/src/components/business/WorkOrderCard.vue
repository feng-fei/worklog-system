<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  MapPin,
  User,
  Calendar,
  ChevronRight,
} from 'lucide-vue-next'
import { relativeTime, formatDate } from '@/lib/utils'

interface Props {
  record: {
    id: number
    order_no?: string
    status?: string
    customer_name?: string
    work_address?: string
    work_content?: string
    title?: string
    staff_name?: string
    created_at?: string
    work_date?: string
    record_type?: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'click', record: Props['record']): void
}>()

const statusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const statusInfo = computed(() => {
  const s = props.record.status || ''
  return statusMap[s] || { label: s || '未知', variant: 'secondary' }
})

const title = computed(() => {
  return props.record.title || props.record.work_content?.slice(0, 40) || '无标题'
})

const typeLabel = computed(() => {
  const t = props.record.record_type || ''
  if (t === 'construction') return '施工'
  if (t === 'maintenance') return '维修'
  if (t === 'install') return '安装'
  if (t === 'inspection') return '巡检'
  return t || '工单'
})

const handleClick = () => {
  emit('click', props.record)
}
</script>

<template>
  <Card
    class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
    @click="handleClick"
  >
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-2">
        <span class="font-semibold">
          {{ record.order_no || '#' + record.id }}
        </span>
        <Badge :variant="statusInfo.variant as any" size="sm">
          {{ statusInfo.label }}
        </Badge>
        <Badge variant="outline" size="sm">
          {{ typeLabel }}
        </Badge>
      </div>
      <ChevronRight class="h-5 w-5 text-muted-foreground" />
    </div>

    <h3 class="mt-2 font-medium text-foreground line-clamp-2">
      {{ title }}
    </h3>

    <div class="mt-3 space-y-1.5 text-sm text-muted-foreground">
      <div class="flex items-center gap-2">
        <User class="h-4 w-4 flex-shrink-0" />
        <span class="truncate">{{ record.customer_name || '未指定客户' }}</span>
      </div>
      <div v-if="record.work_address" class="flex items-center gap-2">
        <MapPin class="h-4 w-4 flex-shrink-0" />
        <span class="truncate">{{ record.work_address }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Calendar class="h-4 w-4 flex-shrink-0" />
        <span>施工: {{ formatDate(record.work_date) }}</span>
        <span class="text-xs opacity-70">· 提交于 {{ relativeTime(record.created_at) }}</span>
        <span v-if="record.staff_name" class="ml-auto">· {{ record.staff_name }}</span>
      </div>
    </div>
  </Card>
</template>
