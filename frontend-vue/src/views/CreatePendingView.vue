<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  User,
  MapPin,
  Phone,
  Clock,
  Users,
  FileText,
  AlertCircle,
  Tag,
  Hash,
  Bell,
  Link2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { pendingApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { PendingWork } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const submitting = ref(false)
const errorMsg = ref('')
const createdId = ref<number | null>(null)

const form = ref<Partial<PendingWork>>({
  title: '',
  todo_type: '',
  priority: 'normal',
  customer_name: '',
  contact_name: '',
  contact_phone: '',
  work_address: '',
  staff_name: '',
  work_content: '',
  reminder_date: '',
  related_record_id: undefined,
})

const priorities = [
  { key: 'low', label: '低', color: 'bg-slate-500', desc: '一般事项' },
  { key: 'normal', label: '普通', color: 'bg-blue-500', desc: '正常处理' },
  { key: 'high', label: '高', color: 'bg-amber-500', desc: '优先处理' },
  { key: 'urgent', label: '紧急', color: 'bg-red-500', desc: '立即处理' },
]

onMounted(() => {
  if (userStore.user?.staff_name) {
    form.value.staff_name = userStore.user.staff_name
  }
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
  if (!form.value.title) {
    errorMsg.value = '请填写待办标题'
    return
  }
  if (!form.value.customer_name) {
    errorMsg.value = '请填写客户名称'
    return
  }

  submitting.value = true
  try {
    const data: Partial<PendingWork> = {
      title: form.value.title,
      todo_type: form.value.todo_type || '',
      priority: form.value.priority || 'normal',
      customer_name: form.value.customer_name,
      contact_name: form.value.contact_name || '',
      contact_phone: form.value.contact_phone || '',
      work_address: form.value.work_address || '',
      staff_name: form.value.staff_name || '',
      work_content: form.value.work_content || '',
      reminder_date: form.value.reminder_date || null,
      related_record_id: form.value.related_record_id || null,
      status: 'pending',
    }

    const result = await pendingApi.create(data)
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
    router.replace(`/pending/${createdId.value}`)
  } else {
    router.push('/pending')
  }
}

const goToList = () => {
  router.push('/pending')
}

const resetForm = () => {
  form.value = {
    title: '',
    todo_type: '',
    priority: 'normal',
    customer_name: '',
    contact_name: '',
    contact_phone: '',
    work_address: '',
    staff_name: userStore.user?.staff_name || '',
    work_content: '',
    reminder_date: '',
    related_record_id: undefined,
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
          新建待办
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
          <Tag class="w-4 h-4 text-primary" />
          <span>基本信息</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="title">待办标题 <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                id="title"
                v-model="form.title"
                placeholder="请输入待办标题"
                class="h-11 rounded-xl pl-9"
              />
              <FileText class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="todo-type">待办类型</Label>
            <div class="relative">
              <Input
                id="todo-type"
                v-model="form.todo_type"
                placeholder="请输入待办类型"
                class="h-11 rounded-xl pl-9"
              />
              <Tag class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label>优先级</Label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="p in priorities"
                :key="p.key"
                :class="[
                  'p-2 rounded-xl border-2 transition-all text-center active:scale-[0.98]',
                  form.priority === p.key
                    ? 'border-primary bg-card shadow-md'
                    : 'border-border bg-card hover:border-primary/50 shadow-sm'
                ]"
                @click="form.priority = p.key as any"
              >
                <div :class="['w-3 h-3 rounded-full mx-auto mb-1', p.color]" />
                <span class="text-xs font-medium text-foreground">{{ p.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User class="w-4 h-4 text-primary" />
          <span>客户信息</span>
        </div>

        <div class="space-y-3">
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
            <Label for="address">工作地址</Label>
            <div class="relative">
              <Input
                id="address"
                v-model="form.work_address"
                placeholder="请输入工作地址"
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
          <Users class="w-4 h-4 text-primary" />
          <span>工作安排</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
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
          <div class="space-y-1.5">
            <Label for="reminder">提醒时间</Label>
            <div class="relative">
              <Input
                id="reminder"
                v-model="form.reminder_date"
                type="datetime-local"
                class="h-11 rounded-xl pl-9"
              />
              <Bell class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="related-record">关联工单ID</Label>
          <div class="relative">
            <Input
              id="related-record"
              v-model.number="form.related_record_id"
              type="number"
              placeholder="关联工单ID（可选）"
              class="h-11 rounded-xl pl-9"
            />
            <Link2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText class="w-4 h-4 text-primary" />
          <span>工作内容</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="content">工作内容</Label>
            <Textarea
              id="content"
              v-model="form.work_content"
              placeholder="请描述工作内容..."
              class="min-h-[120px] rounded-xl resize-none"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="step === 2" class="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div class="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle2 class="w-12 h-12 text-emerald-500" />
      </div>
      <h2 class="text-xl font-bold text-foreground mb-2">待办创建成功</h2>
      <p class="text-muted-foreground text-sm text-center mb-8">
        待办已成功创建，您可以查看详情或返回列表
      </p>

      <div class="w-full space-y-3">
        <Button
          class="w-full h-12 rounded-xl text-base font-semibold"
          @click="goToDetail"
        >
          查看待办详情
        </Button>
        <Button
          variant="outline"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="goToList"
        >
          返回待办列表
        </Button>
        <Button
          variant="ghost"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="resetForm"
        >
          继续创建待办
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
          {{ submitting ? '提交中...' : '提交待办' }}
        </Button>
      </div>
    </div>
  </div>
</template>
