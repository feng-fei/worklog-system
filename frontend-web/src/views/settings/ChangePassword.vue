<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import { Lock, Eye, EyeOff } from 'lucide-vue-next'
import { useFormValidation, validators } from '@/composables/useFormValidation'

const router = useRouter()

const form = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const submitting = ref(false)

const rules = {
  old_password: [
    validators.required('请输入原密码'),
  ],
  new_password: [
    validators.required('请输入新密码'),
    validators.minLength(6, '新密码至少6位'),
  ],
  confirm_password: [
    validators.required('请确认新密码'),
    {
      validator: (value: string) => {
        if (value !== form.new_password) {
          return '两次输入的密码不一致'
        }
        return true
      },
    },
  ],
}

const { errors, validate, validateField } = useFormValidation(form, rules)

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    await authApi.changePassword({
      old_password: form.old_password,
      new_password: form.new_password,
    })
    alert('密码修改成功')
    router.back()
  } catch (e: any) {
    alert(e.response?.data?.message || '密码修改失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="修改密码" show-back />

    <div class="flex-1 px-4 pt-6 pb-24">
      <div class="mx-auto max-w-md space-y-5">
        <div class="relative">
          <Input
            v-model="form.old_password"
            :type="showOldPassword ? 'text' : 'password'"
            label="原密码"
            placeholder="请输入原密码"
            :error="errors.old_password"
            @blur="validateField('old_password')"
          />
          <button
            type="button"
            class="absolute right-4 top-10 text-muted-foreground hover:text-foreground transition-colors"
            @click="showOldPassword = !showOldPassword"
          >
            <Eye v-if="!showOldPassword" class="h-5 w-5" />
            <EyeOff v-else class="h-5 w-5" />
          </button>
        </div>

        <div class="relative">
          <Input
            v-model="form.new_password"
            :type="showNewPassword ? 'text' : 'password'"
            label="新密码"
            placeholder="请输入新密码（至少6位）"
            :error="errors.new_password"
            @blur="validateField('new_password')"
          />
          <button
            type="button"
            class="absolute right-4 top-10 text-muted-foreground hover:text-foreground transition-colors"
            @click="showNewPassword = !showNewPassword"
          >
            <Eye v-if="!showNewPassword" class="h-5 w-5" />
            <EyeOff v-else class="h-5 w-5" />
          </button>
        </div>

        <div class="relative">
          <Input
            v-model="form.confirm_password"
            :type="showConfirmPassword ? 'text' : 'password'"
            label="确认新密码"
            placeholder="请再次输入新密码"
            :error="errors.confirm_password"
            @blur="validateField('confirm_password')"
          />
          <button
            type="button"
            class="absolute right-4 top-10 text-muted-foreground hover:text-foreground transition-colors"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <Eye v-if="!showConfirmPassword" class="h-5 w-5" />
            <EyeOff v-else class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-4 py-4 pb-safe">
      <Button
        class="w-full"
        size="lg"
        :loading="submitting"
        @click="handleSubmit"
      >
        <Lock class="h-5 w-5" />
        确认修改
      </Button>
    </div>
  </div>
</template>
