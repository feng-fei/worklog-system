<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { cn } from '@/lib/utils'
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  height?: string
  showClose?: boolean
  showHandle?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  height: 'auto',
  showClose: true,
  showHandle: true,
  persistent: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'open'): void
}>()

const isVisible = ref(false)
const isAnimating = ref(false)

const open = () => {
  isVisible.value = true
  requestAnimationFrame(() => {
    isAnimating.value = true
  })
  emit('open')
  document.body.style.overflow = 'hidden'
}

const close = () => {
  if (props.persistent) return
  isAnimating.value = false
  setTimeout(() => {
    isVisible.value = false
    document.body.style.overflow = ''
    emit('close')
  }, 300)
}

const handleOverlayClick = () => {
  if (!props.persistent) {
    close()
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  close()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      open()
    } else if (isVisible.value) {
      close()
    }
  }
)

onMounted(() => {
  if (props.modelValue) {
    open()
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[100] flex items-end justify-center"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleOverlayClick"
        />

        <div
          class="relative w-full max-w-lg rounded-t-3xl bg-background shadow-2xl transition-transform duration-300 ease-out"
          :class="[
            isAnimating ? 'translate-y-0' : 'translate-y-full',
            height === 'auto' ? 'max-h-[85vh]' : '',
          ]"
          :style="height !== 'auto' ? { height } : {}"
        >
          <div
            v-if="showHandle"
            class="flex justify-center pt-3 pb-1"
          >
            <div class="h-1.5 w-10 rounded-full bg-muted-foreground/30"></div>
          </div>

          <div
            v-if="title || showClose"
            class="flex items-center justify-between px-5 pb-3"
          >
            <h3 class="text-lg font-semibold">{{ title }}</h3>
            <button
              v-if="showClose"
              class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div
            class="overflow-y-auto px-5 pb-safe"
            :class="height === 'auto' ? 'max-h-[calc(85vh-80px)]' : 'h-full'"
          >
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
</style>
