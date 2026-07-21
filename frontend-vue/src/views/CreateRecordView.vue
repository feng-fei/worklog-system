<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Building2,
  Wrench,
  AlertTriangle,
  User,
  MapPin,
  Phone,
  Calendar,
  Clock,
  Users,
  FileText,
  Package,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Save,
  Send,
  Receipt,
  Truck,
  UtensilsCrossed,
  UserCog,
  MoreHorizontal,
  X,
  Briefcase,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import PhotoUpload from '@/components/PhotoUpload.vue'
import { recordsApi, customersApi, projectsApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/toast/useToast'
import type { ExpenseItem, Customer, Project } from '@/types'
import ExpenseRecorder from '@/components/ExpenseRecorder.vue'
import type { ExpenseItem as ExpenseRecorderItem } from '@/components/ExpenseRecorder.vue'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const submitting = ref(false)
const errorMsg = ref('')
const createdId = ref<number | null>(null)
const showTemplatePicker = ref(false)

const customerSearch = ref('')
const showCustomerDropdown = ref(false)
const customerOptions = ref<Customer[]>([])
const customerLoading = ref(false)
let customerSearchTimer: ReturnType<typeof setTimeout> | null = null

const projectSearch = ref('')
const showProjectDropdown = ref(false)
const projectOptions = ref<Project[]>([])
const projectLoading = ref(false)
let projectSearchTimer: ReturnType<typeof setTimeout> | null = null

const showQuickCustomerDialog = ref(false)
const quickCustomerForm = ref({
  name: '',
  contact_name: '',
  phone: '',
  address: '',
})
const quickCustomerSubmitting = ref(false)

type RecordType = 'project' | 'short' | 'repair'

const recordType = ref<RecordType>('short')

interface FormData {
  customer_name: string
  contact_person: string
  contact_phone: string
  address: string
  appointment_date: string
  staff_name: string
  project_id: string
  project_name: string
  fault_phenomenon: string
  fault_judgment: string
  work_content: string
  remark: string
  labour_fee: number
  material_fee: number
  travel_fee: number
  other_fee: number
  payment_status: 'unpaid' | 'partial' | 'paid' | 'monthly'
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

const form = ref<FormData>({
  customer_name: '',
  contact_person: '',
  contact_phone: '',
  address: '',
  appointment_date: '',
  staff_name: '',
  project_id: '',
  project_name: '',
  fault_phenomenon: '',
  fault_judgment: '',
  work_content: '',
  remark: '',
  labour_fee: 0,
  material_fee: 0,
  travel_fee: 0,
  other_fee: 0,
  payment_status: 'unpaid',
  priority: 'normal',
})

const workPhotos = ref<string[]>([])
const expenseItems = ref<ExpenseItem[]>([])

const expenseCategories = [
  { value: 'material', label: '材料采购', icon: Package },
  { value: 'equipment', label: '工具设备', icon: Wrench },
  { value: 'transport', label: '运输差旅', icon: Truck },
  { value: 'catering', label: '餐饮住宿', icon: UtensilsCrossed },
  { value: 'labor', label: '人工外包', icon: UserCog },
  { value: 'other', label: '其他', icon: MoreHorizontal },
]

const getExpenseCategoryLabel = (value: string) => {
  return expenseCategories.find(c => c.value === value)?.label || value
}

const getExpenseCategoryIcon = (value: string) => {
  return expenseCategories.find(c => c.value === value)?.icon || MoreHorizontal
}

interface RecordTemplate {
  id: string
  name: string
  record_type: RecordType
  fault_phenomenon: string
  fault_judgment: string
  work_content: string
  labour_fee: number
  material_fee: number
  travel_fee: number
  other_fee: number
  remark: string
  expense_items: ExpenseItem[]
}

const defaultTemplates: RecordTemplate[] = [
  {
    id: 'tpl-ac-repair',
    name: '空调维修',
    record_type: 'short',
    fault_phenomenon: '空调不制冷/制热效果差',
    fault_judgment: '需现场检查冷媒压力、压缩机运行状态',
    work_content: '空调故障排查与维修',
    labour_fee: 200,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '',
    expense_items: [],
  },
  {
    id: 'tpl-ac-maintain',
    name: '空调保养',
    record_type: 'short',
    fault_phenomenon: '',
    fault_judgment: '季度常规保养：清洗滤网、检查电气、测试运行',
    work_content: '空调季度保养服务',
    labour_fee: 150,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '含滤网清洗、电气检查、冷媒检测',
    expense_items: [],
  },
  {
    id: 'tpl-fire-inspect',
    name: '消防年检',
    record_type: 'project',
    fault_phenomenon: '',
    fault_judgment: '消防系统年度检测：报警、喷淋、消火栓、防排烟',
    work_content: '消防系统年度检测',
    labour_fee: 800,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '年度消防检测，出具检测报告',
    expense_items: [],
  },
]

const templates = ref<RecordTemplate[]>([...defaultTemplates])

const loadTemplates = () => {
  try {
    const saved = localStorage.getItem('record_templates_v2')
    if (saved) {
      const parsed = JSON.parse(saved)
      templates.value = [...defaultTemplates, ...parsed]
    }
  } catch {}
}

const saveTemplate = () => {
  const name = prompt('请输入模板名称')
  if (!name) return
  const newTpl: RecordTemplate = {
    id: 'tpl-custom-' + Date.now(),
    name,
    record_type: recordType.value,
    fault_phenomenon: form.value.fault_phenomenon,
    fault_judgment: form.value.fault_judgment,
    work_content: form.value.work_content,
    labour_fee: form.value.labour_fee,
    material_fee: form.value.material_fee,
    travel_fee: form.value.travel_fee,
    other_fee: form.value.other_fee,
    remark: form.value.remark,
    expense_items: JSON.parse(JSON.stringify(expenseItems.value)),
  }
  const customTpls = templates.value.filter(t => !defaultTemplates.find(d => d.id === t.id))
  customTpls.push(newTpl)
  localStorage.setItem('record_templates_v2', JSON.stringify(customTpls))
  templates.value = [...defaultTemplates, ...customTpls]
  toast('模板已保存', { type: 'success' })
}

const applyTemplate = (tpl: RecordTemplate) => {
  recordType.value = tpl.record_type
  form.value.fault_phenomenon = tpl.fault_phenomenon
  form.value.fault_judgment = tpl.fault_judgment
  form.value.work_content = tpl.work_content
  form.value.labour_fee = tpl.labour_fee
  form.value.material_fee = tpl.material_fee
  form.value.travel_fee = tpl.travel_fee
  form.value.other_fee = tpl.other_fee
  form.value.remark = tpl.remark
  expenseItems.value = JSON.parse(JSON.stringify(tpl.expense_items || []))
  showTemplatePicker.value = false
  step.value = 1
  toast(`已应用模板：${tpl.name}`, { type: 'success' })
}

const searchCustomers = (keyword: string) => {
  if (customerSearchTimer) clearTimeout(customerSearchTimer)
  customerSearchTimer = setTimeout(async () => {
    if (!keyword.trim()) {
      customerOptions.value = []
      return
    }
    customerLoading.value = true
    try {
      const res = await customersApi.list({ keyword, page: 1, per_page: 20 })
      customerOptions.value = res.records || []
    } catch (e) {
      console.error('Search customers failed:', e)
    } finally {
      customerLoading.value = false
    }
  }, 300)
}

const selectCustomer = (customer: Customer) => {
  form.value.customer_name = customer.name
  form.value.contact_person = customer.contact_name || ''
  form.value.contact_phone = customer.phone || ''
  form.value.address = customer.address || ''
  customerSearch.value = customer.name
  showCustomerDropdown.value = false
}

const searchProjects = (keyword: string) => {
  if (projectSearchTimer) clearTimeout(projectSearchTimer)
  projectSearchTimer = setTimeout(async () => {
    if (!keyword.trim()) {
      projectOptions.value = []
      return
    }
    projectLoading.value = true
    try {
      const res = await projectsApi.list({ keyword, page: 1, per_page: 20 })
      projectOptions.value = res.records || []
    } catch (e) {
      console.error('Search projects failed:', e)
    } finally {
      projectLoading.value = false
    }
  }, 300)
}

const selectProject = (project: Project) => {
  form.value.project_id = String(project.id)
  form.value.project_name = project.name
  form.value.customer_name = project.customer_name
  form.value.address = project.address || form.value.address
  form.value.contact_person = project.contact_name || form.value.contact_person
  form.value.contact_phone = project.contact_phone || form.value.contact_phone
  projectSearch.value = project.name
  showProjectDropdown.value = false
}

const hideCustomerDropdown = () => {
  window.setTimeout(() => {
    showCustomerDropdown.value = false
  }, 200)
}

const hideProjectDropdown = () => {
  window.setTimeout(() => {
    showProjectDropdown.value = false
  }, 200)
}

const openQuickCustomer = () => {
  showCustomerDropdown.value = false
  quickCustomerForm.value = {
    name: customerSearch.value || form.value.customer_name || '',
    contact_name: '',
    phone: '',
    address: '',
  }
  showQuickCustomerDialog.value = true
}

const submitQuickCustomer = async () => {
  if (!quickCustomerForm.value.name.trim()) {
    toast('请输入客户名称', { type: 'error' })
    return
  }
  quickCustomerSubmitting.value = true
  try {
    const customer = await customersApi.create({
      name: quickCustomerForm.value.name,
      short_name: quickCustomerForm.value.name,
      full_name: quickCustomerForm.value.name,
      contact_name: quickCustomerForm.value.contact_name,
      phone: quickCustomerForm.value.phone,
      address: quickCustomerForm.value.address,
    })
    form.value.customer_name = customer.name
    form.value.contact_person = customer.contact_name || ''
    form.value.contact_phone = customer.phone || ''
    form.value.address = customer.address || ''
    customerSearch.value = customer.name
    showQuickCustomerDialog.value = false
    toast('客户创建成功', { type: 'success' })
  } catch (e: any) {
    toast(e.response?.data?.error || '创建失败', { type: 'error' })
  } finally {
    quickCustomerSubmitting.value = false
  }
}

onMounted(() => {
  loadTemplates()
  if (userStore.user?.staff_name) {
    form.value.staff_name = userStore.user.staff_name
  }
})

watch(recordType, (newType) => {
  if (newType === 'repair') {
    form.value.priority = 'urgent'
  } else if (newType === 'project') {
    form.value.priority = 'high'
  } else {
    form.value.priority = 'normal'
  }
})

const typeConfig = [
  {
    key: 'project' as RecordType,
    label: '工程单',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    desc: '大型工程项目，多人员协作',
    priority: 'high' as const,
  },
  {
    key: 'short' as RecordType,
    label: '短工/维修单',
    icon: Wrench,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    desc: '日常维修保养，快速创建',
    priority: 'normal' as const,
  },
  {
    key: 'repair' as RecordType,
    label: '抢修单',
    icon: AlertTriangle,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-600 dark:text-red-400',
    desc: '紧急抢修，优先级高',
    priority: 'urgent' as const,
  },
]

const stepConfig = [
  { id: 1, title: '基本信息', icon: User, desc: '客户、地址、时间、人员' },
  { id: 2, title: '工作描述', icon: FileText, desc: '工作内容、故障、照片' },
  { id: 3, title: '费用结算', icon: Receipt, desc: '人工费、材料费、支出明细' },
]

const totalExpense = computed(() => {
  return expenseItems.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
})

const staffList = computed<string[]>(() => {
  return []
})

const convertToNewFormat = (items: ExpenseItem[]): ExpenseRecorderItem[] => {
  return items.map(item => ({
    expense_type: item.category,
    category: item.category,
    amount: item.amount,
    description: item.remark || '',
    staff_name: '',
    receipt_photos: [],
    expense_date: new Date().toISOString().split('T')[0],
  }))
}

const convertToOldFormat = (items: ExpenseRecorderItem[]): ExpenseItem[] => {
  return items.map(item => ({
    category: item.expense_type || item.category || 'other',
    amount: item.amount,
    remark: item.description || '',
  }))
}

const recorderItems = computed({
  get: () => convertToNewFormat(expenseItems.value),
  set: (items: ExpenseRecorderItem[]) => {
    expenseItems.value = convertToOldFormat(items)
  },
})

const totalFee = computed(() => {
  const f = form.value
  return (
    (Number(f.labour_fee) || 0) +
    (Number(f.material_fee) || 0) +
    (Number(f.travel_fee) || 0) +
    (Number(f.other_fee) || 0)
  )
})

const goBack = () => {
  if (step.value > 1) {
    step.value--
  } else {
    router.back()
  }
}

const nextStep = () => {
  if (step.value === 1 && !form.value.customer_name) {
    errorMsg.value = '请填写客户名称'
    return
  }
  errorMsg.value = ''
  if (step.value < 3) {
    step.value++
  }
}

const addExpenseItem = () => {
  expenseItems.value.push({
    category: 'material',
    amount: 0,
    remark: '',
  })
}

const removeExpenseItem = (index: number) => {
  expenseItems.value.splice(index, 1)
}

const mapRecordTypeToApi = (type: RecordType): 'construction' | 'maintenance' | 'repair' | 'inspection' => {
  switch (type) {
    case 'project':
      return 'construction'
    case 'short':
      return 'maintenance'
    case 'repair':
      return 'repair'
    default:
      return 'maintenance'
  }
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.value.customer_name) {
    errorMsg.value = '请填写客户名称'
    return
  }

  submitting.value = true
  try {
    const submitData = new FormData()
    submitData.append('record_type', mapRecordTypeToApi(recordType.value))
    submitData.append('customer_name', form.value.customer_name)
    if (form.value.contact_person) submitData.append('contact_name', form.value.contact_person)
    if (form.value.contact_phone) submitData.append('customer_phone', form.value.contact_phone)
    if (form.value.address) submitData.append('work_address', form.value.address)
    if (form.value.appointment_date) submitData.append('work_date', form.value.appointment_date)
    if (form.value.staff_name) submitData.append('staff_name', form.value.staff_name)
    if (form.value.project_id) submitData.append('project_id', form.value.project_id)
    if (form.value.fault_phenomenon) submitData.append('fault_description', form.value.fault_phenomenon)
    if (form.value.fault_judgment) submitData.append('fault_diagnosis', form.value.fault_judgment)
    if (form.value.work_content) submitData.append('work_content', form.value.work_content)
    if (form.value.remark) submitData.append('remark', form.value.remark)
    submitData.append('labor_fee', String(form.value.labour_fee || 0))
    submitData.append('material_fee', String(form.value.material_fee || 0))
    submitData.append('transport_fee', String(form.value.travel_fee || 0))
    submitData.append('other_fee', String(form.value.other_fee || 0))
    submitData.append('total_fee', String(totalFee.value))
    submitData.append('payment_status', form.value.payment_status)
    submitData.append('priority', form.value.priority)
    submitData.append('status', 'pending')

    if (expenseItems.value.length > 0) {
      submitData.append('expense_items', JSON.stringify(expenseItems.value))
    }

    if (workPhotos.value.length > 0) {
      submitData.append('work_photos', JSON.stringify(workPhotos.value))
    }

    const result = await recordsApi.create(submitData)
    createdId.value = result.id
    step.value = 4
  } catch (e: any) {
    errorMsg.value = e.response?.data?.error || '创建失败，请重试'
  } finally {
    submitting.value = false
  }
}

const goToDetail = () => {
  if (createdId.value) {
    router.replace(`/record/${createdId.value}`)
  } else {
    router.push('/records')
  }
}

const goToList = () => {
  router.push('/records')
}

const resetForm = () => {
  form.value = {
    customer_name: '',
    contact_person: '',
    contact_phone: '',
    address: '',
    appointment_date: '',
    staff_name: userStore.user?.staff_name || '',
    project_id: '',
    project_name: '',
    fault_phenomenon: '',
    fault_judgment: '',
    work_content: '',
    remark: '',
    labour_fee: 0,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    payment_status: 'unpaid',
    priority: 'normal',
  }
  workPhotos.value = []
  expenseItems.value = []
  createdId.value = null
  step.value = 1
  recordType.value = 'short'
}

const currentTypeConfig = computed(() => typeConfig.find(t => t.key === recordType.value))
</script>

<template>
  <div class="min-h-screen-safe bg-background tech-grid-bg text-foreground flex flex-col">
    <header class="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-2 md:h-14 md:px-6 lg:px-8">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent text-muted-foreground hover:text-foreground"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="flex-1 text-center font-semibold text-base md:text-lg -ml-9 md:-ml-0 dark:neon-text tracking-tight">
          新建工单
        </h1>
        <div class="w-9" />
      </div>

      <div class="px-4 pb-3 md:px-6 lg:px-8 md:pb-4 hidden md:block">
        <div class="flex items-center justify-between max-w-4xl mx-auto">
          <div
            v-for="(s, i) in stepConfig"
            :key="s.id"
            class="flex items-center flex-1"
          >
            <button
              :class="[
                'flex items-center gap-3 transition-all',
                step >= s.id ? 'opacity-100' : 'opacity-50'
              ]"
              :disabled="step <= s.id"
              @click="step > s.id && (step = s.id)"
            >
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0',
                  step > s.id
                    ? 'bg-primary text-primary-foreground'
                    : step === s.id
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                ]"
              >
                <CheckCircle2 v-if="step > s.id" class="w-4 h-4" />
                <component v-else :is="s.icon" class="w-4 h-4" />
              </div>
              <div class="text-left hidden lg:block">
                <div class="text-sm font-medium text-foreground">{{ s.title }}</div>
                <div class="text-xs text-muted-foreground">{{ s.desc }}</div>
              </div>
              <span class="text-sm font-medium md:hidden">{{ s.title }}</span>
            </button>
            <div
              v-if="i < stepConfig.length - 1"
              :class="[
                'flex-1 h-0.5 rounded-full mx-3',
                step > s.id ? 'bg-primary' : 'bg-muted'
              ]"
            />
          </div>
        </div>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto pb-24 md:pb-6">
      <div class="md:px-6 lg:px-8 md:py-6">
        <div class="md:max-w-6xl md:mx-auto">
          <div class="md:grid md:grid-cols-12 md:gap-8">
            <aside class="hidden md:block md:col-span-4 lg:col-span-3">
              <div class="sticky top-24 space-y-2">
                <button
                  v-for="s in stepConfig"
                  :key="s.id"
                  :class="[
                    'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                    step === s.id
                      ? 'bg-primary/10 text-primary'
                      : step > s.id
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground hover:bg-muted/50'
                  ]"
                  :disabled="step <= s.id"
                  @click="step > s.id && (step = s.id)"
                >
                  <div
                    :class="[
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                      step > s.id
                        ? 'bg-primary text-primary-foreground'
                        : step === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    ]"
                  >
                    <CheckCircle2 v-if="step > s.id" class="w-4 h-4" />
                    <span v-else>{{ s.id }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium">{{ s.title }}</div>
                    <div class="text-xs opacity-70 mt-0.5">{{ s.desc }}</div>
                  </div>
                </button>

                <div class="pt-4">
                  <Card class="border-border shadow-sm">
                    <CardContent class="p-4">
                      <div class="text-xs text-muted-foreground mb-2">当前类型</div>
                      <div class="flex items-center gap-2">
                        <div :class="['w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center', currentTypeConfig?.color]">
                          <component :is="currentTypeConfig?.icon" class="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div class="text-sm font-medium text-foreground">{{ currentTypeConfig?.label }}</div>
                          <Badge :class="currentTypeConfig?.bgColor + ' ' + currentTypeConfig?.textColor" variant="outline" class="text-xs">
                            {{ form.priority === 'urgent' ? '紧急' : form.priority === 'high' ? '高' : '普通' }}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </aside>

            <main class="md:col-span-8 lg:col-span-9">
              <div class="px-4 py-4 md:py-0 md:px-0">
                <div class="md:hidden mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    v-for="s in stepConfig"
                    :key="s.id"
                    :class="[
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                      step === s.id
                        ? 'bg-primary text-primary-foreground'
                        : step > s.id
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    ]"
                    :disabled="step <= s.id"
                    @click="step > s.id && (step = s.id)"
                  >
                    <CheckCircle2 v-if="step > s.id" class="w-3.5 h-3.5" />
                    <span v-else>{{ s.id }}</span>
                    {{ s.title }}
                  </button>
                </div>

                <div v-if="step === 1" class="space-y-5 md:space-y-6 animate-fade-in">
                  <Card class="card-tech border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2 text-foreground">
                      <Briefcase class="w-4 h-4 text-blue-400" />
                        <span>工单类型</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <button
                          v-for="t in typeConfig"
                          :key="t.key"
                          :class="[
                            'relative p-4 rounded-xl border-2 transition-all text-left group',
                            recordType === t.key
                              ? 'border-primary bg-card shadow-md'
                              : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                          ]"
                          @click="recordType = t.key"
                        >
                          <div class="flex flex-col md:flex-row md:items-start gap-3">
                            <div :class="['w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0', t.color]">
                              <component :is="t.icon" class="w-5 h-5 text-white" />
                            </div>
                            <div class="flex-1 min-w-0">
                              <h3 class="font-semibold text-foreground text-sm">{{ t.label }}</h3>
                              <p class="text-xs text-muted-foreground mt-1">{{ t.desc }}</p>
                            </div>
                          </div>
                          <div
                            v-if="recordType === t.key"
                            class="absolute top-2 right-2"
                          >
                            <CheckCircle2 class="w-5 h-5 text-primary" />
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="card-tech border-border">
                    <CardHeader class="pb-3">
                      <div class="flex items-center justify-between">
                        <CardTitle class="text-base font-semibold flex items-center gap-2 text-foreground">
                          <User class="w-4 h-4 text-blue-400" />
                          <span>客户信息</span>
                        </CardTitle>
                        <button
                          class="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                          @click="showTemplatePicker = true"
                        >
                          <Sparkles class="w-3.5 h-3.5" />
                          使用模板
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="space-y-4">
                        <div class="space-y-1.5">
                          <Label for="customer">客户名称 <span class="text-destructive">*</span></Label>
                          <div class="relative">
                            <div class="flex gap-2">
                              <div class="relative flex-1">
                                <Input
                                  id="customer"
                                  v-model="customerSearch"
                                  placeholder="搜索或输入客户名称"
                                  class="h-11 rounded-xl pl-9 pr-10"
                                  @focus="showCustomerDropdown = true; customerSearch && searchCustomers(customerSearch)"
                                  @input="searchCustomers(customerSearch); form.customer_name = ($event.target as HTMLInputElement).value"
                                  @blur="hideCustomerDropdown"
                                />
                                <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <div v-if="customerLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                                  <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                class="h-11 w-11 shrink-0 rounded-xl border-border"
                                @click="openQuickCustomer"
                              >
                                <Plus class="w-4 h-4" />
                              </Button>
                            </div>
                            <div
                              v-if="showCustomerDropdown && customerOptions.length > 0"
                              class="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              <div class="max-h-60 overflow-y-auto">
                                <button
                                  v-for="customer in customerOptions"
                                  :key="customer.id"
                                  class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                                  @mousedown.prevent="selectCustomer(customer)"
                                >
                                  <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Building2 class="w-4 h-4 text-primary" />
                                  </div>
                                  <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-foreground truncate">{{ customer.name }}</p>
                                    <p v-if="customer.phone || customer.address" class="text-xs text-muted-foreground truncate">
                                      {{ customer.phone || '' }}{{ customer.phone && customer.address ? ' · ' : '' }}{{ customer.address || '' }}
                                    </p>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div class="space-y-1.5">
                            <Label for="contact">联系人</Label>
                            <div class="relative">
                              <Input
                                id="contact"
                                v-model="form.contact_person"
                                placeholder="联系人姓名"
                                class="h-11 rounded-xl pl-9"
                              />
                              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div class="space-y-1.5">
                            <Label for="phone">联系电话</Label>
                            <div class="relative">
                              <Input
                                id="phone"
                                v-model="form.contact_phone"
                                placeholder="联系电话"
                                class="h-11 rounded-xl pl-9"
                                type="tel"
                              />
                              <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>

                        <div class="space-y-1.5">
                          <Label for="address">施工地址</Label>
                          <div class="relative">
                            <Input
                              id="address"
                              v-model="form.address"
                              placeholder="请输入施工地址"
                              class="h-11 rounded-xl pl-9"
                            />
                            <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card v-if="recordType === 'project'" class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2">
                        <Building2 class="w-4 h-4 text-primary" />
                        <span>关联项目</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="space-y-4">
                        <div class="space-y-1.5">
                          <Label for="project">项目名称</Label>
                          <div class="relative">
                            <Input
                              id="project"
                              v-model="projectSearch"
                              placeholder="搜索或选择项目"
                              class="h-11 rounded-xl pl-9 pr-10"
                              @focus="showProjectDropdown = true; projectSearch && searchProjects(projectSearch)"
                              @input="searchProjects(projectSearch); form.project_name = ($event.target as HTMLInputElement).value"
                              @blur="hideProjectDropdown"
                            />
                            <Briefcase class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <div v-if="projectLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                            <div
                              v-if="showProjectDropdown && projectOptions.length > 0"
                              class="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              <div class="max-h-60 overflow-y-auto">
                                <button
                                  v-for="project in projectOptions"
                                  :key="project.id"
                                  class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                                  @mousedown.prevent="selectProject(project)"
                                >
                                  <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Briefcase class="w-4 h-4 text-primary" />
                                  </div>
                                  <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-foreground truncate">{{ project.name }}</p>
                                    <p v-if="project.customer_name" class="text-xs text-muted-foreground truncate">
                                      {{ project.customer_name }}
                                    </p>
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2">
                        <Calendar class="w-4 h-4 text-primary" />
                        <span>时间与人员</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                          <Label for="appointment-date">预约时间</Label>
                          <div class="relative">
                            <Input
                              id="appointment-date"
                              v-model="form.appointment_date"
                              type="datetime-local"
                              class="h-11 rounded-xl pl-9"
                            />
                            <Clock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div class="space-y-1.5">
                          <Label for="staff">负责人</Label>
                          <div class="relative">
                            <Input
                              id="staff"
                              v-model="form.staff_name"
                              placeholder="负责人姓名"
                              class="h-11 rounded-xl pl-9"
                            />
                            <Users class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      <div v-if="recordType === 'project'" class="mt-4 space-y-1.5">
                        <Label>参与人员</Label>
                        <div class="flex flex-wrap gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/30 min-h-[44px] items-center">
                          <span v-if="form.staff_name" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            <User class="w-3 h-3" />
                            {{ form.staff_name }}
                            <button class="hover:text-primary/80">
                              <X class="w-3 h-3" />
                            </button>
                          </span>
                          <button class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground text-xs hover:border-primary hover:text-primary transition-colors">
                            <Plus class="w-3 h-3" />
                            添加人员
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div v-else-if="step === 2" class="space-y-5 md:space-y-6 animate-fade-in">
                  <div v-if="errorMsg" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4 shrink-0" />
                    <span>{{ errorMsg }}</span>
                  </div>

                  <Card class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2">
                        <FileText class="w-4 h-4 text-primary" />
                        <span>工作描述</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="space-y-4">
                        <div v-if="recordType !== 'project'" class="space-y-1.5">
                          <Label for="phenomenon">故障现象</Label>
                          <Textarea
                            id="phenomenon"
                            v-model="form.fault_phenomenon"
                            placeholder="请描述故障现象..."
                            class="min-h-[80px] rounded-xl resize-none"
                          />
                        </div>

                        <div class="space-y-1.5">
                          <Label for="judgment">{{ recordType === 'project' ? '项目说明' : '初步判断' }}</Label>
                          <Textarea
                            id="judgment"
                            v-model="form.fault_judgment"
                            :placeholder="recordType === 'project' ? '请描述项目概况...' : '请描述故障原因初步判断（可选）...'"
                            class="min-h-[80px] rounded-xl resize-none"
                          />
                        </div>

                        <div class="space-y-1.5">
                          <Label for="work-content">工作内容</Label>
                          <Textarea
                            id="work-content"
                            v-model="form.work_content"
                            placeholder="请详细描述工作内容..."
                            class="min-h-[100px] rounded-xl resize-none"
                          />
                        </div>

                        <div class="space-y-1.5">
                          <Label for="remark">备注</Label>
                          <Textarea
                            id="remark"
                            v-model="form.remark"
                            placeholder="其他备注信息（可选）..."
                            class="min-h-[60px] rounded-xl resize-none"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <div class="flex items-center justify-between">
                        <CardTitle class="text-base font-semibold flex items-center gap-2">
                          <ImageIcon class="w-4 h-4 text-primary" />
                          <span>现场照片</span>
                        </CardTitle>
                        <button
                          class="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                          @click="saveTemplate"
                        >
                          <Save class="w-3.5 h-3.5" />
                          存为模板
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <PhotoUpload v-model="workPhotos" :max="9" />
                    </CardContent>
                  </Card>
                </div>

                <div v-else-if="step === 3" class="space-y-5 md:space-y-6 animate-fade-in">
                  <div v-if="errorMsg" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4 shrink-0" />
                    <span>{{ errorMsg }}</span>
                  </div>

                  <Card class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2">
                        <span class="w-4 h-4 flex items-center justify-center text-primary font-bold">¥</span>
                        <span>费用明细</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="space-y-1.5">
                          <Label for="labour-fee">人工费</Label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                            <Input
                              id="labour-fee"
                              v-model.number="form.labour_fee"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              class="h-11 rounded-xl pl-7"
                            />
                          </div>
                        </div>
                        <div class="space-y-1.5">
                          <Label for="material-fee">材料费</Label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                            <Input
                              id="material-fee"
                              v-model.number="form.material_fee"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              class="h-11 rounded-xl pl-7"
                            />
                          </div>
                        </div>
                        <div class="space-y-1.5">
                          <Label for="travel-fee">差旅费</Label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                            <Input
                              id="travel-fee"
                              v-model.number="form.travel_fee"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              class="h-11 rounded-xl pl-7"
                            />
                          </div>
                        </div>
                        <div class="space-y-1.5">
                          <Label for="other-fee">其他费用</Label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                            <Input
                              id="other-fee"
                              v-model.number="form.other_fee"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              class="h-11 rounded-xl pl-7"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="mt-4 flex items-center justify-between p-4 rounded-xl bg-muted/50">
                        <span class="text-sm text-muted-foreground">总费用</span>
                        <span class="text-2xl font-bold text-foreground">¥{{ totalFee.toFixed(2) }}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="shadow-sm border-border">
                    <CardContent class="pt-6">
                      <ExpenseRecorder v-model="recorderItems" :staff-options="staffList" />
                    </CardContent>
                  </Card>

                  <Card class="shadow-sm border-border">
                    <CardHeader class="pb-3">
                      <CardTitle class="text-base font-semibold flex items-center gap-2">
                        <FileText class="w-4 h-4 text-primary" />
                        <span>其他信息</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="space-y-1.5">
                          <Label for="payment-status">收款状态</Label>
                          <select
                            id="payment-status"
                            v-model="form.payment_status"
                            class="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="unpaid">未付款</option>
                            <option value="partial">部分付款</option>
                            <option value="paid">已付款</option>
                            <option value="monthly">月结</option>
                          </select>
                        </div>
                        <div class="space-y-1.5">
                          <Label for="priority">优先级</Label>
                          <select
                            id="priority"
                            v-model="form.priority"
                            class="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="low">低</option>
                            <option value="normal">普通</option>
                            <option value="high">高</option>
                            <option value="urgent">紧急</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div v-else-if="step === 4" class="flex flex-col items-center justify-center py-10 md:py-16 animate-fade-in">
                  <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <CheckCircle2 class="w-12 h-12 md:w-14 md:h-14 text-emerald-500" />
                  </div>
                  <h2 class="text-xl md:text-2xl font-bold text-foreground mb-2">工单创建成功</h2>
                  <p class="text-muted-foreground text-sm text-center mb-8 max-w-xs">
                    工单已成功创建，您可以查看详情或返回列表
                  </p>

                  <div class="w-full max-w-sm space-y-3">
                    <Button
                      class="w-full h-12 rounded-xl text-base font-semibold"
                      @click="goToDetail"
                    >
                      查看工单详情
                      <ChevronRight class="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      class="w-full h-12 rounded-xl text-base font-medium"
                      @click="goToList"
                    >
                      返回工单列表
                    </Button>
                    <Button
                      variant="ghost"
                      class="w-full h-12 rounded-xl text-base font-medium"
                      @click="resetForm"
                    >
                      继续创建新工单
                    </Button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="step < 4"
      class="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom"
    >
      <div class="flex gap-3 md:max-w-5xl md:mx-auto md:grid md:grid-cols-12 md:gap-6">
        <div class="md:col-span-9 md:col-start-4 lg:col-span-10 lg:col-start-3">
          <div class="flex gap-3">
            <Button
              variant="outline"
              class="flex-1 h-12 rounded-xl text-base font-medium"
              @click="goBack"
            >
              <ChevronLeft class="w-4 h-4 mr-1" />
              {{ step === 1 ? '取消' : '上一步' }}
            </Button>
            <Button
              v-if="step < 3"
              class="flex-1 h-12 rounded-xl text-base font-semibold"
              :disabled="step === 1 && !form.customer_name"
              @click="nextStep"
            >
              下一步
              <ChevronRight class="w-4 h-4 ml-1" />
            </Button>
            <Button
              v-else
              class="flex-1 h-12 rounded-xl text-base font-semibold"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              {{ submitting ? '提交中...' : '提交工单' }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showTemplatePicker"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="showTemplatePicker = false"
        >
          <div class="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl bg-background shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            <div class="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 class="font-semibold text-foreground">选择模板</h3>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                @click="showTemplatePicker = false"
              >
                <X class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div class="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
              <button
                v-for="tpl in templates"
                :key="tpl.id"
                class="w-full p-3 md:p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                @click="applyTemplate(tpl)"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-foreground group-hover:text-primary transition-colors">{{ tpl.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {{ typeConfig.find(t => t.key === tpl.record_type)?.label || tpl.record_type }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {{ tpl.fault_judgment || tpl.work_content || tpl.fault_phenomenon || '无描述' }}
                </p>
                <p class="text-xs text-primary mt-2 font-medium">
                  ¥{{ (tpl.labour_fee + tpl.material_fee + tpl.travel_fee + tpl.other_fee).toFixed(2) }} 起
                </p>
              </button>
              <div v-if="templates.length === 0" class="py-8 text-center text-muted-foreground text-sm">
                暂无模板
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Dialog :open="showQuickCustomerDialog" @update:open="showQuickCustomerDialog = $event">
      <DialogContent class="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>快速添加客户</DialogTitle>
          <DialogDescription>填写客户基本信息，创建后自动填入表单</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-1.5">
            <Label for="quick-customer-name">客户名称 <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                id="quick-customer-name"
                v-model="quickCustomerForm.name"
                placeholder="请输入客户名称"
                class="h-10 rounded-xl pl-9"
              />
              <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="quick-customer-contact">联系人</Label>
              <div class="relative">
                <Input
                  id="quick-customer-contact"
                  v-model="quickCustomerForm.contact_name"
                  placeholder="联系人"
                  class="h-10 rounded-xl pl-9"
                />
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="quick-customer-phone">联系电话</Label>
              <div class="relative">
                <Input
                  id="quick-customer-phone"
                  v-model="quickCustomerForm.phone"
                  placeholder="联系电话"
                  class="h-10 rounded-xl pl-9"
                  type="tel"
                />
                <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="quick-customer-address">客户地址</Label>
            <div class="relative">
              <Input
                id="quick-customer-address"
                v-model="quickCustomerForm.address"
                placeholder="客户地址"
                class="h-10 rounded-xl pl-9"
              />
              <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showQuickCustomerDialog = false">取消</Button>
          <Button @click="submitQuickCustomer" :disabled="quickCustomerSubmitting">
            <Loader2 v-if="quickCustomerSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            创建客户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
:deep([data-slot="card"]) {
  background: hsl(var(--card) / 0.9) !important;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-color: hsl(var(--border) / 0.8) !important;
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1),
              0 0 40px -15px rgb(245 112 29 / 0.1);
  transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}
:deep([data-slot="card"]:hover) {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.15),
              0 0 50px -10px rgb(245 112 29 / 0.2);
  border-color: rgb(245 112 29 / 0.4) !important;
}
.dark :deep([data-slot="card"]) {
  background: rgba(20, 15, 10, 0.92) !important;
  border-color: rgba(148, 163, 184, 0.15) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 40px -15px rgba(59, 130, 246, 0.15);
}
.dark :deep([data-slot="card"]:hover) {
  box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6),
              0 0 50px -10px rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.4) !important;
}

:deep([data-slot="card-title"]) {
  color: hsl(var(--card-foreground)) !important;
}
.dark :deep([data-slot="card-title"]) {
  color: #f8fafc !important;
}

:deep([data-slot="input"]) {
  background: hsl(var(--background) / 0.6) !important;
  border-color: hsl(var(--border) / 0.8) !important;
  color: hsl(var(--foreground)) !important;
}
:deep([data-slot="input"]::placeholder) {
  color: hsl(var(--muted-foreground) / 0.6) !important;
}
:deep([data-slot="input"]:focus-visible) {
  box-shadow: 0 0 0 3px rgb(245 112 29 / 0.2),
              0 0 30px rgb(245 112 29 / 0.15) !important;
  border-color: rgb(245 112 29 / 0.5) !important;
}
.dark :deep([data-slot="input"]) {
  background: rgba(30, 41, 59, 0.6) !important;
  border-color: rgba(148, 163, 184, 0.15) !important;
  color: #f1f5f9 !important;
}
.dark :deep([data-slot="input"]::placeholder) {
  color: rgba(148, 163, 184, 0.6) !important;
}
.dark :deep([data-slot="input"]:focus-visible) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2),
              0 0 30px rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
}

:deep([data-slot="textarea"]) {
  background: hsl(var(--background) / 0.6) !important;
  border-color: hsl(var(--border) / 0.8) !important;
  color: hsl(var(--foreground)) !important;
}
:deep([data-slot="textarea"]::placeholder) {
  color: hsl(var(--muted-foreground) / 0.6) !important;
}
:deep([data-slot="textarea"]:focus-visible) {
  box-shadow: 0 0 0 3px rgb(245 112 29 / 0.2),
              0 0 30px rgb(245 112 29 / 0.15) !important;
  border-color: rgb(245 112 29 / 0.5) !important;
}
.dark :deep([data-slot="textarea"]) {
  background: rgba(30, 41, 59, 0.6) !important;
  border-color: rgba(148, 163, 184, 0.15) !important;
  color: #f1f5f9 !important;
}
.dark :deep([data-slot="textarea"]::placeholder) {
  color: rgba(148, 163, 184, 0.6) !important;
}
.dark :deep([data-slot="textarea"]:focus-visible) {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2),
              0 0 30px rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
}

:deep(label) {
  color: hsl(var(--foreground) / 0.9) !important;
}
.dark :deep(label) {
  color: rgba(203, 213, 225, 0.9) !important;
}

:deep(select) {
  background-color: hsl(var(--background) / 0.6) !important;
  border-color: hsl(var(--border) / 0.8) !important;
  color: hsl(var(--foreground)) !important;
}
.dark :deep(select) {
  background: rgba(30, 41, 59, 0.6) !important;
  border-color: rgba(148, 163, 184, 0.15) !important;
  color: #f1f5f9 !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
}
</style>
