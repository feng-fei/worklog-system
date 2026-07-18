<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, User, Lock, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await userStore.login(username.value, password.value)
    if (data.token) {
      const redirect = route.query.redirect as string | undefined
      router.push(redirect || '/dashboard')
    } else {
      errorMsg.value = data.error || '登录失败，请检查账号密码'
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.error || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen-safe flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900">
    <div class="flex-1 flex flex-col items-center justify-center px-6 py-12 safe-area-top">
      <div class="mb-10 text-center animate-fade-in">
        <div class="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <LogIn class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">工单管理系统</h1>
        <p class="text-slate-400 text-sm">瑞易智能 · 高效调度</p>
      </div>

      <Card class="w-full max-w-sm bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-2xl">
        <CardHeader class="pb-4">
          <CardTitle class="text-xl font-bold text-slate-900">欢迎登录</CardTitle>
          <CardDescription class="text-slate-500">请输入您的账号信息</CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2">
            <Label for="username" class="text-sm font-medium text-slate-700">账号</Label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="username"
                v-model="username"
                type="text"
                placeholder="请输入用户名"
                class="pl-10 h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                @keyup.enter="handleLogin"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="password" class="text-sm font-medium text-slate-700">密码</Label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="请输入密码"
                class="pl-10 h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                @keyup.enter="handleLogin"
              />
            </div>
          </div>

          <div v-if="errorMsg" class="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-3">
            {{ errorMsg }}
          </div>

          <Button
            class="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
            @click="handleLogin"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="w-5 h-5 mr-2 animate-spin" />
            <span v-else>登 录</span>
          </Button>

          <p class="text-center text-xs text-slate-400 pt-2">
            测试账号 admin / 123456
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
