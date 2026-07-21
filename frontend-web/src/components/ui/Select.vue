<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Search, ChevronRight, Check, X } from 'lucide-vue-next'
import Drawer from './Drawer.vue'

interface Option {
  value: string | number
  label: string
  description?: string
  [key: string]: any
}

interface Props {
  modelValue?: string | number | null
  options?: Option[]
  placeholder?: string
  title?: string
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  placeholder: '请选择',
  title: '请选择',
  searchable: true,
  searchPlaceholder: '搜索...',
  disabled: false,
  clearable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'change', value: string | number | null, option: Option | null): void
  (e: 'search', query: string): void
}>()

const drawerOpen = ref(false)
const searchQuery = ref('')

const selectedOption = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return null
  return props.options.find((o) => o.value === props.modelValue) || null
})

const displayText = computed(() => {
  return selectedOption.value?.label || props.placeholder
})

const filteredOptions = computed(() => {
  if (!searchQuery.value || !props.searchable) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(query) ||
      (o.description && o.description.toLowerCase().includes(query))
  )
})

const openDrawer = () => {
  if (props.disabled) return
  searchQuery.value = ''
  drawerOpen.value = true
}

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  drawerOpen.value = false
}

const clearSelection = (e: Event) => {
  e.stopPropagation()
  emit('update:modelValue', null)
  emit('change', null, null)
}

const handleSearch = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchQuery.value = target.value
  emit('search', target.value)
}

watch(
  () => props.modelValue,
  () => {
    // 更新时的处理
  }
)
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-background px-4 text-base transition-colors"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 active:bg-accent/50',
        !selectedOption ? 'text-muted-foreground' : 'text-foreground',
      ]"
      :disabled="disabled"
      @click="openDrawer"
    >
      <span class="truncate">{{ displayText }}</span>
      <div class="flex items-center gap-1">
        <X
          v-if="clearable && selectedOption && !disabled"
          class="h-4 w-4 text-muted-foreground"
          @click="clearSelection"
        />
        <ChevronRight class="h-5 w-5 rotate-90 text-muted-foreground" />
      </div>
    </button>

    <Drawer v-model="drawerOpen" :title="title" height="75vh">
      <div class="pb-4">
        <div v-if="searchable" class="relative mb-4">
          <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            :value="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autofocus
            @input="handleSearch"
          />
        </div>

        <div class="space-y-1">
          <div
            v-if="filteredOptions.length === 0"
            class="py-12 text-center text-sm text-muted-foreground"
          >
            暂无匹配结果
          </div>
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-accent active:bg-accent/80"
            :class="{
              'bg-primary/10 text-primary': modelValue === option.value,
            }"
            @click="selectOption(option)"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ option.label }}</p>
              <p v-if="option.description" class="mt-0.5 text-sm text-muted-foreground truncate">
                {{ option.description }}
              </p>
            </div>
            <Check
              v-if="modelValue === option.value"
              class="ml-3 h-5 w-5 flex-shrink-0 text-primary"
            />
          </button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
