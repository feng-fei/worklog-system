<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <td
    :class="cn(
      'px-4 py-3 align-middle',
      props.class
    )"
  >
    <slot />
  </td>
</template>
