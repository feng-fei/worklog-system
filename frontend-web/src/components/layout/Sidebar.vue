<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Bell,
  Users,
  Briefcase,
  Package,
  BarChart3,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar,
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  History,
  Database,
  FileText,
  UserCog,
  TrendingDown,
  TrendingUp,
  Receipt,
  Sun,
  Moon,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()

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

const toggleGroup = (label: string) => {
  if (props.collapsed) return
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
  }
}
</script>

<template>
  <aside
    class="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 overflow-x-hidden"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div class="flex h-16 items-center border-b border-border" :class="collapsed ? 'justify-center px-2' : 'gap-3 px-5'">
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Building2 class="h-5 w-5" />
      </div>
      <div v-if="!collapsed" class="flex flex-col overflow-hidden">
        <span class="text-base font-semibold text-foreground truncate">工单管理系统</span>
        <span class="text-xs text-muted-foreground truncate">Work Order System</span>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
      <div class="space-y-1 min-w-0" :class="collapsed ? 'px-2' : 'px-3'">
        <template v-for="item in menuItems" :key="item.label">
          <template v-if="item.type === 'group'">
            <template v-if="collapsed">
              <button
                class="group relative flex w-full items-center justify-center rounded-lg py-2 transition-colors duration-200"
                :class="isGroupActive(item)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                @click="handleNav(item.children?.[0])"
              >
                <component :is="item.icon" class="h-5 w-5 flex-shrink-0" :stroke-width="isGroupActive(item) ? 2.2 : 1.8" />
                <div class="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none">
                  {{ item.label }}
                </div>
              </button>
            </template>

            <template v-else>
              <button
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground min-w-0"
                :class="{ 'text-foreground': isGroupActive(item) }"
                @click="toggleGroup(item.label)"
              >
                <span class="truncate">{{ item.label }}</span>
                <component
                  :is="expandedGroups[item.label] ? ChevronDown : ChevronRight"
                  class="h-4 w-4 flex-shrink-0 ml-2"
                />
              </button>
              <div
                v-show="expandedGroups[item.label]"
                class="mt-1 space-y-1 pl-2 min-w-0"
              >
                <button
                  v-for="child in item.children"
                  :key="child.name"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 min-w-0"
                  :class="isActive(child)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                  @click="handleNav(child)"
                >
                  <component :is="child.icon" class="h-4 w-4 flex-shrink-0" :stroke-width="isActive(child) ? 2.2 : 1.8" />
                  <span class="truncate">{{ child.label }}</span>
                </button>
              </div>
            </template>
          </template>

          <template v-else>
            <button
              class="flex items-center rounded-lg py-2 text-sm transition-colors duration-200 min-w-0"
              :class="[
                collapsed ? 'w-full justify-center' : 'w-full gap-3 px-3',
                isActive(item)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              ]"
              @click="handleNav(item)"
            >
              <component :is="item.icon" class="h-5 w-5 flex-shrink-0" :stroke-width="isActive(item) ? 2.2 : 1.8" />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </button>
          </template>
        </template>
      </div>
    </nav>

    <div class="border-t border-border">
      <div class="p-2 text-center text-xs text-muted-foreground">
        v1.0.0
      </div>
    </div>
  </aside>
</template>
