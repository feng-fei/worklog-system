<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { staffsApi } from '@/api'
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
import { useUserStore } from '@/stores/user'
import {
  Search,
  Plus,
  ChevronRight,
  User,
  Phone,
  Calendar,
  RefreshCw,
  Briefcase,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Shield,
} from 'lucide-vue-next'
import { formatDate } from '@/lib/utils'

const { isDesktop, isMobile } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})
const userStore = useUserStore()
const isAdmin = computed(() => userStore.user?.role === 'admin')

const router = useRouter()

const staffs = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)
const showPasswordModal = ref(false)
const targetStaff = ref<any>(null)
const newPassword = ref('123456')

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '在职', variant: 'success' },
  inactive: { label: '离职', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadStaffs = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await staffsApi.list({
      page: currentPage.value,
      page_size: 20,
      status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = Array.isArray(data) ? data : (data.records || data.list || data.items || [])
    const pageSize = 20

    if (refresh) {
      staffs.value = list
    } else {
      staffs.value = [...staffs.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载员工列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/staffs/${id}`)
}

const goToEdit = (id: number) => {
  router.push(`/staffs/${id}/edit`)
}

const goToCreate = () => {
  router.push('/staffs/create')
}

const onRefresh = () => {
  return loadStaffs(true)
}

const handleToggleEnabled = async (staff: any) => {
  if (!isAdmin.value) return
  const action = staff.enabled ? '禁用' : '启用'
  if (!confirm(`确定${action}员工"${staff.name}"的登录账号吗？`)) return
  try {
    await staffsApi.toggleEnabled(staff.id)
    loadStaffs(true)
  } catch (e: any) {
    alert(e.response?.data?.error || `${action}失败`)
  }
}

const openResetPassword = (staff: any) => {
  if (!isAdmin.value) return
  if (!staff.has_account) {
    alert('该员工没有登录账号')
    return
  }
  targetStaff.value = staff
  newPassword.value = '123456'
  showPasswordModal.value = true
}

const handleResetPassword = async () => {
  if (!targetStaff.value) return
  if (!newPassword.value || newPassword.value.length < 6) {
    alert('密码长度至少6位')
    return
  }
  try {
    await staffsApi.resetPassword(targetStaff.value.id, newPassword.value)
    alert(`密码已重置为：${newPassword.value}`)
    showPasswordModal.value = false
    targetStaff.value = null
  } catch (e: any) {
    alert(e.response?.data?.error || '重置密码失败')
  }
}

const filteredStaffs = computed(() => {
  if (!searchQuery.value) return staffs.value
  const query = searchQuery.value.toLowerCase()
  return staffs.value.filter((s) =>
    (s.name || '').toLowerCase().includes(query) ||
    (s.phone || '').toLowerCase().includes(query) ||
    (s.position || '').toLowerCase().includes(query) ||
    (s.username || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadStaffs(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isMobile">
      <MobileHeader title="员工" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索姓名、电话、岗位、账号..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            @keyup.enter="loadStaffs(true)"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(status, key) in { all: '全部', active: '在职', inactive: '离职' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterStatus === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterStatus = key; loadStaffs(true)"
          >
            {{ status }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && staffs.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredStaffs.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无员工记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新员工</p>
          </div>

          <template v-else>
            <Card
              v-for="staff in filteredStaffs"
              :key="staff.id"
              class="p-4 active:scale-[0.99] transition-transform"
            >
              <div class="flex items-start justify-between cursor-pointer" @click="goToDetail(staff.id)">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="font-semibold">
                    {{ staff.name || '未命名' }}
                  </span>
                  <Badge :variant="getStatusInfo(staff.status).variant as any" size="sm">
                    {{ getStatusInfo(staff.status).label }}
                  </Badge>
                  <Badge v-if="staff.has_account" :variant="staff.enabled ? 'success' : 'destructive'" size="sm" class="gap-1">
                    <component :is="staff.enabled ? UserCheck : UserX" class="h-3 w-3" />
                    {{ staff.enabled ? '已启用' : '已禁用' }}
                  </Badge>
                  <Badge v-if="staff.role === 'admin'" variant="warning" size="sm" class="gap-1">
                    <Shield class="h-3 w-3" />
                    管理员
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>

              <div v-if="staff.position" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" @click="goToDetail(staff.id)">
                <Briefcase class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">{{ staff.position }}</span>
              </div>

              <div v-if="staff.has_account && staff.username" class="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                <User class="h-4 w-4 flex-shrink-0" />
                <span class="truncate">账号: {{ staff.username }}</span>
              </div>

              <div class="mt-2 space-y-1.5 text-sm text-muted-foreground cursor-pointer" @click="goToDetail(staff.id)">
                <div v-if="staff.phone" class="flex items-center gap-2">
                  <Phone class="h-4 w-4 flex-shrink-0" />
                  <span>{{ staff.phone }}</span>
                </div>
                <div v-if="staff.hire_date || staff.created_at" class="flex items-center gap-2">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span>入职: {{ formatDate(staff.hire_date || staff.created_at, 'YYYY-MM-DD') }}</span>
                </div>
              </div>

              <div class="mt-3 flex gap-2 pt-3 border-t border-border">
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToDetail(staff.id)"
                >
                  <Eye class="h-4 w-4" />
                  查看
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-foreground rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  @click.stop="goToEdit(staff.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
                <template v-if="isAdmin && staff.has_account">
                  <button
                    class="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors"
                    :class="staff.enabled ? 'text-warning bg-warning/10 hover:bg-warning/20' : 'text-success bg-success/10 hover:bg-success/20'"
                    @click.stop="handleToggleEnabled(staff)"
                    :title="staff.enabled ? '禁用登录' : '启用登录'"
                  >
                    <component :is="staff.enabled ? Lock : Unlock" class="h-4 w-4" />
                  </button>
                  <button
                    class="flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium text-info rounded-lg bg-info/10 hover:bg-info/20 transition-colors"
                    @click.stop="openResetPassword(staff)"
                    title="重置密码"
                  >
                    <Lock class="h-4 w-4" />
                  </button>
                </template>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadStaffs()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && staffs.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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
      <div class="mx-auto w-full max-w-7xl p-6">
        <Card class="p-6">
          <div class="mb-6 flex items-center justify-between">
            <h1 class="text-2xl font-semibold">员工管理</h1>
            <Button @click="goToCreate">
              <Plus class="h-5 w-5" />
              新建员工
            </Button>
          </div>

          <div class="mb-6 flex flex-wrap items-center gap-4">
            <div class="relative flex-1 min-w-[200px] max-w-md">
              <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索姓名、电话、岗位、账号..."
                class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadStaffs(true)"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                v-for="(status, key) in { all: '全部', active: '在职', inactive: '离职' }"
                :key="key"
                class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                :class="filterStatus === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
                @click="filterStatus = key; loadStaffs(true)"
              >
                {{ status }}
              </button>
            </div>

            <Button variant="outline" size="icon" @click="onRefresh">
              <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
            </Button>
          </div>

          <div v-if="loading && staffs.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredStaffs.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无员工记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右上角按钮添加新员工</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工姓名</TableHead>
                  <TableHead>登录账号</TableHead>
                  <TableHead>职位</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>入职日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="staff in filteredStaffs"
                  :key="staff.id"
                  clickable
                  @click="goToDetail(staff.id)"
                >
                  <TableCell class="font-medium">
                    {{ staff.name || '未命名' }}
                  </TableCell>
                  <TableCell>
                    <div v-if="staff.has_account" class="flex items-center gap-2">
                      <span>{{ staff.username }}</span>
                      <Badge :variant="staff.enabled ? 'success' : 'destructive'" size="sm">
                        {{ staff.enabled ? '启用' : '禁用' }}
                      </Badge>
                      <Badge v-if="staff.role === 'admin'" variant="warning" size="sm">
                        管理员
                      </Badge>
                    </div>
                    <span v-else class="text-muted-foreground text-sm">无账号</span>
                  </TableCell>
                  <TableCell>{{ staff.position || '-' }}</TableCell>
                  <TableCell>{{ staff.phone || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">
                    {{ formatDate(staff.hire_date || staff.created_at, 'YYYY-MM-DD') }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getStatusInfo(staff.status).variant as any" size="sm">
                      {{ getStatusInfo(staff.status).label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToDetail(staff.id)"
                      >
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToEdit(staff.id)"
                      >
                        <Edit class="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <template v-if="isAdmin && staff.has_account">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click.stop="handleToggleEnabled(staff)"
                        >
                          <component :is="staff.enabled ? Lock : Unlock" class="h-4 w-4 mr-1" />
                          {{ staff.enabled ? '禁用' : '启用' }}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click.stop="openResetPassword(staff)"
                        >
                          <Lock class="h-4 w-4 mr-1" />
                          重置密码
                        </Button>
                      </template>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="mt-6 text-center">
              <Button variant="outline" @click="loadStaffs()">
                加载更多
              </Button>
            </div>

            <div v-if="loading && staffs.length > 0" class="mt-6 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card class="w-full max-w-sm p-5">
        <h3 class="text-lg font-semibold mb-2">重置密码</h3>
        <p class="text-sm text-muted-foreground mb-4">
          为员工 <span class="font-medium text-foreground">{{ targetStaff?.name }}</span> 重置登录密码
        </p>
        <div class="mb-4">
          <label class="text-sm font-medium mb-1 block">新密码</label>
          <input
            v-model="newPassword"
            type="text"
            class="w-full h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="输入新密码"
          />
          <p class="text-xs text-muted-foreground mt-1">默认密码：123456</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="showPasswordModal = false">
            取消
          </Button>
          <Button class="flex-1" @click="handleResetPassword">
            确认重置
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
