<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
})

const loading = ref(false)
const showPassword = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!form.username.trim()) {
    error.value = '请输入用户名'
    return
  }
  if (!form.password) {
    error.value = '请输入密码'
    return
  }

  error.value = ''
  loading.value = true

  try {
    await userStore.login(form.username, form.password)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-gradient-to-b from-primary/5 via-background to-background">
    <div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div class="mb-10 text-center">
        <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/20">
          <LogIn class="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">工单管理系统</h1>
        <p class="mt-2 text-sm text-muted-foreground">现场作业管理平台</p>
      </div>

      <div class="w-full max-w-sm">
        <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 class="mb-6 text-lg font-semibold text-foreground">账号登录</h2>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">用户名</label>
              <div class="relative">
                <User class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="form.username"
                  type="text"
                  placeholder="请输入用户名"
                  class="pl-12"
                  autocomplete="username"
                />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-foreground">密码</label>
              <div class="relative">
                <Lock class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入密码"
                  class="pl-12 pr-12"
                  autocomplete="current-password"
                  @keyup.enter="handleLogin"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                  @click="showPassword = !showPassword"
                >
                  <Eye v-if="!showPassword" class="h-5 w-5" />
                  <EyeOff v-else class="h-5 w-5" />
                </button>
              </div>
            </div>

            <p v-if="error" class="text-sm text-destructive">
              {{ error }}
            </p>

            <Button
              type="submit"
              size="xl"
              class="w-full"
              :loading="loading"
            >
              登录
            </Button>
          </form>
        </div>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          登录即表示您同意使用条款和隐私政策
        </p>
      </div>
    </div>
  </div>
</template>
