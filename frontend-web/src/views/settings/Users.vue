<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { authApi } from '@/api'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Drawer from '@/components/ui/Drawer.vue'
import MobileHeader from '@/components/layout/MobileHeader.vue'
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  User,
  Shield,
  UserCog,
  Trash2,
  KeyRound,
  X,
} from 'lucide-vue-next'
import { useFormValidation, validators } from '@/composables/useFormValidation'

const userList = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const hasMore = ref(true)

const showDrawer = ref(false)
const editingUser = ref<any>(null)
const submitting = ref(false)

const form = ref({
  username: '',
  password: '',
  role: 'staff',
  staff_id: '',
  status: 'active',
})

const rules = {
  username: [
    validators.required('请输入用户名'),
  ],
  password: [
    {
      validator: (value: string) => {
        if (!editingUser.value && !value) {
          return '请输入密码'
        }
        if (value && value.length < 6) {
          return '密码至少6位'
        }
        return true
      },
    },
  ],
  role: [
    validators.required('请选择角色'),
  ],
}

const { errors, validate, clearErrors } = useFormValidation(form.value, rules)

const roleMap: Record<string, { label: string; variant: string }> = {
  admin: { label: '管理员', variant: 'destructive' },
  staff: { label: '工作人员', variant: 'default' },
}

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: '启用', variant: 'success' },
  inactive: { label: '禁用', variant: 'secondary' },
}

const getRoleInfo = (role: string) => {
  return roleMap[role] || { label: role || '未知', variant: 'secondary' }
}

const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: status || '未知', variant: 'secondary' }
}

const loadUsers = async (refresh: boolean = false) => {
  if (loading.value) return

  loading.value = true
  if (refresh) {
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    const res = await authApi.users({
      page: currentPage.value,
      page_size: 20,
      keyword: searchQuery.value || undefined,
    })

    const data = res.data
    const list = data.records || data.list || data.items || []

    if (refresh) {
      userList.value = list
    } else {
      userList.value = [...userList.value, ...list]
    }

    hasMore.value = list.length >= 20
    currentPage.value++
  } catch (e) {
    console.error('加载用户列表失败', e)
  } finally {
    loading.value = false
  }
}

const onRefresh = () => {
  loadUsers(true)
}

const openCreate = () => {
  editingUser.value = null
  form.value = {
    username: '',
    password: '',
    role: 'staff',
    staff_id: '',
    status: 'active',
  }
  clearErrors()
  showDrawer.value = true
}

const openEdit = (user: any) => {
  editingUser.value = user
  form.value = {
    username: user.username || '',
    password: '',
    role: user.role || 'staff',
    staff_id: user.staff_id || '',
    status: user.status || 'active',
  }
  clearErrors()
  showDrawer.value = true
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true
  try {
    const submitData: Record<string, any> = {
      username: form.value.username,
      role: form.value.role,
      staff_id: form.value.staff_id || undefined,
      status: form.value.status,
    }

    if (form.value.password) {
      submitData.password = form.value.password
    }

    if (editingUser.value) {
      await authApi.updateUser(editingUser.value.id, submitData)
      alert('更新成功')
    } else {
      await authApi.createUser(submitData)
      alert('创建成功')
    }

    showDrawer.value = false
    loadUsers(true)
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleResetPassword = async (user: any) => {
  if (!confirm(`确定要重置用户 ${user.username} 的密码吗？`)) return

  try {
    const res = await authApi.resetPasswordByAdmin(user.id)
    const newPassword = res.data?.password || res.data?.new_password || '123456'
    alert(`密码重置成功，新密码：${newPassword}`)
  } catch (e: any) {
    alert(e.response?.data?.message || '重置失败')
  }
}

const handleDelete = async (user: any) => {
  if (!confirm(`确定要删除用户 ${user.username} 吗？`)) return

  try {
    await authApi.deleteUser(user.id)
    userList.value = userList.value.filter((u) => u.id !== user.id)
    alert('删除成功')
  } catch (e: any) {
    alert(e.response?.data?.message || '删除失败')
  }
}

const getStaffName = (user: any) => {
  return user.staff_name || user.staff?.name || ''
}

onMounted(() => {
  loadUsers(true)
})
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <MobileHeader title="用户管理" show-back>
      <template #right>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="onRefresh"
        >
          <RefreshCw class="h-5 w-5" :class="{ 'animate-spin': loading }" />
        </button>
      </template>
    </MobileHeader>

    <div class="sticky top-14 z-30 bg-background px-4 pb-3 pt-2">
      <div class="relative">
        <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索用户名..."
          class="h-11 w-full rounded-xl border border-input bg-secondary/50 pl-12 pr-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          @keyup.enter="loadUsers(true)"
        />
      </div>
    </div>

    <div class="flex-1 space-y-3 px-4 pb-6">
      <div v-if="loading && userList.length === 0" class="py-12 text-center text-muted-foreground">
        <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin opacity-50" />
        <p>加载中...</p>
      </div>

      <div v-else-if="userList.length === 0" class="py-12 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users class="h-8 w-8 text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">暂无用户</p>
        <p class="mt-1 text-sm text-muted-foreground">点击右下角按钮添加新用户</p>
      </div>

      <template v-else>
        <Card
          v-for="user in userList"
          :key="user.id"
          class="p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User class="h-5 w-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ user.username }}</span>
                  <Badge :variant="getRoleInfo(user.role).variant as any" size="sm">
                    {{ getRoleInfo(user.role).label }}
                  </Badge>
                  <Badge :variant="getStatusInfo(user.status).variant as any" size="sm">
                    {{ getStatusInfo(user.status).label }}
                  </Badge>
                </div>
                <p v-if="getStaffName(user)" class="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                  <UserCog class="h-4 w-4" />
                  关联员工：{{ getStaffName(user) }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              @click="openEdit(user)"
            >
              <UserCog class="h-4 w-4" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              @click="handleResetPassword(user)"
            >
              <KeyRound class="h-4 w-4" />
              重置密码
            </Button>
            <Button
              variant="destructive"
              size="sm"
              class="flex-1"
              @click="handleDelete(user)"
            >
              <Trash2 class="h-4 w-4" />
              删除
            </Button>
          </div>
        </Card>

        <div v-if="hasMore && !loading" class="py-4 text-center">
          <button
            class="text-sm text-primary"
            @click="loadUsers()"
          >
            加载更多
          </button>
        </div>

        <div v-if="loading && userList.length > 0" class="py-4 text-center text-sm text-muted-foreground">
          <RefreshCw class="mx-auto mb-2 h-5 w-5 animate-spin" />
          加载中...
        </div>
      </template>
    </div>

    <button
      class="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 active:scale-90"
      @click="openCreate"
    >
      <Plus class="h-7 w-7" />
    </button>

    <Drawer v-model="showDrawer">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 class="text-lg font-semibold">
          {{ editingUser ? '编辑用户' : '新建用户' }}
        </h3>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
          @click="showDrawer = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="space-y-4 px-5 py-4 pb-safe">
        <Input
          v-model="form.username"
          label="用户名"
          placeholder="请输入用户名"
          :error="errors.username"
          @blur="validateField('username')"
        />

        <Input
          v-model="form.password"
          type="password"
          :label="editingUser ? '新密码（不修改留空）' : '密码'"
          :placeholder="editingUser ? '不修改请留空' : '请输入密码（至少6位）'"
          :error="errors.password"
          @blur="validateField('password')"
        />

        <div class="w-full">
          <label class="mb-2 block text-sm font-medium text-foreground">
            角色
          </label>
          <div class="flex gap-3">
            <button
              v-for="(item, key) in { admin: '管理员', staff: '工作人员' }"
              :key="key"
              class="flex-1 h-12 rounded-xl border font-medium transition-all"
              :class="form.role === key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background hover:bg-accent'"
              @click="form.role = key"
            >
              <Shield class="mr-2 inline h-4 w-4" />
              {{ item }}
            </button>
          </div>
        </div>

        <Input
          v-model="form.staff_id"
          label="关联员工ID"
          placeholder="请输入员工ID（可选）"
        />

        <div class="w-full">
          <label class="mb-2 block text-sm font-medium text-foreground">
            状态
          </label>
          <div class="flex gap-3">
            <button
              v-for="(item, key) in { active: '启用', inactive: '禁用' }"
              :key="key"
              class="flex-1 h-12 rounded-xl border font-medium transition-all"
              :class="form.status === key
                ? key === 'active'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-destructive bg-destructive/10 text-destructive'
                : 'border-input bg-background hover:bg-accent'"
              @click="form.status = key"
            >
              {{ item }}
            </button>
          </div>
        </div>

        <Button
          class="w-full mt-6"
          size="lg"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ editingUser ? '保存修改' : '创建用户' }}
        </Button>
      </div>
    </Drawer>
  </div>
</template>
