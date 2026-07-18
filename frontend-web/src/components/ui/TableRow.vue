<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  hoverable?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: false,
  clickable: false,
})
</script>

<template>
  <tr
    :class="cn(
      'border-b border-border transition-colors',
      hoverable ? 'hover:bg-muted/50' : '',
      clickable ? 'cursor-pointer hover:bg-muted/50' : '',
      props.class
    )"
  >
    <slot />
  </tr>
</template>
