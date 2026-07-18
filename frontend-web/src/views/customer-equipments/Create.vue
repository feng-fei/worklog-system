<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { customersApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  Monitor,
  Building2,
  Settings,
  Tag,
  Hash,
  Calendar,
  MapPin,
  User,
  Phone,
  Activity,
  Wrench,
  Repeat,
  FileText,
  Check,
  AlertCircle,
  Package,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const equipmentId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  customer_name: '',
  equipment_type: '',
  system_type: '',
  brand: '',
  model: '',
  serial_no: '',
  quantity: 1,
  install_date: '',
  warranty_start: '',
  warranty_end: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  status: 'normal',
  last_maintenance: '',
  next_maintenance: '',
  maintenance_cycle: undefined as number | undefined,
  remark: '',
})

const statusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'faulty', label: '故障' },
  { value: 'scrapped', label: '报废' },
]

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  customer_name: [validators.required('请输入客户名称')],
  equipment_type: [validators.required('请输入设备类型')],
  brand: [validators.required('请输入品牌')],
  model: [validators.required('请输入型号')],
})

const loadEquipment = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await customersApi.getEquipment(equipmentId.value)
    const data = res.data
    form.customer_name = data.customer_name || ''
    form.equipment_type = data.equipment_type || ''
    form.system_type = data.system_type || ''
    form.brand = data.brand || ''
    form.model = data.model || ''
    form.serial_no = data.serial_no || ''
    form.quantity = data.quantity || 1
    form.install_date = data.install_date || ''
    form.warranty_start = data.warranty_start || ''
    form.warranty_end = data.warranty_end || ''
    form.location = data.location || ''
    form.contact_name = data.contact_name || ''
    form.contact_phone = data.contact_phone || ''
    form.status = data.status || 'normal'
    form.last_maintenance = data.last_maintenance || ''
    form.next_maintenance = data.next_maintenance || ''
    form.maintenance_cycle = data.maintenance_cycle
    form.remark = data.remark || ''
  } catch (e) {
    console.error('加载设备信息失败', e)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const data: Record<string, any> = {
      customer_name: form.customer_name,
      equipment_type: form.equipment_type,
      system_type: form.system_type,
      brand: form.brand,
      model: form.model,
      serial_no: form.serial_no,
      quantity: form.quantity,
      install_date: form.install_date || undefined,
      warranty_start: form.warranty_start || undefined,
      warranty_end: form.warranty_end || undefined,
      location: form.location,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      status: form.status,
      last_maintenance: form.last_maintenance || undefined,
      next_maintenance: form.next_maintenance || undefined,
      maintenance_cycle: form.maintenance_cycle,
      remark: form.remark,
    }

    if (isEdit.value) {
      await customersApi.updateEquipment(equipmentId.value, data)
    } else {
      await customersApi.createEquipment(data)
    }

    router.back()
  } catch (e: any) {
    const msg = e.response?.data?.error || '保存失败，请重试'
    setError('customer_name', msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadEquipment()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑设备' : '新建设备'"
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
              <Building2 class="h-5 w-5 text-primary" />
              客户信息
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">
                  客户名称 <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <Building2 class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
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
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Monitor class="h-5 w-5 text-primary" />
              设备信息
            </h3>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    设备类型 <span class="text-destructive">*</span>
                  </label>
                  <div class="relative">
                    <Settings class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.equipment_type"
                      type="text"
                      placeholder="设备类型"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.equipment_type }"
                      @blur="validateField('equipment_type')"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">系统类型</label>
                  <div class="relative">
                    <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.system_type"
                      type="text"
                      placeholder="系统类型"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    品牌 <span class="text-destructive">*</span>
                  </label>
                  <div class="relative">
                    <Package class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.brand"
                      type="text"
                      placeholder="品牌"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.brand }"
                      @blur="validateField('brand')"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">
                    型号 <span class="text-destructive">*</span>
                  </label>
                  <div class="relative">
                    <Tag class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.model"
                      type="text"
                      placeholder="型号"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      :class="{ 'border-destructive': errors.model }"
                      @blur="validateField('model')"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">序列号</label>
                  <div class="relative">
                    <Hash class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.serial_no"
                      type="text"
                      placeholder="序列号"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">数量</label>
                  <div class="relative">
                    <Hash class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model.number="form.quantity"
                      type="number"
                      min="1"
                      placeholder="1"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">设备状态</label>
                <div class="relative">
                  <Activity class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <select
                    v-model="form.status"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Calendar class="h-5 w-5 text-primary" />
              日期信息
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">安装日期</label>
                <div class="relative">
                  <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.install_date"
                    type="date"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">保修开始日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.warranty_start"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">保修结束日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.warranty_end"
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
              <MapPin class="h-5 w-5 text-primary" />
              位置与联系人
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">安装位置</label>
                <div class="relative">
                  <MapPin class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.location"
                    type="text"
                    placeholder="安装位置"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
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
                      v-model="form.contact_phone"
                      type="tel"
                      placeholder="联系电话"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Wrench class="h-5 w-5 text-primary" />
              维护信息
            </h3>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-sm font-medium">上次维护日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.last_maintenance"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">下次维护日期</label>
                  <div class="relative">
                    <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.next_maintenance"
                      type="date"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">维护周期（天）</label>
                <div class="relative">
                  <Repeat class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model.number="form.maintenance_cycle"
                    type="number"
                    min="0"
                    placeholder="维护周期天数"
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
            <div>
              <label class="mb-2 block text-sm font-medium">备注</label>
              <textarea
                v-model="form.remark"
                rows="4"
                placeholder="请输入备注信息（选填）"
                class="min-h-[100px] w-full rounded-xl border border-input bg-background p-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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
            {{ isEdit ? '保存修改' : '创建设备' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
