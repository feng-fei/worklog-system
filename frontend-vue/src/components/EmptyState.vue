<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Component } from 'vue'

interface Props {
  icon?: Component
  title?: string
  description?: string
  actionText?: string
  iconClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: Inbox,
  title: '暂无数据',
  description: '',
  actionText: '',
  iconClass: '',
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
    <div
      class="relative mb-5 md:mb-6"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl scale-150 opacity-60" />
      <div
        :class="[
          'relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10',
          iconClass
        ]"
      >
        <component
          :is="icon"
          class="w-8 h-8 md:w-10 md:h-10 text-primary/70"
        />
      </div>
    </div>

    <h3 class="text-base md:text-lg font-semibold text-foreground mb-1.5 md:mb-2">
      {{ title }}
    </h3>

    <p
      v-if="description"
      class="text-xs md:text-sm text-muted-foreground max-w-xs mb-5 md:mb-6 leading-relaxed"
    >
      {{ description }}
    </p>

    <Button
      v-if="actionText"
      variant="default"
      size="sm"
      class="rounded-xl px-5 md:px-6 h-9 md:h-10 text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
      @click="emit('action')"
    >
      {{ actionText }}
    </Button>
  </div>
</template>
