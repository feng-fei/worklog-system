<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Trash2, Receipt, User, DollarSign, FileText, ChevronDown, ChevronUp, Package, Wrench, Truck, UtensilsCrossed, UserCog, MoreHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PhotoUpload from '@/components/PhotoUpload.vue'

export interface ExpenseItem {
  id?: number
  expense_type: string
  category?: string
  amount: number
  description: string
  staff_name: string
  receipt_photos: string[]
  expense_date?: string
}

interface Props {
  modelValue: ExpenseItem[]
  staffOptions?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  staffOptions: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: ExpenseItem[]]
}>()

const expenseCategories = [
  { value: 'material', label: '材料采购', color: 'text-blue-600', icon: Package },
  { value: 'equipment', label: '工具设备', color: 'text-purple-600', icon: Wrench },
  { value: 'transport', label: '运输差旅', color: 'text-amber-600', icon: Truck },
  { value: 'catering', label: '餐饮住宿', color: 'text-orange-600', icon: UtensilsCrossed },
  { value: 'labor', label: '人工外包', color: 'text-green-600', icon: UserCog },
  { value: 'other', label: '其他', color: 'text-muted-foreground', icon: MoreHorizontal },
]

const expenses = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const totalAmount = computed(() => {
  return expenses.value.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
})

const addExpense = () => {
  expenses.value = [
    ...expenses.value,
    {
      expense_type: 'material',
      category: 'material',
      amount: 0,
      description: '',
      staff_name: '',
      receipt_photos: [],
      expense_date: new Date().toISOString().split('T')[0],
    },
  ]
}

const removeExpense = (index: number) => {
  expenses.value = expenses.value.filter((_, i) => i !== index)
}

const updateField = (index: number, field: keyof ExpenseItem, value: any) => {
  const updated = [...expenses.value]
  updated[index] = { ...updated[index], [field]: value }
  if (field === 'expense_type') {
    updated[index].category = value
  }
  expenses.value = updated
}

const updatePhotos = (index: number, photos: string[]) => {
  const updated = [...expenses.value]
  updated[index] = { ...updated[index], receipt_photos: photos }
  expenses.value = updated
}

const getCategoryLabel = (val: string) => {
  return expenseCategories.find(c => c.value === val)?.label || val
}

const getCategoryColor = (val: string) => {
  return expenseCategories.find(c => c.value === val)?.color || ''
}

const getCategoryIcon = (val: string) => {
  return expenseCategories.find(c => c.value === val)?.icon || MoreHorizontal
}

const toggleExpand = (_index: number) => {
  // 移动端点击展开/收起详情，这里用样式控制
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Receipt class="w-5 h-5 text-primary" />
        <span class="font-semibold text-foreground">费用支出明细</span>
        <span class="text-sm text-muted-foreground">({{ expenses.length }} 笔)</span>
      </div>
      <div class="text-right">
        <div class="text-sm text-muted-foreground">支出合计</div>
        <div class="text-lg font-bold text-destructive">¥{{ totalAmount.toFixed(2) }}</div>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="(expense, index) in expenses"
        :key="index"
        class="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div class="flex items-center gap-3 p-3 bg-muted/30 border-b border-border">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span :class="['text-sm font-medium', getCategoryColor(expense.expense_type || expense.category || 'other')]">
                {{ getCategoryLabel(expense.expense_type || expense.category || 'other') }}
              </span>
              <span class="text-sm text-muted-foreground truncate">
                {{ expense.description || '无描述' }}
              </span>
            </div>
            <div v-if="expense.staff_name" class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <User class="w-3 h-3" />
              {{ expense.staff_name }}
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-destructive">¥{{ (expense.amount || 0).toFixed(2) }}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
            @click="removeExpense(index)"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>

        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label class="text-xs">费用类型</Label>
              <div class="relative">
                <component :is="getCategoryIcon(expense.expense_type || expense.category || 'other')" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Select
                  :model-value="expense.expense_type || expense.category || 'material'"
                  @update:model-value="(val: string) => updateField(index, 'expense_type', val)"
                >
                  <SelectTrigger class="h-9 pl-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="cat in expenseCategories" :key="cat.value" :value="cat.value">
                      <div class="flex items-center gap-2">
                        <component :is="cat.icon" class="w-4 h-4" :class="cat.color" />
                        <span>{{ cat.label }}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs">金额 (元)</Label>
              <div class="relative">
                <DollarSign class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  :value="expense.amount"
                  class="h-9 pl-8 font-medium"
                  @input="(e: Event) => updateField(index, 'amount', Number((e.target as HTMLInputElement).value))"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs">支出人员</Label>
              <div class="relative">
                <User class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  :value="expense.staff_name"
                  placeholder="经手人姓名"
                  class="h-9 pl-8"
                  list="staff-list"
                  @input="(e: Event) => updateField(index, 'staff_name', (e.target as HTMLInputElement).value)"
                />
                <datalist id="staff-list">
                  <option v-for="s in staffOptions" :key="s" :value="s" />
                </datalist>
              </div>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs">支出日期</Label>
              <Input
                type="date"
                :value="expense.expense_date"
                class="h-9"
                @input="(e: Event) => updateField(index, 'expense_date', (e.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs flex items-center gap-1">
              <FileText class="w-3.5 h-3.5" />
              费用说明
            </Label>
            <Input
              :value="expense.description"
              placeholder="简要说明费用用途..."
              class="h-9"
              @input="(e: Event) => updateField(index, 'description', (e.target as HTMLInputElement).value)"
            />
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs">票据照片</Label>
            <PhotoUpload :model-value="expense.receipt_photos || []" :max="6" @update:model-value="(v: string[]) => updatePhotos(index, v)" />
          </div>
        </div>
      </div>

      <div v-if="expenses.length === 0" class="py-8 text-center border-2 border-dashed border-border rounded-xl">
        <Receipt class="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <p class="text-sm text-muted-foreground">暂无费用支出记录</p>
        <p class="text-xs text-muted-foreground/70 mt-1">点击下方按钮添加</p>
      </div>

      <Button
        variant="outline"
        class="w-full h-10 border-dashed"
        @click="addExpense"
      >
        <Plus class="w-4 h-4 mr-2" />
        添加费用支出
      </Button>
    </div>
  </div>
</template>
