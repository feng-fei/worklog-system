<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { financeApi, recordsApi, projectsApi, staffsApi, customersApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  ChevronLeft,
  DollarSign,
  Tags,
  Calendar,
  User,
  FileText,
  Link2,
  Check,
  AlertCircle,
  Building2,
  Receipt,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const categories = ref<any[]>([])
const records = ref<any[]>([])
const projects = ref<any[]>([])
const staffs = ref<any[]>([])
const customers = ref<any[]>([])

const invoiceStatusOptions = [
  { value: 'uninvoiced', label: '未开票', color: 'bg-warning text-warning-foreground' },
  { value: 'invoiced', label: '已开票', color: 'bg-success text-success-foreground' },
  { value: 'no_invoice', label: '无需发票', color: 'bg-secondary text-secondary-foreground' },
]

const normalizeInvoiceStatus = (val: any): string => {
  if (val === true || val === 'invoiced') return 'invoiced'
  if (val === false || val === 'uninvoiced' || val === null || val === undefined) return 'uninvoiced'
  if (val === 'no_invoice') return 'no_invoice'
  return 'uninvoiced'
}

const form = reactive({
  amount: undefined as number | undefined,
  category_id: undefined as number | undefined,
  expense_date: new Date().toISOString().split('T')[0],
  handler_id: undefined as number | undefined,
  handler: '',
  customer_id: undefined as number | undefined,
  customer_name: '',
  record_id: undefined as number | undefined,
  project_id: undefined as number | undefined,
  project_name: '',
  is_invoiced: 'uninvoiced' as string,
  remark: '',
})

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  amount: [validators.required('请输入支出金额')],
  category_id: [validators.required('请选择支出分类')],
})

const loadCategories = async () => {
  try {
    const res = await financeApi.expenseCategories({ page_size: 50 })
    const data = res.data
    const list = data.list || data.categories || data.items || data.records || []
    categories.value = list.map((c: any) => ({
      value: c.id,
      label: c.name || c.category_name,
      ...c,
    }))
  } catch (e) {
    console.error('加载支出分类失败', e)
  }
}

const loadRecords = async () => {
  try {
    const res = await recordsApi.list({ page_size: 50 })
    const data = res.data
    const list = data.records || data.list || data.items || []
    records.value = list.map((r: any) => ({
      value: r.id,
      label: r.order_no || '#' + r.id,
      description: r.customer_name || '',
      ...r,
    }))
  } catch (e) {
    console.error('加载工单列表失败', e)
  }
}

const loadProjects = async () => {
  try {
    const res = await projectsApi.list({ page_size: 50 })
    const data = res.data
    const list = data.list || data.items || data.records || []
    projects.value = list.map((p: any) => ({
      value: p.id,
      label: p.name || p.project_name,
      ...p,
    }))
  } catch (e) {
    console.error('加载项目列表失败', e)
  }
}

const loadStaffs = async () => {
  try {
    const res = await staffsApi.list({ page_size: 100 })
    const data = res.data
    const list = data.records || data.list || data.staffs || data.items || []
    staffs.value = list.map((s: any) => ({
      value: s.id,
      label: s.name || s.staff_name,
      description: s.role || s.position || '',
      ...s,
    }))
  } catch (e) {
    console.error('加载人员列表失败', e)
  }
}

const loadCustomers = async () => {
  try {
    const res = await customersApi.list({ page_size: 100 })
    const data = res.data
    const list = data.records || data.list || data.customers || data.items || []
    customers.value = list.map((c: any) => ({
      value: c.id,
      label: c.name || c.customer_name,
      ...c,
    }))
  } catch (e) {
    console.error('加载客户列表失败', e)
  }
}

const loadExpenseDetail = async (id: number) => {
  try {
    const res = await financeApi.getExpense(id)
    const data = res.data
    form.amount = data.amount
    form.category_id = data.category_id
    form.expense_date = data.expense_date || data.created_at?.split('T')[0] || form.expense_date
    form.handler = data.handler || data.staff_name || ''
    form.customer_name = data.customer_name || ''
    form.record_id = data.record_id
    form.project_id = data.project_id
    form.project_name = data.project_name || ''
    form.is_invoiced = normalizeInvoiceStatus(data.is_invoiced)
    form.remark = data.remark || data.note || ''
    
    if (data.handler || data.staff_name) {
      const staff = staffs.value.find(s => s.name === data.handler || s.name === data.staff_name)
      if (staff) {
        form.handler_id = staff.id
      }
    }
    if (data.customer_name) {
      const cust = customers.value.find(c => c.name === data.customer_name || c.customer_name === data.customer_name)
      if (cust) {
        form.customer_id = cust.id
      }
    }
    if (data.project_id) {
      form.project_id = data.project_id
    }
  } catch (e) {
    console.error('加载支出详情失败', e)
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const submitData = {
      amount: form.amount,
      category_id: form.category_id,
      expense_date: form.expense_date,
      handler: form.handler,
      customer_id: form.customer_id,
      customer_name: form.customer_name,
      record_id: form.record_id || undefined,
      project_id: form.project_id || undefined,
      project_name: form.project_name,
      is_invoiced: form.is_invoiced,
      remark: form.remark,
    }

    if (isEdit.value) {
      await financeApi.updateExpense(Number(route.params.id), submitData)
    } else {
      await financeApi.createExpense(submitData)
    }
    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('remark', msg)
  } finally {
    submitting.value = false
  }
}

const onCategoryChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.category_id = option.id || option.value
  } else {
    form.category_id = undefined as any
  }
}

const onStaffChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.handler_id = option.id || option.value
    form.handler = option.name || option.staff_name || option.label
  } else {
    form.handler_id = undefined as any
    form.handler = ''
  }
}

const onCustomerChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.customer_id = option.id || option.value
    form.customer_name = option.name || option.customer_name || option.label
  } else {
    form.customer_id = undefined as any
    form.customer_name = ''
  }
}

const onRecordChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.record_id = option.id || option.value
    if (option.customer_name && !form.customer_name) {
      form.customer_name = option.customer_name
      const cust = customers.value.find(c => c.name === option.customer_name)
      if (cust) form.customer_id = cust.id
    }
  } else {
    form.record_id = undefined as any
  }
}

const onProjectChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.project_id = option.id || option.value
    form.project_name = option.name || option.project_name || option.label
  } else {
    form.project_id = undefined as any
    form.project_name = ''
  }
}

onMounted(() => {
  loadCategories()
  loadRecords()
  loadProjects()
  loadStaffs()
  loadCustomers()
  if (isEdit.value && route.params.id) {
    setTimeout(() => {
      loadExpenseDetail(Number(route.params.id))
    }, 300)
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader :title="isEdit ? '编辑支出' : '新建支出'" show-back>
      <template #right>
        <button
          class="text-sm font-medium text-primary"
          @click="handleSubmit"
        >
          保存
        </button>
      </template>
    </MobileHeader>

    <div class="flex-1 overflow-y-auto pb-32">
      <div class="space-y-5 px-4 py-5">
        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <DollarSign class="h-5 w-5 text-primary" />
            支出信息
          </h3>
          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium">支出金额 <span class="text-destructive">*</span></label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">¥</span>
                <input
                  v-model.number="form.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  :class="{ 'border-destructive': errors.amount }"
                  @blur="validateField('amount')"
                />
              </div>
              <p v-if="errors.amount" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3.5 w-3.5" />
                {{ errors.amount }}
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">支出分类 <span class="text-destructive">*</span></label>
              <Select
                v-model="form.category_id"
                :options="categories"
                placeholder="选择支出分类"
                title="选择支出分类"
                search-placeholder="搜索分类..."
                @change="onCategoryChange"
              />
              <p v-if="errors.category_id" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3.5 w-3.5" />
                {{ errors.category_id }}
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">支出日期</label>
              <div class="relative">
                <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                <input
                  v-model="form.expense_date"
                  type="date"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">
                <User class="inline h-4 w-4 mr-1" />
                经办人
              </label>
              <Select
                v-model="form.handler_id"
                :options="staffs"
                placeholder="选择经办人"
                title="选择经办人"
                search-placeholder="搜索人员..."
                clearable
                @change="onStaffChange"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <Link2 class="h-5 w-5 text-primary" />
            关联信息
          </h3>
          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium">
                <Building2 class="inline h-4 w-4 mr-1" />
                关联客户
              </label>
              <Select
                v-model="form.customer_id"
                :options="customers"
                placeholder="选择关联客户（可选）"
                title="选择客户"
                search-placeholder="搜索客户名称..."
                clearable
                @change="onCustomerChange"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">关联工单</label>
              <Select
                v-model="form.record_id"
                :options="records"
                placeholder="选择关联工单（可选）"
                title="选择关联工单"
                search-placeholder="搜索工单编号..."
                clearable
                @change="onRecordChange"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">关联项目</label>
              <Select
                v-model="form.project_id"
                :options="projects"
                placeholder="选择关联项目（可选）"
                title="选择关联项目"
                search-placeholder="搜索项目名称..."
                clearable
                @change="onProjectChange"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <Receipt class="h-5 w-5 text-primary" />
            发票状态
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in invoiceStatusOptions"
              :key="option.value"
              type="button"
              class="flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-all"
              :class="form.is_invoiced === option.value
                ? `${option.color} border-transparent shadow-sm`
                : 'border-input bg-background hover:bg-accent'"
              @click="form.is_invoiced = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <FileText class="h-5 w-5 text-primary" />
            备注
          </h3>
          <textarea
            v-model="form.remark"
            rows="4"
            placeholder="请输入备注信息..."
            class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            :class="{ 'border-destructive': errors.remark }"
          />
          <p v-if="errors.remark" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle class="h-3.5 w-3.5" />
            {{ errors.remark }}
          </p>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 pb-safe">
      <div class="mx-auto flex max-w-lg gap-3">
        <Button
          variant="outline"
          size="xl"
          class="flex-1"
          @click="router.back()"
        >
          <ChevronLeft class="h-5 w-5" />
          取消
        </Button>
        <Button
          size="xl"
          class="flex-1"
          :loading="submitting"
          @click="handleSubmit"
        >
          <Check class="h-5 w-5" />
          {{ isEdit ? '保存修改' : '确认提交' }}
        </Button>
      </div>
    </div>
  </div>
</template>
