<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { templatesApi, staffsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  FileText,
  Tag,
  Layers,
  DollarSign,
  AlertCircle,
  Check,
  ChevronDown,
  Users,
  Eye,
  EyeOff,
  Hammer,
  Wrench,
  ClipboardList,
  Stethoscope,
  Wrench as WrenchIcon,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const templateId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)
const staffList = ref<any[]>([])
const staffLoading = ref(false)

interface FeeItem {
  id: string
  type: string
  desc: string
  qty: number
  unit: string
  price: number
  subtotal: number
}

const feeTypeOptions = [
  { value: '人工', label: '人工' },
  { value: '材料', label: '材料' },
  { value: '设备', label: '设备' },
  { value: '交通', label: '交通' },
  { value: '其他', label: '其他' },
]

const unitOptions = [
  { value: '小时', label: '小时' },
  { value: '天', label: '天' },
  { value: '个', label: '个' },
  { value: '次', label: '次' },
  { value: '米', label: '米' },
  { value: '套', label: '套' },
  { value: '台', label: '台' },
]

const form = reactive({
  name: '',
  template_type: 'construction' as 'construction' | 'repair',
  category: '',
  work_subtype: '',
  priority: 'normal' as 'high' | 'normal' | 'low',
  work_content: '',
  fault_description: '',
  fault_diagnosis: '',
  repair_process: '',
  repair_result: '',
  labor_fee: undefined as number | undefined,
  material_fee: undefined as number | undefined,
  transport_fee: undefined as number | undefined,
  other_fee: undefined as number | undefined,
  tax_type: 'exclusive' as 'inclusive' | 'exclusive',
  tax_rate: undefined as number | undefined,
  staff_names: [] as string[],
  fee_items: [] as FeeItem[],
  remark: '',
  is_public: false,
})

const templateTypeOptions = [
  { value: 'construction', label: '施工', icon: Hammer },
  { value: 'repair', label: '维修', icon: Wrench },
]

const priorityOptions = [
  { value: 'high', label: '高优先级' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低优先级' },
]

const repairResultOptions = [
  { value: 'repaired', label: '已修复' },
  { value: 'partially_repaired', label: '部分修复' },
  { value: 'unrepairable', label: '无法修复' },
  { value: 'replaced', label: '已更换' },
]

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  name: [validators.required('请输入模板名称')],
  template_type: [validators.required('请选择模板类型')],
})

const totalFee = computed(() => {
  if (form.fee_items.length > 0) {
    return form.fee_items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
  }
  const labor = form.labor_fee || 0
  const material = form.material_fee || 0
  const transport = form.transport_fee || 0
  const other = form.other_fee || 0
  return labor + material + transport + other
})

const addFeeItem = () => {
  form.fee_items.push({
    id: 'fee_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    type: '人工',
    desc: '',
    qty: 1,
    unit: '小时',
    price: 0,
    subtotal: 0,
  })
}

const removeFeeItem = (index: number) => {
  form.fee_items.splice(index, 1)
}

const updateFeeSubtotal = (index: number) => {
  const item = form.fee_items[index]
  item.subtotal = Math.round((item.qty || 0) * (item.price || 0) * 100) / 100
}

const initDefaultFeeItems = () => {
  if (form.fee_items.length === 0) {
    form.fee_items = [
      {
        id: 'labor_default',
        type: '人工',
        desc: '',
        qty: 1,
        unit: '小时',
        price: form.labor_fee || 0,
        subtotal: form.labor_fee || 0,
      }
    ]
  }
}

const loadStaffList = async () => {
  staffLoading.value = true
  try {
    const res = await staffsApi.list({ page_size: 100 })
    const data = res.data
    staffList.value = data.records || (Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('加载员工列表失败', e)
  } finally {
    staffLoading.value = false
  }
}

const loadTemplate = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await templatesApi.get(templateId.value)
    const data = res.data
    form.name = data.name || ''
    form.template_type = data.template_type || 'construction'
    form.category = data.category || ''
    form.work_subtype = data.work_subtype || ''
    form.priority = data.priority || 'normal'
    form.work_content = data.work_content || ''
    form.fault_description = data.fault_description || ''
    form.fault_diagnosis = data.fault_diagnosis || ''
    form.repair_process = data.repair_process || ''
    form.repair_result = data.repair_result || ''
    form.labor_fee = data.labor_fee
    form.material_fee = data.material_fee
    form.transport_fee = data.transport_fee
    form.other_fee = data.other_fee
    form.tax_type = data.tax_type || 'exclusive'
    if (data.tax_type === 'tax') {
      form.tax_type = 'inclusive'
    } else if (data.tax_type === 'no') {
      form.tax_type = 'exclusive'
    }
    form.tax_rate = data.tax_rate ? data.tax_rate / 100 : undefined
    form.staff_names = Array.isArray(data.staff_names) ? data.staff_names : (data.staff_names ? data.staff_names.split(',') : [])
    if (data.fee_items && data.fee_items.length > 0) {
      form.fee_items = data.fee_items.map((item: any, idx: number) => ({
        id: 'tpl_' + idx,
        type: item.type || '其他',
        desc: item.desc || '',
        qty: item.qty || 1,
        unit: item.unit || '个',
        price: item.price || 0,
        subtotal: item.subtotal || (item.qty || 0) * (item.price || 0),
      }))
    }
    form.remark = data.remark || ''
    form.is_public = data.is_public || false
  } catch (e) {
    console.error('加载模板信息失败', e)
  } finally {
    loading.value = false
  }
}

const toggleStaff = (staffName: string) => {
  const index = form.staff_names.indexOf(staffName)
  if (index > -1) {
    form.staff_names.splice(index, 1)
  } else {
    form.staff_names.push(staffName)
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const data: Record<string, any> = {
      name: form.name,
      template_type: form.template_type,
      category: form.category,
      work_subtype: form.work_subtype,
      priority: form.priority,
      work_content: form.work_content,
      fault_description: form.fault_description,
      fault_diagnosis: form.fault_diagnosis,
      repair_process: form.repair_process,
      repair_result: form.repair_result,
      labor_fee: form.fee_items.length > 0 
        ? form.fee_items.filter(i => i.type === '人工').reduce((sum, i) => sum + i.subtotal, 0) 
        : form.labor_fee,
      material_fee: form.fee_items.length > 0 
        ? form.fee_items.filter(i => i.type === '材料').reduce((sum, i) => sum + i.subtotal, 0) 
        : form.material_fee,
      transport_fee: form.fee_items.length > 0 
        ? form.fee_items.filter(i => i.type === '交通').reduce((sum, i) => sum + i.subtotal, 0) 
        : form.transport_fee,
      other_fee: form.fee_items.length > 0 
        ? form.fee_items.filter(i => !['人工', '材料', '交通'].includes(i.type)).reduce((sum, i) => sum + i.subtotal, 0) 
        : form.other_fee,
      tax_type: form.tax_type === 'inclusive' ? 'tax' : 'no',
      tax_rate: form.tax_rate ? form.tax_rate * 100 : 0,
      staff_names: form.staff_names,
      fee_items: form.fee_items.map(item => ({
        type: item.type,
        desc: item.desc,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        subtotal: item.subtotal,
      })),
      remark: form.remark,
      is_public: form.is_public,
    }

    if (isEdit.value) {
      await templatesApi.update(templateId.value, data)
    } else {
      await templatesApi.create(data)
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
  loadTemplate()
  loadStaffList()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑模板' : '新建模板'"
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
              <FileText class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">
                  模板名称 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <FileText class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入模板名称"
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

              <div>
                <label class="mb-2 block text-sm font-medium">
                  模板类型 <span class="text-destructive">*</span>
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    v-for="type in templateTypeOptions"
                    :key="type.value"
                    class="flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-colors"
                    :class="form.template_type === type.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:border-muted-foreground/30'"
                    @click="form.template_type = type.value as any"
                  >
                    <component :is="type.icon" class="h-5 w-5" />
                    <span class="font-medium">{{ type.label }}</span>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">分类</label>
                  <div class="relative">
                    <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.category"
                      type="text"
                      placeholder="请输入分类"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">施工类型</label>
                  <div class="relative">
                    <Layers class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.work_subtype"
                      type="text"
                      placeholder="请输入施工类型"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">优先级</label>
                <div class="relative">
                  <AlertCircle class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <select
                    v-model="form.priority"
                    class="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-12 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option v-for="p in priorityOptions" :key="p.value" :value="p.value">
                      {{ p.label }}
                    </option>
                  </select>
                  <ChevronDown class="absolute right-4 top-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <ClipboardList class="h-5 w-5 text-primary" />
              工作内容
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">工作内容</label>
                <textarea
                  v-model="form.work_content"
                  rows="4"
                  placeholder="请输入工作内容描述"
                  class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div v-if="form.template_type === 'repair'">
                <label class="mb-2 block text-sm font-medium">故障描述</label>
                <textarea
                  v-model="form.fault_description"
                  rows="3"
                  placeholder="请输入故障描述"
                  class="min-h-[80px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div v-if="form.template_type === 'repair'">
                <label class="mb-2 block text-sm font-medium">故障诊断</label>
                <textarea
                  v-model="form.fault_diagnosis"
                  rows="3"
                  placeholder="请输入故障诊断结果"
                  class="min-h-[80px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div v-if="form.template_type === 'repair'">
                <label class="mb-2 block text-sm font-medium">维修过程</label>
                <textarea
                  v-model="form.repair_process"
                  rows="3"
                  placeholder="请输入维修过程描述"
                  class="min-h-[80px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div v-if="form.template_type === 'repair'">
                <label class="mb-2 block text-sm font-medium">维修结果</label>
                <div class="relative">
                  <CheckCircle class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <select
                    v-model="form.repair_result"
                    class="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-12 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">请选择维修结果</option>
                    <option v-for="r in repairResultOptions" :key="r.value" :value="r.value">
                      {{ r.label }}
                    </option>
                  </select>
                  <ChevronDown class="absolute right-4 top-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <DollarSign class="h-5 w-5 text-primary" />
              费用项预设
            </h3>
            <div class="space-y-4">
              <div class="space-y-3">
                <div
                  v-for="(item, index) in form.fee_items"
                  :key="item.id"
                  class="rounded-xl border border-input bg-background p-3 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">费用项 {{ index + 1 }}</span>
                    <button
                      type="button"
                      class="text-destructive p-1"
                      @click="removeFeeItem(index)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="mb-1 block text-xs text-muted-foreground">费用类型</label>
                      <select
                        v-model="item.type"
                        class="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option v-for="t in feeTypeOptions" :key="t.value" :value="t.value">
                          {{ t.label }}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label class="mb-1 block text-xs text-muted-foreground">单位</label>
                      <select
                        v-model="item.unit"
                        class="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option v-for="u in unitOptions" :key="u.value" :value="u.value">
                          {{ u.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-muted-foreground">描述/说明</label>
                    <input
                      v-model="item.desc"
                      type="text"
                      placeholder="费用说明（选填）"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="mb-1 block text-xs text-muted-foreground">数量</label>
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="数量"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs text-muted-foreground">单价</label>
                      <input
                        v-model.number="item.price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="单价"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs text-muted-foreground">小计</label>
                      <div class="h-10 flex items-center px-3 rounded-lg bg-muted text-sm font-medium">
                        ¥{{ item.subtotal.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                @click="addFeeItem"
              >
                <Plus class="h-4 w-4" />
                添加费用项
              </button>

              <div v-if="form.fee_items.length === 0" class="rounded-xl border border-dashed border-input bg-secondary/20 p-4 text-center text-sm text-muted-foreground">
                <DollarSign class="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
                <p>暂无预设费用项，点击上方按钮添加</p>
                <div class="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-2 block text-sm font-medium text-left">人工费（元）</label>
                    <input
                      v-model.number="form.labor_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium text-left">材料费（元）</label>
                    <input
                      v-model.number="form.material_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium text-left">运输费（元）</label>
                    <input
                      v-model.number="form.transport_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium text-left">其他费用（元）</label>
                    <input
                      v-model.number="form.other_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-input bg-secondary/30 p-4">
                <span class="text-sm font-medium">费用合计</span>
                <span class="text-lg font-bold text-primary">¥{{ totalFee.toFixed(2) }}</span>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">计税方式</label>
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    class="flex items-center justify-center h-11 rounded-xl border-2 transition-colors text-sm"
                    :class="form.tax_type === 'exclusive'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:border-muted-foreground/30'"
                    @click="form.tax_type = 'exclusive'"
                  >
                    不含税
                  </button>
                  <button
                    type="button"
                    class="flex items-center justify-center h-11 rounded-xl border-2 transition-colors text-sm"
                    :class="form.tax_type === 'inclusive'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:border-muted-foreground/30'"
                    @click="form.tax_type = 'inclusive'"
                  >
                    含税
                  </button>
                </div>
              </div>

              <div v-if="form.tax_type === 'inclusive'">
                <label class="mb-2 block text-sm font-medium">税率（%）</label>
                <input
                  v-model.number="form.tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="请输入税率（如3表示3%）"
                  class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Users class="h-5 w-5 text-primary" />
              默认员工
            </h3>
            <div v-if="staffLoading" class="py-4 text-center text-sm text-muted-foreground">
              加载中...
            </div>
            <div v-else-if="staffList.length === 0" class="py-4 text-center text-sm text-muted-foreground">
              暂无员工数据
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="staff in staffList"
                :key="staff.id"
                class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                :class="form.staff_names.includes(staff.name)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
                @click="toggleStaff(staff.name)"
              >
                <Check v-if="form.staff_names.includes(staff.name)" class="h-3.5 w-3.5" />
                {{ staff.name }}
              </button>
            </div>
            <p v-if="form.staff_names.length > 0" class="mt-2 text-xs text-muted-foreground">
              已选择 {{ form.staff_names.length }} 人
            </p>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Eye class="h-5 w-5 text-primary" />
              公开设置
            </h3>
            <div class="flex items-center justify-between rounded-xl border border-input bg-background p-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <component :is="form.is_public ? Eye : EyeOff" class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p class="font-medium">是否公开</p>
                  <p class="text-xs text-muted-foreground">
                    {{ form.is_public ? '所有人可见此模板' : '仅创建者可见此模板' }}
                  </p>
                </div>
              </div>
              <button
                class="relative h-6 w-11 rounded-full transition-colors"
                :class="form.is_public ? 'bg-primary' : 'bg-muted'"
                @click="form.is_public = !form.is_public"
              >
                <span
                  class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  :class="form.is_public ? 'translate-x-5' : 'translate-x-0.5'"
                />
              </button>
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
            {{ isEdit ? '保存修改' : '创建模板' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
