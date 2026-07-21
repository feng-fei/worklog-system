<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, FolderKanban, Building2, MapPin, Phone, RefreshCw, Loader2, AlertCircle, Plus, X, LayoutGrid, List, Filter, Briefcase } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { projectsApi } from '@/api'
import type { Project } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const showFilters = ref(true)
const viewMode = ref<'grid' | 'list'>('grid')
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const projects = ref<Project[]>([])
const page = ref(1)
const perPage = 20
const total = ref(0)
const loadingMore = ref(false)
const finished = ref(false)

onMounted(() => {
  if (window.innerWidth >= 768) {
    viewMode.value = 'list'
  }
  loadProjects(true)
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    refresh()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  refresh()
}

watch(searchQuery, () => {
  debouncedSearch()
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

const tabs = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待开始', status: 'pending' },
  { key: 'in_progress', label: '进行中', status: 'in_progress' },
  { key: 'completed', label: '已完成', status: 'completed' },
  { key: 'settled', label: '已结算', status: 'settled' },
]

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
    const statusTab = tabs.find(t => t.key === activeTab.value)
    const res = await projectsApi.list({
      keyword: searchQuery.value,
      status: statusTab?.status || undefined,
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

const handleTabChange = (key: string) => {
  activeTab.value = key
  refresh()
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
</script>

<template>
  <div class="flex flex-col h-full relative">
    <div class="sticky top-0 z-20 safe-area-top">
      <div class="px-4 py-3 md:px-6 lg:px-8 md:py-4 border-b border-border backdrop-blur-xl bg-background/80">
        <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div class="flex items-center gap-2 flex-1">
            <div class="relative flex-1 group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                v-model="searchQuery"
                placeholder="搜索项目名称/编号/合同号"
                class="pl-9 pr-20 h-10 text-sm rounded-xl bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 transition-all"
                @keyup.enter="refresh"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  v-if="searchQuery"
                  class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  @click="clearSearch"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <button
                  class="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
                  @click="refresh"
                >
                  <Search class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button
              class="p-2.5 rounded-xl bg-muted/30 border border-border text-foreground hover:bg-muted/60 transition-all duration-300 active:scale-95 hover:border-primary/30"
              @click="refresh"
            >
              <RefreshCw :class="['w-4 h-4', (refreshing || loading) && 'animate-spin']" />
            </button>
            <button
              class="md:hidden p-2.5 rounded-xl bg-muted/30 border border-border text-foreground active:scale-95 transition-all duration-300 hover:border-primary/30"
              :class="showFilters && 'border-primary/50 text-primary'"
              @click="showFilters = !showFilters"
            >
              <Filter :class="['w-4 h-4', showFilters && 'text-primary']" />
            </button>
          </div>

          <div class="hidden md:flex items-center gap-3">
            <div class="flex gap-1.5 bg-muted/30 p-1 rounded-xl border border-border">
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'list' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'list'"
              >
                <List class="w-4 h-4" />
              </button>
              <button
                :class="[
                  'p-2 rounded-lg transition-all duration-200',
                  viewMode === 'grid' ? 'bg-background shadow-sm text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                ]"
                @click="viewMode = 'grid'"
              >
                <LayoutGrid class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          :class="[
            'overflow-hidden transition-all duration-300 md:overflow-visible',
            showFilters ? 'max-h-96 mt-3 md:mt-3' : 'max-h-0 md:max-h-none md:mt-3'
          ]"
        >
          <div class="flex gap-2 md:gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:pb-0 scrollbar-hide">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 shrink-0',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-primary-foreground shadow-lg shadow-violet-500/25'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border hover:border-primary/30'
              ]"
              @click="handleTabChange(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
    </div>

    <PullRefresh @refresh="refresh">
      <div class="h-full overflow-y-auto px-4 py-3 pb-28 md:px-6 lg:px-8 md:py-4 md:pb-6 scroll-container" @scroll="handleScroll">
        <div v-if="loading && projects.length === 0" class="py-3">
          <Skeleton :mode="viewMode === 'grid' ? 'card' : 'table'" :rows="5" />
        </div>

        <div v-else-if="error && projects.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              v-for="project in projects"
              :key="project.id"
              class="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/25 group border-border/80"
              @click="goToDetail(project.id)"
            >
              <CardContent class="p-4">
                <div class="flex items-start justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                      <FolderKanban class="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <span :class="['px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', statusColorCls[project.status] || statusColorCls.pending]">
                    {{ statusLabels[project.status] || project.status }}
                  </span>
                </div>
                <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ project.name }}</h3>
                <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Building2 class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.customer_name }}</span>
                </div>
                <div v-if="project.project_address" class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.project_address }}</span>
                </div>
                <div v-if="project.contact_name || project.contact_phone" class="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ project.contact_name }} {{ project.contact_name && project.contact_phone ? '·' : '' }} {{ project.contact_phone }}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <span>
                    合同金额 <span class="font-semibold text-foreground">¥{{ (project.contract_amount || 0).toLocaleString() }}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div v-else>
            <div class="rounded-2xl border border-border overflow-hidden shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-border bg-muted/20">
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">项目名称</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">客户</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">状态</th>
                      <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">联系人</th>
                      <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">地址</th>
                      <th class="hidden md:table-cell text-right text-xs font-medium text-muted-foreground px-4 py-3">合同金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="project in projects"
                      :key="project.id"
                      class="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                      @click="goToDetail(project.id)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                            <FolderKanban class="w-4 h-4 text-white" />
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">{{ project.name }}</p>
                            <p v-if="project.project_address" class="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5 md:hidden">{{ project.project_address }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[150px]">{{ project.customer_name }}</td>
                      <td class="px-4 py-3">
                        <span :class="['px-2.5 py-1 rounded-full text-xs font-medium', statusColorCls[project.status] || statusColorCls.pending]">
                          {{ statusLabels[project.status] || project.status }}
                        </span>
                      </td>
                      <td class="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground">
                        {{ project.contact_name || '-' }}
                        <span v-if="project.contact_phone" class="text-xs"> · {{ project.contact_phone }}</span>
                      </td>
                      <td class="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{{ project.project_address || '-' }}</td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm font-medium text-foreground text-right">
                        ¥{{ (project.contract_amount || 0).toLocaleString() }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>

          <div v-if="finished && projects.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <EmptyState
            v-if="!loading && projects.length === 0"
            :icon="Briefcase"
            title="暂无项目"
            description="还没有任何项目，点击下方按钮创建第一个项目"
            action-text="新建项目"
            @action="router.push('/create-project')"
          />
        </template>
      </div>
    </PullRefresh>

    <button
      class="fixed right-4 bottom-20 md:bottom-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5"
      @click="router.push('/create-project')"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
