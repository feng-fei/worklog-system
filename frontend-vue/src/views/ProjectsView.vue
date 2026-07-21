<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, FolderKanban, Building2, MapPin, Phone, RefreshCw, Loader2, AlertCircle, Plus } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { projectsApi } from '@/api'
import type { Project } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const projects = ref<Project[]>([])
const page = ref(1)
const perPage = 20
const total = ref(0)
const loadingMore = ref(false)
const finished = ref(false)

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
  if (loading.value || loadingMore.value) return

  error.value = ''
  if (isRefresh) {
    refreshing.value = true
    page.value = 1
    finished.value = false
  } else {
    loadingMore.value = true
  }
  loading.value = true

  try {
    const res = await projectsApi.list({
      keyword: searchQuery.value,
      page: page.value,
      per_page: perPage,
    })
    const list = res.records || []
    if (isRefresh) {
      projects.value = list
    } else {
      projects.value = [...projects.value, ...list]
    }
    total.value = res.total || 0
    if (projects.value.length >= total.value) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
    console.error('加载项目列表失败', e)
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

const refresh = () => loadProjects(true)
const loadMore = () => {
  if (!finished.value && !loadingMore.value) {
    loadProjects(false)
  }
}

let searchTimer: number | null = null
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    refresh()
  }, 300)
}

const goToDetail = (projectId: number) => {
  router.push({ name: 'project-detail', params: { id: projectId } })
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const bottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (bottom < 100) {
    loadMore()
  }
}

onMounted(() => {
  loadProjects(true)
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10 safe-area-top">
      <div class="flex items-center gap-2 mb-2">
        <h1 class="text-lg font-bold text-foreground">项目管理</h1>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索项目名称/编号/合同号"
            class="pl-9 h-10 text-sm rounded-xl bg-muted/50 border-input"
            @input="handleSearch"
          />
        </div>
        <button
          class="p-2.5 rounded-xl bg-muted/50 border border-input text-foreground active:scale-95 transition-transform"
          @click="refresh"
        >
          <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
        </button>
        <button
          class="p-2.5 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform"
          @click="router.push('/create-project')"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 space-y-2.5 scroll-container" @scroll="handleScroll">
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
                <div v-if="project.project_address" class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.project_address }}</span>
                </div>
                <div v-if="project.contact_name || project.contact_phone" class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.contact_name }} {{ project.contact_name && project.contact_phone ? '·' : '' }} {{ project.contact_phone }}</span>
                </div>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <span class="text-muted-foreground">
                合同金额 <span class="font-semibold text-foreground">¥{{ (project.contract_amount || 0).toLocaleString() }}</span>
              </span>
              <span class="text-muted-foreground">
                {{ formatDate(project.start_date) }} ~ {{ formatDate(project.end_date) }}
              </span>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && projects.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && projects.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">📁</div>
            <p class="text-muted-foreground text-sm">暂无项目</p>
            <button class="mt-3 text-sm text-primary font-medium" @click="router.push('/create-project')">
              新建项目
            </button>
          </div>
        </template>
      </div>
    </PullRefresh>
  </div>
</template>
