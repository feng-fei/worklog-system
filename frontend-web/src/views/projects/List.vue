<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { projectsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
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
  User,
  Calendar,
  RefreshCw,
  Building2,
  Eye,
  Edit,
} from 'lucide-vue-next'
import { formatDate } from '@/lib/utils'
import PullRefresh from '@/components/business/PullRefresh.vue'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const projects = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  planning: { label: '规划中', variant: 'secondary' },
  in_progress: { label: '进行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  paused: { label: '已暂停', variant: 'warning' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadProjects = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await projectsApi.list({
      page: currentPage.value,
      page_size: 20,
      status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      projects.value = list
    } else {
      projects.value = [...projects.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载项目列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/projects/${id}`)
}

const goToEdit = (id: number) => {
  router.push(`/projects/${id}/edit`)
}

const goToCreate = () => {
  router.push('/projects/create')
}

const onRefresh = async () => {
  await loadProjects(true)
}

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter((p) =>
    (p.name || p.project_name || '').toLowerCase().includes(query) ||
    (p.customer_name || '').toLowerCase().includes(query) ||
    (p.manager_name || p.staff_name || '').toLowerCase().includes(query)
  )
})

const getProgress = (project: any) => {
  if (project.progress !== undefined) return project.progress
  if (project.total_records && project.total_records > 0) {
    return Math.round((project.completed_records || 0) / project.total_records * 100)
  }
  return 0
}

onMounted(() => {
  loadProjects(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="!isDesktop">
      <MobileHeader title="项目" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索项目名称、客户名称..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(status, key) in { all: '全部', in_progress: '进行中', completed: '已完成', paused: '已暂停' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterStatus === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterStatus = key; loadProjects(true)"
          >
            {{ status }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1 overflow-auto" @refresh="onRefresh">
        <div class="scroll-container space-y-3 px-4 pb-6">
          <div v-if="loading && projects.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredProjects.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无项目记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮创建新项目</p>
          </div>

          <template v-else>
            <Card
              v-for="project in filteredProjects"
              :key="project.id"
              class="p-4 active:scale-[0.99] transition-transform"
            >
              <div class="flex items-start justify-between cursor-pointer" @click="goToDetail(project.id)">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ project.name || project.project_name || '未命名项目' }}
                  </span>
                  <Badge :variant="getStatusInfo(project.status).variant as any" size="sm">
                    {{ getStatusInfo(project.status).label }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-3 space-y-1.5 text-sm text-muted-foreground cursor-pointer" @click="goToDetail(project.id)">
                <div class="flex items-center gap-2">
                  <Building2 class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ project.customer_name || '未指定客户' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <User class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ project.manager_name || project.staff_name || '未指定负责人' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span>{{ project.start_date ? formatDate(project.start_date) : '未设置开始日期' }}</span>
                </div>
              </div>

              <div class="mt-3 cursor-pointer" @click="goToDetail(project.id)">
                <div class="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>项目进度</span>
                  <span>{{ getProgress(project) }}%</span>
                </div>
                <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary transition-all duration-300"
                    :style="{ width: getProgress(project) + '%' }"
                  ></div>
                </div>
              </div>

              <div class="mt-3 flex gap-2 pt-3 border-t border-border">
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToDetail(project.id)"
                >
                  <Eye class="h-4 w-4" />
                  查看
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-foreground rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  @click.stop="goToEdit(project.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadProjects()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && projects.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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

    <template v-else>
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">项目管理</h1>
          <Button @click="goToCreate">
            <Plus class="h-5 w-5" />
            新建项目
          </Button>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索项目名称、客户名称..."
                class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadProjects(true)"
              />
            </div>
            <Select
              v-model="filterStatus"
              :options="[
                { value: 'all', label: '全部状态' },
                { value: 'planning', label: '规划中' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
                { value: 'paused', label: '已暂停' },
                { value: 'cancelled', label: '已取消' },
              ]"
              placeholder="选择状态"
              class="w-48"
              @change="loadProjects(true)"
            />
            <Button variant="outline" @click="onRefresh">
              <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
              刷新
            </Button>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>项目负责人</TableHead>
                <TableHead>项目状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>结束时间</TableHead>
                <TableHead class="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <tr v-if="loading && projects.length === 0">
                <td colspan="7" class="py-12 text-center text-muted-foreground">
                  <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
                  <p>加载中...</p>
                </td>
              </tr>
              <tr v-else-if="filteredProjects.length === 0">
                <td colspan="7" class="py-12 text-center">
                  <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search class="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p class="text-muted-foreground">暂无项目记录</p>
                </td>
              </tr>
              <template v-else>
                <TableRow
                  v-for="project in filteredProjects"
                  :key="project.id"
                  clickable
                  @click="goToDetail(project.id)"
                >
                  <TableCell class="font-medium">
                    {{ project.name || project.project_name || '未命名项目' }}
                  </TableCell>
                  <TableCell>{{ project.customer_name || '-' }}</TableCell>
                  <TableCell>{{ project.manager_name || project.staff_name || '-' }}</TableCell>
                  <TableCell>
                    <Badge :variant="getStatusInfo(project.status).variant as any" size="sm">
                      {{ getStatusInfo(project.status).label }}
                    </Badge>
                  </TableCell>
                  <TableCell>{{ project.start_date ? formatDate(project.start_date) : '-' }}</TableCell>
                  <TableCell>{{ project.end_date ? formatDate(project.end_date) : '-' }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" @click.stop="goToDetail(project.id)">
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button variant="ghost" size="sm" @click.stop="goToEdit(project.id)">
                        <Edit class="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>

          <div v-if="hasMore && !loading && filteredProjects.length > 0" class="py-4 text-center border-t border-border">
            <Button variant="ghost" @click="loadProjects()">
              加载更多
            </Button>
          </div>

          <div v-if="loading && projects.length > 0" class="py-4 text-center text-sm text-muted-foreground border-t border-border">
            <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin inline-block" />
            加载中...
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
