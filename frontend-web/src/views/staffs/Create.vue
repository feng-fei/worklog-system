<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { staffsApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useFormValidation, validators } from '@/composables/useFormValidation'
import {
  User,
  Phone,
  Calendar,
  IdCard,
  ShieldAlert,
  FileText,
  Briefcase,
  Check,
  AlertCircle,
  KeyRound,
  Upload,
  X,
  Image as ImageIcon,
  Camera,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const staffId = computed(() => Number(route.params.id))
const submitting = ref(false)
const loading = ref(false)
const uploadingPhoto = ref(false)

const form = reactive({
  name: '',
  position: '',
  phone: '',
  id_card: '',
  join_date: new Date().toISOString().split('T')[0],
  status: 'active',
  emergency_contact: '',
  emergency_phone: '',
  remark: '',
  staff_type: 'fixed',
  daily_wage: 0,
  monthly_salary: 0,
  has_account: false,
  username: '',
  password: '',
  role: 'worker',
  enabled: true,
})

const photos = reactive({
  id_card_front: '',
  id_card_back: '',
  certificate_photos: [] as string[],
})

const pendingFiles = reactive({
  id_card_front: null as File | null,
  id_card_back: null as File | null,
  certificate_photos: [] as File[],
})

const { errors, validate, validateField, setError, clearErrors } = useFormValidation(form, {
  name: [validators.required('请输入员工姓名')],
  phone: [
    {
      validator: (val: string) => {
        if (!val) return true
        return validators.phone(val)
      },
    },
  ],
  emergency_phone: [
    {
      validator: (val: string) => {
        if (!val) return true
        return validators.phone(val)
      },
    },
  ],
})

const statusOptions = [
  { value: 'active', label: '在职' },
  { value: 'inactive', label: '离职' },
]

const staffTypeOptions = [
  { value: 'fixed', label: '固定员工' },
  { value: 'temp', label: '临时工' },
]

const roleOptions = [
  { value: 'admin', label: '管理员' },
  { value: 'worker', label: '普通员工' },
]

const idCardFrontPreview = computed(() => {
  if (pendingFiles.id_card_front) {
    return URL.createObjectURL(pendingFiles.id_card_front)
  }
  return photos.id_card_front
})

const idCardBackPreview = computed(() => {
  if (pendingFiles.id_card_back) {
    return URL.createObjectURL(pendingFiles.id_card_back)
  }
  return photos.id_card_back
})

interface CertificateItem {
  url: string
  isPending: boolean
  originalIndex: number
}

const certificatePreviews = computed<CertificateItem[]>(() => {
  const existing: CertificateItem[] = photos.certificate_photos.map((p, idx) => ({
    url: p,
    isPending: false,
    originalIndex: idx,
  }))
  const pending: CertificateItem[] = pendingFiles.certificate_photos.map((f, idx) => ({
    url: URL.createObjectURL(f),
    isPending: true,
    originalIndex: idx,
  }))
  return [...existing, ...pending]
})

const loadStaff = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await staffsApi.get(staffId.value)
    const data = res.data
    form.name = data.name || data.staff_name || ''
    form.position = data.position || data.role || ''
    form.phone = data.phone || data.contact_phone || ''
    form.id_card = data.id_card || ''
    form.join_date = (data.join_date || data.entry_date || data.hire_date || data.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0]
    form.status = data.status || 'active'
    form.emergency_contact = data.emergency_contact || ''
    form.emergency_phone = data.emergency_phone || ''
    form.remark = data.remark || ''
    form.staff_type = data.staff_type || 'fixed'
    form.daily_wage = data.daily_wage || 0
    form.monthly_salary = data.monthly_salary || 0
    form.has_account = data.has_account || false
    form.username = data.username || ''
    form.role = data.role || 'worker'
    form.enabled = data.enabled !== false

    photos.id_card_front = data.id_card_front_photo || data.id_photo || ''
    photos.id_card_back = data.id_card_back_photo || ''
    photos.certificate_photos = data.certificate_photos || []
  } catch (e) {
    console.error('加载员工信息失败', e)
  } finally {
    loading.value = false
  }
}

const handleIdCardFrontSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    pendingFiles.id_card_front = file
  }
  target.value = ''
}

const handleIdCardBackSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    pendingFiles.id_card_back = file
  }
  target.value = ''
}

const handleCertificateSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      pendingFiles.certificate_photos.push(files[i])
    }
  }
  target.value = ''
}

const removePendingIdCardFront = () => {
  pendingFiles.id_card_front = null
}

const removePendingIdCardBack = () => {
  pendingFiles.id_card_back = null
}

const removePendingCertificate = (index: number) => {
  pendingFiles.certificate_photos.splice(index, 1)
}

const removeExistingCertificate = async (photoPath: string) => {
  if (!isEdit.value) return
  try {
    await staffsApi.deleteCertificatePhoto(staffId.value, photoPath)
    photos.certificate_photos = photos.certificate_photos.filter(p => p !== photoPath)
  } catch (e) {
    console.error('删除证书照片失败', e)
  }
}

const uploadPhotos = async (id: number) => {
  uploadingPhoto.value = true
  try {
    if (pendingFiles.id_card_front) {
      await staffsApi.uploadIdCardFront(id, pendingFiles.id_card_front)
    }
    if (pendingFiles.id_card_back) {
      await staffsApi.uploadIdCardBack(id, pendingFiles.id_card_back)
    }
    if (pendingFiles.certificate_photos.length > 0) {
      await staffsApi.uploadCertificatePhotos(id, pendingFiles.certificate_photos)
    }
  } catch (e) {
    console.error('上传照片失败', e)
  } finally {
    uploadingPhoto.value = false
  }
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    let savedId = staffId.value
    if (isEdit.value) {
      await staffsApi.update(staffId.value, form)
    } else {
      const res = await staffsApi.create(form)
      savedId = res.data.id
    }

    const hasPendingPhotos = pendingFiles.id_card_front || pendingFiles.id_card_back || pendingFiles.certificate_photos.length > 0
    if (hasPendingPhotos && savedId) {
      await uploadPhotos(savedId)
    }

    router.push('/staffs')
  } catch (e: any) {
    const msg = e.response?.data?.error || (isEdit.value ? '更新失败，请重试' : '创建失败，请重试')
    setError('name', msg)
  } finally {
    submitting.value = false
  }
}

const onStatusChange = (val: string | number | null) => {
  form.status = val as string
}

onMounted(() => {
  loadStaff()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <MobileHeader
      :title="isEdit ? '编辑员工' : '新建员工'"
      show-back
    >
      <template #right>
        <button
          class="text-sm font-medium text-primary"
          @click="handleSubmit"
          :disabled="submitting || uploadingPhoto"
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
                <label class="mb-2 block text-sm font-medium">姓名 <span class="text-destructive">*</span></label>
                <div class="relative">
                  <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入员工姓名"
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
                <label class="mb-2 block text-sm font-medium">岗位/职位</label>
                <div class="relative">
                  <Briefcase class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.position"
                    type="text"
                    placeholder="请输入岗位或职位"
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
                    placeholder="请输入联系电话"
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

              <div>
                <label class="mb-2 block text-sm font-medium">身份证号</label>
                <div class="relative">
                  <IdCard class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.id_card"
                    type="text"
                    placeholder="请输入身份证号"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">入职日期</label>
                <div class="relative">
                  <Calendar class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.join_date"
                    type="date"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">状态</label>
                <select
                  v-model="form.status"
                  class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">员工类型</label>
                <select
                  v-model="form.staff_type"
                  class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option v-for="opt in staffTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-2 block text-sm font-medium">日薪</label>
                  <input
                    v-model.number="form.daily_wage"
                    type="number"
                    placeholder="日薪金额"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium">月薪</label>
                  <input
                    v-model.number="form.monthly_salary"
                    type="number"
                    placeholder="月薪金额"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <Camera class="h-5 w-5 text-primary" />
              证件照片
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">身份证正面</label>
                <div class="relative">
                  <label
                    v-if="!idCardFrontPreview"
                    class="flex aspect-[1.58/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Upload class="h-8 w-8" />
                    <span class="mt-2 text-sm">点击上传身份证正面</span>
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleIdCardFrontSelect"
                    />
                  </label>
                  <div v-else class="relative aspect-[1.58/1] overflow-hidden rounded-xl bg-muted">
                    <img
                      :src="idCardFrontPreview"
                      class="h-full w-full object-cover"
                      alt="身份证正面"
                    />
                    <button
                      type="button"
                      class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      @click="removePendingIdCardFront"
                    >
                      <X class="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">身份证背面</label>
                <div class="relative">
                  <label
                    v-if="!idCardBackPreview"
                    class="flex aspect-[1.58/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Upload class="h-8 w-8" />
                    <span class="mt-2 text-sm">点击上传身份证背面</span>
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleIdCardBackSelect"
                    />
                  </label>
                  <div v-else class="relative aspect-[1.58/1] overflow-hidden rounded-xl bg-muted">
                    <img
                      :src="idCardBackPreview"
                      class="h-full w-full object-cover"
                      alt="身份证背面"
                    />
                    <button
                      type="button"
                      class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      @click="removePendingIdCardBack"
                    >
                      <X class="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">职业证书照片（可多选）</label>
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(item, idx) in certificatePreviews"
                    :key="idx"
                    class="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <img
                      :src="item.url"
                      class="h-full w-full object-cover"
                      :alt="`证书${idx + 1}`"
                    />
                    <button
                      type="button"
                      class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                      @click="item.isPending ? removePendingCertificate(item.originalIndex) : removeExistingCertificate(item.url)"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>

                  <label
                    class="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Upload class="h-6 w-6" />
                    <span class="mt-1 text-xs">添加照片</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      class="hidden"
                      @change="handleCertificateSelect"
                    />
                  </label>
                </div>
                <p class="mt-2 text-xs text-muted-foreground">
                  <ImageIcon class="mr-1 inline h-3 w-3" />
                  支持上传多张职业证书照片
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <KeyRound class="h-5 w-5 text-primary" />
              账号授权
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between rounded-xl border border-input bg-secondary/30 p-4">
                <div>
                  <p class="font-medium">开启登录账号</p>
                  <p class="text-sm text-muted-foreground">开启后该员工可以登录系统</p>
                </div>
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  :class="form.has_account ? 'bg-primary' : 'bg-input'"
                  @click="form.has_account = !form.has_account"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    :class="form.has_account ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>

              <template v-if="form.has_account">
                <div>
                  <label class="mb-2 block text-sm font-medium">用户名 <span class="text-destructive">*</span></label>
                  <div class="relative">
                    <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.username"
                      type="text"
                      placeholder="请输入登录用户名"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">
                    {{ isEdit ? '重置密码' : '初始密码' }}
                    <span v-if="isEdit" class="text-xs text-muted-foreground ml-1">（不修改请留空）</span>
                  </label>
                  <div class="relative">
                    <IdCard class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <input
                      v-model="form.password"
                      type="password"
                      :placeholder="isEdit ? '留空则不修改密码' : '请输入初始密码'"
                      class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium">角色</label>
                  <select
                    v-model="form.role"
                    class="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>

                <div class="flex items-center justify-between rounded-xl border border-input bg-secondary/30 p-4">
                  <div>
                    <p class="font-medium">账号启用</p>
                    <p class="text-sm text-muted-foreground">关闭后该账号无法登录</p>
                  </div>
                  <button
                    type="button"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    :class="form.enabled ? 'bg-primary' : 'bg-input'"
                    @click="form.enabled = !form.enabled"
                  >
                    <span
                      class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      :class="form.enabled ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                </div>
              </template>
            </div>
          </div>

          <div>
            <h3 class="mb-4 flex items-center gap-2 font-semibold">
              <ShieldAlert class="h-5 w-5 text-primary" />
              紧急联系人
            </h3>
            <div class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium">紧急联系人</label>
                <div class="relative">
                  <User class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.emergency_contact"
                    type="text"
                    placeholder="请输入紧急联系人姓名"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">紧急联系电话</label>
                <div class="relative">
                  <Phone class="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <input
                    v-model="form.emergency_phone"
                    type="tel"
                    placeholder="请输入紧急联系电话"
                    class="h-12 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    :class="{ 'border-destructive': errors.emergency_phone }"
                    @blur="validateField('emergency_phone')"
                  />
                </div>
                <p v-if="errors.emergency_phone" class="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" />
                  {{ errors.emergency_phone }}
                </p>
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
            />
          </div>
        </div>
      </div>

      <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 pb-safe">
        <div class="mx-auto max-w-lg">
          <Button
            size="xl"
            class="w-full"
            :loading="submitting || uploadingPhoto"
            @click="handleSubmit"
          >
            <Check class="h-5 w-5" />
            {{ isEdit ? '保存修改' : '创建员工' }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
