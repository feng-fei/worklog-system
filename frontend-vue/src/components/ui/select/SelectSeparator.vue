<script setup lang="ts">
import { SelectSeparator } from 'radix-vue'
import type { SelectSeparatorProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends SelectSeparatorProps {
  class?: string
}

defineProps<Props>()
</script>

<template>
  <SelectSeparator
    v-bind="$props"
    :class="cn(
      '-mx-1 my-1 h-px bg-muted',
      props.class,
    )"
  />
</template>
