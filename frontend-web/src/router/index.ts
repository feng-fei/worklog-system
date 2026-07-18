import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { title: '工作台' },
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('@/views/records/List.vue'),
        meta: { title: '工单' },
      },
      {
        path: 'records/create',
        name: 'RecordCreate',
        component: () => import('@/views/records/Create.vue'),
        meta: { title: '新建工单', hideBottomNav: true },
      },
      {
        path: 'records/:id/edit',
        name: 'RecordEdit',
        component: () => import('@/views/records/Create.vue'),
        meta: { title: '编辑工单', hideBottomNav: true },
      },
      {
        path: 'records/:id',
        name: 'RecordDetail',
        component: () => import('@/views/records/Detail.vue'),
        meta: { title: '工单详情', hideBottomNav: true },
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/templates/List.vue'),
        meta: { title: '工单模板' },
      },
      {
        path: 'templates/create',
        name: 'TemplateCreate',
        component: () => import('@/views/templates/Create.vue'),
        meta: { title: '新建模板', hideBottomNav: true },
      },
      {
        path: 'templates/:id/edit',
        name: 'TemplateEdit',
        component: () => import('@/views/templates/Create.vue'),
        meta: { title: '编辑模板', hideBottomNav: true },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/customers/List.vue'),
        meta: { title: '客户' },
      },
      {
        path: 'customers/create',
        name: 'CustomerCreate',
        component: () => import('@/views/customers/Create.vue'),
        meta: { title: '新建客户', hideBottomNav: true },
      },
      {
        path: 'customers/:id',
        name: 'CustomerDetail',
        component: () => import('@/views/customers/Detail.vue'),
        meta: { title: '客户详情', hideBottomNav: true },
      },
      {
        path: 'customers/:id/edit',
        name: 'CustomerEdit',
        component: () => import('@/views/customers/Create.vue'),
        meta: { title: '编辑客户', hideBottomNav: true },
      },
      {
        path: 'customer-equipments',
        name: 'CustomerEquipments',
        component: () => import('@/views/customer-equipments/List.vue'),
        meta: { title: '客户设备' },
      },
      {
        path: 'customer-equipments/create',
        name: 'CustomerEquipmentCreate',
        component: () => import('@/views/customer-equipments/Create.vue'),
        meta: { title: '新增设备', hideBottomNav: true },
      },
      {
        path: 'customer-equipments/:id/edit',
        name: 'CustomerEquipmentEdit',
        component: () => import('@/views/customer-equipments/Create.vue'),
        meta: { title: '编辑设备', hideBottomNav: true },
      },
      {
        path: 'maintenance-plans',
        name: 'MaintenancePlans',
        component: () => import('@/views/maintenance-plans/List.vue'),
        meta: { title: '维保计划' },
      },
      {
        path: 'maintenance-plans/create',
        name: 'MaintenancePlanCreate',
        component: () => import('@/views/maintenance-plans/Create.vue'),
        meta: { title: '新增维保计划', hideBottomNav: true },
      },
      {
        path: 'maintenance-plans/:id/edit',
        name: 'MaintenancePlanEdit',
        component: () => import('@/views/maintenance-plans/Create.vue'),
        meta: { title: '编辑维保计划', hideBottomNav: true },
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/projects/List.vue'),
        meta: { title: '项目' },
      },
      {
        path: 'projects/create',
        name: 'ProjectCreate',
        component: () => import('@/views/projects/Create.vue'),
        meta: { title: '新建项目', hideBottomNav: true },
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/projects/Detail.vue'),
        meta: { title: '项目详情', hideBottomNav: true },
      },
      {
        path: 'projects/:id/edit',
        name: 'ProjectEdit',
        component: () => import('@/views/projects/Create.vue'),
        meta: { title: '编辑项目', hideBottomNav: true },
      },
      {
        path: 'staffs',
        name: 'Staffs',
        component: () => import('@/views/staffs/List.vue'),
        meta: { title: '员工' },
      },
      {
        path: 'staffs/create',
        name: 'StaffCreate',
        component: () => import('@/views/staffs/Create.vue'),
        meta: { title: '新建员工', hideBottomNav: true },
      },
      {
        path: 'staffs/:id',
        name: 'StaffDetail',
        component: () => import('@/views/staffs/Detail.vue'),
        meta: { title: '员工详情', hideBottomNav: true },
      },
      {
        path: 'staffs/:id/edit',
        name: 'StaffEdit',
        component: () => import('@/views/staffs/Create.vue'),
        meta: { title: '编辑员工', hideBottomNav: true },
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('@/views/materials/List.vue'),
        meta: { title: '物料' },
      },
      {
        path: 'materials/create',
        name: 'MaterialCreate',
        component: () => import('@/views/materials/Create.vue'),
        meta: { title: '新建物料', hideBottomNav: true },
      },
      {
        path: 'materials/:id',
        name: 'MaterialDetail',
        component: () => import('@/views/materials/Detail.vue'),
        meta: { title: '物料详情', hideBottomNav: true },
      },
      {
        path: 'materials/:id/edit',
        name: 'MaterialEdit',
        component: () => import('@/views/materials/Create.vue'),
        meta: { title: '编辑物料', hideBottomNav: true },
      },
      {
        path: 'materials/stock-logs',
        name: 'MaterialStockLogs',
        component: () => import('@/views/materials/StockLogs.vue'),
        meta: { title: '库存日志', hideBottomNav: true },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/Index.vue'),
        meta: { title: '统计报表' },
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('@/views/finance/Index.vue'),
        meta: { title: '财务' },
      },
      {
        path: 'finance/expenses',
        name: 'FinanceExpenses',
        component: () => import('@/views/finance/Expenses.vue'),
        meta: { title: '支出记录', hideBottomNav: true },
      },
      {
        path: 'finance/expenses/create',
        name: 'FinanceExpenseCreate',
        component: () => import('@/views/finance/ExpenseCreate.vue'),
        meta: { title: '新建支出', hideBottomNav: true },
      },
      {
        path: 'finance/expenses/:id/edit',
        name: 'FinanceExpenseEdit',
        component: () => import('@/views/finance/ExpenseCreate.vue'),
        meta: { title: '编辑支出', hideBottomNav: true },
      },
      {
        path: 'finance/payments',
        name: 'FinancePayments',
        component: () => import('@/views/finance/Payments.vue'),
        meta: { title: '收款记录', hideBottomNav: true },
      },
      {
        path: 'finance/payments/create',
        name: 'FinancePaymentCreate',
        component: () => import('@/views/finance/PaymentCreate.vue'),
        meta: { title: '新建收款', hideBottomNav: true },
      },
      {
        path: 'finance/payments/:id/edit',
        name: 'FinancePaymentEdit',
        component: () => import('@/views/finance/PaymentCreate.vue'),
        meta: { title: '编辑收款', hideBottomNav: true },
      },
      {
        path: 'finance/salaries',
        name: 'FinanceSalaries',
        component: () => import('@/views/finance/Salaries.vue'),
        meta: { title: '工资管理', hideBottomNav: true },
      },
      {
        path: 'finance/salaries/create',
        name: 'FinanceSalaryCreate',
        component: () => import('@/views/finance/SalaryCreate.vue'),
        meta: { title: '新增工资', hideBottomNav: true },
      },
      {
        path: 'finance/salaries/:id/edit',
        name: 'FinanceSalaryEdit',
        component: () => import('@/views/finance/SalaryCreate.vue'),
        meta: { title: '编辑工资', hideBottomNav: true },
      },
      {
        path: 'finance/expense-categories',
        name: 'FinanceExpenseCategories',
        component: () => import('@/views/finance/ExpenseCategories.vue'),
        meta: { title: '支出分类', hideBottomNav: true },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/Index.vue'),
        meta: { title: '设置' },
      },
      {
        path: 'settings/change-password',
        name: 'SettingsChangePassword',
        component: () => import('@/views/settings/ChangePassword.vue'),
        meta: { title: '修改密码', hideBottomNav: true },
      },
      {
        path: 'settings/notifications',
        name: 'SettingsNotifications',
        component: () => import('@/views/settings/Notifications.vue'),
        meta: { title: '消息通知', hideBottomNav: true },
      },
      {
        path: 'settings/operation-logs',
        name: 'SettingsOperationLogs',
        component: () => import('@/views/settings/OperationLogs.vue'),
        meta: { title: '操作日志', hideBottomNav: true },
      },
      {
        path: 'settings/backup',
        name: 'SettingsBackup',
        component: () => import('@/views/settings/Backup.vue'),
        meta: { title: '数据备份', hideBottomNav: true },
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/calendar/Index.vue'),
        meta: { title: '日程日历' },
      },
      {
        path: 'pending',
        name: 'Pending',
        component: () => import('@/views/pending/List.vue'),
        meta: { title: '待办' },
      },
      {
        path: 'pending/create',
        name: 'PendingCreate',
        component: () => import('@/views/pending/Create.vue'),
        meta: { title: '新建待办', hideBottomNav: true },
      },
      {
        path: 'pending/:id',
        name: 'PendingDetail',
        component: () => import('@/views/pending/Detail.vue'),
        meta: { title: '待办详情', hideBottomNav: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/Index.vue'),
        meta: { title: '我的' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')
  const userStore = useUserStore()

  if (token && !userStore.user) {
    userStore.initFromStorage()
    if (!userStore.user) {
      try {
        await userStore.fetchUser()
      } catch (e) {
        console.error('获取用户信息失败', e)
        userStore.logout()
        next({ name: 'Login' })
        return
      }
    }
  }

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
