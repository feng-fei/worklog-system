<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  rows?: number
  class?: string
  error?: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  rows: 4,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'focus': []
  'blur': []
}>()

const textareaClass = computed(() =>
  cn(
    'flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200 resize-none',
    props.error ? 'border-destructive focus-visible:ring-destructive' : '',
    props.class
  )
)

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="mb-2 block text-sm font-medium text-foreground">
      {{ label }}
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="textareaClass"
      @input="handleInput"
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
    <p v-if="error" class="mt-1.5 text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
