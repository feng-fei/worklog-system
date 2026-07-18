<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  Calendar,
  Clock,
  Users,
  Settings,
  FileText,
  Check,
  AlertCircle,
  Tag,
  Layers,
  AlertTriangle,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const planId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  plan_name: '',
  plan_type: 'periodic',
  customer_name: '',
  equipment_id: undefined as number | undefined,
  system_type: '',
  cycle_type: 'month',
  cycle_value: 1,
  start_date: '',
  next_date: '',
  end_date: '',
  staff_name: '',
  work_content: '',
  priority: 'normal',
  status: 'active',
  remark: '',
})

const planTypeOptions = [
  { value: 'periodic', label: '定期' },
  { value: 'once', label: '一次性' },
]

const cycleTypeOptions = [
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
]

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
]

const statusOptions = [
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完成' },
]

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  plan_name: [validators.required('请输入计划名称')],
  plan_type: [validators.required('请选择计划类型')],
  customer_name: [validators.required('请输入客户名称')],
  cycle_type: [validators.required('请选择周期类型')],
  cycle_value: [validators.required('请输入周期值')],
  start_date: [validators.required('请选择开始日期')],
  status: [validators.required('请选择状态')],
})

const loadPlan = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await customersApi.getMaintenancePlan(planId.value)
    const data = res.data
    form.plan_name = data.plan_name || ''
    form.plan_type = data.plan_type || 'periodic'
    form.customer_name = data.customer_name || ''
    form.equipment_id = data.equipment_id
    form.system_type = data.system_type || ''
    form.cycle_type = data.cycle_type || 'month'
    form.cycle_value = data.cycle_value || 1
    form.start_date = data.start_date || ''
    form.next_date = data.next_date || ''
    form.end_date = data.end_date || ''
    form.staff_name = data.staff_name || ''
    form.work_content = data.work_content || ''
    form.priority = data.priority || 'normal'
    form.status = data.status || 'active'
    form.remark = data.remark || ''
  } catch (e) {
    console.error('加载维保计划失败', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const data: Record<string, any> = {
      plan_name: form.plan_name,
      plan_type: form.plan_type,
      customer_name: form.customer_name,
      equipment_id: form.equipment_id,
      system_type: form.system_type,
      cycle_type: form.plan_type === 'periodic' ? form.cycle_type : undefined,
      cycle_value: form.plan_type === 'periodic' ? form.cycle_value : undefined,
      start_date: form.start_date,
      next_date: form.next_date || undefined,
      end_date: form.end_date || undefined,
      staff_name: form.staff_name,
      work_content: form.work_content,
      priority: form.priority,
      status: form.status,
      remark: form.remark,
    }

    if (isEdit.value) {
      await customersApi.updateMaintenancePlan(planId.value, data)
    } else {
      await customersApi.createMaintenancePlan(data)
    }

    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('plan_name', msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPlan()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑维保计划' : '新建维保计划'"
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
                  计划名称 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.plan_name"
                    type="text"
                    placeholder="请输入计划名称"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.plan_name }"
                    @blur="validateField('plan_name')"
                  />
                </div>
                <p v-if="errors.plan_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.plan_name }}
                </p>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">
                  计划类型 <span class="text-destructive">*</span>
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="opt in planTypeOptions"
                    :key="opt.value"
                    type="button"
                    class="flex h-12 items-center justify-center rounded-xl border text-sm font-medium transition-colors"
                    :class="form.plan_type === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:bg-accent'"
                    @click="form.plan_type = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">
                  客户名称 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Users class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.customer_name"
                    type="text"
                    placeholder="请输入客户名称"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.customer_name }"
                    @blur="validateField('customer_name')"
                  />
                </div>
                <p v-if="errors.customer_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.customer_name }}
                </p>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">系统类型</label>
                <div class="relative">
                  <Settings class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.system_type"
                    type="text"
                    placeholder="请输入系统类型"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">负责人</label>
                <div class="relative">
                  <Users class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.staff_name"
                    type="text"
                    placeholder="请输入负责人姓名"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="form.plan_type === 'periodic'">
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Clock class="h-5 w-5 text-primary" />
              周期设置
            </h3>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    周期类型 <span class="text-destructive">*</span>
                  </label>
                  <div class="relative">
                    <Layers class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <select
                      v-model="form.cycle_type"
                      class="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-12 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option v-for="opt in cycleTypeOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    周期值 <span class="text-destructive">*</span>
                  </label>
                  <div class="relative">
                    <Clock class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model.number="form.cycle_value"
                      type="number"
                      min="1"
                      placeholder="1"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.cycle_value }"
                      @blur="validateField('cycle_value')"
                    />
                  </div>
                  <p v-if="errors.cycle_value" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.cycle_value }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Calendar class="h-5 w-5 text-primary" />
              日期设置
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">
                  开始日期 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.start_date"
                    type="date"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.start_date }"
                    @blur="validateField('start_date')"
                  />
                </div>
                <p v-if="errors.start_date" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.start_date }}
                </p>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">下次执行日期</label>
                <div class="relative">
                  <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.next_date"
                    type="date"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">结束日期</label>
                <div class="relative">
                  <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.end_date"
                    type="date"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <AlertTriangle class="h-5 w-5 text-primary" />
              优先级与状态
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">优先级</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in priorityOptions"
                    :key="opt.value"
                    type="button"
                    class="flex h-12 items-center justify-center rounded-xl border text-sm font-medium transition-colors"
                    :class="form.priority === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:bg-accent'"
                    @click="form.priority = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">
                  状态 <span class="text-destructive">*</span>
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    type="button"
                    class="flex h-12 items-center justify-center rounded-xl border text-sm font-medium transition-colors"
                    :class="form.status === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:bg-accent'"
                    @click="form.status = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              工作内容
            </h3>
            <div>
              <label class="mb-2 block text-sm font-medium">工作内容</label>
              <textarea
                v-model="form.work_content"
                rows="4"
                placeholder="请输入工作内容"
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
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
                rows="3"
                placeholder="请输入备注信息（选填）"
                class="min-h-[80px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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
            {{ isEdit ? '保存修改' : '创建计划' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
