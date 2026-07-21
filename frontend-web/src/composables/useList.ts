import { ref, onMounted, onBeforeUnmount } from 'vue'

interface UsePullRefreshOptions {
  onRefresh?: () => Promise<void> | void
  threshold?: number
  maxDistance?: number
}

export function usePullRefresh(
  containerRef: { value: HTMLElement | null },
  options: UsePullRefreshOptions = {}
) {
  const { onRefresh, threshold = 60, maxDistance = 120 } = options

  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const isPulling = ref(false)

  let startY = 0
  let startScrollTop = 0

  const handleTouchStart = (e: TouchEvent) => {
    if (isRefreshing.value) return
    const container = containerRef.value
    if (!container) return
    startScrollTop = container.scrollTop
    if (startScrollTop <= 0) {
      startY = e.touches[0].clientY
      isPulling.value = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.value || isRefreshing.value) return

    const currentY = e.touches[0].clientY
    let diff = currentY - startY

    if (diff <= 0) {
      pullDistance.value = 0
      return
    }

    diff = Math.min(diff * 0.5, maxDistance)
    pullDistance.value = diff

    if (diff >= threshold) {
      // 到达阈值，可以释放刷新
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.value) return
    isPulling.value = false

    if (pullDistance.value >= threshold && onRefresh && !isRefreshing.value) {
      isRefreshing.value = true
      pullDistance.value = threshold
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
        pullDistance.value = 0
      }
    } else {
      pullDistance.value = 0
    }
  }

  onMounted(() => {
    const container = containerRef.value
    if (!container) return
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onBeforeUnmount(() => {
    const container = containerRef.value
    if (!container) return
    container.removeEventListener('touchstart', handleTouchStart)
    container.removeEventListener('touchmove', handleTouchMove)
    container.removeEventListener('touchend', handleTouchEnd)
  })

  const triggerRefresh = async () => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    pullDistance.value = threshold
    try {
      await onRefresh?.()
    } finally {
      isRefreshing.value = false
      pullDistance.value = 0
    }
  }

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    triggerRefresh,
  }
}

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void>
  threshold?: number
  hasMore?: boolean
}

export function useInfiniteScroll(
  containerRef: { value: HTMLElement | null },
  options: UseInfiniteScrollOptions
) {
  const { onLoadMore, threshold = 100 } = options

  const loading = ref(false)
  const hasMore = ref(options.hasMore ?? true)

  const handleScroll = async () => {
    const container = containerRef.value
    if (!container || loading.value || !hasMore.value) return

    const { scrollTop, scrollHeight, clientHeight } = container

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loading.value = true
      try {
        await onLoadMore()
      } finally {
        loading.value = false
      }
    }
  }

  onMounted(() => {
    const container = containerRef.value
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    const container = containerRef.value
    if (!container) return
    container.removeEventListener('scroll', handleScroll)
  })

  const reset = () => {
    hasMore.value = true
    loading.value = false
  }

  const setNoMore = () => {
    hasMore.value = false
  }

  return {
    loading,
    hasMore,
    reset,
    setNoMore,
  }
}
