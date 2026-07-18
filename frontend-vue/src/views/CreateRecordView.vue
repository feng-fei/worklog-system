<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Wrench,
  Construction,
  Building2,
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
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { recordsApi } from '@/api'

const router = useRouter()

const step = ref(1)
const submitting = ref(false)

const form = ref({
  record_type: '',
  title: '',
  customer_name: '',
  contact_person: '',
  contact_phone: '',
  address: '',
  start_time: '',
  estimated_hours: '',
  staff_names: '',
  description: '',
  materials: [] as { name: string; quantity: string; unit: string }[],
})

const types = [
  { key: 'construction', label: '施工单', icon: Wrench, color: 'from-blue-500 to-blue-600', desc: '单次施工任务' },
  { key: 'repair', label: '维修单', icon: Construction, color: 'from-emerald-500 to-emerald-600', desc: '设备维修/抢修' },
  { key: 'project', label: '项目施工', icon: Building2, color: 'from-violet-500 to-violet-600', desc: '大型项目工程' },
]

const selectedType = computed(() => types.find(t => t.key === form.value.record_type))

const goBack = () => {
  if (step.value > 1) {
    step.value--
  } else {
    router.back()
  }
}

const onSelectType = (key: string) => {
  form.value.record_type = key
}

const nextStep = () => {
  if (step.value === 1 && !form.value.record_type) return
  step.value++
}

const addMaterial = () => {
  form.value.materials.push({ name: '', quantity: '', unit: '个' })
}

const removeMaterial = (index: number) => {
  form.value.materials.splice(index, 1)
}

const handleSubmit = async () => {
  if (!form.value.title || !form.value.customer_name) {
    alert('请填写必填项')
    return
  }

  submitting.value = true
  try {
    await recordsApi.create({
      ...form.value,
      materials: form.value.materials.filter(m => m.name),
    })
    step.value = 3
  } catch (e) {
    alert('创建失败，请重试')
  } finally {
    submitting.value = false
  }
}

const handleSaveDraft = () => {
  alert('草稿已保存')
}

const goToList = () => {
  router.push('/records')
}

const stepTitles = ['选择类型', '填写信息', '创建完成']
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
          新建工单
        </h1>
      </div>

      <div class="px-4 pb-3">
        <div class="flex items-center justify-between">
          <div
            v-for="(title, i) in stepTitles"
            :key="i"
            class="flex items-center"
          >
            <div
              :class="[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                step > i + 1
                  ? 'bg-primary text-primary-foreground'
                  : step === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              ]"
            >
              <CheckCircle2 v-if="step > i + 1" class="w-4 h-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              :class="[
                'ml-2 text-sm font-medium',
                step >= i + 1 ? 'text-foreground' : 'text-muted-foreground'
              ]"
            >
              {{ title }}
            </span>
            <div
              v-if="i < stepTitles.length - 1"
              :class="[
                'w-6 mx-2 h-0.5 rounded-full',
                step > i + 1 ? 'bg-primary' : 'bg-muted'
              ]"
            />
          </div>
        </div>
      </div>
    </header>

    <div v-if="step === 1" class="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
      <div class="text-center">
        <h2 class="text-xl font-bold text-foreground">选择工单类型</h2>
        <p class="text-sm text-muted-foreground mt-1.5">请选择您要创建的工单类型</p>
      </div>

      <div class="space-y-3">
        <button
          v-for="t in types"
          :key="t.key"
          :class="[
            'w-full p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98]',
            form.record_type === t.key
              ? 'border-primary bg-card shadow-md'
              : 'border-border bg-card hover:border-primary/50 shadow-sm'
          ]"
          @click="onSelectType(t.key)"
        >
          <div class="flex items-center gap-3">
            <div :class="['w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', t.color]">
              <component :is="t.icon" class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-foreground">{{ t.label }}</h3>
              <p class="text-sm text-muted-foreground mt-0.5">{{ t.desc }}</p>
            </div>
            <div
              :class="[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
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
    </div>

    <div v-else-if="step === 2" class="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText class="w-4 h-4 text-primary" />
          <span>基本信息</span>
        </div>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="title">工单标题 <span class="text-destructive">*</span></Label>
            <Input
              id="title"
              v-model="form.title"
              placeholder="请输入工单标题"
              class="h-11 rounded-xl"
            />
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
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar class="w-4 h-4 text-primary" />
          <span>时间安排</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="start-time">开始时间</Label>
            <div class="relative">
              <Input
                id="start-time"
                v-model="form.start_time"
                type="datetime-local"
                class="h-11 rounded-xl pl-9"
              />
              <Clock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="hours">预计工时</Label>
            <div class="relative">
              <Input
                id="hours"
                v-model="form.estimated_hours"
                placeholder="小时"
                class="h-11 rounded-xl pl-9"
                type="number"
              />
              <Clock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users class="w-4 h-4 text-primary" />
          <span>施工人员</span>
        </div>

        <div class="space-y-1.5">
          <Label for="staff">施工人员</Label>
          <div class="relative">
            <Input
              id="staff"
              v-model="form.staff_names"
              placeholder="多个人员用逗号分隔"
              class="h-11 rounded-xl pl-9"
            />
            <Users class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package class="w-4 h-4 text-primary" />
            <span>物料清单</span>
          </div>
          <button
            class="text-xs text-primary font-medium flex items-center gap-1 tap-highlight-transparent"
            @click="addMaterial"
          >
            <Plus class="w-3.5 h-3.5" />
            添加
          </button>
        </div>

        <div v-if="form.materials.length === 0" class="text-center py-6 text-muted-foreground text-sm">
          暂无物料，点击上方添加
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(m, index) in form.materials"
            :key="index"
            class="flex items-center gap-2"
          >
            <Input
              v-model="m.name"
              placeholder="物料名称"
              class="h-10 rounded-lg flex-1"
            />
            <Input
              v-model="m.quantity"
              placeholder="数量"
              class="h-10 rounded-lg w-20"
              type="number"
            />
            <Input
              v-model="m.unit"
              placeholder="单位"
              class="h-10 rounded-lg w-16"
            />
            <button
              class="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors tap-highlight-transparent"
              @click="removeMaterial(index)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="h-px bg-border -mx-4" />

      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText class="w-4 h-4 text-primary" />
          <span>工作内容</span>
        </div>

        <Textarea
          v-model="form.description"
          placeholder="请详细描述工作内容..."
          class="min-h-[120px] rounded-xl resize-none"
        />
      </div>
    </div>

    <div v-else-if="step === 3" class="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div class="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle2 class="w-12 h-12 text-emerald-500" />
      </div>
      <h2 class="text-xl font-bold text-foreground mb-2">工单创建成功</h2>
      <p class="text-muted-foreground text-sm text-center mb-8">
        工单已成功创建，您可以在工单列表中查看
      </p>

      <div class="w-full space-y-3">
        <Button
          class="w-full h-12 rounded-xl text-base font-semibold"
          @click="goToList"
        >
          查看工单列表
        </Button>
        <Button
          variant="outline"
          class="w-full h-12 rounded-xl text-base font-medium"
          @click="step = 1; form = { record_type: '', title: '', customer_name: '', contact_person: '', contact_phone: '', address: '', start_time: '', estimated_hours: '', staff_names: '', description: '', materials: [] }"
        >
          继续创建
        </Button>
      </div>
    </div>

    <div
      v-if="step < 3"
      class="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 safe-area-bottom"
    >
      <div class="flex gap-3">
        <Button
          v-if="step === 1"
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
          @click="handleSaveDraft"
        >
          <Save class="w-4 h-4 mr-2" />
          保存草稿
        </Button>
        <Button
          v-else
          variant="outline"
          class="flex-1 h-12 rounded-xl text-base font-medium"
          @click="goBack"
        >
          上一步
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
          <Send v-if="!submitting" class="w-4 h-4 mr-2" />
          {{ submitting ? '提交中...' : '提交工单' }}
        </Button>
      </div>
    </div>
  </div>
</template>
