import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '工作台', icon: 'LayoutDashboard' },
      },
      {
        path: 'records',
        name: 'records',
        component: () => import('@/views/RecordsView.vue'),
        meta: { title: '工单', icon: 'ClipboardList' },
      },
      {
        path: 'pending',
        name: 'pending',
        component: () => import('@/views/PendingView.vue'),
        meta: { title: '待办', icon: 'Bell' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '我的', icon: 'User' },
      },
      {
        path: 'statistics',
        name: 'statistics',
        component: () => import('@/views/StatisticsView.vue'),
        meta: { title: '统计概览' },
      },
    ],
  },
  {
    path: '/create',
    name: 'create-record',
    component: () => import('@/views/CreateRecordView.vue'),
    meta: { title: '新建工单' },
  },
  {
    path: '/pending-create',
    name: 'create-pending',
    component: () => import('@/views/CreatePendingView.vue'),
    meta: { title: '新建待办' },
  },
  {
    path: '/customer-create',
    name: 'create-customer',
    component: () => import('@/views/CreateCustomerView.vue'),
    meta: { title: '新建客户' },
  },
  {
    path: '/record/:id',
    name: 'record-detail',
    component: () => import('@/views/RecordDetailView.vue'),
    meta: { title: '工单详情' },
  },
  {
    path: '/pending/:id',
    name: 'pending-detail',
    component: () => import('@/views/PendingDetailView.vue'),
    meta: { title: '待办详情' },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/CustomersView.vue'),
    meta: { title: '客户管理' },
  },
  {
    path: '/customer/:id',
    name: 'customer-detail',
    component: () => import('@/views/CustomerDetailView.vue'),
    meta: { title: '客户详情' },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { title: '消息通知' },
  },
  {
    path: '/materials',
    name: 'materials',
    component: () => import('@/views/MaterialsView.vue'),
    meta: { title: '物料管理' },
  },
  {
    path: '/material/:id',
    name: 'material-detail',
    component: () => import('@/views/MaterialDetailView.vue'),
    meta: { title: '物料详情' },
  },
  {
    path: '/staffs',
    name: 'staffs',
    component: () => import('@/views/StaffsView.vue'),
    meta: { title: '团队成员' },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { title: '项目管理' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const title = to.meta?.title as string | undefined
  if (title) {
    document.title = `${title} · 工单管理系统`
  } else {
    document.title = '工单管理系统'
  }

  const userStore = useUserStore()
  const isPublic = to.meta?.public === true

  if (userStore.isInitializing) {
    return true
  }

  if (!isPublic && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
