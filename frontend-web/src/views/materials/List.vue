<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { materialsApi } from '@/api'
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
  Package,
  RefreshCw,
  Tag,
  Layers,
  DollarSign,
  Eye,
  Edit,
} from 'lucide-vue-next'

const router = useRouter()
const { isDesktop } = useResponsive()
const toggleSidebar = inject('toggleSidebar', () => {})

const materials = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterCategory = ref('all')
const currentPage = ref(1)
const hasMore = ref(true)

const stockStatusMap: Record<string, { label: string; variant: string }> = {
  normal: { label: '正常', variant: 'success' },
  low: { label: '低库存', variant: 'warning' },
  out_of_stock: { label: '缺货', variant: 'destructive' },
}

const getStockStatus = (item: any) => {
  const stock = item.stock_quantity ?? item.stock ?? 0
  const warning = item.low_stock_warning ?? item.warning_value ?? 10
  if (stock <= 0) return stockStatusMap.out_of_stock
  if (stock <= warning) return stockStatusMap.low
  return stockStatusMap.normal
}

const loadMaterials = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await materialsApi.list({
      page: currentPage.value,
      page_size: 20,
      keyword: searchQuery.value || undefined,
      category: filterCategory.value !== 'all' ? filterCategory.value : undefined,
    })

    const data = res.data
    const list = data.records || (Array.isArray(data) ? data : [])
    const pageSize = 20

    if (refresh) {
      materials.value = list
    } else {
      materials.value = [...materials.value, ...list]
    }

    hasMore.value = data.pages ? currentPage.value < data.pages : list.length >= pageSize
    currentPage.value++
  } catch (e) {
    console.error('加载物料列表失败', e)
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: number) => {
  router.push(`/materials/${id}`)
}

const goToEdit = (id: number) => {
  router.push(`/materials/${id}/edit`)
}

const goToCreate = () => {
  router.push('/materials/create')
}

const onRefresh = () => {
  return loadMaterials(true)
}

const filteredMaterials = computed(() => {
  if (!searchQuery.value) return materials.value
  const query = searchQuery.value.toLowerCase()
  return materials.value.filter((m) =>
    (m.name || '').toLowerCase().includes(query) ||
    (m.specification || m.spec || '').toLowerCase().includes(query) ||
    (m.category || '').toLowerCase().includes(query)
  )
})

const categories = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常用' },
  { key: 'low_stock', label: '低库存' },
]

onMounted(() => {
  loadMaterials(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-7xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">物料管理</h1>
          <button
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="goToCreate"
          >
            <Plus class="h-4 w-4" />
            新建物料
          </button>
        </div>

        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索物料名称、规格型号..."
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
          <div v-if="loading && materials.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredMaterials.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无物料记录</p>
          </div>

          <template v-else>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>物料名称</TableHead>
                  <TableHead>物料编码</TableHead>
                  <TableHead>规格型号</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>库存数量</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="material in filteredMaterials"
                  :key="material.id"
                  clickable
                  @click="goToDetail(material.id)"
                >
                  <TableCell>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ material.name }}</span>
                      <Badge :variant="getStockStatus(material).variant as any" size="sm">
                        {{ getStockStatus(material).label }}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ material.code || material.material_code || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ material.specification || material.spec || '-' }}</TableCell>
                  <TableCell class="text-muted-foreground">{{ material.unit || '-' }}</TableCell>
                  <TableCell>{{ material.stock_quantity ?? material.stock ?? 0 }}</TableCell>
                  <TableCell>¥{{ material.price?.toFixed?.(2) || '0.00' }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        @click.stop="goToDetail(material.id)"
                      >
                        <Eye class="h-4 w-4" />
                        查看
                      </button>
                      <button
                        class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        @click.stop="goToEdit(material.id)"
                      >
                        <Edit class="h-4 w-4" />
                        编辑
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div v-if="hasMore && !loading" class="border-t border-border p-4 text-center">
              <button
                class="text-sm text-primary hover:underline"
                @click="loadMaterials()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && materials.length > 0" class="border-t border-border p-4 text-center text-sm text-muted-foreground">
              <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          </template>
        </Card>
      </div>
    </template>

    <template v-else>
      <MobileHeader title="物料" :showMenu="true" @menu-click="toggleSidebar">
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
            placeholder="搜索物料名称、规格型号..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="cat in categories"
            :key="cat.key"
            class="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="filterCategory === cat.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
            @click="filterCategory = cat.key; loadMaterials(true)"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <PullRefresh class="flex-1" @refresh="onRefresh">
        <div class="space-y-3 px-4 pb-6">
          <div v-if="loading && materials.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredMaterials.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无物料记录</p>
            <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新物料</p>
          </div>

          <template v-else>
            <Card
              v-for="material in filteredMaterials"
              :key="material.id"
              class="p-4 active:scale-[0.99] transition-transform"
            >
              <div class="flex items-start justify-between cursor-pointer" @click="goToDetail(material.id)">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">
                    {{ material.name }}
                  </span>
                  <Badge :variant="getStockStatus(material).variant as any" size="sm">
                    {{ getStockStatus(material).label }}
                  </Badge>
                </div>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>

              <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" @click="goToDetail(material.id)">
                <Tag class="h-4 w-4 flex-shrink-0" />
                <span>{{ material.specification || material.spec || '-' }}</span>
              </div>

              <div class="mt-3 grid grid-cols-3 gap-2 text-sm cursor-pointer" @click="goToDetail(material.id)">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Layers class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ material.stock_quantity ?? material.stock ?? 0 }} {{ material.unit || '' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">¥{{ material.price?.toFixed?.(2) || '0.00' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Package class="h-4 w-4 flex-shrink-0" />
                  <span class="truncate">{{ material.category || '-' }}</span>
                </div>
              </div>

              <div class="mt-3 flex gap-2 pt-3 border-t border-border">
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  @click.stop="goToDetail(material.id)"
                >
                  <Eye class="h-4 w-4" />
                  查看
                </button>
                <button
                  class="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-foreground rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  @click.stop="goToEdit(material.id)"
                >
                  <Edit class="h-4 w-4" />
                  编辑
                </button>
              </div>
            </Card>

            <div v-if="hasMore && !loading" class="py-4 text-center">
              <button
                class="text-sm text-primary"
                @click="loadMaterials()"
              >
                加载更多
              </button>
            </div>

            <div v-if="loading && materials.length > 0" class="py-4 text-center text-sm text-muted-foreground">
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
