<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <th
    :class="cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
      props.class
    )"
  >
    <slot />
  </th>
</template>
