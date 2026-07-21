<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsApi, customersApi, staffsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  FileText,
  Building2,
  User,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const projectId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  name: '',
  customer_id: null as number | null,
  customer_name: '',
  manager_id: null as number | null,
  manager_name: '',
  start_date: '',
  end_date: '',
  status: 'planning',
  description: '',
})

const customers = ref<any[]>([])
const staffs = ref<any[]>([])

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  name: [validators.required('请输入项目名称')],
})

const loadProject = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await projectsApi.get(projectId.value)
    const data = res.data
    form.name = data.name || data.project_name || ''
    form.customer_id = data.customer_id || null
    form.customer_name = data.customer_name || ''
    form.manager_id = data.manager_id || data.staff_id || null
    form.manager_name = data.manager_name || data.staff_name || ''
    form.start_date = data.start_date || ''
    form.end_date = data.end_date || ''
    form.status = data.status || 'planning'
    form.description = data.description || data.remark || ''
  } catch (e) {
    console.error('加载项目信息失败', e)
  } finally {
    loading.value = false
  }
}

const loadCustomers = async () => {
  try {
    const res = await customersApi.list({ page_size: 50 })
    const list = res.data.records || res.data.list || res.data.customers || res.data.items || []
    customers.value = list.map((c: any) => ({
      value: c.id,
      label: c.name || c.customer_name,
      description: c.address || '',
      ...c,
    }))
  } catch (e) {
    console.error('加载客户列表失败', e)
  }
}

const loadStaffs = async () => {
  try {
    const res = await staffsApi.list({ page_size: 50 })
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

const onCustomerChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.customer_id = option.id || option.value
    form.customer_name = option.name || option.customer_name || option.label
  } else {
    form.customer_id = null
    form.customer_name = ''
  }
}

const onManagerChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.manager_id = option.id || option.value
    form.manager_name = option.name || option.staff_name || option.label
  } else {
    form.manager_id = null
    form.manager_name = ''
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await projectsApi.update(projectId.value, form)
    } else {
      await projectsApi.create(form)
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
  loadProject()
  loadCustomers()
  loadStaffs()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑项目' : '新建项目'"
      show-back
    >
      <template #right>
        <button
          class="text-sm font-medium text-primary"
          @click="handleSubmit"
        >
          保存
        </button>
      </template>
    </MobileHeader>

    <div v-if="loading && isEdit" class="flex-1 flex items-center justify-center">
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
                <label class="mb-2 block text-sm font-medium">项目名称 <span class="text-destructive">*</span></label>
                <div class="relative">
                  <FileText class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入项目名称"
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
                <label class="mb-2 block text-sm font-medium">客户</label>
                <Select
                  v-model="form.customer_id"
                  :options="customers"
                  placeholder="选择客户"
                  title="选择客户"
                  search-placeholder="搜索客户名称..."
                  clearable
                  @change="onCustomerChange"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">项目负责人</label>
                <Select
                  v-model="form.manager_id"
                  :options="staffs"
                  placeholder="选择项目负责人"
                  title="选择负责人"
                  search-placeholder="搜索人员..."
                  clearable
                  @change="onManagerChange"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">开始日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.start_date"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">预计结束日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.end_date"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Building2 class="h-5 w-5 text-primary" />
              项目状态
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="status in [
                  { value: 'planning', label: '规划中' },
                  { value: 'in_progress', label: '进行中' },
                  { value: 'paused', label: '已暂停' },
                  { value: 'completed', label: '已完成' },
                  { value: 'cancelled', label: '已取消' },
                ]"
                :key="status.value"
                class="h-12 rounded-xl border text-sm font-medium transition-all"
                :class="form.status === status.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground'"
                @click="form.status = status.value"
              >
                {{ status.label }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              项目描述
            </h3>
            <textarea
              v-model="form.description"
              rows="5"
              placeholder="请输入项目描述、目标、范围等信息..."
              class="min-h-[120px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
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
            {{ isEdit ? '保存修改' : '创建项目' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
