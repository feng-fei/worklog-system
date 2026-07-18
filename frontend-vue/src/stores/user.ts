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

  const setUserInfo = (u: User) => {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    const data = res.data
    if (data.token) {
      setToken(data.token)
      if (data.user) {
        setUserInfo(data.user)
      } else {
        await fetchUser()
      }
    }
    return data
  }

  const fetchUser = async () => {
    try {
      const res = await authApi.me()
      const data = res.data
      if (data.user) {
        setUserInfo(data.user)
      }
      return data.user
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
    setUserInfo,
    login,
    fetchUser,
    logout,
    initFromStorage,
  }
})
