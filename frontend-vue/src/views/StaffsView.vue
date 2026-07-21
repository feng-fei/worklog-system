<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, User, Phone, Briefcase, DollarSign, Filter, RefreshCw, Loader2, AlertCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import PullRefresh from '@/components/business/PullRefresh.vue'
import { staffsApi } from '@/api'
import { useList } from '@/composables/useList'
import type { Staff } from '@/types'

const router = useRouter()
const searchQuery = ref('')

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
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-10 safe-area-top">
      <div class="flex items-center gap-2 mb-2">
        <h1 class="text-lg font-bold text-foreground">团队成员</h1>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索员工姓名/职位/电话"
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
      <div class="h-full overflow-y-auto px-4 py-3 space-y-2.5 scroll-container" @scroll="handleScroll">
        <div v-if="loading && staffs.length === 0" class="flex items-center justify-center py-20">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div v-else-if="error && staffs.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
          <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
          <button class="text-sm text-primary font-medium" @click="refresh">重试</button>
        </div>

        <template v-else>
          <div
            v-for="staff in staffs"
            :key="staff.id"
            class="bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.985] transition-all cursor-pointer"
            @click="goToDetail(staff.id)"
          >
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <User class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-foreground text-[15px] truncate">{{ staff.name }}</h3>
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', staffTypeColorCls[staff.staff_type] || staffTypeColorCls.fixed]">
                    {{ staffTypeLabels[staff.staff_type] || staff.staff_type }}
                  </span>
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', statusColorCls[staff.status] || statusColorCls.active]">
                    {{ statusLabels[staff.status] || staff.status }}
                  </span>
                </div>
                <div v-if="staff.position" class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Briefcase class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ staff.position }}</span>
                </div>
                <div v-if="staff.phone" class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone class="w-3.5 h-3.5 shrink-0" />
                  <span class="truncate">{{ staff.phone }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div class="flex items-center gap-4 text-xs">
                <span v-if="staff.staff_type === 'fixed'" class="text-muted-foreground flex items-center gap-1">
                  <DollarSign class="w-3.5 h-3.5" />
                  月薪 <span class="font-semibold text-foreground">¥{{ staff.monthly_salary?.toLocaleString() || 0 }}</span>
                </span>
                <span v-else class="text-muted-foreground flex items-center gap-1">
                  <DollarSign class="w-3.5 h-3.5" />
                  日薪 <span class="font-semibold text-foreground">¥{{ staff.daily_wage?.toLocaleString() || 0 }}</span>
                </span>
                <span v-if="staff.hire_date" class="text-muted-foreground">
                  入职 <span class="font-medium text-foreground">{{ formatDate(staff.hire_date) }}</span>
                </span>
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
  </div>
</template>
