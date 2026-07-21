<script setup lang="ts">
import { SelectValue } from 'radix-vue'
import type { SelectValueProps } from 'radix-vue'

defineProps<SelectValueProps>()
</script>

<template>
  <SelectValue v-bind="$props">
    <slot />
  </SelectValue>
</template>
