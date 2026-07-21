<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Drawer from '@/components/ui/Drawer.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { useResponsive } from '@/composables/useResponsive'
import {
  Search,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Tag,
  X,
  Check,
} from 'lucide-vue-next'

const { isDesktop } = useResponsive()

const categories = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')

const drawerOpen = ref(false)
const isEditing = ref(false)
const formLoading = ref(false)
const formData = ref({
  id: null as number | null,
  name: '',
  expense_type: 'daily',
  sort_order: 0,
})
const formErrors = ref<Record<string, string>>({})

const typeOptions = [
  { value: 'daily', label: '日常支出' },
  { value: 'purchase', label: '采购支出' },
  { value: 'other', label: '其他' },
]

const getTypeLabel = (type: string) => {
  const option = typeOptions.find((o) => o.value === type)
  return option?.label || type || '未分类'
}

const getTypeVariant = (type: string) => {
  const variants: Record<string, string> = {
    daily: 'secondary',
    purchase: 'warning',
    other: 'default',
  }
  return variants[type] || 'secondary'
}

const loadCategories = async () => {
  loading.value = true
  try {
    const res = await financeApi.expenseCategories()
    const data = res.data
    const list = data.categories || data.records || data.list || data.items || []
    categories.value = list
  } catch (e) {
    console.error('加载支出分类失败', e)
  } finally {
    loading.value = false
  }
}

const onRefresh = () => {
  loadCategories()
}

const openCreateDrawer = () => {
  isEditing.value = false
  formData.value = {
    id: null,
    name: '',
    expense_type: 'daily',
    sort_order: 0,
  }
  formErrors.value = {}
  drawerOpen.value = true
}

const openEditDrawer = (category: any) => {
  isEditing.value = true
  formData.value = {
    id: category.id,
    name: category.name || '',
    expense_type: category.expense_type || 'daily',
    sort_order: category.sort_order || 0,
  }
  formErrors.value = {}
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
}

const validateForm = () => {
  formErrors.value = {}
  let valid = true
  if (!formData.value.name?.trim()) {
    formErrors.value.name = '请输入分类名称'
    valid = false
  }
  return valid
}

const handleSubmit = async () => {
  if (!validateForm()) return
  formLoading.value = true
  try {
    const submitData = {
      name: formData.value.name.trim(),
      expense_type: formData.value.expense_type,
      sort_order: formData.value.sort_order,
    }
    if (isEditing.value && formData.value.id) {
      await financeApi.updateExpenseCategory(formData.value.id, submitData)
    } else {
      await financeApi.createExpenseCategory(submitData)
    }
    drawerOpen.value = false
    loadCategories()
  } catch (e: any) {
    console.error('保存失败', e)
    const errorMsg = e.response?.data?.error || e.message || '保存失败，请重试'
    alert(errorMsg)
  } finally {
    formLoading.value = false
  }
}

const handleDelete = async (id: number, e: Event) => {
  e.stopPropagation()
  if (!confirm('确定要删除这个分类吗？')) return
  try {
    await financeApi.deleteExpenseCategory(id)
    loadCategories()
  } catch (e: any) {
    console.error('删除失败', e)
    alert(e.response?.data?.error || '删除失败，请重试')
  }
}

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  const query = searchQuery.value.toLowerCase()
  return categories.value.filter(
    (c) => (c.name || '').toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadCategories()
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <template v-if="isDesktop">
      <div class="mx-auto w-full max-w-5xl px-8 py-6">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-foreground">支出分类</h1>
          <Button @click="openCreateDrawer">
            <Plus class="mr-2 h-4 w-4" /> 新增分类
          </Button>
        </div>
        <Card class="mb-6 p-4">
          <div class="flex items-center gap-4">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索分类名称..."
                class="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
              @click="onRefresh"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              刷新
            </button>
          </div>
        </Card>
        <Card class="overflow-hidden">
          <div v-if="loading && categories.length === 0" class="py-12 text-center text-muted-foreground">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
            <p>加载中...</p>
          </div>
          <div v-else-if="filteredCategories.length === 0" class="py-12 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Tag class="h-8 w-8 text-muted-foreground" />
            </div>
            <p class="text-muted-foreground">暂无支出分类</p>
          </div>
          <template v-else>
            <div class="divide-y divide-border">
              <div v-for="category in filteredCategories" :key="category.id" class="flex items-center justify-between p-4 hover:bg-accent/50">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Tag class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="font-medium">{{ category.name }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <Badge :variant="getTypeVariant(category.expense_type) as any" size="sm">
                        {{ getTypeLabel(category.expense_type) }}
                      </Badge>
                      <span v-if="category.is_system" class="text-xs text-muted-foreground">系统分类</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm text-primary hover:bg-primary/10 transition-colors"
                    @click="openEditDrawer(category)"
                  >
                    <Edit3 class="h-3.5 w-3.5" /> 编辑
                  </button>
                  <button
                    v-if="!category.is_system"
                    class="inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    @click="handleDelete(category.id, $event)"
                  >
                    <Trash2 class="h-3.5 w-3.5" /> 删除
                  </button>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </template>
    <template v-else>
      <MobileHeader title="支出分类" :showBack="true">
        <template #right>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
            @click="onRefresh"
          >
            <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
          </button>
        </template>
      </MobileHeader>
      <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
        <div class="relative">
          <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索分类名称..."
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div class="flex-1 space-y-3 px-4 pb-24">
        <div v-if="loading && categories.length === 0" class="py-12 text-center text-muted-foreground">
          <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
          <p>加载中...</p>
        </div>
        <div v-else-if="filteredCategories.length === 0" class="py-12 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Tag class="h-8 w-8 text-muted-foreground" />
          </div>
          <p class="text-muted-foreground">暂无支出分类</p>
          <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加分类</p>
        </div>
        <template v-else>
          <Card v-for="category in filteredCategories" :key="category.id" class="p-4 active:scale-[0.99] transition-transform">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Tag class="h-5 w-5" />
                </div>
                <div>
                  <p class="font-semibold">{{ category.name }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <Badge :variant="getTypeVariant(category.expense_type) as any" size="sm">
                      {{ getTypeLabel(category.expense_type) }}
                    </Badge>
                    <span v-if="category.is_system" class="text-xs text-muted-foreground">系统</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                @click="openEditDrawer(category)"
              >
                <Edit3 class="h-3.5 w-3.5" /> 编辑
              </button>
              <button
                v-if="!category.is_system"
                class="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                @click="handleDelete(category.id, $event)"
              >
                <Trash2 class="h-3.5 w-3.5" /> 删除
              </button>
            </div>
          </Card>
        </template>
      </div>
      <button
        class="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90"
        @click="openCreateDrawer"
      >
        <Plus class="h-7 w-7" />
      </button>
    </template>
    <Drawer v-model="drawerOpen" :title="isEditing ? '编辑分类' : '新增分类'">
      <div class="space-y-4 pb-6">
        <Input
          v-model="formData.name"
          label="分类名称"
          placeholder="请输入分类名称"
          :error="formErrors.name"
        />
        <div class="w-full">
          <label class="mb-2 block text-sm font-medium text-foreground">分类类型</label>
          <Select
            v-model="formData.expense_type"
            :options="typeOptions"
            placeholder="请选择分类类型"
            title="选择分类类型"
          />
        </div>
        <div class="flex gap-3 pt-2">
          <Button variant="outline" class="flex-1" @click="closeDrawer">
            <X class="h-4 w-4" /> 取消
          </Button>
          <Button class="flex-1" :loading="formLoading" @click="handleSubmit">
            <Check class="h-4 w-4" /> {{ isEditing ? '保存' : '创建' }}
          </Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
