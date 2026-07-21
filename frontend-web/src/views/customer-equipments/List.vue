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
  Monitor,
  RefreshCw,
  Building2,
  Settings,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  Wrench,
} from 'lucide-vue-next'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const equipments = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const hasMore = ref(true)

const statusMap: Record<string, { label: string; variant: string }> = {
  normal: { label: '正常', variant: 'success' },
  faulty: { label: '故障', variant: 'warning' },
  scrapped: { label: '报废', variant: 'destructive' },
}

const getStatusBadge = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const getWarrantyBadge = (item: any) => {
  if (item.is_warranty) {
    return { label: '保修中', variant: 'success' }
  }
  return { label: '已过保', variant: 'secondary' }
}

const loadEquipments = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await customersApi.equipments({
      page: currentPage.value,
      page_size: 20,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      equipments.value = list
    } else {
      equipments.value = [...equipments.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载设备列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToCreate = () => {
  router.push('/customer-equipments/create')
}

const goToEdit = (id: number) => {
  router.push(`/customer-equipments/${id}/edit`)
}

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除该设备吗？')) return
  try {
    await customersApi.deleteEquipment(id)
    loadEquipments(true)
  } catch (e) {
    console.error('删除设备失败', e)
  }
}

const onRefresh = () => {
  return loadEquipments(true)
}

const filteredEquipments = computed(() => {
  if (!searchQuery.value) return equipments.value
  const query = searchQuery.value.toLowerCase()
  return equipments.value.filter((e) =>
    (e.customer_name || '').toLowerCase().includes(query) ||
    (e.brand || '').toLowerCase().includes(query) ||
    (e.model || '').toLowerCase().includes(query) ||
    (e.equipment_type || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadEquipments(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">客户设备管理</h1>
          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="goToCreate"
          >
            <Plus class="h-4 w-4" />
            新建设备
          </button>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索设备名称、客户名称、型号..."
                class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="loadEquipments(true)"
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
          <div v-if="loading && equipments.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredEquipments.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Monitor class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无设备记录</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备名称/型号</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>安装日期</TableHead>
                  <TableHead>保修到期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>保修状态</TableHead>
                  <TableHead>下次维护</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="equipment in filteredEquipments"
                  :key="equipment.id"
                  clickable
                  @click="goToEdit(equipment.id)"
                >
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ equipment.brand }} {{ equipment.model }}</span>
                      <span class="text-xs text-muted-foreground">{{ equipment.serial_no || '-' }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ equipment.customer_name || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ equipment.install_date || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">
                    <span :class="{ 'text-destructive font-medium': !equipment.is_warranty && equipment.warranty_end }">
                      {{ equipment.warranty_end || '-' }}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getStatusBadge(equipment.status).variant as any" size="sm">
                      {{ getStatusBadge(equipment.status).label }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="getWarrantyBadge(equipment).variant as any" size="sm">
                      {{ getWarrantyBadge(equipment).label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ equipment.next_maintenance || '-' }}</TableCell>
                  <TableCell class="text-right">
                    <div class="inline-flex items-center gap-1">
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        @click.stop="goToEdit(equipment.id)"
                      >
                        <Edit2 class="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        @click.stop="handleDelete(equipment.id)"
                      >
                        <Trash2 class="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="border-t border-border p-4 text-center">
              <button
                class="text-sm text-primary hover:underline"
                @click="loadEquipments()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && equipments.length > 0" class="border-t border-border p-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="客户设备" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索设备名称、客户名称、型号..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            @keyup.enter="loadEquipments(true)"
          />
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && equipments.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredEquipments.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Monitor class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无设备记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新设备</p>
          </div>

          <template v-else>
            <Card
              v-for="equipment in filteredEquipments"
              :key="equipment.id"
              class="p-4 active:scale-[0.99] transition-transform cursor-pointer"
              @click="goToEdit(equipment.id)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ equipment.brand }} {{ equipment.model }}
                  </span>
                  <Badge :variant="getStatusBadge(equipment.status).variant as any" size="sm">
                    {{ getStatusBadge(equipment.status).label }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 class="h-4 w-4 flex-shrink-0" />
                <span>{{ equipment.customer_name || '-' }}</span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">安装: {{ equipment.install_date || '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">保至: {{ equipment.warranty_end || '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Settings class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ equipment.equipment_type || '-' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Wrench class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">下次维护: {{ equipment.next_maintenance || '-' }}</span>
                </div>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadEquipments()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && equipments.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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
