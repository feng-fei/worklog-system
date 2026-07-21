<script setup lang="ts">
import { SelectRoot } from 'radix-vue'
import type { SelectRootProps } from 'radix-vue'

defineProps<SelectRootProps>()
defineEmits<{
  'update:modelValue': [value: string]
  'update:open': [value: boolean]
}>()
</script>

<template>
  <SelectRoot
    v-bind="$props"
    @update:model-value="(val) => $emit('update:modelValue', val)"
    @update:open="(val) => $emit('update:open', val)"
  >
    <slot />
  </SelectRoot>
</template>
