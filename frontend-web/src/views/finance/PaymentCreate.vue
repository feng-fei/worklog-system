<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { financeApi, customersApi, recordsApi, staffsApi, projectsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Card from '@/components/ui/Card.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import { useResponsive } from '@/composables/useResponsive'
import {
  ChevronLeft,
  Save,
  User,
  DollarSign,
  FileText,
  Calendar,
  Users,
  Link2,
  Building2,
  Receipt,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { isDesktop } = useResponsive()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)

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
  customer_id: undefined as number | undefined,
  customer_name: '',
  record_id: undefined as number | undefined,
  project_id: undefined as number | undefined,
  project_name: '',
  amount: undefined as number | undefined,
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: '现金',
  received_by_id: undefined as number | undefined,
  received_by: '',
  is_invoiced: 'uninvoiced' as string,
  remark: '',
})

const customers = ref<any[]>([])
const records = ref<any[]>([])
const staffs = ref<any[]>([])
const projects = ref<any[]>([])

const paymentMethods = [
  { value: '现金', label: '现金' },
  { value: '微信', label: '微信' },
  { value: '支付宝', label: '支付宝' },
  { value: '银行转账', label: '银行转账' },
  { value: '其他', label: '其他' },
]

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  customer_name: [validators.required('请选择客户')],
  amount: [validators.required('请输入金额')],
})

const loadCustomers = async () => {
  try {
    const res = await customersApi.list({ page_size: 100 })
    const list = res.data.records || res.data.list || res.data.customers || res.data.items || []
    customers.value = list.map((c: any) => ({
      value: c.id,
      label: c.name || c.customer_name,
      ...c,
    }))
  } catch (e) {
    console.error('加载客户列表失败', e)
  }
}

const loadRecords = async () => {
  try {
    const res = await recordsApi.list({ page_size: 50 })
    const list = res.data.records || res.data.list || res.data.items || []
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

const loadStaffs = async () => {
  try {
    const res = await staffsApi.list({ page_size: 100 })
    const list = res.data.records || res.data.list || res.data.staffs || res.data.items || []
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

const loadProjects = async () => {
  try {
    const res = await projectsApi.list({ page_size: 50 })
    const list = res.data.list || res.data.items || res.data.records || []
    projects.value = list.map((p: any) => ({
      value: p.id,
      label: p.name || p.project_name,
      ...p,
    }))
  } catch (e) {
    console.error('加载项目列表失败', e)
  }
}

const loadPaymentDetail = async (id: number) => {
  try {
    const res = await financeApi.getPayment(id)
    const data = res.data
    form.customer_name = data.customer_name || ''
    form.record_id = data.record_id
    form.project_id = data.project_id
    form.project_name = data.project_name || ''
    form.amount = data.amount
    form.payment_date = data.payment_date || data.created_at?.split('T')[0] || form.payment_date
    
    const pmMap: Record<string, string> = {
      'cash': '现金', 'wechat': '微信', 'alipay': '支付宝', 'bank': '银行转账', 'other': '其他'
    }
    form.payment_method = pmMap[data.payment_method] || data.payment_method || '现金'
    
    form.received_by = data.received_by || ''
    form.is_invoiced = normalizeInvoiceStatus(data.is_invoiced)
    form.remark = data.remark || ''
    
    if (data.customer_name) {
      const cust = customers.value.find(c => c.name === data.customer_name || c.customer_name === data.customer_name)
      if (cust) form.customer_id = cust.id
    }
    if (data.received_by) {
      const staff = staffs.value.find(s => s.name === data.received_by || s.staff_name === data.received_by)
      if (staff) form.received_by_id = staff.id
    }
  } catch (e) {
    console.error('加载收款详情失败', e)
  }
}

const onCustomerChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.customer_id = option.id || option.value
    form.customer_name = option.name || option.customer_name || option.label
  } else {
    form.customer_id = undefined
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
    if (option.project_id && !form.project_id) {
      form.project_id = option.project_id
      const proj = projects.value.find(p => p.id === option.project_id)
      if (proj) form.project_name = proj.name || proj.project_name
    }
  } else {
    form.record_id = undefined
  }
}

const onStaffChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.received_by_id = option.id || option.value
    form.received_by = option.name || option.staff_name || option.label
  } else {
    form.received_by_id = undefined
    form.received_by = ''
  }
}

const onProjectChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.project_id = option.id || option.value
    form.project_name = option.name || option.project_name || option.label
  } else {
    form.project_id = undefined
    form.project_name = ''
  }
}

const handleSubmit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const pmMap: Record<string, string> = {
      '现金': 'cash', '微信': 'wechat', '支付宝': 'alipay', '银行转账': 'bank', '其他': 'other'
    }
    const data = {
      customer_id: form.customer_id,
      customer_name: form.customer_name,
      record_id: form.record_id || undefined,
      project_id: form.project_id || undefined,
      project_name: form.project_name,
      amount: form.amount,
      payment_date: form.payment_date,
      payment_method: pmMap[form.payment_method] || form.payment_method,
      received_by: form.received_by,
      is_invoiced: form.is_invoiced,
      remark: form.remark,
    }
    if (isEdit.value) {
      await financeApi.updatePayment(Number(route.params.id), data)
    } else {
      await financeApi.createPayment(data)
    }
    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('amount', msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  Promise.all([loadCustomers(), loadRecords(), loadStaffs(), loadProjects()]).then(() => {
    if (isEdit.value && route.params.id) {
      loadPaymentDetail(Number(route.params.id))
    }
  })
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <template v-if="!isDesktop">
      <MobileHeader
        :title="isEdit ? '编辑收款' : '新建收款'"
        show-back
        @back="router.back()"
      >
        <template #right>
          <button
            class="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            :disabled="submitting"
            @click="handleSubmit"
          >
            保存
          </button>
        </template>
      </MobileHeader>

      <div class="flex-1 space-y-4 p-4 pb-28">
        <Card class="p-4 space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">
              <User class="inline h-4 w-4 mr-1 text-muted-foreground" />
              客户名称 <span class="text-destructive">*</span>
            </label>
            <Select
              v-model="form.customer_id"
              :options="customers"
              placeholder="请选择客户"
              title="选择客户"
              search-placeholder="搜索客户名称..."
              clearable
              @change="onCustomerChange"
            />
            <p v-if="errors.customer_name" class="mt-1 text-xs text-destructive">{{ errors.customer_name }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium">
              <FileText class="inline h-4 w-4 mr-1 text-muted-foreground" />
              关联工单
            </label>
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
            <label class="mb-1.5 block text-sm font-medium">
              <Link2 class="inline h-4 w-4 mr-1 text-muted-foreground" />
              关联项目
            </label>
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

          <div>
            <label class="mb-1.5 block text-sm font-medium">
              <DollarSign class="inline h-4 w-4 mr-1 text-muted-foreground" />
              收款金额 <span class="text-destructive">*</span>
            </label>
            <Input
              v-model.number="form.amount"
              type="number"
              placeholder="请输入金额"
              @blur="validateField('amount')"
            />
            <p v-if="errors.amount" class="mt-1 text-xs text-destructive">{{ errors.amount }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium">
                <Calendar class="inline h-4 w-4 mr-1 text-muted-foreground" />
                收款日期
              </label>
              <Input
                v-model="form.payment_date"
                type="date"
                placeholder="选择日期"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium">收款方式</label>
              <Select
                v-model="form.payment_method"
                :options="paymentMethods"
                placeholder="选择收款方式"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium">
              <Users class="inline h-4 w-4 mr-1 text-muted-foreground" />
              收款人
            </label>
            <Select
              v-model="form.received_by_id"
              :options="staffs"
              placeholder="选择收款人"
              title="选择收款人"
              search-placeholder="搜索人员..."
              clearable
              @change="onStaffChange"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium flex items-center gap-1">
              <Receipt class="h-4 w-4 text-muted-foreground" />
              发票状态
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in invoiceStatusOptions"
                :key="option.value"
                type="button"
                class="flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all"
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
            <label class="mb-1.5 block text-sm font-medium">
              <FileText class="inline h-4 w-4 mr-1 text-muted-foreground" />
              备注
            </label>
            <Textarea
              v-model="form.remark"
              placeholder="请输入备注信息..."
              :rows="3"
            />
          </div>
        </Card>
      </div>

      <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 safe-bottom">
        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" @click="router.back()">
            <ChevronLeft class="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button class="flex-1" :disabled="submitting" @click="handleSubmit">
            <Save class="h-4 w-4 mr-2" />
            {{ isEdit ? '保存修改' : '创建收款' }}
          </Button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mx-auto w-full max-w-3xl p-6">
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button variant="outline" size="sm" @click="router.back()">
              <ChevronLeft class="h-4 w-4 mr-2" />
              返回
            </Button>
            <h1 class="text-2xl font-bold">{{ isEdit ? '编辑收款' : '新建收款' }}</h1>
          </div>
          <Button :disabled="submitting" @click="handleSubmit">
            <Save class="h-4 w-4 mr-2" />
            {{ isEdit ? '保存修改' : '创建收款' }}
          </Button>
        </div>

        <Card class="p-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2">
              <label class="mb-1.5 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
              <Select
                v-model="form.customer_id"
                :options="customers"
                placeholder="请选择客户"
                title="选择客户"
                search-placeholder="搜索客户名称..."
                clearable
                @change="onCustomerChange"
              />
              <p v-if="errors.customer_name" class="mt-1 text-xs text-destructive">{{ errors.customer_name }}</p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium">关联工单</label>
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
              <label class="mb-1.5 block text-sm font-medium">关联项目</label>
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

            <div>
              <label class="mb-1.5 block text-sm font-medium">收款金额 <span class="text-destructive">*</span></label>
              <Input
                v-model.number="form.amount"
                type="number"
                placeholder="请输入金额"
                @blur="validateField('amount')"
              />
              <p v-if="errors.amount" class="mt-1 text-xs text-destructive">{{ errors.amount }}</p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium">收款日期</label>
              <Input
                v-model="form.payment_date"
                type="date"
                placeholder="选择日期"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium">收款方式</label>
              <Select
                v-model="form.payment_method"
                :options="paymentMethods"
                placeholder="选择收款方式"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium">收款人</label>
              <Select
                v-model="form.received_by_id"
                :options="staffs"
                placeholder="选择收款人"
                title="选择收款人"
                search-placeholder="搜索人员..."
                clearable
                @change="onStaffChange"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium flex items-center gap-1">
                <Receipt class="h-4 w-4 text-muted-foreground" />
                发票状态
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="option in invoiceStatusOptions"
                  :key="option.value"
                  type="button"
                  class="flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all"
                  :class="form.is_invoiced === option.value
                    ? `${option.color} border-transparent shadow-sm`
                    : 'border-input bg-background hover:bg-accent'"
                  @click="form.is_invoiced = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <div class="col-span-2">
              <label class="mb-1.5 block text-sm font-medium">备注</label>
              <Textarea
                v-model="form.remark"
                placeholder="请输入备注信息..."
                :rows="3"
              />
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
