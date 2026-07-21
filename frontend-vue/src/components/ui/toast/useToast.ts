import { ref, h, render } from 'vue'
import Toast from '@/components/ui/toast/Toast.vue'

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
  description?: string
}

interface ToastItem {
  id: number
  title: string
  description?: string
  type: ToastType
}

const toasts = ref<ToastItem[]>([])
let toastId = 0
let container: HTMLElement | null = null

const ensureContainer = () => {
  if (container) return container
  container = document.createElement('div')
  container.id = 'toast-container'
  container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none'
  document.body.appendChild(container)
  return container
}

const removeToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

export const toast = (title: string, options: ToastOptions = {}) => {
  const { type = 'default', duration = 3000, description } = options
  const id = ++toastId

  ensureContainer()

  const item: ToastItem = { id, title, description, type }
  toasts.value.push(item)

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }

  return {
    dismiss: () => removeToast(id),
  }
}

export const useToast = () => {
  return {
    toast,
    toasts,
    dismiss: removeToast,
  }
}
