<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { financeApi, staffsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  ChevronLeft,
  User,
  Calendar,
  DollarSign,
  Wallet,
  Clock,
  FileText,
  Check,
  AlertCircle,
  Hash,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const staffs = ref<any[]>([])

const statusOptions = [
  { value: 'pending', label: '未结算' },
  { value: 'settled', label: '已结算' },
]

const form = reactive({
  staff_id: undefined as number | undefined,
  staff_name: '',
  month: new Date().toISOString().slice(0, 7),
  gross_salary: undefined as number | undefined,
  deduction: undefined as number | undefined,
  net_salary: undefined as number | undefined,
  hours: undefined as number | undefined,
  record_count: undefined as number | undefined,
  status: 'pending',
  remark: '',
})

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  staff_id: [validators.required('请选择员工')],
  gross_salary: [validators.required('请输入应发工资')],
  month: [validators.required('请选择工资月份')],
})

const computedNetSalary = computed(() => {
  const gross = Number(form.gross_salary) || 0
  const deduction = Number(form.deduction) || 0
  return (gross - deduction).toFixed(2)
})

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

const loadSalaryDetail = async (id: number) => {
  try {
    const res = await financeApi.getSalary(id)
    const data = res.data
    form.staff_id = data.staff_id
    form.staff_name = data.staff_name || data.name || ''
    form.month = data.month || (data.work_date ? data.work_date.slice(0, 7) : form.month)
    form.gross_salary = data.gross_salary || data.payable_amount
    form.deduction = data.deduction || 0
    form.net_salary = data.net_salary || (Number(data.gross_salary || data.payable_amount) - Number(data.deduction || 0))
    form.hours = data.hours || (data.work_units ? data.work_units * 8 : undefined)
    form.record_count = data.record_count || 1
    form.status = data.status || 'pending'
    form.remark = data.remark || data.note || ''
    
    if (data.staff_name && !form.staff_id) {
      const staff = staffs.value.find(s => s.name === data.staff_name || s.staff_name === data.staff_name)
      if (staff) {
        form.staff_id = staff.id
      }
    }
  } catch (e) {
    console.error('加载工资详情失败', e)
  }
}

const onStaffChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.staff_id = option.id || option.value
    form.staff_name = option.name || option.staff_name || option.label
  } else {
    form.staff_id = undefined as any
    form.staff_name = ''
  }
}

const onStatusChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.status = option.value || option.label
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const submitData = {
      staff_id: form.staff_id,
      staff_name: form.staff_name,
      month: form.month,
      gross_salary: form.gross_salary,
      deduction: form.deduction || 0,
      net_salary: Number(computedNetSalary.value),
      hours: form.hours || undefined,
      record_count: form.record_count || undefined,
      status: form.status,
      remark: form.remark,
    }

    if (isEdit.value) {
      await financeApi.updateSalary(Number(route.params.id), submitData)
    } else {
      await financeApi.createSalary(submitData)
    }
    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('remark', msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadStaffs().then(() => {
    if (isEdit.value && route.params.id) {
      setTimeout(() => {
        loadSalaryDetail(Number(route.params.id))
      }, 200)
    }
  })
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader :title="isEdit ? '编辑工资' : '新建工资'" show-back>
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
            <User class="h-5 w-5 text-primary" />
            基本信息
          </h3>
          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium">员工姓名 <span class="text-destructive">*</span></label>
              <Select
                v-model="form.staff_id"
                :options="staffs"
                placeholder="选择员工"
                title="选择员工"
                search-placeholder="搜索员工..."
                @change="onStaffChange"
              />
              <p v-if="errors.staff_id" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3.5 w-3.5" />
                {{ errors.staff_id }}
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">工资月份 <span class="text-destructive">*</span></label>
              <div class="relative">
                <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                <input
                  v-model="form.month"
                  type="month"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  :class="{ 'border-destructive': errors.month }"
                  @blur="validateField('month')"
                />
              </div>
              <p v-if="errors.month" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3.5 w-3.5" />
                {{ errors.month }}
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">状态</label>
              <Select
                v-model="form.status"
                :options="statusOptions"
                placeholder="选择状态"
                title="选择状态"
                @change="onStatusChange"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <DollarSign class="h-5 w-5 text-primary" />
            工资明细
          </h3>
          <div class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium">应发工资 <span class="text-destructive">*</span></label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">¥</span>
                <input
                  v-model.number="form.gross_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  :class="{ 'border-destructive': errors.gross_salary }"
                  @blur="validateField('gross_salary')"
                />
              </div>
              <p v-if="errors.gross_salary" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle class="h-3.5 w-3.5" />
                {{ errors.gross_salary }}
              </p>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">扣款/社保</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">¥</span>
                <input
                  v-model.number="form.deduction"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">实发工资（自动计算）</label>
              <div class="relative">
                <Wallet class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  :value="computedNetSalary"
                  type="text"
                  readonly
                  class="h-12 w-full rounded-xl border border-input bg-muted/50 pl-12 pr-4 text-base font-semibold text-success placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="mb-4 flex items-center gap-2 font-semibold">
            <Clock class="h-5 w-5 text-primary" />
            工作量统计
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-2 block text-sm font-medium">工时（小时）</label>
              <div class="relative">
                <Clock class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  v-model.number="form.hours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium">工单数量</label>
              <div class="relative">
                <Hash class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  v-model.number="form.record_count"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
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
