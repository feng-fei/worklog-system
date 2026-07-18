<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  User,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  Building2,
  CreditCard,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const customerId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)
const showInvoiceInfo = ref(false)

const form = reactive({
  name: '',
  contact_name: '',
  phone: '',
  address: '',
  remark: '',
  short_name: '',
  full_name: '',
  credit_code: '',
  invoice_title: '',
  tax_number: '',
  bank_name: '',
  bank_account: '',
  invoice_address: '',
  invoice_phone: '',
})

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  name: [validators.required('请输入客户名称')],
  phone: [
    {
      validator: (val: string) => {
        if (!val) return true
        return validators.phone(val)
      },
    },
  ],
})

const loadCustomer = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await customersApi.get(customerId.value)
    const data = res.data.customer || res.data
    form.name = data.name || data.customer_name || ''
    form.contact_name = data.contact_name || data.contact_person || ''
    form.phone = data.phone || data.contact_phone || ''
    form.address = data.address || ''
    form.remark = data.remark || data.notes || ''
    form.short_name = data.short_name || ''
    form.full_name = data.full_name || ''
    form.credit_code = data.credit_code || ''
    form.invoice_title = data.invoice_title || ''
    form.tax_number = data.tax_number || ''
    form.bank_name = data.bank_name || ''
    form.bank_account = data.bank_account || ''
    form.invoice_address = data.invoice_address || ''
    form.invoice_phone = data.invoice_phone || ''
    
    const hasInvoiceData = form.invoice_title || form.tax_number || form.bank_name || 
                          form.bank_account || form.invoice_address || form.invoice_phone
    if (hasInvoiceData) {
      showInvoiceInfo.value = true
    }
  } catch (e) {
    console.error('加载客户信息失败', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const submitData = {
      name: form.name,
      contact_name: form.contact_name,
      phone: form.phone,
      address: form.address,
      remark: form.remark,
      short_name: form.short_name || form.name,
      full_name: form.full_name || form.name,
      credit_code: form.credit_code,
      invoice_title: form.invoice_title,
      tax_number: form.tax_number,
      bank_name: form.bank_name,
      bank_account: form.bank_account,
      invoice_address: form.invoice_address,
      invoice_phone: form.invoice_phone,
    }
    
    if (isEdit.value) {
      await customersApi.update(customerId.value, submitData)
    } else {
      await customersApi.create(submitData)
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
  loadCustomer()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑客户' : '新建客户'"
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
              <User class="h-5 w-5 text-primary" />
              基本信息
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">客户名称 <span class="text-destructive">*</span></label>
                <div class="relative">
                  <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入客户名称"
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

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">联系人</label>
                  <div class="relative">
                    <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.contact_name"
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
                      v-model="form.phone"
                      type="tel"
                      placeholder="联系电话"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.phone }"
                      @blur="validateField('phone')"
                    />
                  </div>
                  <p v-if="errors.phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle class="h-3.5 w-3.5" />
                    {{ errors.phone }}
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">地址</label>
                <div class="relative">
                  <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.address"
                    type="text"
                    placeholder="请输入客户地址"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl border border-input bg-card p-4 transition-colors hover:bg-accent/50"
              @click="showInvoiceInfo = !showInvoiceInfo"
            >
              <h3 class="flex items-center gap-2 font-semibold">
                <Receipt class="h-5 w-5 text-primary" />
                开票信息
              </h3>
              <ChevronDown v-if="!showInvoiceInfo" class="h-5 w-5 text-muted-foreground transition-transform" />
              <ChevronUp v-else class="h-5 w-5 text-muted-foreground transition-transform" />
            </button>
            
            <div v-show="showInvoiceInfo" class="mt-4 space-y-4 rounded-xl border border-input bg-card p-4">
              <div>
                <label class="mb-2 block text-sm font-medium">发票抬头</label>
                <div class="relative">
                  <Building2 class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.invoice_title"
                    type="text"
                    placeholder="请输入发票抬头"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">税号</label>
                <div class="relative">
                  <CreditCard class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.tax_number"
                    type="text"
                    placeholder="请输入纳税人识别号"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">开户银行</label>
                  <input
                    v-model="form.bank_name"
                    type="text"
                    placeholder="请输入开户银行名称"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">银行账号</label>
                  <input
                    v-model="form.bank_account"
                    type="text"
                    placeholder="请输入银行账号"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">注册地址</label>
                <div class="relative">
                  <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.invoice_address"
                    type="text"
                    placeholder="请输入注册地址"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">开票电话</label>
                <div class="relative">
                  <Phone class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.invoice_phone"
                    type="tel"
                    placeholder="请输入开票电话"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <FileText class="h-5 w-5 text-primary" />
              备注信息
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">备注</label>
                <textarea
                  v-model="form.remark"
                  rows="4"
                  placeholder="请输入备注信息..."
                  class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
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
            {{ isEdit ? '保存修改' : '创建客户' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
