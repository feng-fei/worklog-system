<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  MoreVertical,
  Package,
  Barcode,
  Tag,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Minus,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { materialsApi } from '@/api'

const route = useRoute()
const router = useRouter()

const materialId = computed(() => Number(route.params.id))
const loading = ref(true)

const mockMaterial = {
  id: 1,
  name: '铜管 Φ16mm',
  sku: 'WL-TG-001',
  category: 'hvac',
  category_label: '暖通',
  unit: '米',
  stock: 156,
  min_stock: 50,
  price: 12.5,
  cost_price: 8.2,
  supplier: '华东铜管厂',
  supplier_phone: '13800138000',
  created_at: '2025-06-15',
  updated_at: '2026-07-18',
  remark: '常用空调铜管，规格16mm',
  recentRecords: [
    { id: 1, record_no: 'GD20260718001', title: '某大厦12层空调安装', quantity: 85, type: '出库', date: '2026-07-18' },
    { id: 2, record_no: 'RK20260710001', title: '采购入库', quantity: 200, type: '入库', date: '2026-07-10' },
    { id: 3, record_no: 'GD20260705003', title: 'B栋办公区网络布线', quantity: 30, type: '出库', date: '2026-07-05' },
  ],
}

const useMock = import.meta.env.DEV
const material = ref(mockMaterial as any)

const isLowStock = computed(() => material.value.stock < material.value.min_stock)

const goBack = () => {
  router.back()
}

onMounted(async () => {
  if (!useMock) {
    try {
      const res = await materialsApi.get(materialId.value)
      material.value = res.data
    } catch (e) {
      console.error('Failed to load material:', e)
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen-safe bg-background flex flex-col">
    <header class="fixed top-0 left-0 right-0 z-40 safe-area-top bg-background/80 backdrop-blur-xl border-b border-border">
      <div class="flex items-center justify-between h-12 px-3">
        <div class="flex items-center gap-2 min-w-0">
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent"
            @click="goBack"
          >
            <ArrowLeft class="w-5 h-5 text-foreground" />
          </button>
          <h1 class="text-base font-semibold truncate">物料详情</h1>
        </div>
        <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent">
          <MoreVertical class="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto pt-12 safe-area-top pb-24 safe-area-bottom">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-muted-foreground text-sm">加载中...</div>
      </div>

      <div v-else class="p-4 space-y-4">
        <div
          :class="[
            'rounded-2xl p-5 shadow-lg text-white',
            isLowStock
              ? 'bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/20'
              : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'
          ]"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Package class="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 class="text-lg font-bold">{{ material.name }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur">
                    {{ material.category_label }}
                  </span>
                  <span class="text-xs text-white/80">{{ material.sku }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
            <div class="text-center">
              <p class="text-2xl font-bold">{{ material.stock }}</p>
              <p class="text-xs text-white/70 mt-0.5">当前库存</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold">{{ material.min_stock }}</p>
              <p class="text-xs text-white/70 mt-0.5">最低库存</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold">¥{{ material.price }}</p>
              <p class="text-xs text-white/70 mt-0.5">单价</p>
            </div>
          </div>

          <div v-if="isLowStock" class="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span class="text-xs">库存不足，低于最低库存线，请及时补货</span>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign class="w-4 h-4 text-primary" />
            价格信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <DollarSign class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">销售单价</span>
              </div>
              <span class="text-sm font-semibold text-foreground">¥{{ material.price.toFixed(2) }}/{{ material.unit }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <DollarSign class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">成本单价</span>
              </div>
              <span class="text-sm font-medium text-foreground">¥{{ material.cost_price.toFixed(2) }}/{{ material.unit }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 class="w-4 h-4 text-primary" />
            供应商信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Building2 class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">供应商</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ material.supplier }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <button
              class="w-full flex items-center justify-between tap-highlight-transparent"
              @click="material.supplier_phone && (window.location.href = `tel:${material.supplier_phone}`)"
            >
              <div class="flex items-center gap-2.5 text-sm">
                <Package class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">联系电话</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-sm text-primary font-medium">{{ material.supplier_phone }}</span>
                <span class="text-xs text-primary">拨打</span>
              </div>
            </button>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar class="w-4 h-4 text-primary" />
            时间信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">创建时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ material.created_at }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">更新时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ material.updated_at }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <Barcode class="w-4 h-4 text-primary" />
              出入库记录
            </h3>
            <button class="text-xs text-primary font-medium">
              全部
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="record in material.recentRecords"
              :key="record.id"
              class="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    record.type === '入库'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  ]"
                >
                  <TrendingUp v-if="record.type === '入库'" class="w-4 h-4" />
                  <TrendingDown v-else class="w-4 h-4" />
                </div>
                <div>
                  <p class="text-sm font-medium text-foreground">{{ record.title }}</p>
                  <p class="text-xs text-muted-foreground">{{ record.record_no }} · {{ record.date }}</p>
                </div>
              </div>
              <span
                :class="[
                  'text-sm font-semibold',
                  record.type === '入库' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                ]"
              >
                {{ record.type === '入库' ? '+' : '-' }}{{ record.quantity }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="material.remark" class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag class="w-4 h-4 text-primary" />
            备注
          </h3>
          <p class="text-sm text-foreground/80 leading-relaxed">{{ material.remark }}</p>
        </div>
      </div>
    </main>

    <div class="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom">
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1 h-12 rounded-xl text-base font-medium">
          <Minus class="w-4 h-4 mr-2" />
          出库
        </Button>
        <Button variant="outline" class="flex-1 h-12 rounded-xl text-base font-medium">
          <Plus class="w-4 h-4 mr-2" />
          入库
        </Button>
        <Button class="flex-1 h-12 rounded-xl text-base font-semibold">
          <Edit class="w-4 h-4 mr-2" />
          编辑
        </Button>
      </div>
    </div>
  </div>
</template>
