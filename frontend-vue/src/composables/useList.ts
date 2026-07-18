import { ref, reactive, onMounted } from 'vue'

interface UseListOptions<T> {
  fetchFn: (params: Record<string, any>) => Promise<{ data: { records: T[]; total: number; page: number; pages: number } }>
  defaultParams?: Record<string, any>
  immediate?: boolean
}

export function useList<T = any>(options: UseListOptions<T>) {
  const { fetchFn, defaultParams = {}, immediate = true } = options

  const list = ref<T[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const loadingMore = ref(false)
  const finished = ref(false)
  const total = ref(0)

  const params = reactive({
    page: 1,
    page_size: 20,
    ...defaultParams,
  })

  const loadList = async (isRefresh = false) => {
    if (loading.value) return

    if (isRefresh) {
      refreshing.value = true
      params.page = 1
      finished.value = false
    } else if (finished.value) {
      return
    } else {
      loadingMore.value = true
    }

    loading.value = true

    try {
      const res = await fetchFn({ ...params })
      const { records, total: totalCount, page, pages } = res.data

      if (isRefresh || params.page === 1) {
        list.value = records as any
      } else {
        list.value = [...list.value, ...records] as any
      }

      total.value = totalCount
      finished.value = page >= pages
    } catch (e) {
      console.error('加载列表失败', e)
    } finally {
      loading.value = false
      refreshing.value = false
      loadingMore.value = false
    }
  }

  const refresh = () => loadList(true)

  const loadMore = () => {
    if (!finished.value && !loading.value) {
      params.page++
      loadList(false)
    }
  }

  const resetParams = () => {
    params.page = 1
    finished.value = false
  }

  onMounted(() => {
    if (immediate) {
      loadList(true)
    }
  })

  return {
    list,
    loading,
    refreshing,
    loadingMore,
    finished,
    total,
    params,
    loadList,
    refresh,
    loadMore,
    resetParams,
  }
}
