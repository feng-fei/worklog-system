<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('overflow-x-auto rounded-xl border border-border', props.class)">
    <table class="w-full text-sm">
      <slot />
    </table>
  </div>
</template>
