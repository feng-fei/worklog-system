<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, User, Phone, Briefcase, DollarSign, RefreshCw, Loader2, AlertCircle, Plus, X, LayoutGrid, List, Filter } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { staffsApi } from '@/api'
import { useList } from '@/composables/useList'
import type { Staff } from '@/types'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const showFilters = ref(true)
const viewMode = ref<'grid' | 'list'>('grid')

onMounted(() => {
  if (window.innerWidth >= 768) {
    viewMode.value = 'list'
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const debouncedSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  handleSearch()
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
  { key: 'active', label: '在职', status: 'active' },
  { key: 'inactive', label: '离职', status: 'inactive' },
]

const {
  list: staffs,
  loading,
  refreshing,
  loadingMore,
  finished,
  error,
  loadList,
  refresh,
  loadMore,
  params,
} = useList<Staff>({
  fetchFn: staffsApi.list,
  defaultParams: { per_page: 20 },
  immediate: false,
})

loadList(true)

const staffTypeLabels: Record<string, string> = {
  fixed: '固定工',
  temp: '临时工',
}

const staffTypeColorCls: Record<string, string> = {
  fixed: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  temp: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

const statusLabels: Record<string, string> = {
  active: '在职',
  inactive: '离职',
}

const statusColorCls: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
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

const handleTabChange = (key: string) => {
  activeTab.value = key
  const tab = tabs.find(t => t.key === key)
  if (tab) {
    if (tab.status) {
      params.status = tab.status
    } else {
      delete (params as any).status
    }
  }
  refresh()
}

const handleSearch = () => {
  if (searchQuery.value) {
    params.keyword = searchQuery.value
  } else {
    delete (params as any).keyword
  }
  refresh()
}

const goToDetail = (id: number) => {
  router.push(`/staff/${id}`)
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
                placeholder="搜索员工姓名/职位/电话"
                class="pl-9 pr-20 h-10 text-sm rounded-xl bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 transition-all"
                @keyup.enter="handleSearch"
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
                  @click="handleSearch"
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
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-primary-foreground shadow-lg shadow-emerald-500/25'
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
        <div v-if="loading && staffs.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && staffs.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              v-for="staff in staffs"
              :key="staff.id"
              class="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/25 group border-border/80"
              @click="goToDetail(staff.id)"
            >
              <CardContent class="p-4">
                <div class="flex items-start gap-3 mb-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <User class="w-5 h-5 text-white" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-foreground text-sm">{{ staff.name }}</h3>
                    <div class="flex items-center gap-1.5 mt-1">
                      <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', staffTypeColorCls[staff.staff_type] || staffTypeColorCls.fixed]">
                        {{ staffTypeLabels[staff.staff_type] || staff.staff_type }}
                      </span>
                      <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', statusColorCls[staff.status] || statusColorCls.active]">
                        {{ statusLabels[staff.status] || staff.status }}
                      </span>
                    </div>
                  </div>
                </div>
                <div v-if="staff.position" class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Briefcase class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ staff.position }}</span>
                </div>
                <div v-if="staff.phone" class="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ staff.phone }}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <span class="flex items-center gap-1">
                    <DollarSign class="w-3.5 h-3.5" />
                    {{ staff.staff_type === 'fixed' ? '月薪' : '日薪' }}
                    <span class="font-semibold text-foreground">¥{{ (staff.staff_type === 'fixed' ? staff.monthly_salary : staff.daily_wage)?.toLocaleString() || 0 }}</span>
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
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">姓名</th>
                      <th class="hidden md:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">职位</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">类型</th>
                      <th class="text-left text-xs font-medium text-muted-foreground px-4 py-3">状态</th>
                      <th class="hidden lg:table-cell text-left text-xs font-medium text-muted-foreground px-4 py-3">电话</th>
                      <th class="hidden md:table-cell text-right text-xs font-medium text-muted-foreground px-4 py-3">薪资</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="staff in staffs"
                      :key="staff.id"
                      class="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
                      @click="goToDetail(staff.id)"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                            <User class="w-4 h-4 text-white" />
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-foreground truncate max-w-[120px] group-hover:text-primary transition-colors">{{ staff.name }}</p>
                            <p v-if="staff.position" class="text-xs text-muted-foreground truncate max-w-[120px] mt-0.5 md:hidden">{{ staff.position }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[120px]">{{ staff.position || '-' }}</td>
                      <td class="px-4 py-3">
                        <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', staffTypeColorCls[staff.staff_type] || staffTypeColorCls.fixed]">
                          {{ staffTypeLabels[staff.staff_type] || staff.staff_type }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusColorCls[staff.status] || statusColorCls.active]">
                          {{ statusLabels[staff.status] || staff.status }}
                        </span>
                      </td>
                      <td class="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground">{{ staff.phone || '-' }}</td>
                      <td class="hidden md:table-cell px-4 py-3 text-sm font-medium text-foreground text-right">
                        ¥{{ (staff.staff_type === 'fixed' ? staff.monthly_salary : staff.daily_wage)?.toLocaleString() || 0 }}
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

          <div v-if="finished && staffs.length > 0" class="py-6 text-center text-sm text-muted-foreground">
            — 没有更多了 —
          </div>

          <div v-if="!loading && staffs.length === 0" class="py-16 text-center">
            <div class="text-5xl mb-3">👥</div>
            <p class="text-muted-foreground text-sm">暂无员工</p>
          </div>
        </template>
      </div>
    </PullRefresh>

    <button
      class="fixed right-4 bottom-20 md:bottom-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-92 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
      @click="router.push('/create-staff')"
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
