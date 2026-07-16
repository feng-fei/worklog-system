const { createApp, ref, onMounted } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { title: '仪表盘' },
      },
      {
        path: 'records',
        name: 'Records',
        component: RecordListView,
        meta: { title: '工单管理' },
      },
      {
        path: 'records/create',
        name: 'RecordCreate',
        component: RecordCreate,
        meta: { title: '新建工单' },
      },
      {
        path: 'records/:id',
        name: 'RecordDetail',
        component: RecordDetailView,
        meta: { title: '工单详情' },
      },
      {
        path: 'pending',
        name: 'Pending',
        component: PendingWorkView,
        meta: { title: '待办任务' },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: CustomerView,
        meta: { title: '客户管理' },
      },
      {
        path: 'materials',
        name: 'Materials',
        component: MaterialView,
        meta: { title: '物料库存' },
      },
      {
        path: 'finance',
        name: 'Finance',
        component: FinanceView,
        meta: { title: '财务统计' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView,
        meta: { title: '系统设置' },
      },
      {
        path: 'staff',
        name: 'Staff',
        component: StaffView,
        meta: { title: '员工管理' },
      },
      {
        path: 'projects',
        name: 'Projects',
        component: ProjectView,
        meta: { title: '项目管理' },
      },
      {
        path: 'salary',
        name: 'Salary',
        component: SalaryView,
        meta: { title: '工资管理' },
      },
      {
        path: 'templates',
        name: 'Templates',
        component: TemplateView,
        meta: { title: '工单模板' },
      },
      {
        path: 'equipments',
        name: 'Equipments',
        component: EquipmentView,
        meta: { title: '客户设备' },
      },
      {
        path: 'expense-categories',
        name: 'ExpenseCategories',
        component: ExpenseCategoryView,
        meta: { title: '支出分类' },
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: CalendarView,
        meta: { title: '工单日历' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: ReportView,
        meta: { title: '统计报表' },
      },
      {
        path: 'oplogs',
        name: 'OpLogs',
        component: OpLogView,
        meta: { title: '操作日志', adminOnly: true },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: NotificationView,
        meta: { title: '消息中心' },
      },
      {
        path: 'users',
        name: 'Users',
        component: UserView,
        meta: { title: '账号管理', adminOnly: true },
      },
      {
        path: 'maintenance-plans',
        name: 'MaintenancePlans',
        component: MaintenancePlanView,
        meta: { title: '维护计划', adminOnly: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth === false) {
    next();
  } else if (!token) {
    next({ path: '/login' });
  } else if (to.meta.adminOnly) {
    const userStr = localStorage.getItem('userInfo') || localStorage.getItem('user');
    let user = null;
    try { user = userStr ? JSON.parse(userStr) : null; } catch (e) {}
    if (user && (user.role === 'admin' || user.is_admin)) {
      next();
    } else {
      next({ path: '/dashboard' });
    }
  } else {
    next();
  }
});

const app = createApp({
  setup() {
    const appReady = ref(false);
    const zhCn = ElementPlusLocaleZhCn.default || ElementPlusLocaleZhCn;

    onMounted(() => {
      appStore.initResponsive();
      appStore.initTheme();
      appStore.initUserFromStorage();
      appReady.value = true;
    });

    return {
      appReady,
      zhCn,
    };
  },
});

app.use(router);
app.use(ElementPlus);

for (const [key, comp] of Object.entries(ElementPlusIconsVue || {})) {
  app.component(key, comp);
}

app.component('OfflineStatus', OfflineStatus);
app.component('PWAInstall', PWAInstall);
app.component('GlobalLoading', GlobalLoading);
app.component('PhotoUpload', PhotoUpload);
app.component('BatchActions', BatchActions);
app.component('ExportButtons', ExportButtons);
app.component('PrintRepair', PrintRepair);

app.config.globalProperties.$api = apiService;
app.config.globalProperties.$store = appStore;

app.mount('#app');

window.VueApp = app;
