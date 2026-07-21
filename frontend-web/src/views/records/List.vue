<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { recordsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
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
  Filter,
  Plus,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  RefreshCw,
  Eye,
  Edit,
  Briefcase,
} from 'lucide-vue-next'
import { relativeTime, formatDateTime } from '@/lib/utils'

const { isDesktop, isMobile, isTablet } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const router = useRouter()

const records = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('all')
const filterProject = ref('independent')
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  pending: { label: '待办工单', variant: 'warning' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadRecords = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const params: any = {
      page: currentPage.value,
      per_page: 20,
      status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
      keyword: searchQuery.value || undefined,
    }
    if (filterProject.value === 'independent') {
      params.no_project = true
    } else if (filterProject.value === 'project') {
      params.has_project = true
    }
    const res = await recordsApi.list(params)

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      records.value = list
    } else {
      records.value = [...records.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载工单列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/records/${id}`)
}

const goToEdit = (id: number) => {
  router.push(`/records/${id}/edit`)
}

const goToCreate = () => {
  router.push('/records/create')
}

const onRefresh = () => {
  return loadRecords(true)
}

const filteredRecords = computed(() => {
  if (!searchQuery.value) return records.value
  const query = searchQuery.value.toLowerCase()
  return records.value.filter((r) =>
    (r.order_no || '#' + r.id).toLowerCase().includes(query) ||
    (r.customer_name || '').toLowerCase().includes(query) ||
    (r.work_content || r.title || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadRecords(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <!-- 移动端视图 -->
    <template v-if="isMobile">
      <MobileHeader title="工单" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索工单编号、客户名称..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(status, key) in { all: '全部', pending: '待办工单', in_progress: '进行中', completed: '已完成' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterStatus === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterStatus = key; loadRecords(true)"
          >
            {{ status }}
          </button>
        </div>

        <div class="mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(project, key) in { independent: '独立工单', project: '项目工单', all: '全部工单' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="filterProject === key
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'"
            @click="filterProject = key; loadRecords(true)"
          >
            <Briefcase v-if="key !== 'all'" class="mr-1 inline h-3 w-3" />
            {{ project }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1 overflow-hidden" @refresh="onRefresh">
        <div class="scroll-container h-full overflow-y-auto space-y-3 px-4 pb-6">
          <div v-if="loading && records.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredRecords.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无工单记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮创建新工单</p>
          </div>

          <template v-else>
            <Card
              v-for="record in filteredRecords"
              :key="record.id"
              class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
              @click="goToDetail(record.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ record.order_no || '#' + record.id }}
                  </span>
                  <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                    {{ getStatusInfo(record.status).label }}
                  </Badge>
                </div>
              </div>

              <div class="mt-2">
                <p class="text-sm text-muted-foreground">
                  {{ record.customer_name || '未指定客户' }}
                  <span v-if="record.work_address" class="ml-2">· {{ record.work_address }}</span>
                </p>
              </div>

              <p class="mt-2 text-sm text-foreground line-clamp-2">
                {{ record.work_content?.slice(0, 30) || '暂无工作内容' }}
              </p>

              <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div class="flex items-center gap-1">
                  <User class="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{{ record.staff_name || '未分配' }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Calendar class="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{{ relativeTime(record.created_at) }}</span>
                </div>
              </div>

              <div class="mt-3 flex gap-2 pt-3 border-t border-border">
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToDetail(record.id)"
                >
                  <Eye class="h-4 w-4" />
                  查看
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-foreground rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  @click.stop="goToEdit(record.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadRecords()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && records.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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

    <!-- 桌面端视图 -->
    <template v-else>
      <div class="mx-auto w-full max-w-7xl p-6">
        <Card class="p-6">
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-2xl font-semibold">工单管理</h1>
            <Button @click="goToCreate">
              <Plus class="h-5 w-5" />
              新建工单
            </Button>
          </div>

          <div class="mb-6 flex flex-wrap items-center gap-4">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索工单编号、客户名称..."
                class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadRecords(true)"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                v-for="(status, key) in { all: '全部', pending: '待办工单', in_progress: '进行中', completed: '已完成' }"
                :key="key"
                class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                :class="filterStatus === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
                @click="filterStatus = key; loadRecords(true)"
              >
                {{ status }}
              </button>
            </div>

            <Button variant="outline" size="icon" @click="onRefresh">
              <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
            </Button>
          </div>

          <div v-if="loading && records.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredRecords.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无工单记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右上角按钮创建新工单</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工单号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>工作内容</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>施工日期</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="record in filteredRecords"
                  :key="record.id"
                  clickable
                  @click="goToDetail(record.id)"
                >
                  <TableCell class="font-medium whitespace-nowrap">
                    {{ record.order_no || '#' + record.id }}
                  </TableCell>
                  <TableCell class="truncate">{{ record.customer_name || '未指定客户' }}</TableCell>
                  <TableCell class="max-w-[300px] truncate">
                    {{ record.work_content?.slice(0, 30) || '暂无内容' }}
                  </TableCell>
                  <TableCell>{{ record.staff_name || '-' }}</TableCell>
                  <TableCell>
                    <Badge :variant="getStatusInfo(record.status).variant as any" size="sm">
                      {{ getStatusInfo(record.status).label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-muted-foreground whitespace-nowrap">
                    {{ record.work_date ? formatDateTime(record.work_date).split(' ')[0] : '-' }}
                  </TableCell>
                  <TableCell class="text-muted-foreground whitespace-nowrap">
                    <div class="flex flex-col">
                      <span>{{ formatDateTime(record.created_at) }}</span>
                      <span class="text-xs opacity-70">{{ relativeTime(record.created_at) }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToDetail(record.id)"
                      >
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToEdit(record.id)"
                      >
                        <Edit class="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="mt-6 text-center">
              <Button variant="outline" @click="loadRecords()">
                加载更多
              </Button>
            </div>

            <div v-if="loading && records.length > 0" class="mt-6 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>
  </div>
</template>
