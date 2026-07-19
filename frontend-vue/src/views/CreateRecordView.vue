<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Wrench,
  ShieldCheck,
  Hammer,
  ClipboardCheck,
  Save,
  Send,
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
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import PhotoUpload from '@/components/PhotoUpload.vue'
import { recordsApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { toast } from '@/components/ui/toast/useToast'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const submitting = ref(false)
const errorMsg = ref('')
const createdId = ref<number | null>(null)
const showTemplatePicker = ref(false)

const form = ref({
  record_type: 'repair' as 'construction' | 'maintenance' | 'repair' | 'inspection',
  customer_name: '',
  contact_person: '',
  contact_phone: '',
  address: '',
  appointment_date: '',
  staff_name: '',
  fault_phenomenon: '',
  fault_judgment: '',
  remark: '',
  labour_fee: 0,
  material_fee: 0,
  travel_fee: 0,
  other_fee: 0,
})

const photos = ref<string[]>([])

interface RecordTemplate {
  id: string
  name: string
  record_type: string
  fault_phenomenon: string
  fault_judgment: string
  labour_fee: number
  material_fee: number
  travel_fee: number
  other_fee: number
  remark: string
}

const defaultTemplates: RecordTemplate[] = [
  {
    id: 'tpl-ac-repair',
    name: '空调常规维修',
    record_type: 'repair',
    fault_phenomenon: '空调不制冷/制热效果差',
    fault_judgment: '需现场检查冷媒压力、压缩机运行状态',
    labour_fee: 200,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '',
  },
  {
    id: 'tpl-ac-maintain',
    name: '空调季度保养',
    record_type: 'maintenance',
    fault_phenomenon: '',
    fault_judgment: '季度常规保养：清洗滤网、检查电气、测试运行',
    labour_fee: 150,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '含滤网清洗、电气检查、冷媒检测',
  },
  {
    id: 'tpl-fire-inspect',
    name: '消防系统年检',
    record_type: 'inspection',
    fault_phenomenon: '',
    fault_judgment: '消防系统年度检测：报警、喷淋、消火栓、防排烟',
    labour_fee: 800,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
    remark: '年度消防检测，出具检测报告',
  },
]

const templates = ref<RecordTemplate[]>([...defaultTemplates])

const loadTemplates = () => {
  try {
    const saved = localStorage.getItem('record_templates')
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
    record_type: form.value.record_type,
    fault_phenomenon: form.value.fault_phenomenon,
    fault_judgment: form.value.fault_judgment,
    labour_fee: form.value.labour_fee,
    material_fee: form.value.material_fee,
    travel_fee: form.value.travel_fee,
    other_fee: form.value.other_fee,
    remark: form.value.remark,
  }
  const customTpls = templates.value.filter(t => !defaultTemplates.find(d => d.id === t.id))
  customTpls.push(newTpl)
  localStorage.setItem('record_templates', JSON.stringify(customTpls))
  templates.value = [...defaultTemplates, ...customTpls]
  toast('模板已保存', { type: 'success' })
}

const applyTemplate = (tpl: RecordTemplate) => {
  form.value.record_type = tpl.record_type as any
  form.value.fault_phenomenon = tpl.fault_phenomenon
  form.value.fault_judgment = tpl.fault_judgment
  form.value.labour_fee = tpl.labour_fee
  form.value.material_fee = tpl.material_fee
  form.value.travel_fee = tpl.travel_fee
  form.value.other_fee = tpl.other_fee
  form.value.remark = tpl.remark
  showTemplatePicker.value = false
  step.value = 2
  toast(`已应用模板：${tpl.name}`, { type: 'success' })
}

onMounted(() => {
  loadTemplates()
  if (userStore.user?.staff_name) {
    form.value.staff_name = userStore.user.staff_name
  }
})

const types = [
  { key: 'repair', label: '维修单', icon: Hammer, color: 'from-amber-500 to-orange-500', desc: '设备维修/故障抢修' },
  { key: 'construction', label: '施工单', icon: Wrench, color: 'from-blue-500 to-blue-600', desc: '安装施工/新建工程' },
  { key: 'maintenance', label: '维保单', icon: ShieldCheck, color: 'from-purple-500 to-purple-600', desc: '定期保养/维护' },
  { key: 'inspection', label: '巡检单', icon: ClipboardCheck, color: 'from-cyan-500 to-teal-600', desc: '例行巡检/安全检查' },
]

const stepTitles = ['选择类型', '填写信息', '创建完成']

const totalFee = computed(() => {
  const f = form.value
  return (Number(f.labour_fee) || 0) + (Number(f.material_fee) || 0) + (Number(f.travel_fee) || 0) + (Number(f.other_fee) || 0)
})

const goBack = () => {
  if (step.value > 1) {
    step.value--
  } else {
    router.back()
  }
}

const onSelectType = (key: string) => {
  form.value.record_type = key as any
}

const nextStep = () => {
  if (step.value === 1 && !form.value.record_type) return
  step.value++
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.value.customer_name) {
    errorMsg.value = '请填写客户名称'
    return
  }

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('record_type', form.value.record_type)
    formData.append('customer_name', form.value.customer_name)
    if (form.value.contact_person) formData.append('contact_person', form.value.contact_person)
    if (form.value.contact_phone) formData.append('contact_phone', form.value.contact_phone)
    if (form.value.address) formData.append('address', form.value.address)
    if (form.value.appointment_date) formData.append('appointment_date', form.value.appointment_date)
    if (form.value.staff_name) formData.append('staff_name', form.value.staff_name)
    if (form.value.fault_phenomenon) formData.append('fault_phenomenon', form.value.fault_phenomenon)
    if (form.value.fault_judgment) formData.append('fault_judgment', form.value.fault_judgment)
    if (form.value.remark) formData.append('remark', form.value.remark)
    formData.append('labour_fee', String(form.value.labour_fee || 0))
    formData.append('material_fee', String(form.value.material_fee || 0))
    formData.append('travel_fee', String(form.value.travel_fee || 0))
    formData.append('other_fee', String(form.value.other_fee || 0))
    formData.append('total_fee', String(totalFee.value))
    formData.append('payment_status', 'unpaid')
    formData.append('priority', 'normal')
    formData.append('status', 'pending')

    const result = await recordsApi.create(formData)
    createdId.value = result.id
    step.value = 3
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
    record_type: 'repair',
    customer_name: '',
    contact_person: '',
    contact_phone: '',
    address: '',
    appointment_date: '',
    staff_name: userStore.user?.staff_name || '',
    fault_phenomenon: '',
    fault_judgment: '',
    remark: '',
    labour_fee: 0,
    material_fee: 0,
    travel_fee: 0,
    other_fee: 0,
  }
  photos.value = []
  createdId.value = null
  step.value = 1
}
</script>

<template>
  <div class="min-h-screen-safe bg-background flex flex-col">
    <header class="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-2 md:h-14 md:px-6 lg:px-8">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="flex-1 text-center font-semibold text-foreground text-base md:text-lg -ml-9 md:-ml-0">
          新建工单
        </h1>
      </div>

      <div class="px-4 pb-3 md:px-6 lg:px-8 md:pb-4">
        <div class="flex items-center justify-between max-w-3xl mx-auto">
          <div
            v-for="(title, i) in stepTitles"
            :key="i"
            class="flex items-center"
          >
            <div
              :class="[
                'w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                step > i + 1
                  ? 'bg-primary text-primary-foreground'
                  : step === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              ]"
            >
              <CheckCircle2 v-if="step > i + 1" class="w-4 h-4 md:w-5 md:h-5" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              :class="[
                'ml-2 text-sm font-medium hidden sm:inline',
                step >= i + 1 ? 'text-foreground' : 'text-muted-foreground'
              ]"
            >
              {{ title }}
            </span>
            <div
              v-if="i < stepTitles.length - 1"
              :class="[
                'w-4 sm:w-8 md:w-12 lg:w-16 mx-1 sm:mx-2 h-0.5 rounded-full flex-1 max-w-[80px]',
                step > i + 1 ? 'bg-primary' : 'bg-muted'
              ]"
            />
          </div>
        </div>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto">
      <div class="md:px-6 lg:px-8 md:py-6">
        <div v-if="step === 1" class="px-4 py-6 md:py-0 md:max-w-3xl md:mx-auto">
          <div class="text-center mb-6 md:mb-8">
            <h2 class="text-xl md:text-2xl font-bold text-foreground">选择工单类型</h2>
            <p class="text-sm text-muted-foreground mt-1.5">请选择您要创建的工单类型</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <button
              v-for="t in types"
              :key="t.key"
              :class="[
                'w-full p-4 md:p-5 rounded-2xl border-2 transition-all text-left hover:-translate-y-0.5',
                form.record_type === t.key
                  ? 'border-primary bg-card shadow-lg'
                  : 'border-border bg-card hover:border-primary/50 shadow-sm hover:shadow-md'
              ]"
              @click="onSelectType(t.key)"
            >
              <div class="flex items-center gap-3 md:gap-4">
                <div :class="['w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', t.color]">
                  <component :is="t.icon" class="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-foreground text-base md:text-lg">{{ t.label }}</h3>
                  <p class="text-sm text-muted-foreground mt-0.5">{{ t.desc }}</p>
                </div>
                <div
                  :class="[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    form.record_type === t.key
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30'
                  ]"
                >
                  <CheckCircle2
                    v-if="form.record_type === t.key"
                    class="w-3 h-3 text-primary-foreground"
                  />
                </div>
              </div>
            </button>
          </div>

          <div class="pt-2">
            <button
              class="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              @click="showTemplatePicker = true"
            >
              <FileText class="w-5 h-5" />
              <span class="font-medium">使用模板快速填充</span>
            </button>
          </div>
        </div>

        <div v-else-if="step === 2" class="px-4 py-4 md:py-0 md:max-w-4xl md:mx-auto">
          <div v-if="errorMsg" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 mb-4 md:mb-6 animate-fade-in">
            <span>{{ errorMsg }}</span>
          </div>

          <div class="space-y-5 md:space-y-6">
            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <div class="flex items-center justify-between">
                  <CardTitle class="text-base font-semibold flex items-center gap-2">
                    <User class="w-4 h-4 text-primary" />
                    <span>客户信息</span>
                  </CardTitle>
                  <button
                    class="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    @click="showTemplatePicker = true"
                  >
                    <Sparkles class="w-3.5 h-3.5" />
                    模板
                  </button>
                </div>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="space-y-4">
                  <div class="space-y-1.5">
                    <Label for="customer">客户名称 <span class="text-destructive">*</span></Label>
                    <div class="relative">
                      <Input
                        id="customer"
                        v-model="form.customer_name"
                        placeholder="请输入客户名称"
                        class="h-11 rounded-xl pl-9"
                      />
                      <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <Calendar class="w-4 h-4 text-primary" />
                  <span>预约安排</span>
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
              </CardContent>
            </Card>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <FileText class="w-4 h-4 text-primary" />
                  <span>问题描述</span>
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="space-y-4">
                  <div class="space-y-1.5">
                    <Label for="phenomenon">故障现象</Label>
                    <Textarea
                      id="phenomenon"
                      v-model="form.fault_phenomenon"
                      placeholder="请描述故障现象..."
                      class="min-h-[80px] rounded-xl resize-none"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <Label for="judgment">初步判断</Label>
                    <Textarea
                      id="judgment"
                      v-model="form.fault_judgment"
                      placeholder="请描述故障原因初步判断（可选）..."
                      class="min-h-[80px] rounded-xl resize-none"
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
                <PhotoUpload v-model="photos" :max="9" />
              </CardContent>
            </Card>

            <Card class="shadow-sm border-border">
              <CardHeader class="pb-3">
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <span class="w-4 h-4 flex items-center justify-center text-primary font-bold">¥</span>
                  <span>费用预估</span>
                </CardTitle>
              </CardHeader>
              <CardContent class="pt-0">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                  <div class="space-y-1.5">
                    <Label for="labour-fee">人工费</Label>
                    <Input
                      id="labour-fee"
                      v-model.number="form.labour_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      class="h-11 rounded-xl"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="material-fee">物料费</Label>
                    <Input
                      id="material-fee"
                      v-model.number="form.material_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      class="h-11 rounded-xl"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="travel-fee">差旅费</Label>
                    <Input
                      id="travel-fee"
                      v-model.number="form.travel_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      class="h-11 rounded-xl"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="other-fee">其他费用</Label>
                    <Input
                      id="other-fee"
                      v-model.number="form.other_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      class="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div class="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <span class="text-sm text-muted-foreground">预估总费用</span>
                  <span class="text-xl md:text-2xl font-bold text-foreground">¥{{ totalFee.toFixed(2) }}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div class="h-24 md:hidden"></div>
        </div>

        <div v-else-if="step === 3" class="flex flex-col items-center justify-center px-6 py-10 md:py-16 md:max-w-md md:mx-auto">
          <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 animate-fade-in">
            <CheckCircle2 class="w-12 h-12 md:w-14 md:h-14 text-emerald-500" />
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-foreground mb-2">工单创建成功</h2>
          <p class="text-muted-foreground text-sm text-center mb-8">
            工单已成功创建，您可以查看详情或继续创建
          </p>

          <div class="w-full space-y-3">
            <Button
              class="w-full h-12 rounded-xl text-base font-semibold"
              @click="goToDetail"
            >
              查看工单详情
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
    </div>

    <div
      v-if="step < 3"
      class="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom"
    >
      <div class="flex gap-3 md:max-w-3xl md:mx-auto">
        <Button
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
          @click="goBack"
        >
          {{ step === 1 ? '取消' : '上一步' }}
        </Button>
        <Button
          v-if="step === 1"
          class="flex-1 h-12 rounded-xl text-base font-semibold"
          :disabled="!form.record_type"
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
                <Trash2 class="w-4 h-4 text-muted-foreground" />
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
                    {{ types.find(t => t.key === tpl.record_type)?.label || tpl.record_type }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {{ tpl.fault_judgment || tpl.fault_phenomenon || '无描述' }}
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
  </div>
</template>

<style scoped>
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
</style>
