<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, FolderKanban, Building2, Calendar, Clock, CheckCircle2, Filter, RefreshCw, Loader2, AlertCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { recordsApi } from '@/api'
import type { WorkRecord } from '@/types'

interface ProjectSummary {
  id: number | string
  name: string
  customer_name: string
  total_records: number
  completed_records: number
  progress: number
  status: 'active' | 'completed' | 'pending'
  start_date: string
  end_date: string
  total_fee: number
}

const router = useRouter()
const searchQuery = ref('')
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const allRecords = ref<WorkRecord[]>([])

const projects = computed<ProjectSummary[]>(() => {
  const projectMap = new Map<number | string, ProjectSummary>()

  const filtered = searchQuery.value
    ? allRecords.value.filter(r =>
        r.project_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        r.customer_name?.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    : allRecords.value

  for (const record of filtered) {
    if (!record.project_id && !record.project_name) continue

    const key = record.project_id || record.project_name || 'unknown'
    const existing = projectMap.get(key)

    if (!existing) {
      projectMap.set(key, {
        id: key,
        name: record.project_name || '未命名项目',
        customer_name: record.customer_name,
        total_records: 1,
        completed_records: record.status === 'completed' ? 1 : 0,
        progress: record.status === 'completed' ? 100 : 0,
        status: record.status === 'completed' ? 'completed' : record.status === 'in_progress' ? 'active' : 'pending',
        start_date: record.work_date || record.created_at,
        end_date: record.completed_at || record.work_date || record.created_at,
        total_fee: record.total_fee || 0,
      })
    } else {
      existing.total_records++
      if (record.status === 'completed') {
        existing.completed_records++
      }
      existing.progress = Math.round((existing.completed_records / existing.total_records) * 100)

      if (record.status === 'in_progress') {
        existing.status = 'active'
      } else if (record.status === 'pending' && existing.status === 'completed') {
        existing.status = 'active'
      }

      const recordDate = record.work_date || record.created_at
      if (recordDate && recordDate < existing.start_date) {
        existing.start_date = recordDate
      }
      const endDate = record.completed_at || record.work_date || record.created_at
      if (endDate && endDate > existing.end_date) {
        existing.end_date = endDate
      }

      existing.total_fee += record.total_fee || 0
    }
  }

  return Array.from(projectMap.values()).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (b.status === 'active' && a.status !== 'active') return 1
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  })
})

const statusLabels: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  pending: '待开始',
}

const statusColorCls: Record<string, string> = {
  active: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
}

const progressColorCls = (progress: number) => {
  if (progress >= 100) return 'bg-emerald-500'
  if (progress >= 50) return 'bg-amber-500'
  return 'bg-blue-500'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
  }
}

const loadProjects = async (isRefresh = false) => {
  if (loading.value) return

  error.value = ''
  if (isRefresh) {
    refreshing.value = true
  }
  loading.value = true

  try {
    const allRecs: WorkRecord[] = []
    let page = 1
    const perPage = 100
    let hasMore = true

    while (hasMore) {
      const res = await recordsApi.list({ page, per_page: perPage })
      allRecs.push(...res.records)
      if (!res.pages || page >= res.pages) {
        hasMore = false
      } else {
        page++
      }
    }

    allRecords.value = allRecs
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
    console.error('加载项目列表失败', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const refresh = () => loadProjects(true)

const handleSearch = () => {
}

const goToDetail = (projectId: number | string) => {
  router.push({ path: '/records', query: { project_id: String(projectId) } })
}

const handleScroll = (_e: Event) => {
}

onMounted(() => {
  loadProjects(true)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10">
      <div class="flex items-center gap-2 mb-2">
        <h1 class="text-lg font-bold text-foreground">项目管理</h1>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索项目名称/客户"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <button
          class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
          @click="refresh"
        >
          <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
        </button>
        <button class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform">
          <Filter class="w-4 h-4" />
        </button>
      </div>
    </div>

    <PullRefresh @refresh="refresh">
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" @scroll="handleScroll">
        <div v-if="loading && projects.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && projects.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div
            v-for="project in projects"
            :key="project.id"
            class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
            @click="goToDetail(project.id)"
          >
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                <FolderKanban class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-foreground text-[15px] truncate">{{ project.name }}</h3>
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', statusColorCls[project.status]]">
                    {{ statusLabels[project.status] }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Building2 class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.customer_name }}</span>
                </div>
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ formatDate(project.start_date) }} ~ {{ formatDate(project.end_date) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-border/50">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  进度 <span class="font-semibold text-foreground">{{ project.progress }}%</span>
                </span>
                <span class="text-muted-foreground flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5" />
                  {{ project.completed_records }}/{{ project.total_records }} 工单
                </span>
              </div>
              <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full transition-all duration-500', progressColorCls(project.progress)]"
                  :style="{ width: `${project.progress}%` }"
                />
              </div>
              <div class="flex items-center justify-between mt-2.5 text-xs">
                <span class="text-muted-foreground">
                  项目总额 <span class="font-semibold text-foreground">¥{{ project.total_fee.toLocaleString() }}</span>
                </span>
              </div>
            </div>
          </div>

          <div v-if="!loading && projects.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">📁</div>
            <p class="text-muted-foreground text-sm">暂无项目</p>
            <p class="text-muted-foreground text-xs mt-1">项目将从工单中自动汇总</p>
          </div>
        </template>
      </div>
    </PullRefresh>
  </div>
</template>
