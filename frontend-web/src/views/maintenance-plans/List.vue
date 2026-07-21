<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { customersApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import PullRefresh from '@/components/business/PullRefresh.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Search,
  Plus,
  ChevronRight,
  Calendar,
  RefreshCw,
  Clock,
  Users,
  Settings,
  Edit,
  Trash2,
  Play,
  AlertCircle,
} from 'lucide-vue-next'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const plans = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '进行中', variant: 'success' },
  paused: { label: '已暂停', variant: 'warning' },
  completed: { label: '已完成', variant: 'secondary' },
}

const planTypeMap: Record<string, string> = {
  periodic: '定期',
  once: '一次性',
}

const cycleTypeMap: Record<string, string> = {
  day: '天',
  week: '周',
  month: '月',
  quarter: '季度',
  year: '年',
}

const getCycleText = (plan: any) => {
  if (plan.plan_type === 'once') return '一次性'
  const type = cycleTypeMap[plan.cycle_type] || plan.cycle_type
  return `每${plan.cycle_value || 1}${type}`
}

const formatDate = (date: string | undefined) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}

const loadPlans = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await customersApi.maintenancePlans({
      page: currentPage.value,
      page_size: 20,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      plans.value = list
    } else {
      plans.value = [...plans.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载维保计划列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/maintenance-plans/${id}`)
}

const goToCreate = () => {
  router.push('/maintenance-plans/create')
}

const goToEdit = (id: number) => {
  router.push(`/maintenance-plans/edit/${id}`)
}

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除该维保计划吗？')) return
  try {
    await customersApi.deleteMaintenancePlan(id)
    loadPlans(true)
  } catch (e) {
    console.error('删除失败', e)
  }
}

const handleGenerateTodos = async (id: number) => {
  if (!confirm('确定要生成待办吗？')) return
  try {
    await customersApi.generateMaintenanceTodos({ plan_id: id })
    alert('待办生成成功')
    loadPlans(true)
  } catch (e: any) {
    const msg = e.response?.data?.error || '生成失败，请重试'
    alert(msg)
  }
}

const onRefresh = () => {
  return loadPlans(true)
}

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  const query = searchQuery.value.toLowerCase()
  return plans.value.filter((p) =>
    (p.plan_name || '').toLowerCase().includes(query) ||
    (p.customer_name || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadPlans(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">维保计划</h1>
          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="goToCreate"
          >
            <Plus class="h-4 w-4" />
            新建计划
          </button>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索计划名称、客户名称..."
                class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
              @click="onRefresh"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              刷新
            </button>
          </div>
        </Card>

        <Card class="overflow-hidden">
          <div v-if="loading && plans.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredPlans.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Calendar class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无维保计划</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>计划名称</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>关联设备</TableHead>
                  <TableHead>维护内容</TableHead>
                  <TableHead>周期</TableHead>
                  <TableHead>计划日期</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="plan in filteredPlans"
                  :key="plan.id"
                  clickable
                  @click="goToDetail(plan.id)"
                >
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ plan.plan_name }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ plan.customer_name || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">
                    <span class="text-xs">设备ID: {{ plan.equipment_id || '-' }}</span>
                  </TableCell>
                  <TableCell class="text-muted-foreground">
                    <span class="line-clamp-2 max-w-[200px]" :title="plan.work_content">
                      {{ plan.work_content || '-' }}
                    </span>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ getCycleText(plan) }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ formatDate(plan.next_date) }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ plan.staff_name || '-' }}</TableCell>
                  <TableCell>
                    <Badge :variant="statusMap[plan.status]?.variant as any || 'secondary'" size="sm">
                      {{ statusMap[plan.status]?.label || plan.status || '-' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        @click.stop="goToEdit(plan.id)"
                      >
                        <Edit class="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        @click.stop="handleDelete(plan.id)"
                      >
                        <Trash2 class="h-4 w-4" />
                        删除
                      </button>
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-success transition-colors hover:bg-success/10"
                        @click.stop="handleGenerateTodos(plan.id)"
                      >
                        <Play class="h-4 w-4" />
                        生成待办
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="border-t border-border p-4 text-center">
              <button
                class="text-sm text-primary hover:underline"
                @click="loadPlans()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && plans.length > 0" class="border-t border-border p-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="维保计划" :showMenu="true" @menu-click="toggleSidebar">
        <template #right>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="onRefresh"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </template>
      </MobileHeader>

      <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
        <div class="relative">
          <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索计划名称、客户名称..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && plans.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredPlans.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Calendar class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无维保计划</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新计划</p>
          </div>

          <template v-else>
            <Card
              v-for="plan in filteredPlans"
              :key="plan.id"
              class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
              @click="goToDetail(plan.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ plan.plan_name }}
                  </span>
                  <Badge :variant="statusMap[plan.status]?.variant as any || 'secondary'" size="sm">
                    {{ statusMap[plan.status]?.label || plan.status || '-' }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Users class="h-4 w-4 flex-shrink-0" />
                <span>{{ plan.customer_name || '-' }}</span>
              </div>

              <div v-if="plan.work_content" class="mt-2 text-sm text-muted-foreground line-clamp-2">
                {{ plan.work_content }}
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Clock class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ getCycleText(plan) }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Settings class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">设备ID: {{ plan.equipment_id || '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">下次: {{ formatDate(plan.next_date) }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Users class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ plan.staff_name || '-' }}</span>
                </div>
              </div>

              <div class="mt-3 flex gap-2">
                <button
                  class="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-md text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToEdit(plan.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
                <button
                  class="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-md text-sm font-medium text-success bg-success/10 hover:bg-success/20 transition-colors"
                  @click.stop="handleGenerateTodos(plan.id)"
                >
                  <Play class="h-4 w-4" />
                  生成待办
                </button>
                <button
                  class="flex-1 inline-flex h-8 items-center justify-center gap-1 rounded-md text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  @click.stop="handleDelete(plan.id)"
                >
                  <Trash2 class="h-4 w-4" />
                  删除
                </button>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadPlans()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && plans.length > 0" class="py-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </div>
      </PullRefresh>

      <button
        class="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90"
        @click="goToCreate"
      >
        <Plus class="h-7 w-7" />
      </button>
    </template>
  </div>
</template>
