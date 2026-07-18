<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

interface Props {
  variant?: Variant
  size?: 'default' | 'sm' | 'lg'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
})

const variants: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  outline: 'text-foreground border border-border hover:bg-accent',
  success: 'bg-success/10 text-success hover:bg-success/20',
  warning: 'bg-warning/10 text-warning hover:bg-warning/20',
  info: 'bg-info/10 text-info hover:bg-info/20',
}

const sizes = {
  default: 'px-3 py-1 text-sm',
  sm: 'px-2 py-0.5 text-xs',
  lg: 'px-4 py-1.5 text-base',
}

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-full font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    variants[props.variant],
    sizes[props.size],
    props.class
  )
)
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
