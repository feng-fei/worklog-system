<script setup lang="ts">
import { ref, onMounted, computed, inject, watch } from 'vue'
import { useRouter } from 'vue-router'
import { pendingApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Table from '@/components/ui/Table.vue'
import TableHeader from '@/components/ui/TableHeader.vue'
import TableBody from '@/components/ui/TableBody.vue'
import TableRow from '@/components/ui/TableRow.vue'
import TableHead from '@/components/ui/TableHead.vue'
import TableCell from '@/components/ui/TableCell.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Bell,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Search,
  Eye,
  Trash2,
  ArrowRightCircle,
  X,
  CheckSquare,
  Square,
  Hammer,
  Wrench,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const { isMobile } = useResponsive()
const router = useRouter()
const toggleSidebar = inject('toggleSidebar', () => {})

const pendings = ref<any[]>([])
const loading = ref(false)
const filterStatus = ref('pending')
const searchQuery = ref('')
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)
const selectedIds = ref<number[]>([])
const showConvertModal = ref(false)
const convertType = ref<'construction' | 'repair'>('construction')
const batchProcessing = ref(false)

const statusMap: Record<string, { label: string; variant: string; icon: any }> = {
  pending: { label: '待办工单', variant: 'warning', icon: Clock },
  in_progress: { label: '进行中', variant: 'info', icon: Clock },
  completed: { label: '已完成', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: '已取消', variant: 'secondary', icon: AlertCircle },
  transferred: { label: '已转工单', variant: 'info', icon: ArrowRightCircle },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary', icon: Bell }
}

const allSelected = computed(() => {
  if (filteredPendings.value.length === 0) return false
  return filteredPendings.value.every((p) => selectedIds.value.includes(p.id))
})

const someSelected = computed(() => {
  return selectedIds.value.length > 0 && !allSelected.value
})

const loadPendings = async (reset = false) => {
  if (reset) {
    page.value = 1
    pendings.value = []
    selectedIds.value = []
  }
  loading.value = true
  try {
    const params: Record<string, any> = {
      status: filterStatus.value,
      page: page.value,
      per_page: 20,
    }
    if (searchQuery.value) {
      params.keyword = searchQuery.value
    }
    const res = await pendingApi.list(params)
    const data = res.data
    const records = data.records || data.list || data.pending_works || data.items || []
    if (reset) {
      pendings.value = records
    } else {
      pendings.value = [...pendings.value, ...records]
    }
    total.value = data.total || 0
    hasMore.value = data.pages ? page.value < data.pages : records.length >= 20
  } catch (e) {
    console.error('加载待办失败', e)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (loading.value || !hasMore.value) return
  page.value++
  loadPendings()
}

const filteredPendings = computed(() => {
  if (!searchQuery.value) return pendings.value
  const q = searchQuery.value.toLowerCase()
  return pendings.value.filter((p) =>
    (p.title || '').toLowerCase().includes(q) ||
    (p.customer_name || '').toLowerCase().includes(q) ||
    (p.work_content || '').toLowerCase().includes(q)
  )
})

const toggleSelect = (id: number) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredPendings.value.map((p) => p.id)
  }
}

const clearSelection = () => {
  selectedIds.value = []
}

const goToDetail = (item: any) => {
  router.push(`/pending/${item.id}`)
}

const goToCreate = () => {
  router.push('/pending/create')
}

const handleRefresh = () => {
  loadPendings(true)
}

const handleStatusChange = (status: string) => {
  filterStatus.value = status
  loadPendings(true)
}

const batchComplete = async () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择待办事项')
    return
  }
  if (!confirm(`确定要将选中的 ${selectedIds.value.length} 条待办标记为完成吗？`)) return
  batchProcessing.value = true
  try {
    await pendingApi.batch({
      ids: selectedIds.value,
      action: 'update_status',
      status: 'completed',
    })
    alert('批量标记完成成功')
    selectedIds.value = []
    loadPendings(true)
  } catch (e: any) {
    alert(e.response?.data?.error || e.message || '操作失败')
  } finally {
    batchProcessing.value = false
  }
}

const batchDelete = async () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择待办事项')
    return
  }
  if (!confirm(`确定要删除选中的 ${selectedIds.value.length} 条待办吗？此操作不可恢复！`)) return
  batchProcessing.value = true
  try {
    await pendingApi.batch({
      ids: selectedIds.value,
      action: 'delete',
    })
    alert('批量删除成功')
    selectedIds.value = []
    loadPendings(true)
  } catch (e: any) {
    alert(e.response?.data?.error || e.message || '操作失败')
  } finally {
    batchProcessing.value = false
  }
}

const openConvertModal = () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择待办事项')
    return
  }
  convertType.value = 'construction'
  showConvertModal.value = true
}

const confirmConvert = async () => {
  const selectedItems = pendings.value.filter((p) => selectedIds.value.includes(p.id))
  const firstItem = selectedItems[0]
  
  const pendingData = {
    ids: selectedIds.value,
    customer_name: firstItem.customer_name,
    contact_name: firstItem.contact_name,
    contact_phone: firstItem.contact_phone,
    work_address: firstItem.work_address,
    title: firstItem.title || firstItem.work_content?.slice(0, 50) || '待办转工单',
    work_content: selectedItems.map((p, idx) => 
      `${selectedItems.length > 1 ? `${idx + 1}. ` : ''}${p.title || ''}${p.title ? '\n' : ''}${p.work_content || ''}`
    ).join('\n\n'),
    priority: firstItem.priority,
  }

  batchProcessing.value = true
  try {
    await pendingApi.batch({
      ids: selectedIds.value,
      action: 'update_status',
      status: 'transferred',
    })
    
    sessionStorage.setItem('pendingConvertData', JSON.stringify({
      ...pendingData,
      order_type: convertType.value,
    }))
    
    router.push('/records/create')
  } catch (e: any) {
    alert(e.response?.data?.error || e.message || '操作失败')
    batchProcessing.value = false
  }
}

onMounted(() => {
  loadPendings(true)
})

watch(filterStatus, () => {
  selectedIds.value = []
})
</script>

<template>
  <!-- 移动端视图 -->
  <template v-if="isMobile">
    <div class="flex min-h-full flex-col bg-background">
      <MobileHeader title="待办事项" :showMenu="true" @menu-click="toggleSidebar">
        <template #right>
          <div class="flex items-center gap-1">
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
              @click="handleRefresh"
            >
              <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
            </button>
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
              @click="goToCreate"
            >
              <Plus class="h-5 w-5" />
            </button>
          </div>
        </template>
      </MobileHeader>

      <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2 space-y-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索待办..."
            class="pl-9"
            @keyup.enter="loadPendings(true)"
          />
        </div>
        <div class="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(status, key) in { pending: '待办工单', in_progress: '进行中', completed: '已完成', transferred: '已转工单', cancelled: '已取消' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterStatus === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="handleStatusChange(key)"
          >
            {{ status }}
          </button>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <div
        v-if="selectedIds.length > 0"
        class="sticky top-[168px] z-20 bg-primary/10 border-b border-primary/20 px-4 py-3"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-primary">已选择 {{ selectedIds.length }} 项</span>
          <button
            class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            @click="clearSelection"
          >
            <X class="h-4 w-4" />
            取消选择
          </button>
        </div>
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="default"
            class="flex-1"
            :disabled="batchProcessing"
            @click="batchComplete"
          >
            <CheckCircle2 class="h-4 w-4 mr-1" />
            标记完成
          </Button>
          <Button
            size="sm"
            variant="default"
            class="flex-1"
            :disabled="batchProcessing"
            @click="openConvertModal"
          >
            <ArrowRightCircle class="h-4 w-4 mr-1" />
            转工单
          </Button>
          <Button
            size="sm"
            variant="destructive"
            class="flex-none"
            :disabled="batchProcessing"
            @click="batchDelete"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div class="flex-1 space-y-3 px-4 pb-6 pt-3">
        <div v-if="loading && pendings.length === 0" class="py-12 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredPendings.length === 0" class="py-12 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell class="h-8 w-8 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground">暂无待办事项</p>
          <Button class="mt-4" variant="outline" size="sm" @click="goToCreate">
            <Plus class="h-4 w-4 mr-2" />
            新建待办
          </Button>
        </div>

        <template v-else>
          <!-- 全选按钮 -->
          <div class="flex items-center gap-2 py-1">
            <button
              class="flex items-center gap-2 text-sm"
              @click="toggleSelectAll"
            >
              <component
                :is="allSelected ? CheckSquare : someSelected ? Square : Square"
                class="h-5 w-5 text-primary"
                :class="{ 'opacity-60': someSelected }"
              />
              <span>{{ allSelected ? '取消全选' : '全选' }}</span>
            </button>
          </div>

          <Card
            v-for="item in filteredPendings"
            :key="item.id"
            class="p-4 transition-shadow"
            :class="{
              'ring-2 ring-primary bg-primary/5': selectedIds.includes(item.id),
              'hover:shadow-sm cursor-pointer': !selectedIds.includes(item.id)
            }"
            @click="toggleSelect(item.id)"
          >
            <div class="flex items-start gap-3">
              <button
                class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition-colors"
                :class="selectedIds.includes(item.id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-muted-foreground/30 hover:border-primary'"
                @click.stop="toggleSelect(item.id)"
              >
                <CheckCircle2 v-if="selectedIds.includes(item.id)" class="h-4 w-4" />
              </button>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3
                    class="font-medium"
                    :class="{ 'line-through text-muted-foreground': item.status === 'completed' }"
                  >
                    {{ item.title || item.work_content?.slice(0, 30) || '无标题' }}
                  </h3>
                  <Badge :variant="getStatusInfo(item.status).variant as any" size="sm">
                    {{ getStatusInfo(item.status).label }}
                  </Badge>
                </div>

                <p
                  v-if="item.work_content"
                  class="mt-1 text-sm text-muted-foreground line-clamp-2"
                >
                  {{ item.work_content }}
                </p>

                <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div v-if="item.customer_name" class="flex items-center gap-1">
                    <User class="h-3 w-3" />
                    <span class="truncate max-w-[150px]">{{ item.customer_name }}</span>
                  </div>
                  <div v-if="item.reminder_date" class="flex items-center gap-1">
                    <Calendar class="h-3 w-3" />
                    <span>{{ formatDate(item.reminder_date, 'MM-DD') }}</span>
                  </div>
                  <div v-if="item.created_at" class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    <span>{{ relativeTime(item.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-3 flex gap-2 pt-3 border-t border-border">
              <button
                class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                @click.stop="goToDetail(item)"
              >
                <Eye class="h-4 w-4" />
                查看详情
              </button>
            </div>
          </Card>

          <div v-if="hasMore" class="py-4 text-center">
            <Button variant="outline" size="sm" :disabled="loading" @click="loadMore">
              <RefreshCw v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
              {{ loading ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </template>
      </div>
    </div>
  </template>

  <!-- 桌面端视图 -->
  <template v-else>
    <div class="mx-auto w-full max-w-7xl p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">待办事项</h1>
          <p class="mt-1 text-sm text-muted-foreground">批量管理待办任务，选择后可批量操作</p>
        </div>
        <Button @click="goToCreate">
          <Plus class="h-4 w-4 mr-2" />
          新建待办
        </Button>
      </div>

      <Card class="overflow-hidden">
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="relative w-64">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="搜索待办..."
                class="pl-9"
                @keyup.enter="loadPendings(true)"
              />
            </div>
            <div class="flex gap-1">
              <Button
                v-for="(status, key) in { pending: '待办工单', in_progress: '进行中', completed: '已完成', transferred: '已转工单', cancelled: '已取消' }"
                :key="key"
                :variant="filterStatus === key ? 'default' : 'outline'"
                size="sm"
                @click="handleStatusChange(key)"
              >
                {{ status }}
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" @click="handleRefresh">
            <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
            刷新
          </Button>
        </div>

        <!-- 批量操作栏 -->
        <div
          v-if="selectedIds.length > 0"
          class="flex items-center justify-between border-b border-primary/20 bg-primary/5 px-6 py-3"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-primary">已选择 {{ selectedIds.length }} 项</span>
            <button
              class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              @click="clearSelection"
            >
              <X class="h-4 w-4" />
              取消选择
            </button>
          </div>
          <div class="flex gap-2">
            <Button
              size="sm"
              :disabled="batchProcessing"
              @click="batchComplete"
            >
              <CheckCircle2 class="h-4 w-4 mr-1" />
              批量标记完成
            </Button>
            <Button
              size="sm"
              :disabled="batchProcessing"
              @click="openConvertModal"
            >
              <ArrowRightCircle class="h-4 w-4 mr-1" />
              批量转工单
            </Button>
            <Button
              size="sm"
              variant="destructive"
              :disabled="batchProcessing"
              @click="batchDelete"
            >
              <Trash2 class="h-4 w-4 mr-1" />
              批量删除
            </Button>
          </div>
        </div>

        <div v-if="loading && pendings.length === 0" class="px-6 py-12 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>

        <div v-else-if="filteredPendings.length === 0" class="px-6 py-12 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell class="h-8 w-8 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground">暂无待办事项</p>
          <Button class="mt-4" variant="outline" size="sm" @click="goToCreate">
            <Plus class="h-4 w-4 mr-2" />
            新建待办
          </Button>
        </div>

        <template v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">
                  <button @click="toggleSelectAll">
                    <component
                      :is="allSelected ? CheckSquare : Square"
                      class="h-5 w-5 text-primary"
                    />
                  </button>
                </TableHead>
                <TableHead>标题</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>提醒日期</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead class="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in filteredPendings"
                :key="item.id"
                clickable
                :class="{ 'bg-primary/5': selectedIds.includes(item.id) }"
                @click="toggleSelect(item.id)"
              >
                <TableCell>
                  <button
                    class="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
                    :class="selectedIds.includes(item.id)
                      ? 'border-primary bg-primary text-white'
                      : 'border-muted-foreground/30 hover:border-primary'"
                    @click.stop="toggleSelect(item.id)"
                  >
                    <CheckCircle2 v-if="selectedIds.includes(item.id)" class="h-3 w-3" />
                  </button>
                </TableCell>
                <TableCell class="font-medium max-w-[250px] truncate">
                  <span :class="{ 'line-through text-muted-foreground': item.status === 'completed' }">
                    {{ item.title || item.work_content?.slice(0, 30) || '无标题' }}
                  </span>
                </TableCell>
                <TableCell>{{ item.customer_name || '-' }}</TableCell>
                <TableCell>
                  <Badge variant="secondary" size="sm">
                    {{ item.todo_type || '待办' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="item.priority === 'urgent' ? 'destructive' : item.priority === 'high' ? 'warning' : 'secondary' as any"
                    size="sm"
                  >
                    {{ item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '高' : item.priority === 'low' ? '低' : '普通' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span v-if="item.reminder_date" class="flex items-center gap-1">
                    <Calendar class="h-3 w-3 text-muted-foreground" />
                    {{ formatDate(item.reminder_date, 'YYYY-MM-DD') }}
                  </span>
                  <span v-else class="text-muted-foreground">-</span>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ relativeTime(item.created_at) }}
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click.stop="goToDetail(item)"
                    >
                      <Eye class="h-4 w-4 mr-1" />
                      查看
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div v-if="hasMore" class="border-t border-border px-6 py-4 text-center">
            <Button variant="outline" size="sm" :disabled="loading" @click="loadMore">
              <RefreshCw v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
              {{ loading ? '加载中...' : `加载更多 (${pendings.length}/${total})` }}
            </Button>
          </div>
        </template>
      </Card>
    </div>
  </template>

  <!-- 转工单弹窗 -->
  <div
    v-if="showConvertModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="showConvertModal = false"
  >
    <Card class="w-full max-w-md p-6">
      <h3 class="text-lg font-semibold mb-4">选择工单类型</h3>
      <p class="text-sm text-muted-foreground mb-4">
        将选中的 {{ selectedIds.length }} 条待办事项转换为工单
      </p>
      <div class="space-y-3 mb-6">
        <button
          class="w-full p-4 rounded-xl border-2 text-left transition-all"
          :class="convertType === 'construction'
            ? 'border-primary bg-primary/10'
            : 'border-input hover:border-primary/50'"
          @click="convertType = 'construction'"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Hammer class="h-5 w-5 text-primary" />
            </div>
            <div>
              <div class="font-medium">施工单</div>
              <div class="text-sm text-muted-foreground">设备安装、布线施工等</div>
            </div>
          </div>
        </button>
        <button
          class="w-full p-4 rounded-xl border-2 text-left transition-all"
          :class="convertType === 'repair'
            ? 'border-primary bg-primary/10'
            : 'border-input hover:border-primary/50'"
          @click="convertType = 'repair'"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wrench class="h-5 w-5 text-primary" />
            </div>
            <div>
              <div class="font-medium">维修单</div>
              <div class="text-sm text-muted-foreground">设备故障维修、抢修等</div>
            </div>
          </div>
        </button>
      </div>
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1"
          @click="showConvertModal = false"
        >
          取消
        </Button>
        <Button
          class="flex-1"
          :disabled="batchProcessing"
          @click="confirmConvert"
        >
          {{ batchProcessing ? '处理中...' : '确认转换' }}
        </Button>
      </div>
    </Card>
  </div>
</template>
