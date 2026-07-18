<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recordsApi, customersApi, staffsApi, projectsApi, templatesApi, financeApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Card from '@/components/ui/Card.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardFooter from '@/components/ui/CardFooter.vue'
import Drawer from '@/components/ui/Drawer.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import PhotoUploader from '@/components/business/PhotoUploader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import { useResponsive } from '@/composables/useResponsive'
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Phone,
  FileText,
  Image,
  Users,
  Calendar,
  Check,
  AlertCircle,
  Briefcase,
  Clock,
  DollarSign,
  Wallet,
  Plus,
  Trash2,
  Paperclip,
  X,
  Building2,
  Hammer,
  TrendingUp,
  Tag,
  Wrench,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  ClipboardList,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { isDesktop } = useResponsive()

const isEdit = computed(() => !!route.params.id)
const recordId = computed(() => Number(route.params.id))
const loading = ref(false)
const currentStep = ref(0)
const submitting = ref(false)

interface StaffItem {
  id: number | string
  name: string
  hours: number
}

interface FeeItem {
  id: string
  type: string
  desc: string
  qty: number
  unit: string
  price: number
  subtotal: number
}

interface ExpenseItem {
  id: string
  category: number | null
  category_name: string
  amount: number
  description: string
  expense_date: string
}

const form = reactive({
  order_type: 'construction' as 'project_construction' | 'construction' | 'repair',
  fault_description: '',
  fault_type: '',
  fault_diagnosis: '',
  repair_process: '',
  repair_result: 'completed' as 'completed' | 'incomplete',
  incomplete_reason_type: '',
  incomplete_reason: '',
  convert_to_pending: false,
  warranty_status: 'none' as 'warranty' | 'expired' | 'none',
  project_id: undefined as number | undefined,
  project_name: '',
  customer_name: '',
  work_address: '',
  contact_person: '',
  contact_phone: '',
  title: '',
  record_type: 'install',
  priority: 'normal',
  status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
  work_content: '',
  project_stage: 'preparation',
  progress_percent: 0,
  progress_note: '',
  staff_list: [] as StaffItem[],
  work_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  work_hours: 0,
  fee_items: [] as FeeItem[],
  expense_items: [] as ExpenseItem[],
  has_tax: false,
  tax_rate: 0.03,
  photos: [] as string[],
  files: [] as any[],
  remark: '',
  selected_template_id: null as number | null,
})

const customers = ref<any[]>([])
const staffs = ref<any[]>([])
const projects = ref<any[]>([])
const templates = ref<any[]>([])
const expenseCategories = ref<any[]>([])

const showQuickCreateCustomer = ref(false)
const quickCreateSubmitting = ref(false)
const quickCustomerForm = reactive({
  name: '',
  contact_name: '',
  phone: '',
  address: '',
})
const { errors: quickCustomerErrors, validate: validateQuickCustomer, setError: setQuickCustomerError, clearErrors: clearQuickCustomerErrors } = useFormValidation(quickCustomerForm, {
  name: [validators.required('请输入客户名称')],
  phone: [
    {
      validator: (val: string) => {
        if (!val || !val.trim()) return true
        return val.trim().length >= 6
      },
      message: '电话号码长度至少6位',
    },
  ],
})

const recordTypeOptions = [
  { value: 'install', label: '安装' },
  { value: 'maintenance', label: '维修' },
  { value: 'inspection', label: '巡检' },
  { value: 'repair', label: '抢修' },
  { value: 'other', label: '其他' },
]

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
]

const statusOptions = [
  { value: 'pending', label: '待办工单' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const projectStageOptions = [
  { value: 'preparation', label: '准备阶段' },
  { value: 'material_arrival', label: '材料进场' },
  { value: 'in_progress', label: '施工中' },
  { value: 'completed', label: '已完成' },
  { value: 'acceptance', label: '验收' },
  { value: 'settlement', label: '结算' },
]

const feeTypeOptions = [
  { value: 'material', label: '材料' },
  { value: 'labor', label: '人工' },
  { value: 'equipment', label: '设备' },
  { value: 'transport', label: '交通' },
  { value: 'meal', label: '餐饮' },
  { value: 'accommodation', label: '住宿' },
  { value: 'other', label: '其他' },
]

const faultTypeOptions = [
  { value: 'weak_current', label: '弱电系统故障' },
  { value: 'network', label: '网络故障' },
  { value: 'monitoring', label: '监控安防故障' },
  { value: 'access_control', label: '门禁系统故障' },
  { value: 'intelligent', label: '智能化系统故障' },
  { value: 'low_voltage', label: '低压强电故障' },
  { value: 'lighting', label: '照明系统故障' },
  { value: 'circuit', label: '线路故障' },
  { value: 'equipment', label: '设备故障' },
  { value: 'other', label: '其他' },
]

const warrantyStatusOptions = [
  { value: 'warranty', label: '在保' },
  { value: 'expired', label: '过保' },
  { value: 'none', label: '无保修' },
]

const incompleteReasonTypeOptions = [
  { value: 'parts_insufficient', label: '配件不足' },
  { value: 'customer_reason', label: '客户原因' },
  { value: 'technical_difficulty', label: '技术难题' },
  { value: 'other', label: '其他' },
]

const projectConstructionStepLabels = ['选择类型', '选择项目', '施工内容', '施工进度', '人员工时', '费用记录', '开支记录', '附件备注']
const constructionStepLabels = ['选择类型', '客户信息', '施工日期', '人员工时', '施工内容', '费用列表', '开支记录', '附件备注']
const repairStepLabels = [
  '选择类型',
  '客户信息',
  '维修日期',
  '人员工时',
  '故障现象',
  '故障诊断',
  '维修内容',
  '维修结果',
  '费用列表',
  '开支记录',
  '附件备注',
]

const stepLabels = computed(() => {
  if (form.order_type === 'project_construction') {
    return projectConstructionStepLabels
  }
  if (form.order_type === 'construction') {
    return constructionStepLabels
  }
  return repairStepLabels
})

const totalSteps = computed(() => stepLabels.value.length)

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  contact_phone: [
    {
      validator: (val: string) => {
        if (!val) return true
        return validators.phone(val)
      },
    },
  ],
})

const totalFee = computed(() => {
  return form.fee_items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
})

const taxAmount = computed(() => {
  if (!form.has_tax) return 0
  return Math.round(totalFee.value * form.tax_rate * 100) / 100
})

const grandTotal = computed(() => {
  return Math.round((totalFee.value + taxAmount.value) * 100) / 100
})

const totalStaffHours = computed(() => {
  return form.staff_list.reduce((sum, item) => sum + (item.hours || 0), 0)
})

const materialFeeTypes = ['material', 'equipment']

const regularFeeItems = computed(() => {
  return form.fee_items.filter(item => !materialFeeTypes.includes(item.type))
})

const materialFeeItems = computed(() => {
  return form.fee_items.filter(item => materialFeeTypes.includes(item.type))
})

const laborFeeIndex = computed(() => {
  return form.fee_items.findIndex((item) => item.type === 'labor' && item.desc === '人工费')
})

watch(() => [form.start_time, form.end_time], () => {
  if (form.start_time && form.end_time) {
    const [startH, startM] = form.start_time.split(':').map(Number)
    const [endH, endM] = form.end_time.split(':').map(Number)
    const hours = (endH * 60 + endM - startH * 60 - startM) / 60
    form.work_hours = Math.max(0, Math.round(hours * 100) / 100)
  }
})

watch(
  () => totalStaffHours.value,
  () => {
    updateLaborFeeQty()
  }
)

const updateLaborFeeQty = () => {
  const idx = laborFeeIndex.value
  if (idx !== -1) {
    form.fee_items[idx].qty = totalStaffHours.value
    updateFeeSubtotal(idx)
  }
}

const initDefaultFeeItems = () => {
  if (form.fee_items.length > 0) return
  form.fee_items = [
    {
      id: 'labor_default',
      type: 'labor',
      desc: '人工费',
      qty: totalStaffHours.value || 0,
      unit: '小时',
      price: 0,
      subtotal: 0,
    },
    {
      id: 'debug_default',
      type: 'other',
      desc: '调试费',
      qty: 1,
      unit: '次',
      price: 0,
      subtotal: 0,
    },
    {
      id: 'transport_default',
      type: 'transport',
      desc: '交通费',
      qty: 1,
      unit: '次',
      price: 0,
      subtotal: 0,
    },
  ]
}

const canGoNext = computed(() => {
  const step = currentStep.value
  const type = form.order_type

  if (type === 'project_construction') {
    if (step === 0) return true
    if (step === 1) return !!form.project_id
    if (step === 2) return form.title.trim() && form.work_content.trim()
    if (step === 3) return form.progress_percent >= 0 && form.progress_percent <= 100
    if (step === 4) return form.staff_list.length > 0
    if (step === 5) return true
    return true
  } else if (type === 'construction') {
    if (step === 0) return true
    if (step === 1) return form.customer_name.trim() && form.work_address.trim()
    if (step === 2) return form.work_date && form.start_time && form.end_time
    if (step === 3) return form.staff_list.length > 0
    if (step === 4) return form.title.trim() && form.work_content.trim()
    if (step === 5) return true
    return true
  } else {
    if (step === 0) return true
    if (step === 1) return form.customer_name.trim() && form.work_address.trim()
    if (step === 2) return form.work_date && form.start_time && form.end_time
    if (step === 3) return form.staff_list.length > 0
    if (step === 4) return form.fault_description.trim() && form.fault_type
    if (step === 5) return form.fault_diagnosis.trim()
    if (step === 6) return form.repair_process.trim()
    if (step === 7) {
      if (form.repair_result === 'incomplete') {
        return form.incomplete_reason_type && form.incomplete_reason.trim()
      }
      return true
    }
    if (step === 8) return true
    return true
  }
})

const nextStep = () => {
  if (currentStep.value < totalSteps.value - 1) {
    let stepValid = true
    const step = currentStep.value
    const type = form.order_type

    if (type === 'project_construction') {
      if (step === 1) {
        clearErrors()
        if (!form.project_id) {
          setError('project_name', '请选择项目')
          stepValid = false
        }
      } else if (step === 2) {
        clearErrors()
        if (!form.title.trim()) {
          setError('title', '请输入工单标题')
          stepValid = false
        }
        if (!form.work_content.trim()) {
          setError('work_content', '请填写工作内容')
          stepValid = false
        }
      } else if (step === 4) {
        if (form.staff_list.length === 0) {
          stepValid = false
          alert('请至少添加一个施工人员')
        }
      }
    } else if (type === 'construction') {
      if (step === 1) {
        clearErrors()
        if (!form.customer_name.trim()) {
          setError('customer_name', '请输入客户名称')
          stepValid = false
        }
        if (!form.work_address.trim()) {
          setError('work_address', '请输入工作地址')
          stepValid = false
        }
        validateField('contact_phone')
        if (errors.contact_phone) {
          stepValid = false
        }
      } else if (step === 2) {
        if (!form.work_date || !form.start_time || !form.end_time) {
          stepValid = false
          alert('请填写完整的施工日期和时间')
        }
      } else if (step === 3) {
        if (form.staff_list.length === 0) {
          stepValid = false
          alert('请至少添加一个施工人员')
        }
      } else if (step === 4) {
        clearErrors()
        if (!form.title.trim()) {
          setError('title', '请输入工单标题')
          stepValid = false
        }
        if (!form.work_content.trim()) {
          setError('work_content', '请填写工作内容')
          stepValid = false
        }
      }
    } else {
      if (step === 1) {
        clearErrors()
        if (!form.customer_name.trim()) {
          setError('customer_name', '请输入客户名称')
          stepValid = false
        }
        if (!form.work_address.trim()) {
          setError('work_address', '请输入工作地址')
          stepValid = false
        }
        validateField('contact_phone')
        if (errors.contact_phone) {
          stepValid = false
        }
      } else if (step === 2) {
        if (!form.work_date || !form.start_time || !form.end_time) {
          stepValid = false
          alert('请填写完整的维修日期和时间')
        }
      } else if (step === 3) {
        if (form.staff_list.length === 0) {
          stepValid = false
          alert('请至少添加一个维修人员')
        }
      } else if (step === 4) {
        clearErrors()
        if (!form.fault_description.trim()) {
          setError('fault_description', '请填写故障描述')
          stepValid = false
        }
        if (!form.fault_type) {
          stepValid = false
          alert('请选择故障类型')
        }
      } else if (step === 5) {
        clearErrors()
        if (!form.fault_diagnosis.trim()) {
          setError('fault_diagnosis', '请填写故障诊断')
          stepValid = false
        }
      } else if (step === 6) {
        clearErrors()
        if (!form.repair_process.trim()) {
          setError('repair_process', '请填写维修内容')
          stepValid = false
        }
      } else if (step === 7) {
        if (form.repair_result === 'incomplete') {
          if (!form.incomplete_reason_type) {
            stepValid = false
            alert('请选择未完成原因类型')
          }
          if (!form.incomplete_reason.trim()) {
            stepValid = false
            alert('请填写未完成原因说明')
          }
        }
      }
    }

    if (stepValid) {
      currentStep.value++
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const loadRecord = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await recordsApi.get(recordId.value)
    const data = res.data
    form.order_type = data.order_type || 'construction'
    form.fault_description = data.fault_description || ''
    form.fault_type = data.fault_type || ''
    form.fault_diagnosis = data.fault_diagnosis || ''
    form.repair_process = data.repair_process || ''
    form.repair_result = data.repair_result || 'completed'
    form.incomplete_reason_type = data.incomplete_reason_type || ''
    form.incomplete_reason = data.incomplete_reason || ''
    form.warranty_status = data.warranty_status || 'none'
    form.project_id = data.project_id
    form.project_name = data.project_name || ''
    form.customer_name = data.customer_name || ''
    form.work_address = data.work_address || ''
    form.contact_person = data.contact_person || data.contact_name || ''
    form.contact_phone = data.contact_phone || data.customer_phone || ''
    form.title = data.title || ''
    form.record_type = data.work_subtype || data.record_type_detail || data.record_type || 'install'
    form.priority = data.priority || 'normal'
    form.status = data.status || 'pending'
    form.work_content = data.work_content || ''
    form.project_stage = data.project_stage || 'preparation'
    form.progress_percent = data.progress_percent || 0
    form.progress_note = data.progress_note || ''
    form.work_date = (data.work_date || data.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
    form.start_time = data.start_time || ''
    form.end_time = data.end_time || ''
    form.work_hours = data.work_hours || 0
    form.has_tax = data.tax_type === 'tax'
    form.tax_rate = data.tax_rate ? data.tax_rate / 100 : 0.03
    form.photos = data.work_photos || data.photos || []
    form.remark = data.remark || ''
    if (data.staff_list && Array.isArray(data.staff_list)) {
      form.staff_list = data.staff_list.map((s: any) => ({
        id: s.id || s.staff_id,
        name: s.name || s.staff_name,
        hours: s.hours || 0,
      }))
    }
    if (data.fee_items && Array.isArray(data.fee_items)) {
      form.fee_items = data.fee_items.map((item: any, idx: number) => ({
        id: item.id || `fee_${idx}`,
        type: item.type || 'other',
        desc: item.desc || '',
        qty: item.qty || 0,
        unit: item.unit || '个',
        price: item.price || 0,
        subtotal: item.subtotal || (item.qty || 0) * (item.price || 0),
      }))
    } else {
      initDefaultFeeItems()
    }
    const expenseData = data.expense_items || data.expenses || []
    if (Array.isArray(expenseData) && expenseData.length > 0) {
      form.expense_items = expenseData.map((item: any, idx: number) => ({
        id: item.id || `expense_${idx}`,
        category: item.category_id || item.category || '',
        category_name: item.category_name || (item.category ? String(item.category) : ''),
        amount: Number(item.amount) || 0,
        description: item.description || '',
        expense_date: (item.expense_date || form.work_date || '').split('T')[0],
      }))
    } else {
      form.expense_items = []
    }
  } catch (e) {
    console.error('加载工单信息失败', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const submitData: Record<string, any> = {
      order_type: form.order_type,
      project_id: form.project_id,
      project_name: form.project_name,
      customer_name: form.customer_name,
      work_address: form.work_address,
      contact_person: form.contact_person,
      contact_name: form.contact_person,
      contact_phone: form.contact_phone,
      customer_phone: form.contact_phone,
      title: form.title,
      priority: form.priority,
      status: form.status,
      work_content: form.work_content,
      work_date: form.work_date,
      start_time: form.start_time,
      end_time: form.end_time,
      work_hours: form.work_hours,
      staff_list: form.staff_list,
      staff_names: form.staff_list.map(s => s.name).join(','),
      fee_items: form.fee_items,
      expense_items: form.expense_items.map(expense => ({
        ...expense,
        category_id: expense.category ? parseInt(String(expense.category)) : null,
      })),
      tax_type: form.has_tax ? 'tax' : 'no',
      tax_rate: form.tax_rate * 100,
      amount: grandTotal.value,
      work_photos: form.photos,
      remark: form.remark,
    }

    if (form.order_type === 'repair') {
      submitData.record_type = 'repair'
      submitData.fault_description = form.fault_description
      submitData.fault_type = form.fault_type
      submitData.fault_diagnosis = form.fault_diagnosis
      submitData.repair_process = form.repair_process
      submitData.repair_result = form.repair_result
      submitData.warranty_status = form.warranty_status
      if (form.repair_result === 'incomplete') {
        submitData.incomplete_reason_type = form.incomplete_reason_type
        submitData.incomplete_reason = form.incomplete_reason
        submitData.convert_to_pending = form.convert_to_pending
      }
    } else {
      submitData.record_type = 'construction'
      submitData.work_subtype = form.record_type
    }

    if (form.order_type === 'project_construction') {
      submitData.project_stage = form.project_stage
      submitData.progress_percent = form.progress_percent
      submitData.progress_note = form.progress_note
    }

    let savedRecordId = recordId.value
    if (isEdit.value) {
      await recordsApi.update(recordId.value, submitData)
    } else {
      const res = await recordsApi.create(submitData)
      savedRecordId = res.data?.id || res.data?.record?.id
    }

    if (form.expense_items.length > 0) {
      const expensePromises = form.expense_items.map((expense) => {
        const expenseData: Record<string, any> = {
          category_id: expense.category ? parseInt(String(expense.category)) : null,
          category_name: expense.category_name,
          amount: expense.amount,
          description: expense.description || (form.title + ' - 工单开支'),
          expense_date: expense.expense_date || form.work_date,
          record_id: savedRecordId,
        }

        if (form.order_type === 'project_construction' && form.project_id) {
          return projectsApi.createExpense(form.project_id, expenseData)
        } else {
          expenseData.expense_type = 'daily'
          return financeApi.createExpense(expenseData)
        }
      })
      await Promise.all(expensePromises)
    }

    router.push('/records')
  } catch (e: any) {
    const msg = e.response?.data?.error || (isEdit.value ? '更新失败，请重试' : '创建失败，请重试')
    setError('work_content', msg)
  } finally {
    submitting.value = false
  }
}

const loadTemplates = async () => {
  try {
    const res = await templatesApi.list({ page_size: 100 })
    let list = res.data
    if (Array.isArray(list)) {
    } else {
      list = list.records || list.list || list.templates || list.items || []
    }
    templates.value = list.map((t: any) => ({
      value: t.id,
      label: t.name,
      description: t.category || t.template_type,
      ...t,
    }))
  } catch (e) {
    console.error('加载模板列表失败', e)
  }
}

const onTemplateChange = async (val: string | number | null, option: any) => {
  if (!option || !val) {
    form.selected_template_id = null
    return
  }
  form.selected_template_id = Number(val)
  try {
    const res = await templatesApi.get(Number(val))
    const tpl = res.data
    
    if (tpl.template_type === 'construction') {
      form.order_type = 'construction'
    } else if (tpl.template_type === 'repair') {
      form.order_type = 'repair'
    }
    
    form.priority = tpl.priority || 'normal'
    form.record_type = tpl.work_subtype || form.record_type
    form.work_content = tpl.work_content || ''
    form.fault_description = tpl.fault_description || ''
    form.fault_diagnosis = tpl.fault_diagnosis || ''
    form.repair_process = tpl.repair_process || ''
    
    form.has_tax = tpl.tax_type === 'tax'
    if (tpl.tax_rate) {
      form.tax_rate = tpl.tax_rate / 100
    }
    
    if (tpl.staff_names && tpl.staff_names.length > 0) {
      form.staff_list = tpl.staff_names.map((name: string, idx: number) => ({
        id: name + '_' + idx,
        name: name,
        hours: form.work_hours || 8,
      }))
    }
    
    if (tpl.fee_items && tpl.fee_items.length > 0) {
      form.fee_items = tpl.fee_items.map((item: any, idx: number) => ({
        id: 'tpl_' + idx + '_' + Date.now(),
        type: item.type || 'other',
        desc: item.desc || '',
        qty: item.qty || 1,
        unit: item.unit || '个',
        price: item.price || 0,
        subtotal: item.subtotal || (item.qty || 0) * (item.price || 0),
      }))
    } else {
      form.fee_items = []
      initDefaultFeeItems()
      if (tpl.labor_fee) {
        const laborIdx = form.fee_items.findIndex(i => i.id === 'labor_default')
        if (laborIdx !== -1) {
          form.fee_items[laborIdx].price = tpl.labor_fee
          updateFeeSubtotal(laborIdx)
        }
      }
    }
    
    form.remark = tpl.remark || ''
    currentStep.value = 1
  } catch (e) {
    console.error('加载模板失败', e)
  }
}

const loadCustomers = async () => {
  try {
    const res = await customersApi.list({ page_size: 100 })
    let list = res.data
    if (Array.isArray(list)) {
    } else {
      list = list.records || list.list || list.customers || list.items || []
    }
    customers.value = list.map((c: any) => ({
      value: c.name || c.customer_name,
      label: c.name || c.customer_name,
      description: c.address || c.work_address,
      ...c,
    }))
  } catch (e) {
    console.error('加载客户列表失败', e)
  }
}

const openQuickCreateCustomer = () => {
  quickCustomerForm.name = ''
  quickCustomerForm.contact_name = ''
  quickCustomerForm.phone = ''
  quickCustomerForm.address = ''
  clearQuickCustomerErrors()
  showQuickCreateCustomer.value = true
}

const handleQuickCreateCustomer = async () => {
  if (!validateQuickCustomer()) return
  
  quickCreateSubmitting.value = true
  try {
    const submitData = {
      name: quickCustomerForm.name,
      contact_name: quickCustomerForm.contact_name,
      phone: quickCustomerForm.phone,
      address: quickCustomerForm.address,
      short_name: quickCustomerForm.name,
      full_name: quickCustomerForm.name,
    }
    const res = await customersApi.create(submitData)
    const newCustomer = res.data
    
    await loadCustomers()
    
    form.customer_name = newCustomer.name
    form.work_address = newCustomer.address || quickCustomerForm.address || ''
    form.contact_person = newCustomer.contact_name || quickCustomerForm.contact_name || ''
    form.contact_phone = newCustomer.phone || quickCustomerForm.phone || ''
    
    showQuickCreateCustomer.value = false
  } catch (e: any) {
    const msg = e.response?.data?.error || '创建客户失败'
    setQuickCustomerError('name', msg)
  } finally {
    quickCreateSubmitting.value = false
  }
}

const loadStaffs = async () => {
  try {
    const res = await staffsApi.list({ page_size: 100 })
    let list = res.data
    if (Array.isArray(list)) {
      // 直接返回数组
    } else {
      list = list.records || list.list || list.staffs || list.items || []
    }
    staffs.value = list.map((s: any) => ({
      value: s.name || s.staff_name,
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
    const res = await projectsApi.list({ page_size: 100 })
    let list = res.data
    if (Array.isArray(list)) {
      // 直接返回数组
    } else {
      list = list.records || list.list || list.projects || list.items || []
    }
    projects.value = list.map((p: any) => ({
      value: p.name || p.project_name,
      label: p.name || p.project_name,
      description: p.customer_name || '',
      ...p,
    }))
  } catch (e) {
    console.error('加载项目列表失败', e)
  }
}

const onProjectChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.project_id = option.id
    form.project_name = option.name || option.project_name || option.label
    form.customer_name = option.customer_name || ''
    form.work_address = option.address || option.location || ''
    form.contact_person = option.contact_name || option.contact_person || ''
    form.contact_phone = option.contact_phone || option.phone || ''
  } else {
    form.project_id = undefined
    form.project_name = ''
  }
}

const onCustomerChange = (_val: string | number | null, option: any) => {
  if (option) {
    form.customer_name = option.name || option.customer_name || option.label
    form.work_address = option.address || option.work_address || option.description || ''
    form.contact_person = option.contact_person || ''
    form.contact_phone = option.phone || option.contact_phone || ''
  }
}

const selectedStaffIds = computed(() => form.staff_list.map((s) => s.id))

const availableStaffs = computed(() => {
  return staffs.value.filter((s) => !selectedStaffIds.value.includes(s.value))
})

const addStaff = (_val: string | number | null, option: any) => {
  if (option) {
    form.staff_list.push({
      id: option.value,
      name: option.label,
      hours: form.work_hours || 8,
    })
  }
}

const removeStaff = (index: number) => {
  form.staff_list.splice(index, 1)
}

const addFeeItem = (type: string = 'other') => {
  const defaultDesc: Record<string, string> = {
    labor: '人工费',
    transport: '交通费',
    meal: '餐饮费',
    accommodation: '住宿费',
    other: '其他费用',
    material: '材料费',
    equipment: '设备费',
  }
  form.fee_items.push({
    id: Date.now().toString(),
    type: type,
    desc: defaultDesc[type] || '',
    qty: 1,
    unit: type === 'labor' ? '小时' : '个',
    price: 0,
    subtotal: 0,
  })
}

const addRegularFee = () => {
  addFeeItem('other')
}

const addMaterialFee = () => {
  addFeeItem('material')
}

const loadExpenseCategories = async () => {
  try {
    const res = await financeApi.expenseCategories({ page_size: 100 })
    let list = res.data
    if (Array.isArray(list)) {
    } else {
      list = list.records || list.list || list.categories || list.items || []
    }
    expenseCategories.value = list.map((c: any) => ({
      value: c.id,
      label: c.name || c.category_name,
      ...c,
    }))
  } catch (e) {
    console.error('加载支出分类失败', e)
  }
}

const addExpenseItem = () => {
  const today = new Date().toISOString().split('T')[0]
  form.expense_items.push({
    id: Date.now().toString(),
    category: null,
    category_name: '',
    amount: 0,
    description: '',
    expense_date: form.work_date || today,
  })
}

const removeExpenseItem = (index: number) => {
  form.expense_items.splice(index, 1)
}

const onExpenseCategoryChange = (index: number, val: string | number | null, option: any) => {
  if (option) {
    form.expense_items[index].category = option.id ? Number(option.id) : (val ? Number(val) : null)
    form.expense_items[index].category_name = option.name || option.category_name || option.label || ''
  } else {
    form.expense_items[index].category = null
    form.expense_items[index].category_name = ''
  }
}

const totalExpenseAmount = computed(() => {
  return form.expense_items.reduce((sum, item) => sum + (item.amount || 0), 0)
})

const removeFeeItem = (index: number) => {
  form.fee_items.splice(index, 1)
}

const removeFeeItemById = (id: string) => {
  const idx = form.fee_items.findIndex(item => item.id === id)
  if (idx !== -1) {
    form.fee_items.splice(idx, 1)
  }
}

const updateFeeSubtotalById = (id: string) => {
  const idx = form.fee_items.findIndex(item => item.id === id)
  if (idx !== -1) {
    updateFeeSubtotal(idx)
  }
}

const updateFeeSubtotal = (index: number) => {
  const item = form.fee_items[index]
  item.subtotal = Math.round((item.qty || 0) * (item.price || 0) * 100) / 100
}

const switchOrderType = (type: 'project_construction' | 'construction' | 'repair') => {
  form.order_type = type
  currentStep.value = 0
  clearErrors()
  form.fault_description = ''
  form.fault_type = ''
  form.fault_diagnosis = ''
  form.repair_process = ''
  form.repair_result = 'completed'
  form.incomplete_reason_type = ''
  form.incomplete_reason = ''
  form.convert_to_pending = false
  form.warranty_status = 'none'
  form.project_id = undefined
  form.project_name = ''
  form.customer_name = ''
  form.work_address = ''
  form.contact_person = ''
  form.contact_phone = ''
  form.title = ''
  form.record_type = 'install'
  form.priority = 'normal'
  form.status = 'pending'
  form.work_content = ''
  form.project_stage = 'preparation'
  form.progress_percent = 0
  form.progress_note = ''
  form.staff_list = []
  form.work_date = new Date().toISOString().split('T')[0]
  form.start_time = ''
  form.end_time = ''
  form.work_hours = 0
  form.fee_items = []
  form.expense_items = []
  form.has_tax = false
  form.photos = []
  form.files = []
  form.remark = ''
  form.selected_template_id = null
  initDefaultFeeItems()
}

const loadPendingConvertData = () => {
  try {
    const dataStr = sessionStorage.getItem('pendingConvertData')
    if (dataStr) {
      const data = JSON.parse(dataStr)
      sessionStorage.removeItem('pendingConvertData')
      
      form.order_type = data.order_type || 'construction'
      form.customer_name = data.customer_name || ''
      form.work_address = data.work_address || ''
      form.contact_person = data.contact_name || ''
      form.contact_phone = data.contact_phone || ''
      form.title = data.title || '待办转工单'
      form.priority = data.priority || 'normal'
      form.work_content = data.work_content || ''
      
      if (form.order_type === 'repair') {
        form.fault_description = data.work_content || ''
      }
      
      currentStep.value = 1
      
      setTimeout(() => {
        if (form.customer_name) {
          const customerOption = customers.value.find(c => c.name === form.customer_name || c.label === form.customer_name)
          if (customerOption) {
            form.work_address = customerOption.address || customerOption.work_address || form.work_address
            form.contact_person = customerOption.contact_name || form.contact_person
            form.contact_phone = customerOption.phone || customerOption.contact_phone || form.contact_phone
          }
        }
      }, 500)
    }
  } catch (e) {
    console.error('加载待办转换数据失败', e)
    sessionStorage.removeItem('pendingConvertData')
  }
}

onMounted(() => {
  loadCustomers()
  loadStaffs()
  loadProjects()
  loadTemplates()
  loadExpenseCategories()
  loadRecord()
  if (!isEdit.value) {
    setTimeout(loadPendingConvertData, 300)
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <div v-if="loading && isEdit" class="flex-1 flex items-center justify-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p>加载中...</p>
      </div>
    </div>
    <template v-else>
    <template v-if="!isDesktop">
      <MobileHeader
        :title="isEdit ? '编辑工单' : '新建工单'"
        show-back
        @right-click=""
      >
        <template #right>
          <button
            v-if="currentStep === totalSteps - 1"
            class="text-sm font-medium text-primary"
            :class="{ 'opacity-50': submitting }"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ isEdit ? '保存' : '提交' }}
          </button>
        </template>
      </MobileHeader>

      <div class="border-b border-border bg-card px-4 py-3">
        <div class="flex items-center overflow-x-auto pb-1">
          <div
            v-for="(label, index) in stepLabels"
            :key="index"
            class="flex items-center flex-shrink-0"
          >
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors flex-shrink-0"
              :class="currentStep > index
                ? 'bg-success text-white'
                : currentStep === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'"
            >
              <Check v-if="currentStep > index" class="h-4 w-4" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span
              class="ml-2 text-sm whitespace-nowrap"
              :class="currentStep >= index ? 'text-foreground font-medium' : 'text-muted-foreground'"
            >
              {{ label }}
            </span>
            <div
              v-if="index < stepLabels.length - 1"
              class="mx-3 h-0.5 w-6 bg-muted flex-shrink-0"
              :class="{ 'bg-primary': currentStep > index }"
            ></div>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pb-32">
        <!-- Step 0: 工单类型选择 -->
        <div v-show="currentStep === 0" class="space-y-5 px-4 py-5">
          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Briefcase class="h-5 w-5 text-primary" />
              选择工单类型
            </h3>
            <div class="grid grid-cols-1 gap-3">
              <button
                class="h-20 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                :class="form.order_type === 'project_construction'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground'"
                @click="switchOrderType('project_construction')"
              >
                <div class="flex items-center gap-3">
                  <Building2 class="h-8 w-8" />
                  <div class="text-left">
                    <div class="font-semibold text-base">项目施工单</div>
                    <div class="text-xs text-muted-foreground">关联项目的施工工单</div>
                  </div>
                </div>
              </button>
              <button
                class="h-20 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                :class="form.order_type === 'construction'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground'"
                @click="switchOrderType('construction')"
              >
                <div class="flex items-center gap-3">
                  <Hammer class="h-8 w-8" />
                  <div class="text-left">
                    <div class="font-semibold text-base">施工单</div>
                    <div class="text-xs text-muted-foreground">普通独立施工工单</div>
                  </div>
                </div>
              </button>
              <button
                class="h-20 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                :class="form.order_type === 'repair'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-foreground'"
                @click="switchOrderType('repair')"
              >
                <div class="flex items-center gap-3">
                  <Wrench class="h-8 w-8" />
                  <div class="text-left">
                    <div class="font-semibold text-base">维修单</div>
                    <div class="text-xs text-muted-foreground">设备故障维修工单</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <ClipboardList class="h-5 w-5 text-primary" />
              选择模板（可选）
            </h3>
            <Select
              v-model="form.selected_template_id"
              :options="templates"
              placeholder="选择工单模板快速创建"
              title="选择模板"
              search-placeholder="搜索模板名称..."
              @change="onTemplateChange"
            />
            <p class="mt-2 text-xs text-muted-foreground">选择模板后将自动填充工单内容、费用项等预设信息</p>
          </div>
        </div>

        <!-- 项目施工单 -->
        <template v-if="form.order_type === 'project_construction'">
          <div v-show="currentStep === 1" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Building2 class="h-5 w-5 text-primary" />
                选择项目 <span class="text-destructive">*</span>
              </h3>
              <div>
                <Select
                  v-model="form.project_name"
                  :options="projects"
                  placeholder="请选择项目"
                  title="选择项目"
                  search-placeholder="搜索项目名称..."
                  @change="onProjectChange"
                />
                <p v-if="errors.project_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.project_name }}
                </p>
              </div>
              <div v-if="form.project_id" class="mt-4 rounded-xl bg-muted/50 p-4 space-y-3">
                <div class="flex items-start gap-3">
                  <User class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-muted-foreground">客户名称</div>
                    <div class="font-medium">{{ form.customer_name || '-' }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <MapPin class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-muted-foreground">工作地址</div>
                    <div class="font-medium">{{ form.work_address || '-' }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <User class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-muted-foreground">联系人</div>
                    <div class="font-medium">{{ form.contact_person || '-' }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <Phone class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs text-muted-foreground">联系电话</div>
                    <div class="font-medium">{{ form.contact_phone || '-' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 2" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <FileText class="h-5 w-5 text-primary" />
                施工内容
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">工单标题 <span class="text-destructive">*</span></label>
                  <input
                    v-model="form.title"
                    type="text"
                    placeholder="请输入工单标题"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.title }"
                  />
                  <p v-if="errors.title" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.title }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">施工类型</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="type in recordTypeOptions"
                      :key="type.value"
                      class="h-12 rounded-xl border text-sm font-medium transition-all"
                      :class="form.record_type === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'"
                      @click="form.record_type = type.value"
                    >
                      {{ type.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">优先级</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="p in priorityOptions"
                      :key="p.value"
                      class="h-12 rounded-xl border text-sm font-medium transition-all"
                      :class="form.priority === p.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'"
                      @click="form.priority = p.value"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">
                    工作内容 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.work_content"
                    rows="5"
                    placeholder="请详细描述工作内容..."
                    class="min-h-[120px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.work_content }"
                  />
                  <p v-if="errors.work_content" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.work_content }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 3" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <TrendingUp class="h-5 w-5 text-primary" />
                施工进度
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">施工阶段</label>
                  <Select
                    v-model="form.project_stage"
                    :options="projectStageOptions.map(o => ({ value: o.value, label: o.label }))"
                    placeholder="请选择施工阶段"
                    title="选择施工阶段"
                  />
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">
                    进度百分比: {{ form.progress_percent }}%
                  </label>
                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="form.progress_percent"
                      type="range"
                      min="0"
                      max="100"
                      class="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      v-model.number="form.progress_percent"
                      type="number"
                      min="0"
                      max="100"
                      class="w-20 h-10 rounded-lg border border-input bg-background px-2 text-center text-sm"
                    />
                  </div>
                  <div class="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary transition-all duration-300"
                      :style="{ width: form.progress_percent + '%' }"
                    ></div>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">进度说明</label>
                  <textarea
                    v-model="form.progress_note"
                    rows="4"
                    placeholder="请描述当前进度情况..."
                    class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 4" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Users class="h-5 w-5 text-primary" />
                人员工时
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">添加施工人员</label>
                  <Select
                    :model-value="null"
                    :options="availableStaffs"
                    placeholder="选择施工人员"
                    title="选择施工人员"
                    search-placeholder="搜索人员..."
                    @change="addStaff"
                  />
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(staff, index) in form.staff_list"
                    :key="staff.id"
                    class="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{{ staff.name }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="staff.hours"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-16 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm"
                      />
                      <span class="text-sm text-muted-foreground">小时</span>
                      <button
                        type="button"
                        class="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeStaff(index)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div v-if="form.staff_list.length === 0" class="text-center py-6 text-muted-foreground text-sm">
                    暂无施工人员，请从上方添加
                  </div>
                </div>

                <div class="flex justify-between items-center pt-3 border-t border-border">
                  <span class="font-medium">总工时</span>
                  <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 5" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <DollarSign class="h-5 w-5 text-primary" />
                  费用记录
                </h3>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-muted/50 mb-4">
                <div>
                  <div class="text-sm font-medium">是否含税</div>
                  <div class="text-xs text-muted-foreground">税率 3%</div>
                </div>
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                  @click="form.has_tax = !form.has_tax"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="form.has_tax ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
              </div>

              <div v-if="regularFeeItems.length > 0" class="mb-5">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-muted-foreground">常规费用</h4>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-primary font-medium"
                    @click="addRegularFee"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    添加
                  </button>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="item in regularFeeItems"
                    :key="item.id"
                    class="p-3 rounded-xl bg-muted/50 space-y-3"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">
                        {{ item.desc || `费用项` }}
                      </span>
                      <button
                        v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                        type="button"
                        class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeFeeItemById(item.id)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">费用类型</label>
                      <Select
                        v-model="item.type"
                        :options="feeTypeOptions.filter(o => !['material', 'equipment'].includes(o.value))"
                        placeholder="选择类型"
                        title="选择费用类型"
                      />
                    </div>

                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">名称/描述</label>
                      <input
                        v-model="item.desc"
                        type="text"
                        placeholder="费用描述"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">数量</label>
                        <input
                          v-model.number="item.qty"
                          type="number"
                          min="0"
                          :disabled="item.id === 'labor_default'"
                          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                          @input="updateFeeSubtotalById(item.id)"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">单价</label>
                        <input
                          v-model.number="item.price"
                          type="number"
                          min="0"
                          step="0.01"
                          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          @input="updateFeeSubtotalById(item.id)"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">小计</label>
                        <div class="h-10 flex items-center justify-center rounded-lg bg-background border border-input text-sm font-medium">
                          ¥{{ item.subtotal.toFixed(2) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="regularFeeItems.length === 0" class="mb-5">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-muted-foreground">常规费用</h4>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-primary font-medium"
                    @click="addRegularFee"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    添加
                  </button>
                </div>
                <div class="text-center py-4 text-muted-foreground text-xs rounded-xl border border-dashed border-border">
                  暂无常规费用
                </div>
              </div>

              <div v-if="materialFeeItems.length > 0" class="mb-5">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-muted-foreground">设备材料费用</h4>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-primary font-medium"
                    @click="addMaterialFee"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    添加
                  </button>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="item in materialFeeItems"
                    :key="item.id"
                    class="p-3 rounded-xl bg-muted/50 space-y-3"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">
                        {{ item.desc || `费用项` }}
                      </span>
                      <button
                        type="button"
                        class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeFeeItemById(item.id)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">费用类型</label>
                      <Select
                        v-model="item.type"
                        :options="feeTypeOptions.filter(o => ['material', 'equipment'].includes(o.value))"
                        placeholder="选择类型"
                        title="选择费用类型"
                      />
                    </div>

                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">名称/描述</label>
                      <input
                        v-model="item.desc"
                        type="text"
                        placeholder="费用描述"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">数量</label>
                        <input
                          v-model.number="item.qty"
                          type="number"
                          min="0"
                          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          @input="updateFeeSubtotalById(item.id)"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">单价</label>
                        <input
                          v-model.number="item.price"
                          type="number"
                          min="0"
                          step="0.01"
                          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          @input="updateFeeSubtotalById(item.id)"
                        />
                      </div>
                      <div>
                        <label class="mb-1.5 block text-xs text-muted-foreground">小计</label>
                        <div class="h-10 flex items-center justify-center rounded-lg bg-background border border-input text-sm font-medium">
                          ¥{{ item.subtotal.toFixed(2) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="materialFeeItems.length === 0">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-sm font-medium text-muted-foreground">设备材料费用</h4>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-primary font-medium"
                    @click="addMaterialFee"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    添加
                  </button>
                </div>
                <div class="text-center py-4 text-muted-foreground text-xs rounded-xl border border-dashed border-border">
                  暂无设备材料费用
                </div>
              </div>

              <div v-if="form.fee_items.length > 0" class="mt-4 space-y-2 pt-4 border-t border-border">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">费用合计</span>
                  <span class="font-medium">¥{{ totalFee.toFixed(2) }}</span>
                </div>
                <div v-if="form.has_tax" class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">税额 (3%)</span>
                  <span class="font-medium">¥{{ taxAmount.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-border">
                  <span class="font-semibold">总计</span>
                  <span class="text-xl font-bold text-primary">¥{{ grandTotal.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 6" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <Wallet class="h-5 w-5 text-primary" />
                  开支记录
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-primary font-medium"
                  @click="addExpenseItem"
                >
                  <Plus class="h-4 w-4" />
                  添加开支
                </button>
              </div>

              <p class="text-sm text-muted-foreground mb-4">
                {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
              </p>

              <div v-if="form.expense_items.length === 0" class="text-center py-8 text-muted-foreground text-sm rounded-xl border-2 border-dashed border-border">
                暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
              </div>

              <div class="space-y-3">
                <div
                  v-for="(expense, index) in form.expense_items"
                  :key="expense.id"
                  class="p-4 rounded-xl bg-muted/50 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                    <button
                      type="button"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      @click="removeExpenseItem(index)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">支出分类 <span class="text-destructive">*</span></label>
                    <Select
                      :model-value="expense.category"
                      :options="expenseCategories"
                      placeholder="选择支出分类"
                      title="选择支出分类"
                      search-placeholder="搜索分类..."
                      @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">金额 <span class="text-destructive">*</span></label>
                      <input
                        v-model.number="expense.amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">日期</label>
                      <input
                        v-model="expense.expense_date"
                        type="date"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">备注说明</label>
                    <input
                      v-model="expense.description"
                      type="text"
                      placeholder="开支说明（可选）"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div v-if="form.expense_items.length > 0" class="mt-4 pt-4 border-t border-border">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">开支合计</span>
                  <span class="text-lg font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 7" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Image class="h-5 w-5 text-primary" />
                现场照片
              </h3>
              <PhotoUploader v-model="form.photos" :max-count="9" />
            </div>

            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Paperclip class="h-5 w-5 text-primary" />
                备注
              </h3>
              <textarea
                v-model="form.remark"
                rows="4"
                placeholder="其他需要说明的内容..."
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </template>

        <!-- 施工单 -->
        <template v-if="form.order_type === 'construction'">
          <div v-show="currentStep === 1" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <User class="h-5 w-5 text-primary" />
                客户信息
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <Select
                        v-model="form.customer_name"
                        :options="customers"
                        placeholder="选择客户"
                        title="选择客户"
                        search-placeholder="搜索客户名称..."
                        @change="onCustomerChange"
                      />
                    </div>
                    <button
                      type="button"
                      class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-input bg-background text-primary hover:bg-accent/50 active:bg-accent transition-colors"
                      @click="openQuickCreateCustomer"
                    >
                      <Plus class="h-5 w-5" />
                    </button>
                  </div>
                  <p v-if="errors.customer_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.customer_name }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">工作地址 <span class="text-destructive">*</span></label>
                  <div class="relative">
                    <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.work_address"
                      type="text"
                      placeholder="请输入工作地址"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.work_address }"
                      @blur="validateField('work_address')"
                    />
                  </div>
                  <p v-if="errors.work_address" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.work_address }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-2 block text-sm font-medium">联系人</label>
                    <div class="relative">
                      <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.contact_person"
                        type="text"
                        placeholder="联系人姓名"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">联系电话</label>
                    <div class="relative">
                      <Phone class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.contact_phone"
                        type="tel"
                        placeholder="联系电话"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.contact_phone }"
                        @blur="validateField('contact_phone')"
                      />
                    </div>
                    <p v-if="errors.contact_phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.contact_phone }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 2" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Calendar class="h-5 w-5 text-primary" />
                施工日期
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">施工日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.work_date"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-2 block text-sm font-medium">开始时间</label>
                    <div class="relative">
                      <Clock class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.start_time"
                        type="time"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">结束时间</label>
                    <div class="relative">
                      <Clock class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.end_time"
                        type="time"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div v-if="form.work_hours > 0" class="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span class="text-muted-foreground">预计工时</span>
                  <span class="text-lg font-semibold text-primary">{{ form.work_hours }} 小时</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 3" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Users class="h-5 w-5 text-primary" />
                人员工时
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">添加施工人员</label>
                  <Select
                    :model-value="null"
                    :options="availableStaffs"
                    placeholder="选择施工人员"
                    title="选择施工人员"
                    search-placeholder="搜索人员..."
                    @change="addStaff"
                  />
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(staff, index) in form.staff_list"
                    :key="staff.id"
                    class="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{{ staff.name }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="staff.hours"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-16 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm"
                      />
                      <span class="text-sm text-muted-foreground">小时</span>
                      <button
                        type="button"
                        class="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeStaff(index)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div v-if="form.staff_list.length === 0" class="text-center py-6 text-muted-foreground text-sm">
                    暂无施工人员，请从上方添加
                  </div>
                </div>

                <div class="flex justify-between items-center pt-3 border-t border-border">
                  <span class="font-medium">总工时</span>
                  <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 4" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Hammer class="h-5 w-5 text-primary" />
                施工内容
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">工单标题 <span class="text-destructive">*</span></label>
                  <input
                    v-model="form.title"
                    type="text"
                    placeholder="请输入工单标题"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.title }"
                  />
                  <p v-if="errors.title" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.title }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">施工类型</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="type in recordTypeOptions"
                      :key="type.value"
                      class="h-12 rounded-xl border text-sm font-medium transition-all"
                      :class="form.record_type === type.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'"
                      @click="form.record_type = type.value"
                    >
                      {{ type.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">优先级</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="p in priorityOptions"
                      :key="p.value"
                      class="h-12 rounded-xl border text-sm font-medium transition-all"
                      :class="form.priority === p.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'"
                      @click="form.priority = p.value"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">
                    工作内容 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.work_content"
                    rows="5"
                    placeholder="请详细描述工作内容、问题、解决方案等..."
                    class="min-h-[120px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.work_content }"
                  />
                  <p v-if="errors.work_content" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.work_content }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 5" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <DollarSign class="h-5 w-5 text-primary" />
                  费用列表
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-primary font-medium"
                  @click="addFeeItem"
                >
                  <Plus class="h-4 w-4" />
                  添加
                </button>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-muted/50 mb-4">
                <div>
                  <div class="text-sm font-medium">是否含税</div>
                  <div class="text-xs text-muted-foreground">税率 3%</div>
                </div>
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                  @click="form.has_tax = !form.has_tax"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="form.has_tax ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(item, index) in form.fee_items"
                  :key="item.id"
                  class="p-3 rounded-xl bg-muted/50 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">
                      {{ item.desc || `费用项 ${index + 1}` }}
                    </span>
                    <button
                      v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                      type="button"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      @click="removeFeeItem(index)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">费用类型</label>
                    <Select
                      v-model="item.type"
                      :options="feeTypeOptions"
                      placeholder="选择类型"
                      title="选择费用类型"
                    />
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">名称/描述</label>
                    <input
                      v-model="item.desc"
                      type="text"
                      placeholder="费用描述"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">数量</label>
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="0"
                        :disabled="item.id === 'labor_default'"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">单价</label>
                      <input
                        v-model.number="item.price"
                        type="number"
                        min="0"
                        step="0.01"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">小计</label>
                      <div class="h-10 flex items-center justify-center rounded-lg bg-background border border-input text-sm font-medium">
                        ¥{{ item.subtotal.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="form.fee_items.length === 0" class="text-center py-8 text-muted-foreground text-sm rounded-xl border-2 border-dashed border-border">
                  暂无费用记录，点击右上角添加
                </div>
              </div>

              <div v-if="form.fee_items.length > 0" class="mt-4 space-y-2 pt-4 border-t border-border">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">费用合计</span>
                  <span class="font-medium">¥{{ totalFee.toFixed(2) }}</span>
                </div>
                <div v-if="form.has_tax" class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">税额 (3%)</span>
                  <span class="font-medium">¥{{ taxAmount.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-border">
                  <span class="font-semibold">总计</span>
                  <span class="text-xl font-bold text-primary">¥{{ grandTotal.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 6" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <Wallet class="h-5 w-5 text-primary" />
                  开支记录
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-primary font-medium"
                  @click="addExpenseItem"
                >
                  <Plus class="h-4 w-4" />
                  添加开支
                </button>
              </div>

              <p class="text-sm text-muted-foreground mb-4">
                {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
              </p>

              <div v-if="form.expense_items.length === 0" class="text-center py-8 text-muted-foreground text-sm rounded-xl border-2 border-dashed border-border">
                暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
              </div>

              <div class="space-y-3">
                <div
                  v-for="(expense, index) in form.expense_items"
                  :key="expense.id"
                  class="p-4 rounded-xl bg-muted/50 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                    <button
                      type="button"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      @click="removeExpenseItem(index)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">支出分类 <span class="text-destructive">*</span></label>
                    <Select
                      :model-value="expense.category"
                      :options="expenseCategories"
                      placeholder="选择支出分类"
                      title="选择支出分类"
                      search-placeholder="搜索分类..."
                      @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">金额 <span class="text-destructive">*</span></label>
                      <input
                        v-model.number="expense.amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">日期</label>
                      <input
                        v-model="expense.expense_date"
                        type="date"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">备注说明</label>
                    <input
                      v-model="expense.description"
                      type="text"
                      placeholder="开支说明（可选）"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div v-if="form.expense_items.length > 0" class="mt-4 pt-4 border-t border-border">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">开支合计</span>
                  <span class="text-lg font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 7" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Image class="h-5 w-5 text-primary" />
                现场照片
              </h3>
              <PhotoUploader v-model="form.photos" :max-count="9" />
            </div>

            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Paperclip class="h-5 w-5 text-primary" />
                备注
              </h3>
              <textarea
                v-model="form.remark"
                rows="4"
                placeholder="其他需要说明的内容..."
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
        </template>

        <!-- 维修单流程 -->
        <template v-if="form.order_type === 'repair'">
          <!-- Step 1: 客户信息 -->
          <div v-show="currentStep === 1" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <User class="h-5 w-5 text-primary" />
                客户信息
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <Select
                        v-model="form.customer_name"
                        :options="customers"
                        placeholder="选择或搜索客户"
                        title="选择客户"
                        search-placeholder="搜索客户名称..."
                        @change="onCustomerChange"
                      />
                    </div>
                    <button
                      type="button"
                      class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-input bg-background text-primary hover:bg-accent/50 active:bg-accent transition-colors"
                      @click="openQuickCreateCustomer"
                    >
                      <Plus class="h-5 w-5" />
                    </button>
                  </div>
                  <p v-if="errors.customer_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.customer_name }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">工作地址 <span class="text-destructive">*</span></label>
                  <div class="relative">
                    <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.work_address"
                      type="text"
                      placeholder="请输入工作地址"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.work_address }"
                      @blur="validateField('work_address')"
                    />
                  </div>
                  <p v-if="errors.work_address" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.work_address }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-2 block text-sm font-medium">联系人</label>
                    <div class="relative">
                      <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.contact_person"
                        type="text"
                        placeholder="联系人姓名"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">联系电话</label>
                    <div class="relative">
                      <Phone class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.contact_phone"
                        type="tel"
                        placeholder="联系电话"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.contact_phone }"
                        @blur="validateField('contact_phone')"
                      />
                    </div>
                    <p v-if="errors.contact_phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.contact_phone }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: 维修日期 -->
          <div v-show="currentStep === 2" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Calendar class="h-5 w-5 text-primary" />
                维修日期
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">维修日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.work_date"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-2 block text-sm font-medium">开始时间</label>
                    <div class="relative">
                      <Clock class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.start_time"
                        type="time"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">结束时间</label>
                    <div class="relative">
                      <Clock class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <input
                        v-model="form.end_time"
                        type="time"
                        class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div v-if="form.work_hours > 0" class="flex justify-between items-center p-4 rounded-xl bg-muted/50">
                  <span class="text-muted-foreground">自动计算工时</span>
                  <span class="text-lg font-semibold text-primary">{{ form.work_hours }} 小时</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: 人员工时 -->
          <div v-show="currentStep === 3" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Users class="h-5 w-5 text-primary" />
                人员工时
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">添加维修人员</label>
                  <Select
                    :model-value="null"
                    :options="availableStaffs"
                    placeholder="选择维修人员"
                    title="选择维修人员"
                    search-placeholder="搜索人员..."
                    @change="addStaff"
                  />
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(staff, index) in form.staff_list"
                    :key="staff.id"
                    class="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">{{ staff.name }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <input
                        v-model.number="staff.hours"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-16 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm"
                      />
                      <span class="text-sm text-muted-foreground">小时</span>
                      <button
                        type="button"
                        class="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeStaff(index)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div v-if="form.staff_list.length === 0" class="text-center py-6 text-muted-foreground text-sm">
                    暂无维修人员，请从上方添加
                  </div>
                </div>

                <div class="flex justify-between items-center pt-3 border-t border-border">
                  <span class="font-medium">总工时</span>
                  <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: 故障现象 -->
          <div v-show="currentStep === 4" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <AlertTriangle class="h-5 w-5 text-primary" />
                故障现象
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">故障类型 <span class="text-destructive">*</span></label>
                  <Select
                    v-model="form.fault_type"
                    :options="faultTypeOptions"
                    placeholder="请选择故障类型"
                    title="故障类型"
                  />
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">保修状态</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="option in warrantyStatusOptions"
                      :key="option.value"
                      class="h-12 rounded-xl border text-sm font-medium transition-all"
                      :class="form.warranty_status === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground'"
                      @click="form.warranty_status = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">
                    故障描述 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.fault_description"
                    rows="6"
                    placeholder="请详细描述故障现象，包括故障发生时间、具体表现、影响范围等..."
                    class="min-h-[150px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.fault_description }"
                    @blur="validateField('fault_description')"
                  />
                  <p v-if="errors.fault_description" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.fault_description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: 故障诊断 -->
          <div v-show="currentStep === 5" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Search class="h-5 w-5 text-primary" />
                故障诊断
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    故障分析诊断 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.fault_diagnosis"
                    rows="8"
                    placeholder="请详细描述故障原因分析、诊断过程、检测结果等..."
                    class="min-h-[180px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.fault_diagnosis }"
                    @blur="validateField('fault_diagnosis')"
                  />
                  <p v-if="errors.fault_diagnosis" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.fault_diagnosis }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 6: 维修内容 -->
          <div v-show="currentStep === 6" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Wrench class="h-5 w-5 text-primary" />
                维修内容
              </h3>
              <div class="space-y-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    维修过程/内容 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.repair_process"
                    rows="8"
                    placeholder="请详细描述维修过程、采取的措施、更换的部件、调试结果等..."
                    class="min-h-[180px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.repair_process }"
                    @blur="validateField('repair_process')"
                  />
                  <p v-if="errors.repair_process" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.repair_process }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 7: 维修结果 -->
          <div v-show="currentStep === 7" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <CheckCircle class="h-5 w-5 text-primary" />
                维修结果
              </h3>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <button
                    class="h-20 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.repair_result === 'completed'
                      ? 'border-success bg-success/10 text-success'
                      : 'border-input bg-background text-foreground'"
                    @click="form.repair_result = 'completed'"
                  >
                    <CheckCircle class="h-8 w-8" />
                    <div class="font-semibold">维修完成</div>
                  </button>
                  <button
                    class="h-20 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.repair_result === 'incomplete'
                      ? 'border-warning bg-warning/10 text-warning'
                      : 'border-input bg-background text-foreground'"
                    @click="form.repair_result = 'incomplete'"
                  >
                    <XCircle class="h-8 w-8" />
                    <div class="font-semibold">未完成</div>
                  </button>
                </div>

                <div v-if="form.repair_result === 'incomplete'" class="space-y-4 p-4 rounded-xl bg-muted/50">
                  <div>
                    <label class="mb-2 block text-sm font-medium">未完成原因类型 <span class="text-destructive">*</span></label>
                    <Select
                      v-model="form.incomplete_reason_type"
                      :options="incompleteReasonTypeOptions"
                      placeholder="请选择原因类型"
                      title="未完成原因类型"
                    />
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">原因说明 <span class="text-destructive">*</span></label>
                    <textarea
                      v-model="form.incomplete_reason"
                      rows="4"
                      placeholder="请详细说明未完成的具体原因..."
                      class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>

                  <div class="flex items-center justify-between p-3 rounded-lg bg-background border border-input">
                    <div>
                      <div class="font-medium text-sm">转入待办</div>
                      <div class="text-xs text-muted-foreground">将此工单转为待办事项</div>
                    </div>
                    <button
                      type="button"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      :class="form.convert_to_pending ? 'bg-primary' : 'bg-muted'"
                      @click="form.convert_to_pending = !form.convert_to_pending"
                    >
                      <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        :class="form.convert_to_pending ? 'translate-x-6' : 'translate-x-1'"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 8: 费用列表 -->
          <div v-show="currentStep === 8" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <DollarSign class="h-5 w-5 text-primary" />
                  费用列表
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-primary font-medium"
                  @click="addFeeItem"
                >
                  <Plus class="h-4 w-4" />
                  添加
                </button>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-muted/50 mb-4">
                <div>
                  <div class="text-sm font-medium">是否含税</div>
                  <div class="text-xs text-muted-foreground">税率 3%</div>
                </div>
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                  @click="form.has_tax = !form.has_tax"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="form.has_tax ? 'translate-x-6' : 'translate-x-1'"
                  ></span>
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(item, index) in form.fee_items"
                  :key="item.id"
                  class="p-3 rounded-xl bg-muted/50 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">
                      {{ item.desc || `费用项 ${index + 1}` }}
                    </span>
                    <button
                      v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                      type="button"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      @click="removeFeeItem(index)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">费用类型</label>
                    <Select
                      v-model="item.type"
                      :options="feeTypeOptions"
                      placeholder="选择类型"
                      title="选择费用类型"
                    />
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">名称/描述</label>
                    <input
                      v-model="item.desc"
                      type="text"
                      placeholder="费用描述"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">数量</label>
                      <input
                        v-model.number="item.qty"
                        type="number"
                        min="0"
                        :disabled="item.id === 'labor_default'"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">单价</label>
                      <input
                        v-model.number="item.price"
                        type="number"
                        min="0"
                        step="0.01"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        @input="updateFeeSubtotal(index)"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">小计</label>
                      <div class="h-10 flex items-center justify-center rounded-lg bg-background border border-input text-sm font-medium">
                        ¥{{ item.subtotal.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="form.fee_items.length === 0" class="text-center py-8 text-muted-foreground text-sm rounded-xl border-2 border-dashed border-border">
                  暂无费用记录，点击右上角添加
                </div>
              </div>

              <div v-if="form.fee_items.length > 0" class="mt-4 space-y-2 pt-4 border-t border-border">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">费用合计</span>
                  <span class="font-medium">¥{{ totalFee.toFixed(2) }}</span>
                </div>
                <div v-if="form.has_tax" class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">税额 (3%)</span>
                  <span class="font-medium">¥{{ taxAmount.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-border">
                  <span class="font-semibold">总计</span>
                  <span class="text-xl font-bold text-primary">¥{{ grandTotal.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 9" class="space-y-5 px-4 py-5">
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="flex items-center gap-2 font-semibold">
                  <Wallet class="h-5 w-5 text-primary" />
                  开支记录
                </h3>
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-primary font-medium"
                  @click="addExpenseItem"
                >
                  <Plus class="h-4 w-4" />
                  添加开支
                </button>
              </div>

              <p class="text-sm text-muted-foreground mb-4">
                {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
              </p>

              <div v-if="form.expense_items.length === 0" class="text-center py-8 text-muted-foreground text-sm rounded-xl border-2 border-dashed border-border">
                暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
              </div>

              <div class="space-y-3">
                <div
                  v-for="(expense, index) in form.expense_items"
                  :key="expense.id"
                  class="p-4 rounded-xl bg-muted/50 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                    <button
                      type="button"
                      class="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      @click="removeExpenseItem(index)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">支出分类 <span class="text-destructive">*</span></label>
                    <Select
                      :model-value="expense.category"
                      :options="expenseCategories"
                      placeholder="选择支出分类"
                      title="选择支出分类"
                      search-placeholder="搜索分类..."
                      @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">金额 <span class="text-destructive">*</span></label>
                      <input
                        v-model.number="expense.amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label class="mb-1.5 block text-xs text-muted-foreground">日期</label>
                      <input
                        v-model="expense.expense_date"
                        type="date"
                        class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="mb-1.5 block text-xs text-muted-foreground">备注说明</label>
                    <input
                      v-model="expense.description"
                      type="text"
                      placeholder="开支说明（可选）"
                      class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div v-if="form.expense_items.length > 0" class="mt-4 pt-4 border-t border-border">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">开支合计</span>
                  <span class="text-lg font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-show="currentStep === 10" class="space-y-5 px-4 py-5">
            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Image class="h-5 w-5 text-primary" />
                现场照片
              </h3>
              <PhotoUploader v-model="form.photos" :max-count="9" />
            </div>

            <div>
              <h3 class="mb-4 flex items-center gap-2 font-semibold">
                <Paperclip class="h-5 w-5 text-primary" />
                备注
              </h3>
              <textarea
                v-model="form.remark"
                rows="4"
                placeholder="其他需要说明的内容..."
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

        </template>
      </div>

      <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 pb-safe">
        <div class="mx-auto flex max-w-lg gap-3">
          <Button
            v-if="currentStep > 0"
            variant="outline"
            size="xl"
            class="flex-1"
            @click="prevStep"
          >
            <ChevronLeft class="h-5 w-5" />
            上一步
          </Button>
          <Button
            v-if="currentStep < totalSteps - 1"
            size="xl"
            class="flex-1"
            :disabled="!canGoNext"
            @click="nextStep"
          >
            下一步
            <ChevronRight class="h-5 w-5" />
          </Button>
          <Button
            v-else
            size="xl"
            class="flex-1"
            :loading="submitting"
            @click="handleSubmit"
          >
            <Check class="h-5 w-5" />
            {{ isEdit ? '保存修改' : '提交工单' }}
          </Button>
        </div>
      </div>
    </template>

    <!-- 桌面端 -->
    <template v-else>
      <div class="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl">{{ isEdit ? '编辑工单' : '新建工单' }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="mb-8">
              <div class="flex items-center justify-between">
                <div
                  v-for="(label, index) in stepLabels"
                  :key="index"
                  class="flex items-center flex-1"
                >
                  <div class="flex items-center">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                      :class="currentStep > index
                        ? 'bg-success text-white'
                        : currentStep === index
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'"
                    >
                      <Check v-if="currentStep > index" class="h-5 w-5" />
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <span
                      class="ml-3 text-sm font-medium"
                      :class="currentStep >= index ? 'text-foreground' : 'text-muted-foreground'"
                    >
                      {{ label }}
                    </span>
                  </div>
                  <div
                    v-if="index < stepLabels.length - 1"
                    class="flex-1 h-0.5 mx-4"
                    :class="currentStep > index ? 'bg-primary' : 'bg-muted'"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Step 0: 工单类型选择 -->
            <div v-show="currentStep === 0" class="space-y-6">
              <div>
                <label class="mb-2 block text-sm font-medium">工单类型</label>
                <div class="grid grid-cols-3 gap-3 max-w-3xl">
                  <button
                    class="h-24 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.order_type === 'project_construction'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background text-foreground'"
                    @click="switchOrderType('project_construction')"
                  >
                    <Building2 class="h-7 w-7" />
                    <div class="font-semibold">项目施工单</div>
                    <div class="text-xs text-muted-foreground">关联项目</div>
                  </button>
                  <button
                    class="h-24 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.order_type === 'construction'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background text-foreground'"
                    @click="switchOrderType('construction')"
                  >
                    <Hammer class="h-7 w-7" />
                    <div class="font-semibold">施工单</div>
                    <div class="text-xs text-muted-foreground">普通施工</div>
                  </button>
                  <button
                    class="h-24 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.order_type === 'repair'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background text-foreground'"
                    @click="switchOrderType('repair')"
                  >
                    <Wrench class="h-7 w-7" />
                    <div class="font-semibold">维修单</div>
                    <div class="text-xs text-muted-foreground">设备维修</div>
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">选择模板（可选）</label>
                <div class="max-w-xl">
                  <Select
                    v-model="form.selected_template_id"
                    :options="templates"
                    placeholder="选择工单模板快速创建"
                    title="选择模板"
                    search-placeholder="搜索模板名称..."
                    @change="onTemplateChange"
                  />
                </div>
                <p class="mt-2 text-xs text-muted-foreground">选择模板后将自动填充工单内容、费用项等预设信息</p>
              </div>
            </div>

            <!-- 项目施工单 -->
            <template v-if="form.order_type === 'project_construction'">
              <div v-show="currentStep === 1" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-medium">选择项目 <span class="text-destructive">*</span></label>
                    <Select
                      v-model="form.project_name"
                      :options="projects"
                      placeholder="请选择项目"
                      title="选择项目"
                      search-placeholder="搜索项目名称..."
                      @change="onProjectChange"
                    />
                    <p v-if="errors.project_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.project_name }}
                    </p>
                  </div>

                  <div v-if="form.project_id" class="rounded-lg bg-muted/50 p-4 space-y-3">
                    <div class="text-sm font-medium mb-2">项目信息</div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">客户名称</span>
                      <span class="font-medium">{{ form.customer_name || '-' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">工作地址</span>
                      <span class="font-medium text-right flex-1 ml-4 truncate">{{ form.work_address || '-' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">联系人</span>
                      <span class="font-medium">{{ form.contact_person || '-' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">联系电话</span>
                      <span class="font-medium">{{ form.contact_phone || '-' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 2" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="space-y-5">
                    <div>
                      <label class="mb-2 block text-sm font-medium">工单标题 <span class="text-destructive">*</span></label>
                      <input
                        v-model="form.title"
                        type="text"
                        placeholder="请输入工单标题"
                        class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.title }"
                      />
                      <p v-if="errors.title" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle class="h-3.5 w-3.5" />
                        {{ errors.title }}
                      </p>
                    </div>

                    <div>
                      <label class="mb-2 block text-sm font-medium">施工类型</label>
                      <div class="grid grid-cols-5 gap-2">
                        <button
                          v-for="type in recordTypeOptions"
                          :key="type.value"
                          class="h-11 rounded-lg border text-sm font-medium transition-all"
                          :class="form.record_type === type.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background text-foreground'"
                          @click="form.record_type = type.value"
                        >
                          {{ type.label }}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label class="mb-2 block text-sm font-medium">优先级</label>
                      <div class="grid grid-cols-3 gap-2 max-w-xs">
                        <button
                          v-for="p in priorityOptions"
                          :key="p.value"
                          class="h-11 rounded-lg border text-sm font-medium transition-all"
                          :class="form.priority === p.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background text-foreground'"
                          @click="form.priority = p.value"
                        >
                          {{ p.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">
                      工作内容 <span class="text-destructive">*</span>
                    </label>
                    <textarea
                      v-model="form.work_content"
                      rows="8"
                      placeholder="请详细描述工作内容..."
                      class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      :class="{ 'border-destructive': errors.work_content }"
                    />
                    <p v-if="errors.work_content" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.work_content }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 3" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="space-y-5">
                    <div>
                      <label class="mb-2 block text-sm font-medium">施工阶段</label>
                      <Select
                        v-model="form.project_stage"
                        :options="projectStageOptions.map(o => ({ value: o.value, label: o.label }))"
                        placeholder="请选择施工阶段"
                        title="选择施工阶段"
                      />
                    </div>

                    <div>
                      <label class="mb-2 block text-sm font-medium">
                        进度百分比: {{ form.progress_percent }}%
                      </label>
                      <div class="flex items-center gap-4">
                        <input
                          v-model.number="form.progress_percent"
                          type="range"
                          min="0"
                          max="100"
                          class="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <input
                          v-model.number="form.progress_percent"
                          type="number"
                          min="0"
                          max="100"
                          class="w-20 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm"
                        />
                      </div>
                      <div class="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          class="h-full bg-primary transition-all duration-300"
                          :style="{ width: form.progress_percent + '%' }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">进度说明</label>
                    <textarea
                      v-model="form.progress_note"
                      rows="6"
                      placeholder="请描述当前进度情况..."
                      class="min-h-[150px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 4" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-medium">添加施工人员</label>
                    <Select
                      :model-value="null"
                      :options="availableStaffs"
                      placeholder="选择施工人员"
                      title="选择施工人员"
                      search-placeholder="搜索人员..."
                      @change="addStaff"
                    />
                  </div>

                  <div class="flex items-end">
                    <div class="flex-1 p-4 rounded-lg bg-muted/50">
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-muted-foreground">已添加人员</span>
                        <span class="text-sm font-medium">{{ form.staff_list.length }} 人</span>
                      </div>
                      <div class="flex justify-between items-center mt-2">
                        <span class="text-sm text-muted-foreground">总工时</span>
                        <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="mb-3 block text-sm font-medium">施工人员列表</label>
                  <div class="border border-border rounded-lg overflow-hidden">
                    <table class="w-full">
                      <thead class="bg-muted/50">
                        <tr>
                          <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">姓名</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-32">工时（小时）</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(staff, index) in form.staff_list" :key="staff.id" class="border-t border-border">
                          <td class="px-4 py-3 text-sm">{{ staff.name }}</td>
                          <td class="px-4 py-3">
                            <input
                              v-model.number="staff.hours"
                              type="number"
                              min="0"
                              step="0.5"
                              class="w-full h-8 rounded-md border border-input bg-background px-2 text-center text-sm"
                            />
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button
                              type="button"
                              class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              @click="removeStaff(index)"
                            >
                              <Trash2 class="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        <tr v-if="form.staff_list.length === 0">
                          <td colspan="3" class="px-4 py-8 text-center text-sm text-muted-foreground">
                            暂无施工人员，请从上方添加
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 5" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-medium">费用明细</h3>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-muted-foreground">是否含税（3%）</span>
                      <button
                        type="button"
                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                        :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                        @click="form.has_tax = !form.has_tax"
                      >
                        <span
                          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                          :class="form.has_tax ? 'translate-x-5' : 'translate-x-0.5'"
                        ></span>
                      </button>
                    </div>
                    <Button size="sm" @click="addFeeItem">
                      <Plus class="h-4 w-4" />
                      添加费用
                    </Button>
                  </div>
                </div>

                <div class="border border-border rounded-lg overflow-hidden">
                  <table class="w-full">
                    <thead class="bg-muted/50">
                      <tr>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">类型</th>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称/描述</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">数量</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">单位</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">单价</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">小计</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in form.fee_items" :key="item.id" class="border-t border-border">
                        <td class="px-4 py-3">
                          <Select
                            v-model="item.type"
                            :options="feeTypeOptions"
                            placeholder="选择"
                            title="选择费用类型"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.desc"
                            type="text"
                            placeholder="费用描述"
                            class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.qty"
                            type="number"
                            min="0"
                            :disabled="item.id === 'labor_default'"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.unit"
                            type="text"
                            placeholder="单位"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.price"
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3 text-right text-sm font-medium">
                          ¥{{ item.subtotal.toFixed(2) }}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <button
                            v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                            type="button"
                            class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            @click="removeFeeItem(index)"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="form.fee_items.length === 0">
                        <td colspan="7" class="px-4 py-12 text-center text-sm text-muted-foreground">
                          暂无费用记录，点击上方按钮添加
                        </td>
                      </tr>
                    </tbody>
                    <tfoot v-if="form.fee_items.length > 0" class="border-t border-border bg-muted/30">
                      <tr>
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">费用合计</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ totalFee.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr v-if="form.has_tax">
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">税额 (3%)</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ taxAmount.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr class="border-t border-border">
                        <td colspan="5" class="px-4 py-3 text-right text-sm font-semibold">总计</td>
                        <td class="px-4 py-3 text-right text-lg font-bold text-primary">
                          ¥{{ grandTotal.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div v-show="currentStep === 6" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="flex items-center gap-2 text-base font-medium">
                    <Wallet class="h-5 w-5 text-primary" />
                    开支记录
                  </h3>
                  <Button size="sm" @click="addExpenseItem">
                    <Plus class="h-4 w-4" />
                    添加开支
                  </Button>
                </div>
                <p class="text-sm text-muted-foreground">
                  {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
                </p>
                <div v-if="form.expense_items.length === 0" class="text-center py-12 text-muted-foreground text-sm rounded-lg border-2 border-dashed border-border">
                  暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
                </div>
                <div class="space-y-4">
                  <div
                    v-for="(expense, index) in form.expense_items"
                    :key="expense.id"
                    class="p-5 rounded-lg bg-muted/30 space-y-4"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                      <button
                        type="button"
                        class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeExpenseItem(index)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label class="mb-2 block text-sm font-medium">支出分类 <span class="text-destructive">*</span></label>
                        <Select
                          :model-value="expense.category"
                          :options="expenseCategories"
                          placeholder="选择支出分类"
                          title="选择支出分类"
                          search-placeholder="搜索分类..."
                          @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                        />
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="mb-2 block text-sm font-medium">金额 <span class="text-destructive">*</span></label>
                          <input
                            v-model.number="expense.amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label class="mb-2 block text-sm font-medium">日期</label>
                          <input
                            v-model="expense.expense_date"
                            type="date"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label class="mb-2 block text-sm font-medium">备注说明</label>
                      <input
                        v-model="expense.description"
                        type="text"
                        placeholder="开支说明（可选）"
                        class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
                <div v-if="form.expense_items.length > 0" class="pt-4 border-t border-border">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">开支合计</span>
                    <span class="text-xl font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 7" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-3 block text-sm font-medium">现场照片</label>
                    <PhotoUploader v-model="form.photos" :max-count="9" />
                  </div>
                  <div>
                    <label class="mb-3 block text-sm font-medium">备注</label>
                    <textarea
                      v-model="form.remark"
                      rows="8"
                      placeholder="其他需要说明的内容..."
                      class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </div>
            </template>

            <!-- 施工单 -->
            <template v-if="form.order_type === 'construction'">
              <div v-show="currentStep === 1" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="space-y-5">
                    <div>
                      <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
                      <div class="flex gap-2">
                        <div class="flex-1">
                          <Select
                            v-model="form.customer_name"
                            :options="customers"
                            placeholder="选择客户"
                            title="选择客户"
                            search-placeholder="搜索客户名称..."
                            @change="onCustomerChange"
                          />
                        </div>
                        <button
                          type="button"
                          class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-input bg-background text-primary hover:bg-accent/50 active:bg-accent transition-colors"
                          @click="openQuickCreateCustomer"
                        >
                          <Plus class="h-5 w-5" />
                        </button>
                      </div>
                      <p v-if="errors.customer_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle class="h-3.5 w-3.5" />
                        {{ errors.customer_name }}
                      </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-2 block text-sm font-medium">联系人</label>
                        <div class="relative">
                          <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <input
                            v-model="form.contact_person"
                            type="text"
                            placeholder="联系人姓名"
                            class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label class="mb-2 block text-sm font-medium">联系电话</label>
                        <div class="relative">
                          <Phone class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <input
                            v-model="form.contact_phone"
                            type="tel"
                            placeholder="联系电话"
                            class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            :class="{ 'border-destructive': errors.contact_phone }"
                            @blur="validateField('contact_phone')"
                          />
                        </div>
                        <p v-if="errors.contact_phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle class="h-3.5 w-3.5" />
                          {{ errors.contact_phone }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">工作地址 <span class="text-destructive">*</span></label>
                    <div class="relative">
                      <MapPin class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.work_address"
                        type="text"
                        placeholder="请输入工作地址"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.work_address }"
                        @blur="validateField('work_address')"
                      />
                    </div>
                    <p v-if="errors.work_address" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.work_address }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 2" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-3xl">
                  <div>
                    <label class="mb-2 block text-sm font-medium">施工日期</label>
                    <div class="relative">
                      <Calendar class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.work_date"
                        type="date"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">开始时间</label>
                    <div class="relative">
                      <Clock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.start_time"
                        type="time"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">结束时间</label>
                    <div class="relative">
                      <Clock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.end_time"
                        type="time"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div v-if="form.work_hours > 0" class="flex justify-between items-center p-4 rounded-lg bg-muted/50 max-w-md">
                  <span class="text-muted-foreground">预计工时</span>
                  <span class="text-xl font-semibold text-primary">{{ form.work_hours }} 小时</span>
                </div>
              </div>

              <div v-show="currentStep === 3" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-medium">添加施工人员</label>
                    <Select
                      :model-value="null"
                      :options="availableStaffs"
                      placeholder="选择施工人员"
                      title="选择施工人员"
                      search-placeholder="搜索人员..."
                      @change="addStaff"
                    />
                  </div>

                  <div class="flex items-end">
                    <div class="flex-1 p-4 rounded-lg bg-muted/50">
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-muted-foreground">已添加人员</span>
                        <span class="text-sm font-medium">{{ form.staff_list.length }} 人</span>
                      </div>
                      <div class="flex justify-between items-center mt-2">
                        <span class="text-sm text-muted-foreground">总工时</span>
                        <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="mb-3 block text-sm font-medium">施工人员列表</label>
                  <div class="border border-border rounded-lg overflow-hidden">
                    <table class="w-full">
                      <thead class="bg-muted/50">
                        <tr>
                          <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">姓名</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-32">工时（小时）</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(staff, index) in form.staff_list" :key="staff.id" class="border-t border-border">
                          <td class="px-4 py-3 text-sm">{{ staff.name }}</td>
                          <td class="px-4 py-3">
                            <input
                              v-model.number="staff.hours"
                              type="number"
                              min="0"
                              step="0.5"
                              class="w-full h-8 rounded-md border border-input bg-background px-2 text-center text-sm"
                            />
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button
                              type="button"
                              class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              @click="removeStaff(index)"
                            >
                              <Trash2 class="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        <tr v-if="form.staff_list.length === 0">
                          <td colspan="3" class="px-4 py-8 text-center text-sm text-muted-foreground">
                            暂无施工人员，请从上方添加
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 4" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="space-y-5">
                    <div>
                      <label class="mb-2 block text-sm font-medium">工单标题 <span class="text-destructive">*</span></label>
                      <input
                        v-model="form.title"
                        type="text"
                        placeholder="请输入工单标题"
                        class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.title }"
                      />
                      <p v-if="errors.title" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle class="h-3.5 w-3.5" />
                        {{ errors.title }}
                      </p>
                    </div>

                    <div>
                      <label class="mb-2 block text-sm font-medium">施工类型</label>
                      <div class="grid grid-cols-5 gap-2">
                        <button
                          v-for="type in recordTypeOptions"
                          :key="type.value"
                          class="h-11 rounded-lg border text-sm font-medium transition-all"
                          :class="form.record_type === type.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background text-foreground'"
                          @click="form.record_type = type.value"
                        >
                          {{ type.label }}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label class="mb-2 block text-sm font-medium">优先级</label>
                      <div class="grid grid-cols-3 gap-2 max-w-xs">
                        <button
                          v-for="p in priorityOptions"
                          :key="p.value"
                          class="h-11 rounded-lg border text-sm font-medium transition-all"
                          :class="form.priority === p.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-background text-foreground'"
                          @click="form.priority = p.value"
                        >
                          {{ p.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">
                      工作内容 <span class="text-destructive">*</span>
                    </label>
                    <textarea
                      v-model="form.work_content"
                      rows="8"
                      placeholder="请详细描述工作内容、问题、解决方案等..."
                      class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      :class="{ 'border-destructive': errors.work_content }"
                    />
                    <p v-if="errors.work_content" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.work_content }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 5" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-medium">费用列表</h3>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-muted-foreground">是否含税（3%）</span>
                      <button
                        type="button"
                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                        :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                        @click="form.has_tax = !form.has_tax"
                      >
                        <span
                          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                          :class="form.has_tax ? 'translate-x-5' : 'translate-x-0.5'"
                        ></span>
                      </button>
                    </div>
                    <Button size="sm" @click="addFeeItem">
                      <Plus class="h-4 w-4" />
                      添加费用
                    </Button>
                  </div>
                </div>

                <div class="border border-border rounded-lg overflow-hidden">
                  <table class="w-full">
                    <thead class="bg-muted/50">
                      <tr>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">类型</th>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称/描述</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">数量</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">单位</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">单价</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">小计</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in form.fee_items" :key="item.id" class="border-t border-border">
                        <td class="px-4 py-3">
                          <Select
                            v-model="item.type"
                            :options="feeTypeOptions"
                            placeholder="选择"
                            title="选择费用类型"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.desc"
                            type="text"
                            placeholder="费用描述"
                            class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.qty"
                            type="number"
                            min="0"
                            :disabled="item.id === 'labor_default'"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.unit"
                            type="text"
                            placeholder="单位"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.price"
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3 text-right text-sm font-medium">
                          ¥{{ item.subtotal.toFixed(2) }}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <button
                            v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                            type="button"
                            class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            @click="removeFeeItem(index)"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="form.fee_items.length === 0">
                        <td colspan="7" class="px-4 py-12 text-center text-sm text-muted-foreground">
                          暂无费用记录，点击上方按钮添加
                        </td>
                      </tr>
                    </tbody>
                    <tfoot v-if="form.fee_items.length > 0" class="border-t border-border bg-muted/30">
                      <tr>
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">费用合计</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ totalFee.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr v-if="form.has_tax">
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">税额 (3%)</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ taxAmount.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr class="border-t border-border">
                        <td colspan="5" class="px-4 py-3 text-right text-sm font-semibold">总计</td>
                        <td class="px-4 py-3 text-right text-lg font-bold text-primary">
                          ¥{{ grandTotal.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div v-show="currentStep === 6" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="flex items-center gap-2 text-base font-medium">
                    <Wallet class="h-5 w-5 text-primary" />
                    开支记录
                  </h3>
                  <Button size="sm" @click="addExpenseItem">
                    <Plus class="h-4 w-4" />
                    添加开支
                  </Button>
                </div>
                <p class="text-sm text-muted-foreground">
                  {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
                </p>
                <div v-if="form.expense_items.length === 0" class="text-center py-12 text-muted-foreground text-sm rounded-lg border-2 border-dashed border-border">
                  暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
                </div>
                <div class="space-y-4">
                  <div
                    v-for="(expense, index) in form.expense_items"
                    :key="expense.id"
                    class="p-5 rounded-lg bg-muted/30 space-y-4"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                      <button
                        type="button"
                        class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeExpenseItem(index)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label class="mb-2 block text-sm font-medium">支出分类 <span class="text-destructive">*</span></label>
                        <Select
                          :model-value="expense.category"
                          :options="expenseCategories"
                          placeholder="选择支出分类"
                          title="选择支出分类"
                          search-placeholder="搜索分类..."
                          @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                        />
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="mb-2 block text-sm font-medium">金额 <span class="text-destructive">*</span></label>
                          <input
                            v-model.number="expense.amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label class="mb-2 block text-sm font-medium">日期</label>
                          <input
                            v-model="expense.expense_date"
                            type="date"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label class="mb-2 block text-sm font-medium">备注说明</label>
                      <input
                        v-model="expense.description"
                        type="text"
                        placeholder="开支说明（可选）"
                        class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
                <div v-if="form.expense_items.length > 0" class="pt-4 border-t border-border">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">开支合计</span>
                    <span class="text-xl font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 7" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-3 block text-sm font-medium">现场照片</label>
                    <PhotoUploader v-model="form.photos" :max-count="9" />
                  </div>
                  <div>
                    <label class="mb-3 block text-sm font-medium">备注</label>
                    <textarea
                      v-model="form.remark"
                      rows="8"
                      placeholder="其他需要说明的内容..."
                      class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </div>
            </template>

            <!-- 维修单流程 - 桌面端 -->
            <template v-if="form.order_type === 'repair'">
              <!-- Step 1: 客户信息 -->
              <div v-show="currentStep === 1" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="space-y-5">
                    <div>
                      <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
                      <div class="flex gap-2">
                        <div class="flex-1">
                          <Select
                            v-model="form.customer_name"
                            :options="customers"
                            placeholder="选择或搜索客户"
                            title="选择客户"
                            search-placeholder="搜索客户名称..."
                            @change="onCustomerChange"
                          />
                        </div>
                        <button
                          type="button"
                          class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-input bg-background text-primary hover:bg-accent/50 active:bg-accent transition-colors"
                          @click="openQuickCreateCustomer"
                        >
                          <Plus class="h-5 w-5" />
                        </button>
                      </div>
                      <p v-if="errors.customer_name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle class="h-3.5 w-3.5" />
                        {{ errors.customer_name }}
                      </p>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-2 block text-sm font-medium">联系人</label>
                        <div class="relative">
                          <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <input
                            v-model="form.contact_person"
                            type="text"
                            placeholder="联系人姓名"
                            class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div>
                        <label class="mb-2 block text-sm font-medium">联系电话</label>
                        <div class="relative">
                          <Phone class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <input
                            v-model="form.contact_phone"
                            type="tel"
                            placeholder="联系电话"
                            class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            :class="{ 'border-destructive': errors.contact_phone }"
                            @blur="validateField('contact_phone')"
                          />
                        </div>
                        <p v-if="errors.contact_phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle class="h-3.5 w-3.5" />
                          {{ errors.contact_phone }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">工作地址 <span class="text-destructive">*</span></label>
                    <div class="relative">
                      <MapPin class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.work_address"
                        type="text"
                        placeholder="请输入工作地址"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        :class="{ 'border-destructive': errors.work_address }"
                        @blur="validateField('work_address')"
                      />
                    </div>
                    <p v-if="errors.work_address" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle class="h-3.5 w-3.5" />
                      {{ errors.work_address }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Step 2: 维修日期 -->
              <div v-show="currentStep === 2" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-3xl">
                  <div>
                    <label class="mb-2 block text-sm font-medium">维修日期</label>
                    <div class="relative">
                      <Calendar class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.work_date"
                        type="date"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">开始时间</label>
                    <div class="relative">
                      <Clock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.start_time"
                        type="time"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">结束时间</label>
                    <div class="relative">
                      <Clock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        v-model="form.end_time"
                        type="time"
                        class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div v-if="form.work_hours > 0" class="flex justify-between items-center p-4 rounded-lg bg-muted/50 max-w-md">
                  <span class="text-muted-foreground">自动计算工时</span>
                  <span class="text-xl font-semibold text-primary">{{ form.work_hours }} 小时</span>
                </div>
              </div>

              <!-- Step 3: 人员工时 -->
              <div v-show="currentStep === 3" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-medium">添加维修人员</label>
                    <Select
                      :model-value="null"
                      :options="availableStaffs"
                      placeholder="选择维修人员"
                      title="选择维修人员"
                      search-placeholder="搜索人员..."
                      @change="addStaff"
                    />
                  </div>

                  <div class="flex items-end">
                    <div class="flex-1 p-4 rounded-lg bg-muted/50">
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-muted-foreground">已添加人员</span>
                        <span class="text-sm font-medium">{{ form.staff_list.length }} 人</span>
                      </div>
                      <div class="flex justify-between items-center mt-2">
                        <span class="text-sm text-muted-foreground">总工时</span>
                        <span class="text-lg font-semibold text-primary">{{ totalStaffHours }} 小时</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="mb-3 block text-sm font-medium">维修人员列表</label>
                  <div class="border border-border rounded-lg overflow-hidden">
                    <table class="w-full">
                      <thead class="bg-muted/50">
                        <tr>
                          <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">姓名</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-32">工时（小时）</th>
                          <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(staff, index) in form.staff_list" :key="staff.id" class="border-t border-border">
                          <td class="px-4 py-3 text-sm">{{ staff.name }}</td>
                          <td class="px-4 py-3">
                            <input
                              v-model.number="staff.hours"
                              type="number"
                              min="0"
                              step="0.5"
                              class="w-full h-8 rounded-md border border-input bg-background px-2 text-center text-sm"
                            />
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button
                              type="button"
                              class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              @click="removeStaff(index)"
                            >
                              <Trash2 class="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        <tr v-if="form.staff_list.length === 0">
                          <td colspan="3" class="px-4 py-8 text-center text-sm text-muted-foreground">
                            暂无维修人员，请从上方添加
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Step 4: 故障现象 -->
              <div v-show="currentStep === 4" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-medium">故障类型 <span class="text-destructive">*</span></label>
                    <Select
                      v-model="form.fault_type"
                      :options="faultTypeOptions"
                      placeholder="请选择故障类型"
                      title="故障类型"
                    />
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium">保修状态</label>
                    <div class="grid grid-cols-3 gap-2">
                      <button
                        v-for="option in warrantyStatusOptions"
                        :key="option.value"
                        class="h-11 rounded-lg border text-sm font-medium transition-all"
                        :class="form.warranty_status === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background text-foreground'"
                        @click="form.warranty_status = option.value"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    故障描述 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.fault_description"
                    rows="6"
                    placeholder="请详细描述故障现象，包括故障发生时间、具体表现、影响范围等..."
                    class="min-h-[150px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.fault_description }"
                    @blur="validateField('fault_description')"
                  />
                  <p v-if="errors.fault_description" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.fault_description }}
                  </p>
                </div>
              </div>

              <!-- Step 5: 故障诊断 -->
              <div v-show="currentStep === 5" class="space-y-6">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    故障分析诊断 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.fault_diagnosis"
                    rows="8"
                    placeholder="请详细描述故障原因分析、诊断过程、检测结果等..."
                    class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.fault_diagnosis }"
                    @blur="validateField('fault_diagnosis')"
                  />
                  <p v-if="errors.fault_diagnosis" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.fault_diagnosis }}
                  </p>
                </div>
              </div>

              <!-- Step 6: 维修内容 -->
              <div v-show="currentStep === 6" class="space-y-6">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    维修过程/内容 <span class="text-destructive">*</span>
                  </label>
                  <textarea
                    v-model="form.repair_process"
                    rows="8"
                    placeholder="请详细描述维修过程、采取的措施、更换的部件、调试结果等..."
                    class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    :class="{ 'border-destructive': errors.repair_process }"
                    @blur="validateField('repair_process')"
                  />
                  <p v-if="errors.repair_process" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.repair_process }}
                  </p>
                </div>
              </div>

              <!-- Step 7: 维修结果 -->
              <div v-show="currentStep === 7" class="space-y-6">
                <div class="grid grid-cols-2 gap-3 max-w-lg">
                  <button
                    class="h-20 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.repair_result === 'completed'
                      ? 'border-success bg-success/10 text-success'
                      : 'border-input bg-background text-foreground'"
                    @click="form.repair_result = 'completed'"
                  >
                    <CheckCircle class="h-8 w-8" />
                    <div class="font-semibold">维修完成</div>
                  </button>
                  <button
                    class="h-20 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2"
                    :class="form.repair_result === 'incomplete'
                      ? 'border-warning bg-warning/10 text-warning'
                      : 'border-input bg-background text-foreground'"
                    @click="form.repair_result = 'incomplete'"
                  >
                    <XCircle class="h-8 w-8" />
                    <div class="font-semibold">未完成</div>
                  </button>
                </div>

                <div v-if="form.repair_result === 'incomplete'" class="space-y-4 p-6 rounded-lg bg-muted/50 max-w-3xl">
                  <div>
                    <label class="mb-2 block text-sm font-medium">未完成原因类型 <span class="text-destructive">*</span></label>
                    <Select
                      v-model="form.incomplete_reason_type"
                      :options="incompleteReasonTypeOptions"
                      placeholder="请选择原因类型"
                      title="未完成原因类型"
                    />
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium">原因说明 <span class="text-destructive">*</span></label>
                    <textarea
                      v-model="form.incomplete_reason"
                      rows="4"
                      placeholder="请详细说明未完成的具体原因..."
                      class="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>

                  <div class="flex items-center justify-between p-4 rounded-lg bg-background border border-input max-w-md">
                    <div>
                      <div class="font-medium">转入待办</div>
                      <div class="text-sm text-muted-foreground">将此工单转为待办事项</div>
                    </div>
                    <button
                      type="button"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      :class="form.convert_to_pending ? 'bg-primary' : 'bg-muted'"
                      @click="form.convert_to_pending = !form.convert_to_pending"
                    >
                      <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        :class="form.convert_to_pending ? 'translate-x-6' : 'translate-x-1'"
                      ></span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 8: 费用列表 -->
              <div v-show="currentStep === 8" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-medium">费用列表</h3>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-muted-foreground">是否含税（3%）</span>
                      <button
                        type="button"
                        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                        :class="form.has_tax ? 'bg-primary' : 'bg-muted'"
                        @click="form.has_tax = !form.has_tax"
                      >
                        <span
                          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                          :class="form.has_tax ? 'translate-x-5' : 'translate-x-0.5'"
                        ></span>
                      </button>
                    </div>
                    <Button size="sm" @click="addFeeItem">
                      <Plus class="h-4 w-4" />
                      添加费用
                    </Button>
                  </div>
                </div>

                <div class="border border-border rounded-lg overflow-hidden">
                  <table class="w-full">
                    <thead class="bg-muted/50">
                      <tr>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">类型</th>
                        <th class="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称/描述</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">数量</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-24">单位</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">单价</th>
                        <th class="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">小计</th>
                        <th class="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in form.fee_items" :key="item.id" class="border-t border-border">
                        <td class="px-4 py-3">
                          <Select
                            v-model="item.type"
                            :options="feeTypeOptions"
                            placeholder="选择"
                            title="选择费用类型"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.desc"
                            type="text"
                            placeholder="费用描述"
                            class="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.qty"
                            type="number"
                            min="0"
                            :disabled="item.id === 'labor_default'"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model="item.unit"
                            type="text"
                            placeholder="单位"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-center text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td class="px-4 py-3">
                          <input
                            v-model.number="item.price"
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-full h-9 rounded-md border border-input bg-background px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            @input="updateFeeSubtotal(index)"
                          />
                        </td>
                        <td class="px-4 py-3 text-right text-sm font-medium">
                          ¥{{ item.subtotal.toFixed(2) }}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <button
                            v-if="item.id !== 'labor_default' && item.id !== 'debug_default' && item.id !== 'transport_default'"
                            type="button"
                            class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            @click="removeFeeItem(index)"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="form.fee_items.length === 0">
                        <td colspan="7" class="px-4 py-12 text-center text-sm text-muted-foreground">
                          暂无费用记录，点击上方按钮添加
                        </td>
                      </tr>
                    </tbody>
                    <tfoot v-if="form.fee_items.length > 0" class="border-t border-border bg-muted/30">
                      <tr>
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">费用合计</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ totalFee.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr v-if="form.has_tax">
                        <td colspan="5" class="px-4 py-2 text-right text-sm text-muted-foreground">税额 (3%)</td>
                        <td class="px-4 py-2 text-right text-sm font-medium">
                          ¥{{ taxAmount.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                      <tr class="border-t border-border">
                        <td colspan="5" class="px-4 py-3 text-right text-sm font-semibold">总计</td>
                        <td class="px-4 py-3 text-right text-lg font-bold text-primary">
                          ¥{{ grandTotal.toFixed(2) }}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div v-show="currentStep === 9" class="space-y-6">
                <div class="flex items-center justify-between">
                  <h3 class="flex items-center gap-2 text-base font-medium">
                    <Wallet class="h-5 w-5 text-primary" />
                    开支记录
                  </h3>
                  <Button size="sm" @click="addExpenseItem">
                    <Plus class="h-4 w-4" />
                    添加开支
                  </Button>
                </div>
                <p class="text-sm text-muted-foreground">
                  {{ form.order_type === 'project_construction' && form.project_id ? '项目施工开支将计入项目支出' : '此工单开支将计入系统运营支出' }}
                </p>
                <div v-if="form.expense_items.length === 0" class="text-center py-12 text-muted-foreground text-sm rounded-lg border-2 border-dashed border-border">
                  暂无开支记录，可点击添加本工单产生的费用支出（如材料采购、差旅等）
                </div>
                <div class="space-y-4">
                  <div
                    v-for="(expense, index) in form.expense_items"
                    :key="expense.id"
                    class="p-5 rounded-lg bg-muted/30 space-y-4"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium">开支 #{{ index + 1 }}</span>
                      <button
                        type="button"
                        class="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        @click="removeExpenseItem(index)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label class="mb-2 block text-sm font-medium">支出分类 <span class="text-destructive">*</span></label>
                        <Select
                          :model-value="expense.category"
                          :options="expenseCategories"
                          placeholder="选择支出分类"
                          title="选择支出分类"
                          search-placeholder="搜索分类..."
                          @change="(val: any, opt: any) => onExpenseCategoryChange(index, val, opt)"
                        />
                      </div>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="mb-2 block text-sm font-medium">金额 <span class="text-destructive">*</span></label>
                          <input
                            v-model.number="expense.amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label class="mb-2 block text-sm font-medium">日期</label>
                          <input
                            v-model="expense.expense_date"
                            type="date"
                            class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label class="mb-2 block text-sm font-medium">备注说明</label>
                      <input
                        v-model="expense.description"
                        type="text"
                        placeholder="开支说明（可选）"
                        class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
                <div v-if="form.expense_items.length > 0" class="pt-4 border-t border-border">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">开支合计</span>
                    <span class="text-xl font-semibold text-destructive">¥{{ totalExpenseAmount.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div v-show="currentStep === 10" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label class="mb-3 block text-sm font-medium">现场照片</label>
                    <PhotoUploader v-model="form.photos" :max-count="9" />
                  </div>
                  <div>
                    <label class="mb-3 block text-sm font-medium">备注</label>
                    <textarea
                      v-model="form.remark"
                      rows="8"
                      placeholder="其他需要说明的内容..."
                      class="min-h-[180px] w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </div>

            </template>
          </CardContent>
          <CardFooter class="flex justify-between border-t pt-5">
            <Button
              v-if="currentStep > 0"
              variant="outline"
              @click="prevStep"
            >
              <ChevronLeft class="h-4 w-4" />
              上一步
            </Button>
            <div v-else></div>
            <div class="flex gap-3">
              <Button
                v-if="currentStep < totalSteps - 1"
                :disabled="!canGoNext"
                @click="nextStep"
              >
                下一步
                <ChevronRight class="h-4 w-4" />
              </Button>
              <Button
                v-else
                :loading="submitting"
                @click="handleSubmit"
              >
                <Check class="h-4 w-4" />
                {{ isEdit ? '保存修改' : '提交工单' }}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </template>

    <Drawer
      v-model="showQuickCreateCustomer"
      title="新建客户"
    >
      <div class="space-y-4 py-4">
        <div>
          <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
          <input
            v-model="quickCustomerForm.name"
            type="text"
            placeholder="请输入客户名称"
            class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            :class="{ 'border-destructive': quickCustomerErrors.name }"
          />
          <p v-if="quickCustomerErrors.name" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle class="h-3.5 w-3.5" />
            {{ quickCustomerErrors.name }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-2 block text-sm font-medium">联系人</label>
            <input
              v-model="quickCustomerForm.contact_name"
              type="text"
              placeholder="联系人姓名"
              class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">联系电话</label>
            <input
              v-model="quickCustomerForm.phone"
              type="tel"
              placeholder="联系电话"
              class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium">地址</label>
          <input
            v-model="quickCustomerForm.address"
            type="text"
            placeholder="请输入客户地址"
            class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          @click="showQuickCreateCustomer = false"
        >
          取消
        </Button>
        <Button
          :loading="quickCreateSubmitting"
          @click="handleQuickCreateCustomer"
        >
          创建
        </Button>
      </div>
    </Drawer>
    </template>
  </div>
</template>
