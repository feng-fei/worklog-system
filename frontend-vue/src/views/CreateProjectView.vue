<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  User,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  Building2,
  CreditCard,
  Calendar,
  DollarSign,
  FolderKanban,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { projectsApi, customersApi } from '@/api'
import type { Project, Customer } from '@/types'

const router = useRouter()

const step = ref(1)
const submitting = ref(false)
const errorMsg = ref('')
const createdId = ref<number | null>(null)
const customerOptions = ref<Customer[]>([])
const showCustomerDropdown = ref(false)
const customerSearch = ref('')

const form = ref<Partial<Project>>({
  name: '',
  customer_name: '',
  customer_id: undefined,
  contract_no: '',
  project_type: '',
  project_address: '',
  contact_name: '',
  contact_phone: '',
  start_date: '',
  end_date: '',
  contract_amount: 0,
  description: '',
  remark: '',
})

const loadCustomers = async (keyword: string) => {
  if (!keyword) {
    customerOptions.value = []
    return
  }
  try {
    const res = await customersApi.list({ keyword, page: 1, per_page: 10 })
    customerOptions.value = res.records || []
  } catch (e) {
    console.error('Failed to load customers:', e)
  }
}

const selectCustomer = (customer: Customer) => {
  form.value.customer_id = customer.id
  form.value.customer_name = customer.name
  form.value.contact_name = customer.contact_name || ''
  form.value.contact_phone = customer.phone || ''
  form.value.project_address = customer.address || ''
  customerSearch.value = customer.name
  showCustomerDropdown.value = false
}

const goBack = () => {
  if (step.value > 1) {
    step.value--
  } else {
    router.back()
  }
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.value.name) {
    errorMsg.value = '请填写项目名称'
    return
  }
  if (!form.value.customer_name) {
    errorMsg.value = '请选择客户'
    return
  }

  submitting.value = true
  try {
    const data: Partial<Project> = {
      ...form.value,
    }

    const result = await projectsApi.create(data)
    createdId.value = result.id
    step.value = 2
  } catch (e: any) {
    errorMsg.value = e.response?.data?.error || '创建失败，请重试'
  } finally {
    submitting.value = false
  }
}

const goToDetail = () => {
  if (createdId.value) {
    router.replace(`/project/${createdId.value}`)
  } else {
    router.push('/projects')
  }
}

const goToList = () => {
  router.push('/projects')
}

const resetForm = () => {
  form.value = {
    name: '',
    customer_name: '',
    customer_id: undefined,
    contract_no: '',
    project_type: '',
    project_address: '',
    contact_name: '',
    contact_phone: '',
    start_date: '',
    end_date: '',
    contract_amount: 0,
    description: '',
    remark: '',
  }
  customerSearch.value = ''
  customerOptions.value = []
  createdId.value = null
  step.value = 1
}
</script>

<template>
  <div class="min-h-screen-safe bg-background flex flex-col">
    <header class="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div class="flex items-center h-12 px-2">
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors tap-highlight-transparent"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5 text-foreground" />
        </button>
        <h1 class="flex-1 text-center font-semibold text-foreground text-base -ml-9">
          新建项目
        </h1>
      </div>
    </header>

    <div v-if="step === 1" class="flex-1 px-4 py-4 space-y-5 overflow-y-auto pb-24">
      <div v-if="errorMsg" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderKanban class="w-4 h-4 text-primary" />
          <span>基本信息</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="name">项目名称 <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                id="name"
                v-model="form.name"
                placeholder="请输入项目名称"
                class="h-11 rounded-xl pl-9"
              />
              <FolderKanban class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div class="space-y-1.5 relative">
            <Label for="customer">客户名称 <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                id="customer"
                v-model="customerSearch"
                placeholder="搜索并选择客户"
                class="h-11 rounded-xl pl-9"
                @focus="showCustomerDropdown = true"
                @input="loadCustomers(customerSearch)"
              />
              <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <div
              v-if="showCustomerDropdown && customerOptions.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              <button
                v-for="customer in customerOptions"
                :key="customer.id"
                class="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                @click="selectCustomer(customer)"
              >
                <p class="text-sm font-medium text-foreground">{{ customer.name }}</p>
                <p v-if="customer.contact_name || customer.phone" class="text-xs text-muted-foreground mt-0.5">
                  {{ customer.contact_name }}{{ customer.contact_name && customer.phone ? ' · ' : '' }}{{ customer.phone }}
                </p>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="contract-no">合同编号</Label>
              <div class="relative">
                <Input
                  id="contract-no"
                  v-model="form.contract_no"
                  placeholder="合同编号"
                  class="h-11 rounded-xl pl-9"
                />
                <FileText class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="project-type">项目类型</Label>
              <div class="relative">
                <Input
                  id="project-type"
                  v-model="form.project_type"
                  placeholder="如：弱电工程"
                  class="h-11 rounded-xl pl-9"
                />
                <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User class="w-4 h-4 text-primary" />
          <span>联系信息</span>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="contact">联系人</Label>
              <div class="relative">
                <Input
                  id="contact"
                  v-model="form.contact_name"
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
            <Label for="address">项目地址</Label>
            <div class="relative">
              <Input
                id="address"
                v-model="form.project_address"
                placeholder="请输入项目地址"
                class="h-11 rounded-xl pl-9"
              />
              <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar class="w-4 h-4 text-primary" />
          <span>时间与金额</span>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="start-date">开始日期</Label>
              <div class="relative">
                <Input
                  id="start-date"
                  v-model="form.start_date"
                  type="date"
                  class="h-11 rounded-xl pl-9"
                />
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="end-date">结束日期</Label>
              <div class="relative">
                <Input
                  id="end-date"
                  v-model="form.end_date"
                  type="date"
                  class="h-11 rounded-xl pl-9"
                />
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="contract-amount">合同金额</Label>
            <div class="relative">
              <Input
                id="contract-amount"
                v-model.number="form.contract_amount"
                type="number"
                placeholder="0.00"
                class="h-11 rounded-xl pl-9"
              />
              <DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText class="w-4 h-4 text-primary" />
          <span>备注</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="description">项目描述</Label>
            <Textarea
              id="description"
              v-model="form.description"
              placeholder="请输入项目描述（可选）..."
              class="min-h-[80px] rounded-xl resize-none"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="remark">备注信息</Label>
            <Textarea
              id="remark"
              v-model="form.remark"
              placeholder="请输入备注信息（可选）..."
              class="min-h-[80px] rounded-xl resize-none"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="step === 2" class="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div class="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle2 class="w-12 h-12 text-emerald-500" />
      </div>
      <h2 class="text-xl font-bold text-foreground mb-2">项目创建成功</h2>
      <p class="text-muted-foreground text-sm text-center mb-8">
        项目已成功创建，您可以查看详情或返回列表
      </p>

      <div class="w-full space-y-3">
        <Button
          class="w-full h-12 rounded-xl text-base font-semibold"
          @click="goToDetail"
        >
          查看项目详情
        </Button>
        <Button
          variant="outline"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="goToList"
        >
          返回项目列表
        </Button>
        <Button
          variant="ghost"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="resetForm"
        >
          继续创建项目
        </Button>
      </div>
    </div>

    <div
      v-if="step < 2"
      class="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom"
    >
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
          @click="goBack"
        >
          取消
        </Button>
        <Button
          class="flex-1 h-12 rounded-xl text-base font-semibold"
          :disabled="submitting"
          @click="handleSubmit"
        >
          <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
          <Send v-else class="w-4 h-4 mr-2" />
          {{ submitting ? '提交中...' : '提交项目' }}
        </Button>
      </div>
    </div>
  </div>
</template>
