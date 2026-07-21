import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export interface User {
  id: number
  username: string
  staff_name: string
  role: string
  staff_id: number | null
  enabled: boolean
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const setToken = (t: string) => {
    token.value = t
    localStorage.setItem('token', t)
  }

  const setUser = (u: User) => {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    setToken(res.data.token)
    if (res.data.user) {
      setUser(res.data.user)
    } else {
      await fetchUser()
    }
    return res.data
  }

  const fetchUser = async () => {
    try {
      const res = await authApi.me()
      setUser(res.data)
      return res.data
    } catch (e) {
      console.error('获取用户信息失败', e)
      throw e
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const initFromStorage = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
      } catch {
        // ignore
      }
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    setToken,
    setUser,
    login,
    fetchUser,
    logout,
    initFromStorage,
  }
})
