<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import type { ToastType } from './useToast'

interface Props {
  title: string
  description?: string
  type?: ToastType
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
})

const emit = defineEmits<{
  close: []
}>()

const icons: Record<ToastType, any> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = computed(() => {
  const colorMap: Record<ToastType, string> = {
    default: 'border-border bg-card text-foreground',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
  }
  return colorMap[props.type]
})

const iconColor = computed(() => {
  const colorMap: Record<ToastType, string> = {
    default: 'text-muted-foreground',
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
  }
  return colorMap[props.type]
})
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto animate-slide-down',
      colors
    ]"
  >
    <component :is="icons[type]" :class="['w-5 h-5 shrink-0 mt-0.5', iconColor]" />
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-sm">{{ title }}</p>
      <p v-if="description" class="text-xs mt-1 opacity-80 leading-relaxed">{{ description }}</p>
    </div>
    <button
      class="shrink-0 opacity-60 hover:opacity-100 transition-opacity tap-highlight-transparent"
      @click="emit('close')"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>

<style scoped>
.animate-slide-down {
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
