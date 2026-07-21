<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { materialsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  Package,
  Tag,
  Layers,
  DollarSign,
  AlertTriangle,
  FileText,
  Check,
  AlertCircle,
  Hash,
  Building,
  Box,
  MapPin,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const materialId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  material_no: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  spec: '',
  unit: '',
  unit_price: undefined as number | undefined,
  stock: undefined as number | undefined,
  min_stock: undefined as number | undefined,
  location: '',
  remark: '',
})

const unitOptions = ['个', '米', '台', '套', '件', '箱', '千克', '吨', '米²', '米³']

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  name: [validators.required('请输入物料名称')],
  unit: [validators.required('请选择或输入单位')],
})

const loadMaterial = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await materialsApi.get(materialId.value)
    const data = res.data.material || res.data
    form.material_no = data.material_no || ''
    form.name = data.name || ''
    form.category = data.category || ''
    form.brand = data.brand || ''
    form.model = data.model || ''
    form.spec = data.spec || data.specification || ''
    form.unit = data.unit || ''
    form.unit_price = data.unit_price ?? data.price
    form.stock = data.stock ?? data.initial_stock
    form.min_stock = data.min_stock ?? data.low_stock_warning ?? data.warning_value
    form.location = data.location || ''
    form.remark = data.remark || ''
  } catch (e) {
    console.error('加载物料信息失败', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const data: Record<string, any> = {
      name: form.name,
      category: form.category,
      brand: form.brand,
      model: form.model,
      spec: form.spec,
      unit: form.unit,
      unit_price: form.unit_price,
      min_stock: form.min_stock,
      location: form.location,
      remark: form.remark,
    }

    if (isEdit.value) {
      await materialsApi.update(materialId.value, data)
    } else {
      data.stock = form.stock || 0
      await materialsApi.create(data)
    }

    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('name', msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadMaterial()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑物料' : '新建物料'"
      show-back
    >
      <template #right>
        <button
          class="text-sm font-medium text-primary"
          @click="handleSubmit"
          :disabled="submitting"
        >
          保存
        </button>
      </template>
    </MobileHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p>加载中...</p>
      </div>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto pb-32">
        <div class="space-y-5 px-4 py-5">
          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Package class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-4">
              <div v-if="isEdit">
                <label class="mb-2 block text-sm font-medium">物料编号</label>
                <div class="relative">
                  <Hash class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.material_no"
                    type="text"
                    disabled
                    class="h-12 w-full rounded-xl border border-input bg-muted pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">
                  物料名称 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Package class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入物料名称"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.name }"
                    @blur="validateField('name')"
                  />
                </div>
                <p v-if="errors.name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.name }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">分类</label>
                  <div class="relative">
                    <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.category"
                      type="text"
                      placeholder="分类"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">品牌</label>
                  <div class="relative">
                    <Building class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.brand"
                      type="text"
                      placeholder="品牌"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">型号</label>
                <div class="relative">
                  <Box class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.model"
                    type="text"
                    placeholder="请输入型号"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">规格</label>
                <div class="relative">
                  <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.spec"
                    type="text"
                    placeholder="请输入规格"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">
                  单位 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Layers class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.unit"
                    type="text"
                    placeholder="请输入或选择单位"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.unit }"
                    @blur="validateField('unit')"
                  />
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="u in unitOptions"
                    :key="u"
                    class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    :class="form.unit === u
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
                    @click="form.unit = u; validateField('unit')"
                  >
                    {{ u }}
                  </button>
                </div>
                <p v-if="errors.unit" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.unit }}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">单价（元）</label>
                  <div class="relative">
                    <DollarSign class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model.number="form.unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    {{ isEdit ? '当前库存' : '初始库存' }}
                  </label>
                  <div class="relative">
                    <Layers class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model.number="form.stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      :disabled="isEdit"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <AlertTriangle class="h-5 w-5 text-primary" />
              库存预警
            </h3>
            <div>
              <label class="mb-2 block text-sm font-medium">低库存预警值</label>
              <div class="relative">
                <AlertTriangle class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                <input
                  v-model.number="form.min_stock"
                  type="number"
                  min="0"
                  placeholder="低于此数量时预警"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <p class="mt-1.5 text-xs text-muted-foreground">
                当库存数量低于此值时，将标记为低库存状态
              </p>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <MapPin class="h-5 w-5 text-primary" />
              存放位置
            </h3>
            <div>
              <label class="mb-2 block text-sm font-medium">存放位置</label>
              <div class="relative">
                <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                <input
                  v-model="form.location"
                  type="text"
                  placeholder="请输入存放位置"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              备注信息
            </h3>
            <div>
              <label class="mb-2 block text-sm font-medium">备注</label>
              <textarea
                v-model="form.remark"
                rows="4"
                placeholder="请输入备注信息（选填）"
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 pb-safe">
        <div class="mx-auto max-w-lg">
          <Button
            size="xl"
            class="w-full"
            :loading="submitting"
            @click="handleSubmit"
          >
            <Check class="h-5 w-5" />
            {{ isEdit ? '保存修改' : '创建物料' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
