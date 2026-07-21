<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { customersApi } from '@/api'
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
  Plus,
  ChevronRight,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  Eye,
  Edit,
} from 'lucide-vue-next'
import { relativeTime, formatDate } from '@/lib/utils'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const customers = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterStatus = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '合作中', variant: 'success' },
  paused: { label: '已暂停', variant: 'secondary' },
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadCustomers = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await customersApi.list({
      page: currentPage.value,
      page_size: 20,
      status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
      q: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      customers.value = list
    } else {
      customers.value = [...customers.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载客户列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/customers/${id}`)
}

const goToEdit = (id: number) => {
  router.push(`/customers/${id}/edit`)
}

const goToCreate = () => {
  router.push('/customers/create')
}

const onRefresh = () => {
  return loadCustomers(true)
}

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const query = searchQuery.value.toLowerCase()
  return customers.value.filter((c) =>
    (c.name || c.customer_name || '').toLowerCase().includes(query) ||
    (c.contact_person || '').toLowerCase().includes(query) ||
    (c.phone || c.contact_phone || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadCustomers(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <!-- 移动端视图 -->
    <template v-if="!isDesktop">
      <MobileHeader title="客户" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索客户名称、联系人、电话..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="(status, key) in { all: '全部', active: '合作中', paused: '已暂停' }"
            :key="key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterStatus === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterStatus = key; loadCustomers(true)"
          >
            {{ status }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1 overflow-y-auto scroll-container" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && customers.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredCustomers.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无客户记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新客户</p>
          </div>

          <template v-else>
            <Card
              v-for="customer in filteredCustomers"
              :key="customer.id"
              class="p-4 active:scale-[0.99] transition-transform"
            >
              <div class="flex items-start justify-between cursor-pointer" @click="goToDetail(customer.id)">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ customer.name || customer.customer_name || '未命名客户' }}
                  </span>
                  <Badge :variant="getStatusInfo(customer.status).variant as any" size="sm">
                    {{ getStatusInfo(customer.status).label }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-3 space-y-1.5 text-sm text-muted-foreground cursor-pointer" @click="goToDetail(customer.id)">
                <div class="flex items-center gap-2">
                  <User class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ customer.contact_person || '未设置联系人' }}</span>
                  <Phone v-if="customer.phone || customer.contact_phone" class="h-4 w-4 flex-shrink-0 ml-2" />
                  <span v-if="customer.phone || customer.contact_phone" class="truncate">
                    {{ customer.phone || customer.contact_phone }}
                  </span>
                </div>
                <div v-if="customer.address" class="flex items-center gap-2">
                  <MapPin class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ customer.address }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span>{{ relativeTime(customer.created_at) }}</span>
                </div>
              </div>

              <div class="mt-3 flex gap-2 pt-3 border-t border-border">
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToDetail(customer.id)"
                >
                  <Eye class="h-4 w-4" />
                  查看
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-foreground rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  @click.stop="goToEdit(customer.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadCustomers()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && customers.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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
      <div class="mx-auto w-full max-w-7xl flex-1 p-6">
        <!-- 顶部标题栏 -->
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold">客户管理</h1>
          <Button @click="goToCreate">
            <Plus class="h-5 w-5" />
            新建客户
          </Button>
        </div>

        <!-- 筛选区 -->
        <Card class="mb-6 p-4">
          <div class="flex flex-wrap items-center gap-4">
            <div class="relative flex-1 min-w-[280px] max-w-md">
              <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索客户名称、联系人、电话..."
                class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadCustomers(true)"
              />
            </div>
            <div class="flex gap-2">
              <button
                v-for="(status, key) in { all: '全部', active: '合作中', paused: '已暂停' }"
                :key="key"
                class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                :class="filterStatus === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
                @click="filterStatus = key; loadCustomers(true)"
              >
                {{ status }}
              </button>
            </div>
            <Button variant="outline" @click="onRefresh">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              刷新
            </Button>
          </div>
        </Card>

        <!-- 表格区 -->
        <Card class="overflow-hidden">
          <div v-if="loading && customers.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredCustomers.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无客户记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右上角按钮添加新客户</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户名称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="customer in filteredCustomers"
                  :key="customer.id"
                  clickable
                  @click="goToDetail(customer.id)"
                >
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ customer.name || customer.customer_name || '未命名客户' }}</span>
                      <Badge :variant="getStatusInfo(customer.status).variant as any" size="sm">
                        {{ getStatusInfo(customer.status).label }}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <User class="h-4 w-4 text-muted-foreground" />
                      <span>{{ customer.contact_person || '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <Phone class="h-4 w-4 text-muted-foreground" />
                      <span>{{ customer.phone || customer.contact_phone || '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <Mail class="h-4 w-4 text-muted-foreground" />
                      <span class="truncate max-w-[200px]">{{ customer.email || '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <MapPin class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span class="truncate max-w-[240px]">{{ customer.address || '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <Calendar class="h-4 w-4 text-muted-foreground" />
                      <span>{{ customer.created_at ? formatDate(customer.created_at) : '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToDetail(customer.id)"
                      >
                        <Eye class="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        @click.stop="goToEdit(customer.id)"
                      >
                        <Edit class="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="py-4 text-center border-t border-border">
              <button
                class="text-sm text-primary"
                @click="loadCustomers()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && customers.length > 0" class="py-4 text-center text-sm text-muted-foreground border-t border-border">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>
  </div>
</template>
