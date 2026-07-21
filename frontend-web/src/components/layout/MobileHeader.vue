<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChevronLeft, Menu, MoreHorizontal } from 'lucide-vue-next'

interface Props {
  title?: string
  showBack?: boolean
  showMenu?: boolean
  menuIcon?: any
  transparent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  showMenu: false,
  transparent: false,
})

const router = useRouter()

const emit = defineEmits<{
  'right-click': []
  'menu-click': []
}>()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full pt-safe transition-all duration-200"
    :class="transparent ? 'bg-transparent' : 'bg-background/80 backdrop-blur-lg border-b border-border'"
  >
    <div class="flex h-14 items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <button
          v-if="showBack"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors -ml-2"
          @click="goBack"
        >
          <ChevronLeft class="h-6 w-6" />
        </button>
        <button
          v-else-if="showMenu"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors -ml-2"
          @click="emit('menu-click')"
        >
          <component :is="menuIcon || Menu" class="h-6 w-6" />
        </button>
        <h1 class="text-lg font-semibold">{{ title }}</h1>
      </div>
      <div class="flex items-center gap-1">
        <slot name="right">
          <button
            v-if="$slots['right-content'] || emit"
            class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors -mr-2"
            @click="emit('right-click')"
          >
            <slot name="right-content">
              <MoreHorizontal class="h-5 w-5" />
            </slot>
          </button>
        </slot>
      </div>
    </div>
  </header>
</template>
