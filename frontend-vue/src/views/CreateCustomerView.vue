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
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { customersApi } from '@/api'
import type { Customer } from '@/types'

const router = useRouter()

const step = ref(1)
const submitting = ref(false)
const errorMsg = ref('')
const createdId = ref<number | null>(null)

const form = ref<Partial<Customer>>({
  name: '',
  short_name: '',
  contact_name: '',
  phone: '',
  address: '',
  credit_code: '',
  remark: '',
})

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
    errorMsg.value = '请填写客户名称'
    return
  }

  submitting.value = true
  try {
    const data: Partial<Customer> = {
      name: form.value.name,
      short_name: form.value.short_name || '',
      contact_name: form.value.contact_name || '',
      phone: form.value.phone || '',
      address: form.value.address || '',
      credit_code: form.value.credit_code || '',
      remark: form.value.remark || '',
    }

    const result = await customersApi.create(data)
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
    router.replace(`/customer/${createdId.value}`)
  } else {
    router.push('/customers')
  }
}

const goToList = () => {
  router.push('/customers')
}

const resetForm = () => {
  form.value = {
    name: '',
    short_name: '',
    contact_name: '',
    phone: '',
    address: '',
    credit_code: '',
    remark: '',
  }
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
          新建客户
        </h1>
      </div>
    </header>

    <div v-if="step === 1" class="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
      <div v-if="errorMsg" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 class="w-4 h-4 text-primary" />
          <span>基本信息</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="name">客户名称 <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                id="name"
                v-model="form.name"
                placeholder="请输入客户名称"
                class="h-11 rounded-xl pl-9"
              />
              <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="short-name">简称</Label>
            <div class="relative">
              <Input
                id="short-name"
                v-model="form.short_name"
                placeholder="客户简称"
                class="h-11 rounded-xl pl-9"
              />
              <FileText class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  v-model="form.phone"
                  placeholder="联系电话"
                  class="h-11 rounded-xl pl-9"
                  type="tel"
                />
                <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="address">地址</Label>
            <div class="relative">
              <Input
                id="address"
                v-model="form.address"
                placeholder="请输入客户地址"
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
          <CreditCard class="w-4 h-4 text-primary" />
          <span>开票信息</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="credit-code">税号/信用代码</Label>
            <div class="relative">
              <Input
                id="credit-code"
                v-model="form.credit_code"
                placeholder="统一社会信用代码"
                class="h-11 rounded-xl pl-9"
              />
              <CreditCard class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
            <Label for="remark">备注信息</Label>
            <Textarea
              id="remark"
              v-model="form.remark"
              placeholder="请输入备注信息（可选）..."
              class="min-h-[100px] rounded-xl resize-none"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="step === 2" class="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div class="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle2 class="w-12 h-12 text-emerald-500" />
      </div>
      <h2 class="text-xl font-bold text-foreground mb-2">客户创建成功</h2>
      <p class="text-muted-foreground text-sm text-center mb-8">
        客户已成功创建，您可以查看详情或返回列表
      </p>

      <div class="w-full space-y-3">
        <Button
          class="w-full h-12 rounded-xl text-base font-semibold"
          @click="goToDetail"
        >
          查看客户详情
        </Button>
        <Button
          variant="outline"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="goToList"
        >
          返回客户列表
        </Button>
        <Button
          variant="ghost"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="resetForm"
        >
          继续创建客户
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
          {{ submitting ? '提交中...' : '提交客户' }}
        </Button>
      </div>
    </div>
  </div>
</template>
