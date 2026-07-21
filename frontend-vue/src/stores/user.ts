import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const isInitializing = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const isTokenExpired = () => {
    if (!user.value?.exp) return false
    const now = Math.floor(Date.now() / 1000)
    return user.value.exp < now
  }

  const setToken = (t: string) => {
    token.value = t
    localStorage.setItem('token', t)
  }

  const setUserInfo = (u: User) => {
    user.value = { ...u, id: u.id || u.user_id || 0 }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password)
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
      const userData = await authApi.me()
      setUserInfo(userData)
      return userData
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

  const initAuth = async () => {
    isInitializing.value = true
    try {
      initFromStorage()

      if (!token.value) {
        return
      }

      if (isTokenExpired()) {
        logout()
        return
      }

      if (!user.value) {
        try {
          await fetchUser()
        } catch (e) {
          logout()
        }
      }
    } finally {
      isInitializing.value = false
    }
  }

  return {
    token,
    user,
    isInitializing,
    isLoggedIn,
    isAdmin,
    setToken,
    setUserInfo,
    login,
    fetchUser,
    logout,
    initFromStorage,
    initAuth,
    isTokenExpired,
  }
})
