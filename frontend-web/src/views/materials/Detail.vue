<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { materialsApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Package,
  Tag,
  Layers,
  DollarSign,
  Edit,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Plus,
  Minus,
  Calendar,
} from 'lucide-vue-next'
import { formatDate, relativeTime } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const materialId = computed(() => Number(route.params.id))
const material = ref<any>(null)
const loading = ref(true)
const stockLogs = ref<any[]>([])
const stockLoading = ref(false)

const stockQuantity = ref(0)
const showStockDialog = ref(false)
const stockType = ref<'in' | 'out'>('in')
const stockRemark = ref('')

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

const loadMaterial = async () => {
  loading.value = true
  try {
    const res = await materialsApi.get(materialId.value)
    material.value = res.data
  } catch (e) {
    console.error('加载物料详情失败', e)
  } finally {
    loading.value = false
  }
}

const loadStockLogs = async () => {
  stockLoading.value = true
  try {
    const res = await materialsApi.stockLogs({
      material_id: materialId.value,
      page_size: 20,
    })
    const data = res.data
    stockLogs.value = data.records || data.list || data.items || []
  } catch (e) {
    console.error('加载库存记录失败', e)
  } finally {
    stockLoading.value = false
  }
}

const openStockDialog = (type: 'in' | 'out') => {
  stockType.value = type
  stockQuantity.value = 0
  stockRemark.value = ''
  showStockDialog.value = true
}

const handleStock = async () => {
  if (stockQuantity.value <= 0) {
    alert('请输入正确的数量')
    return
  }
  if (stockType.value === 'out' && stockQuantity.value > (material.value?.stock_quantity ?? material.value?.stock ?? 0)) {
    alert('出库数量不能大于当前库存')
    return
  }

  try {
    await materialsApi.stock(materialId.value, {
      type: stockType.value,
      quantity: stockQuantity.value,
      remark: stockRemark.value,
    })
    showStockDialog.value = false
    loadMaterial()
    loadStockLogs()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

const goToEdit = () => {
  router.push(`/materials/${materialId.value}/edit`)
}

onMounted(() => {
  loadMaterial()
  loadStockLogs()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      title="物料详情"
      show-back
    >
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="goToEdit"
        >
          <Edit class="h-5 w-5" />
        </button>
      </template>
    </MobileHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p>加载中...</p>
      </div>
    </div>

    <template v-else-if="material">
      <div class="flex-1 overflow-y-auto pb-32">
        <div class="bg-gradient-to-r from-primary to-primary/80 px-5 py-6 text-primary-foreground">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm opacity-80">
                物料编号: #{{ material.id }}
              </p>
              <h1 class="mt-1 text-xl font-bold">
                {{ material.name }}
              </h1>
            </div>
            <Badge variant="outline" class="bg-white/20 text-white border-white/30">
              {{ getStockStatus(material).label }}
            </Badge>
          </div>
          <p class="mt-2 text-sm opacity-80">
            {{ material.specification || material.spec || '暂无规格' }}
          </p>
        </div>

        <div class="space-y-4 p-4">
          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Package class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-3 text-sm">
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <Tag class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">规格型号</p>
                    <p class="font-medium">{{ material.specification || material.spec || '-' }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Layers class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">单位</p>
                    <p class="font-medium">{{ material.unit || '-' }}</p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-start gap-2">
                  <DollarSign class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">单价</p>
                    <p class="font-medium">¥{{ material.price?.toFixed?.(2) || '0.00' }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Package class="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p class="text-muted-foreground">分类</p>
                    <p class="font-medium">{{ material.category || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Layers class="h-5 w-5 text-primary" />
              库存信息
            </h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-muted-foreground text-sm">当前库存</p>
                <p class="mt-1 text-2xl font-bold">
                  {{ material.stock_quantity ?? material.stock ?? 0 }}
                  <span class="text-base font-normal text-muted-foreground">{{ material.unit || '' }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="text-muted-foreground text-sm">低库存预警</p>
                <p class="mt-1 text-lg font-medium flex items-center justify-end gap-1">
                  <AlertTriangle class="h-4 w-4 text-warning" />
                  {{ material.low_stock_warning ?? material.warning_value ?? 10 }}
                  <span class="text-sm font-normal text-muted-foreground">{{ material.unit || '' }}</span>
                </p>
              </div>
            </div>
            <div class="mt-4 flex gap-3">
              <Button variant="outline" class="flex-1" @click="openStockDialog('in')">
                <TrendingUp class="h-5 w-5 text-success" />
                入库
              </Button>
              <Button variant="outline" class="flex-1" @click="openStockDialog('out')">
                <TrendingDown class="h-5 w-5 text-destructive" />
                出库
              </Button>
            </div>
          </Card>

          <Card v-if="material.remark" class="p-5">
            <h3 class="mb-3 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              备注
            </h3>
            <div class="rounded-xl bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {{ material.remark }}
            </div>
          </Card>

          <Card class="p-5">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              库存变动记录
            </h3>

            <div v-if="stockLoading && stockLogs.length === 0" class="py-8 text-center text-muted-foreground text-sm">
              加载中...
            </div>

            <div v-else-if="stockLogs.length === 0" class="py-8 text-center text-muted-foreground text-sm">
              暂无变动记录
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="log in stockLogs"
                :key="log.id"
                class="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full"
                    :class="log.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'"
                  >
                    <Plus v-if="log.type === 'in'" class="h-4 w-4" />
                    <Minus v-else class="h-4 w-4" />
                  </div>
                  <div>
                    <p class="font-medium text-sm">
                      {{ log.type === 'in' ? '入库' : '出库' }}
                      <span
                        class="ml-2 font-semibold"
                        :class="log.type === 'in' ? 'text-success' : 'text-destructive'"
                      >
                        {{ log.type === 'in' ? '+' : '-' }}{{ log.quantity }}
                      </span>
                      <span class="text-muted-foreground font-normal">{{ material.unit || '' }}</span>
                    </p>
                    <p v-if="log.remark" class="mt-0.5 text-xs text-muted-foreground">
                      {{ log.remark }}
                    </p>
                    <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar class="h-3 w-3" />
                      {{ relativeTime(log.created_at) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="showStockDialog"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
        @click.self="showStockDialog = false"
      >
        <div class="w-full max-w-lg rounded-t-3xl bg-background p-5 pb-safe animate-slide-up">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ stockType === 'in' ? '物料入库' : '物料出库' }}
            </h3>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
              @click="showStockDialog = false"
            >
              <ArrowLeft class="h-5 w-5 rotate-45" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium">
                数量 <span class="text-destructive">*</span>
              </label>
              <div class="flex items-center gap-3">
                <button
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-secondary text-lg font-medium"
                  @click="stockQuantity = Math.max(0, stockQuantity - 1)"
                >
                  <Minus class="h-5 w-5" />
                </button>
                <input
                  v-model.number="stockQuantity"
                  type="number"
                  min="0"
                  class="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  class="flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-secondary text-lg font-medium"
                  @click="stockQuantity = stockQuantity + 1"
                >
                  <Plus class="h-5 w-5" />
                </button>
              </div>
              <p class="mt-1.5 text-xs text-muted-foreground">
                单位：{{ material?.unit || '个' }}
                <span v-if="stockType === 'out'" class="ml-2">
                  当前库存：{{ material?.stock_quantity ?? material?.stock ?? 0 }}
                </span>
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">备注</label>
              <textarea
                v-model="stockRemark"
                rows="3"
                placeholder="请输入备注信息（选填）"
                class="min-h-[80px] w-full rounded-xl border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <Button variant="outline" size="xl" class="flex-1" @click="showStockDialog = false">
              取消
            </Button>
            <Button size="xl" class="flex-1" @click="handleStock">
              确认{{ stockType === 'in' ? '入库' : '出库' }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
