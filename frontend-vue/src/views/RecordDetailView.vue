<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MoreVertical, MapPin, User, Calendar, Clock, Phone, FileText } from 'lucide-vue-next'
import { recordsApi } from '@/api'

const route = useRoute()
const router = useRouter()
const recordId = Number(route.params.id)

const loading = ref(true)

const mockRecord = {
  id: 1,
  record_no: 'GD20260718001',
  record_type: 'construction',
  type_label: '施工单',
  title: '某大厦12层空调安装',
  status: 'in_progress',
  status_label: '进行中',
  customer_name: '华信科技有限公司',
  contact_name: '张经理',
  contact_phone: '138****8888',
  address: '北京市朝阳区建国路88号某大厦12层',
  start_time: '2026-07-18 09:30',
  end_time: '2026-07-18 18:00',
  staff_names: '张三、李四、王五',
  fault_description: '',
  fault_diagnosis: '',
  repair_process: '安装10台中央空调，包括室内机和室外机的安装、调试和验收。',
  materials: [
    { name: '中央空调室内机', quantity: 10, unit: '台' },
    { name: '中央空调室外机', quantity: 2, unit: '台' },
    { name: '铜管', quantity: 50, unit: '米' },
  ],
}

const record = ref<any>(mockRecord)

const useMock = import.meta.env.DEV

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    construction: 'bg-blue-50 text-blue-700',
    repair: 'bg-emerald-50 text-emerald-700',
    project: 'bg-violet-50 text-violet-700',
  }
  return colors[type] || 'bg-slate-50 text-slate-700'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-red-50 text-red-700',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-slate-100 text-slate-600',
  }
  return colors[status] || 'bg-slate-100 text-slate-600'
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/records')
  }
}

const fetchDetail = async () => {
  if (useMock) {
    loading.value = false
    return
  }
  try {
    loading.value = true
    const res = await recordsApi.get(recordId)
    record.value = res.data
  } catch (e) {
    console.error('获取工单详情失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="min-h-screen-safe bg-muted/30 flex flex-col">
    <div class="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-2">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="flex-1 text-center font-semibold text-foreground text-base -ml-10">
          工单详情
        </h1>
        <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors tap-highlight-transparent">
          <MoreVertical class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-muted-foreground text-sm">加载中...</div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div class="px-4 py-4 space-y-4">
        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', getTypeColor(record.record_type)]">
                {{ record.type_label }}
              </span>
              <span class="text-xs text-muted-foreground">{{ record.record_no }}</span>
            </div>
            <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', getStatusColor(record.status)]">
              {{ record.status_label }}
            </span>
          </div>
          <h2 class="text-xl font-bold text-foreground">{{ record.title }}</h2>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground">客户信息</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <User class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="flex-1">
                <p class="text-sm text-muted-foreground">客户名称</p>
                <p class="text-sm font-medium text-foreground">{{ record.customer_name }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Phone class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div class="flex-1">
                <p class="text-sm text-muted-foreground">联系人</p>
                <p class="text-sm font-medium text-foreground">{{ record.contact_name }} · {{ record.contact_phone }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <MapPin class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
              </div>
              <div class="flex-1">
                <p class="text-sm text-muted-foreground">施工地址</p>
                <p class="text-sm font-medium text-foreground">{{ record.address }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground">时间安排</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Calendar class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div class="flex-1 flex justify-between">
                <p class="text-sm text-muted-foreground">开始时间</p>
                <p class="text-sm font-medium text-foreground">{{ record.start_time }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Clock class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div class="flex-1 flex justify-between">
                <p class="text-sm text-muted-foreground">预计完成</p>
                <p class="text-sm font-medium text-foreground">{{ record.end_time }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground">施工人员</h3>
          <p class="text-sm text-foreground">{{ record.staff_names }}</p>
        </div>

        <div v-if="record.repair_process" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground">工作内容</h3>
          <p class="text-sm text-foreground leading-relaxed">{{ record.repair_process }}</p>
        </div>

        <div v-if="record.materials && record.materials.length > 0" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground">物料清单</h3>
          <div class="space-y-2">
            <div
              v-for="(m, idx) in record.materials"
              :key="idx"
              class="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span class="text-sm text-foreground">{{ m.name }}</span>
              <span class="text-sm font-medium text-foreground">{{ m.quantity }} {{ m.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="h-24"></div>
    </div>

    <div class="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border p-4 safe-area-bottom">
      <div class="flex gap-3">
        <button class="flex-1 h-12 rounded-xl border border-input text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors tap-highlight-transparent">
          编辑
        </button>
        <button class="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all tap-highlight-transparent">
          开始施工
        </button>
      </div>
    </div>
  </div>
</template>
