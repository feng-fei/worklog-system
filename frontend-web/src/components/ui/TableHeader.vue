<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <thead :class="cn('bg-muted/50', props.class)">
    <slot />
  </thead>
</template>
