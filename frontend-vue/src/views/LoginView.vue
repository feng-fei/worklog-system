<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, User, Lock, Loader2, ShieldCheck, Zap, Clock } from 'lucide-vue-next'
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

const features = [
  { icon: Zap, title: '高效调度', desc: '智能工单分配，实时进度追踪' },
  { icon: ShieldCheck, title: '安全可靠', desc: '数据加密存储，权限精细管理' },
  { icon: Clock, title: '随时响应', desc: '移动端随时随地处理工单' },
]
</script>

<template>
  <div class="min-h-screen-safe flex flex-col md:flex-row relative overflow-hidden bg-slate-950">
    <div class="absolute inset-0 tech-grid opacity-60" />
    <div class="absolute inset-0 radial-glow" />
    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse-soft" />
    <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] animate-pulse-soft" style="animation-delay: 2s;" />
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />

    <div class="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden z-10">
      <div class="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10" />
      
      <div class="relative z-10 flex flex-col justify-center px-12 lg:px-20 py-16 w-full">
        <div class="mb-12 animate-fade-in">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-6 glow-primary">
            <LogIn class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight text-glow">工单管理系统</h1>
          <p class="text-xl text-slate-400">瑞易智能 · 高效调度</p>
        </div>

        <div class="space-y-4 max-w-md">
          <div
            v-for="(feature, index) in features"
            :key="feature.title"
            class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center shrink-0 group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all group-hover:scale-110">
              <component :is="feature.icon" class="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-white mb-1">{{ feature.title }}</h3>
              <p class="text-sm text-slate-400">{{ feature.desc }}</p>
            </div>
          </div>
        </div>

        <div class="mt-16 pt-8 border-t border-white/10">
          <p class="text-sm text-slate-500">© 2024 瑞易智能. All rights reserved.</p>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center px-6 py-12 safe-area-top md:px-8 lg:px-12 relative z-10">
      <div class="md:hidden mb-10 text-center animate-fade-in">
        <div class="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 glow-primary">
          <LogIn class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-white mb-2 text-glow">工单管理系统</h1>
        <p class="text-slate-400 text-sm">瑞易智能 · 高效调度</p>
      </div>

      <div class="relative w-full max-w-sm md:max-w-md animate-fade-in" style="animation-delay: 100ms;">
        <div class="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/30 rounded-3xl blur-lg opacity-50" />
        <Card class="relative bg-slate-900/70 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          <CardHeader class="pb-4 relative">
            <CardTitle class="text-xl md:text-2xl font-bold text-white">欢迎登录</CardTitle>
            <CardDescription class="text-slate-400">请输入您的账号信息</CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div class="space-y-2">
              <Label for="username" class="text-sm font-medium text-slate-300">账号</Label>
              <div class="relative group">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  id="username"
                  v-model="username"
                  type="text"
                  placeholder="请输入用户名"
                  class="pl-10 h-12 text-base rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                  @keyup.enter="handleLogin"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="password" class="text-sm font-medium text-slate-300">密码</Label>
              <div class="relative group">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="请输入密码"
                  class="pl-10 h-12 text-base rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                  @keyup.enter="handleLogin"
                />
              </div>
            </div>

            <div v-if="errorMsg" class="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3 animate-fade-in">
              {{ errorMsg }}
            </div>

            <Button
              class="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 glow-primary"
              @click="handleLogin"
              :disabled="loading"
            >
              <Loader2 v-if="loading" class="w-5 h-5 mr-2 animate-spin" />
              <span v-else>登 录</span>
            </Button>

            <p class="text-center text-xs text-slate-500 pt-2">
              默认账号 admin / admin123
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="md:hidden mt-10 text-center">
        <p class="text-xs text-slate-500">© 2024 瑞易智能. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>
