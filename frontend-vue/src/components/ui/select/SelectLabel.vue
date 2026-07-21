<script setup lang="ts">
import { SelectLabel } from 'radix-vue'
import type { SelectLabelProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends SelectLabelProps {
  class?: string
}

defineProps<Props>()
</script>

<template>
  <SelectLabel
    v-bind="$props"
    :class="cn(
      'py-1.5 pl-8 pr-2 text-sm font-semibold',
      props.class,
    )"
  >
    <slot />
  </SelectLabel>
</template>
