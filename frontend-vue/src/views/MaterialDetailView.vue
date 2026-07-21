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
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { materialsApi } from '@/api'
import type { Material } from '@/types'

const route = useRoute()
const router = useRouter()

const materialId = computed(() => Number(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const material = ref<Material | null>(null)

const categoryLabels: Record<string, string> = {
  electrical: '电气',
  hvac: '暖通',
  network: '网络',
  fire: '消防',
}

const getCategoryLabel = (category?: string) => {
  if (!category) return ''
  return categoryLabels[category] || category
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isLowStock = computed(() => material.value?.is_low_stock ?? false)

const goBack = () => {
  router.back()
}

const fetchMaterial = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await materialsApi.get(materialId.value)
    material.value = data
  } catch (e: any) {
    error.value = e?.message || '加载失败，请稍后重试'
    console.error('Failed to load material:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMaterial()
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
        <Loader2 class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else-if="error" class="flex flex-col items-center justify-center py-16 text-center px-4">
        <AlertCircle class="w-12 h-12 text-red-400 mb-3" />
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <button
          class="flex items-center gap-2 text-sm text-primary font-medium px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
          @click="fetchMaterial"
        >
          <RefreshCw class="w-4 h-4" />
          重试
        </button>
      </div>

      <div v-else-if="material" class="p-4 space-y-4">
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
                    {{ getCategoryLabel(material.category) }}
                  </span>
                  <span class="text-xs text-white/80">{{ material.material_no }}</span>
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
              <p class="text-2xl font-bold">¥{{ material.unit_price }}</p>
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
            <Package class="w-4 h-4 text-primary" />
            基本信息
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Barcode class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">物料编号</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ material.material_no }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Tag class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">分类</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ getCategoryLabel(material.category) }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Package class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">单位</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ material.unit }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign class="w-4 h-4 text-primary" />
            库存与价格
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Package class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">当前库存</span>
              </div>
              <span class="text-sm font-semibold text-foreground">{{ material.stock }}{{ material.unit }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <AlertTriangle class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">最低库存</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ material.min_stock }}{{ material.unit }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Package class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">最高库存</span>
              </div>
              <span class="text-sm font-medium text-foreground">{{ material.max_stock }}{{ material.unit }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <DollarSign class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">单价</span>
              </div>
              <span class="text-sm font-semibold text-foreground">¥{{ material.unit_price.toFixed(2) }}/{{ material.unit }}</span>
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
              <span class="text-sm font-medium text-foreground">{{ material.supplier || '-' }}</span>
            </div>
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
              <span class="text-sm text-foreground font-medium">{{ formatDate(material.created_at) }}</span>
            </div>

            <div class="h-px bg-border/60" />

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 text-sm">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                <span class="text-muted-foreground">更新时间</span>
              </div>
              <span class="text-sm text-foreground font-medium">{{ formatDate((material as any).updated_at) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <Barcode class="w-4 h-4 text-primary" />
              出入库记录
            </h3>
          </div>

          <div class="py-8 text-center">
            <div class="text-4xl mb-2">📋</div>
            <p class="text-sm text-muted-foreground">暂无记录</p>
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
