<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import MobileLayout from './MobileLayout.vue'
import DesktopLayout from '@/components/layout/DesktopLayout.vue'
import { useResponsive } from '@/composables/useResponsive'

const { isMobile } = useResponsive()
const route = useRoute()

const hideLayout = computed(() => route.meta.hideLayout === true)
</script>

<template>
  <template v-if="hideLayout">
    <RouterView />
  </template>
  <MobileLayout v-else-if="isMobile" />
  <DesktopLayout v-else />
</template>
