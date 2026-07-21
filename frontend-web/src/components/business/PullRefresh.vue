<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RefreshCw } from 'lucide-vue-next'

interface Props {
  pullingText?: string
  releasingText?: string
  loadingText?: string
  successText?: string
  threshold?: number
  headHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  pullingText: '下拉刷新',
  releasingText: '释放刷新',
  loadingText: '刷新中...',
  successText: '刷新成功',
  threshold: 60,
  headHeight: 50,
})

const emit = defineEmits<{
  refresh: []
}>()

const scrollElement = ref<HTMLElement | null>(null)
const pullDistance = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)
const isSuccess = ref(false)
let startY = 0
let startScrollTop = 0

const statusText = computed(() => {
  if (isSuccess.value) return props.successText
  if (isRefreshing.value) return props.loadingText
  if (pullDistance.value >= props.threshold) return props.releasingText
  return props.pullingText
})

const headStyle = computed(() => ({
  height: `${Math.min(pullDistance.value, props.threshold * 1.5)}px`,
  marginTop: `-${props.headHeight}px`,
}))

const iconRotate = computed(() => {
  const progress = Math.min(pullDistance.value / props.threshold, 1)
  return `rotate(${progress * 360}deg)`
})

const onTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value) return
  const target = e.target as HTMLElement
  scrollElement.value = target.closest('.scroll-container') as HTMLElement || null
  startScrollTop = scrollElement.value?.scrollTop || 0
  if (startScrollTop > 0) return
  startY = e.touches[0].clientY
  isPulling.value = true
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value) return
  const currentY = e.touches[0].clientY
  const diff = currentY - startY
  if (diff <= 0) {
    pullDistance.value = 0
    return
  }
  const scrollTop = scrollElement.value?.scrollTop || 0
  if (scrollTop > 0) return
  e.preventDefault()
  pullDistance.value = Math.min(diff * 0.5, props.threshold * 1.5)
}

const onTouchEnd = async () => {
  if (!isPulling.value || isRefreshing.value) return
  isPulling.value = false
  if (pullDistance.value >= props.threshold) {
    await doRefresh()
  } else {
    pullDistance.value = 0
  }
}

const doRefresh = async () => {
  isRefreshing.value = true
  pullDistance.value = props.headHeight
  try {
    await emit('refresh')
    isSuccess.value = true
    setTimeout(() => {
      isSuccess.value = false
      isRefreshing.value = false
      pullDistance.value = 0
    }, 500)
  } catch (e) {
    isRefreshing.value = false
    pullDistance.value = 0
  }
}

onMounted(() => {
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
})

onUnmounted(() => {
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<template>
  <div class="pull-refresh-wrapper relative w-full" @touchstart="onTouchStart">
    <div
      class="pull-refresh-head flex w-full items-center justify-center overflow-hidden transition-all duration-200"
      :style="headStyle"
    >
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw
          v-if="!isRefreshing"
          class="h-4 w-4 transition-transform duration-200"
          :style="{ transform: iconRotate }"
        />
        <RefreshCw v-else class="h-4 w-4 animate-spin" />
        <span>{{ statusText }}</span>
      </div>
    </div>
    <div
      class="pull-refresh-content transition-transform duration-200"
      :style="{ transform: `translateY(${pullDistance}px)` }"
    >
      <slot />
    </div>
  </div>
</template>
