<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  class?: string
  error?: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'focus': []
  'blur': []
}>()

const inputClass = computed(() =>
  cn(
    'flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200',
    props.error ? 'border-destructive focus-visible:ring-destructive' : '',
    props.class
  )
)

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="mb-2 block text-sm font-medium text-foreground">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClass"
      @input="handleInput"
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
    <p v-if="error" class="mt-1.5 text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
