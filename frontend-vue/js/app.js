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
  } else {
    next();
  }
});

const app = createApp({
  setup() {
    const appReady = ref(false);
    const zhCn = ElementPlusLocaleZhCn.default || ElementPlusLocaleZhCn;

    onMounted(() => {
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

app.config.globalProperties.$api = apiService;
app.config.globalProperties.$store = appStore;

app.mount('#app');

window.VueApp = app;
