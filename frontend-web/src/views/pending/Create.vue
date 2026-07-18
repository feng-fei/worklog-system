<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pendingApi, customersApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const customers = ref<any[]>([])

const form = reactive({
  title: '',
  customer_name: '',
  contact_name: '',
  contact_phone: '',
  work_address: '',
  staff_name: '',
  work_content: '',
  reminder_date: '',
  todo_type: '客户报修',
  priority: 'normal',
})

const todoTypes = [
  { value: '客户报修', label: '客户报修' },
  { value: '巡检维护', label: '巡检维护' },
  { value: '设备保养', label: '设备保养' },
  { value: '其他', label: '其他' },
]

const priorities = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
]

const loadCustomers = async () => {
  try {
    const res = await customersApi.list({ page_size: 100 })
    customers.value = res.data.records || res.data.list || res.data || []
  } catch (e) {
    console.error('加载客户失败', e)
  }
}

const handleSubmit = async () => {
  if (!form.title && !form.work_content) {
    alert('请填写标题或工作内容')
    return
  }
  if (!form.customer_name) {
    alert('请选择客户')
    return
  }

  submitting.value = true
  try {
    await pendingApi.create(form)
    router.back()
  } catch (e: any) {
    alert(e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCustomers()
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="新建待办" :showBack="true">
      <template #right>
        <button
          class="flex h-10 items-center gap-1 rounded-full px-3 text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors"
          :disabled="submitting"
          @click="handleSubmit"
        >
          <Save class="h-4 w-4" />
          <span class="text-sm font-medium">保存</span>
        </button>
      </template>
    </MobileHeader>

    <div class="flex-1 space-y-4 p-4 pb-24">
      <Card class="p-4 space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium">
            <FileText class="inline h-4 w-4 mr-1 text-muted-foreground" />
            标题
          </label>
          <Input v-model="form.title" placeholder="请输入待办标题" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium">
            <User class="inline h-4 w-4 mr-1 text-muted-foreground" />
            客户名称 <span class="text-destructive">*</span>
          </label>
          <Select
            v-model="form.customer_name"
            :options="customers.map((c) => ({ value: c.name, label: c.name }))"
            placeholder="请选择客户"
            searchable
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium">联系人</label>
            <Input v-model="form.contact_name" placeholder="联系人姓名" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium">联系电话</label>
            <Input v-model="form.contact_phone" placeholder="联系电话" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium">
            <MapPin class="inline h-4 w-4 mr-1 text-muted-foreground" />
            工作地址
          </label>
          <Input v-model="form.work_address" placeholder="请输入工作地址" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-sm font-medium">
              <Calendar class="inline h-4 w-4 mr-1 text-muted-foreground" />
              提醒日期
            </label>
            <Input
              v-model="form.reminder_date"
              type="date"
              placeholder="选择日期"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium">优先级</label>
            <Select
              v-model="form.priority"
              :options="priorities"
              placeholder="选择优先级"
            />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium">待办类型</label>
          <Select
            v-model="form.todo_type"
            :options="todoTypes"
            placeholder="选择待办类型"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium">工作内容</label>
          <Textarea
            v-model="form.work_content"
            placeholder="请详细描述工作内容..."
            :rows="4"
          />
        </div>
      </Card>
    </div>

    <div class="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 safe-bottom">
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1" @click="router.back()">
          <ArrowLeft class="h-4 w-4 mr-2" />
          取消
        </Button>
        <Button class="flex-1" :disabled="submitting" @click="handleSubmit">
          <Save class="h-4 w-4 mr-2" />
          保存
        </Button>
      </div>
    </div>
  </div>
</template>
