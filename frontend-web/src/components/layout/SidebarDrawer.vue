<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Bell,
  Users,
  Briefcase,
  UserCog,
  Package,
  BarChart3,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  X,
  LogOut,
  Calendar,
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  History,
  Database,
  FileText,
  TrendingDown,
  TrendingUp,
  Receipt,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { cn } from '@/lib/utils'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

interface MenuItem {
  label: string
  icon?: any
  path?: string
  name?: string
  type?: 'group'
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    label: '工作台',
    icon: LayoutDashboard,
    path: '/dashboard',
    name: 'Dashboard'
  },
  {
    label: '日程日历',
    icon: Calendar,
    path: '/calendar',
    name: 'Calendar'
  },
  {
    label: '统计报表',
    icon: BarChart3,
    path: '/reports',
    name: 'Reports'
  },
  {
    label: '工单中心',
    type: 'group',
    icon: ClipboardList,
    children: [
      { label: '工单列表', icon: ClipboardList, path: '/records', name: 'Records' },
      { label: '待办事项', icon: Bell, path: '/pending', name: 'Pending' },
      { label: '项目列表', icon: Briefcase, path: '/projects', name: 'Projects' },
      { label: '新建工单', icon: PlusCircle, path: '/records/create', name: 'RecordCreate' },
      { label: '工单模板', icon: FileSpreadsheet, path: '/templates', name: 'Templates' },
    ]
  },
  {
    label: '客户管理',
    type: 'group',
    icon: Users,
    children: [
      { label: '客户列表', icon: Users, path: '/customers', name: 'Customers' },
      { label: '客户设备', icon: Monitor, path: '/customer-equipments', name: 'CustomerEquipments' },
      { label: '维保计划', icon: ShieldCheck, path: '/maintenance-plans', name: 'MaintenancePlans' },
    ]
  },
  {
    label: '物料管理',
    type: 'group',
    icon: Package,
    children: [
      { label: '物料列表', icon: Package, path: '/materials', name: 'Materials' },
      { label: '库存日志', icon: History, path: '/materials/stock-logs', name: 'MaterialStockLogs' },
    ]
  },
  {
    label: '员工管理',
    icon: UserCog,
    path: '/staffs',
    name: 'Staffs'
  },
  {
    label: '财务中心',
    type: 'group',
    icon: Wallet,
    children: [
      { label: '财务概览', icon: Wallet, path: '/finance', name: 'Finance' },
      { label: '支出记录', icon: TrendingDown, path: '/finance/expenses', name: 'FinanceExpenses' },
      { label: '收款记录', icon: TrendingUp, path: '/finance/payments', name: 'FinancePayments' },
      { label: '工资管理', icon: Receipt, path: '/finance/salaries', name: 'FinanceSalaries' },
      { label: '支出分类', icon: FileText, path: '/finance/expense-categories', name: 'FinanceExpenseCategories' },
    ]
  },
  {
    label: '系统管理',
    type: 'group',
    icon: Settings,
    children: [
      { label: '操作日志', icon: History, path: '/settings/operation-logs', name: 'SettingsOperationLogs' },
      { label: '数据备份', icon: Database, path: '/settings/backup', name: 'SettingsBackup' },
    ]
  },
]

const expandedGroups = ref<Record<string, boolean>>({
  '工单中心': true,
  '客户管理': false,
  '物料管理': false,
  '财务中心': false,
  '系统管理': false,
})

const isVisible = ref(false)
const isAnimating = ref(false)

const open = () => {
  isVisible.value = true
  requestAnimationFrame(() => {
    isAnimating.value = true
  })
  document.body.style.overflow = 'hidden'
}

const close = () => {
  isAnimating.value = false
  setTimeout(() => {
    isVisible.value = false
    document.body.style.overflow = ''
  }, 300)
}

const handleClose = () => {
  emit('update:modelValue', false)
  close()
}

const handleOverlayClick = () => {
  handleClose()
}

const toggleGroup = (label: string) => {
  expandedGroups.value[label] = !expandedGroups.value[label]
}

const isActive = (item: MenuItem) => {
  return route.name === item.name
}

const isGroupActive = (group: MenuItem) => {
  return group.children?.some(child => isActive(child))
}

const handleNav = (item: MenuItem) => {
  if (item.path) {
    router.push(item.path)
    handleClose()
  }
}

const handleLogout = () => {
  userStore.logout()
  handleClose()
}

const userInitial = computed(() => {
  const name = userStore.user?.staff_name || userStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})

const roleLabel = computed(() => {
  if (userStore.user?.role === 'admin') return '管理员'
  return '员工'
})

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      open()
    } else if (isVisible.value) {
      close()
    }
  }
)

onMounted(() => {
  if (props.modelValue) {
    open()
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sidebar-fade">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[100]"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleOverlayClick"
        />

        <aside
          class="absolute left-0 top-0 bottom-0 flex w-72 flex-col bg-card shadow-2xl transition-transform duration-300 ease-out"
          :class="isAnimating ? 'translate-x-0' : '-translate-x-full'"
        >
          <div class="flex h-16 items-center justify-between gap-3 border-b border-border px-5">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 class="h-5 w-5" />
              </div>
              <div class="flex flex-col">
                <span class="text-base font-semibold text-foreground">工单管理系统</span>
                <span class="text-xs text-muted-foreground">Work Order System</span>
              </div>
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent active:bg-accent/80 transition-colors"
              @click="handleClose"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto py-4">
            <div class="space-y-1 px-3">
              <template v-for="item in menuItems" :key="item.label">
                <template v-if="item.type === 'group'">
                  <button
                    class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                    :class="{ 'text-foreground': isGroupActive(item) }"
                    @click="toggleGroup(item.label)"
                  >
                    <span>{{ item.label }}</span>
                    <component
                      :is="expandedGroups[item.label] ? ChevronDown : ChevronRight"
                      class="h-4 w-4"
                    />
                  </button>
                  <div
                    v-show="expandedGroups[item.label]"
                    class="mt-1 space-y-1 pl-2"
                  >
                    <button
                      v-for="child in item.children"
                      :key="child.name"
                      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200"
                      :class="isActive(child)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                      @click="handleNav(child)"
                    >
                      <component :is="child.icon" class="h-4 w-4" :stroke-width="isActive(child) ? 2.2 : 1.8" />
                      <span>{{ child.label }}</span>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <button
                    class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200"
                    :class="isActive(item)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                    @click="handleNav(item)"
                  >
                    <component :is="item.icon" class="h-4 w-4" :stroke-width="isActive(item) ? 2.2 : 1.8" />
                    <span>{{ item.label }}</span>
                  </button>
                </template>
              </template>
            </div>
          </nav>

          <div class="border-t border-border p-4">
            <div class="flex items-center gap-3 rounded-xl p-2 mb-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {{ userInitial }}
              </div>
              <div class="flex flex-1 flex-col overflow-hidden">
                <span class="truncate text-sm font-medium text-foreground">
                  {{ userStore.user?.staff_name || userStore.user?.username || '用户' }}
                </span>
                <span class="truncate text-xs text-muted-foreground">{{ roleLabel }}</span>
              </div>
            </div>
            <button
              class="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
              <span>退出登录</span>
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.3s ease;
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}
</style>
