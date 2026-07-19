import type { Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'

const checkPermission = (el: HTMLElement, binding: DirectiveBinding) => {
  const userStore = useUserStore()
  const userRole = userStore.user?.role

  if (!userRole) {
    el.parentNode?.removeChild(el)
    return
  }

  const value = binding.value
  const roles = Array.isArray(value) ? value : [value]

  if (!roles.includes(userRole)) {
    el.parentNode?.removeChild(el)
  }
}

export const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      checkPermission(el, binding)
    }
  },
}

export default permission
