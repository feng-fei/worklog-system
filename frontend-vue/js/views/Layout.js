const AppLayout = {
  template: `
    <el-container class="app-layout">
      <el-aside :width="store.sidebarCollapsed ? '64px' : '210px'">
        <div class="sidebar-logo">
          <el-icon><Tools /></el-icon>
          <span v-show="!store.sidebarCollapsed">工单管理</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          :collapse="store.sidebarCollapsed"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          <el-menu-item index="/records">
            <el-icon><Document /></el-icon>
            <template #title>工单管理</template>
          </el-menu-item>
          <el-sub-menu index="business" v-if="isAdmin">
            <template #title>
              <el-icon><Briefcase /></el-icon>
              <span>业务管理</span>
            </template>
            <el-menu-item index="/templates">工单模板</el-menu-item>
            <el-menu-item index="/equipments">客户设备</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/pending">
            <el-icon><Bell /></el-icon>
            <template #title>待办任务</template>
          </el-menu-item>
          <el-menu-item index="/customers">
            <el-icon><UserFilled /></el-icon>
            <template #title>客户管理</template>
          </el-menu-item>
          <el-menu-item index="/staff" v-if="isAdmin">
            <el-icon><User /></el-icon>
            <template #title>员工管理</template>
          </el-menu-item>
          <el-menu-item index="/projects">
            <el-icon><List /></el-icon>
            <template #title>项目管理</template>
          </el-menu-item>
          <el-menu-item index="/materials">
            <el-icon><Box /></el-icon>
            <template #title>物料库存</template>
          </el-menu-item>
          <el-sub-menu index="finance-menu">
            <template #title>
              <el-icon><Money /></el-icon>
              <span>财务统计</span>
            </template>
            <el-menu-item index="/finance">财务概览</el-menu-item>
            <el-menu-item index="/salary" v-if="isAdmin">工资管理</el-menu-item>
            <el-menu-item index="/expense-categories" v-if="isAdmin">支出分类</el-menu-item>
          </el-sub-menu>
          <el-menu-item v-if="isAdmin" index="/settings">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="main-header">
          <div class="header-left">
            <el-icon
              style="font-size:20px;cursor:pointer;color:#606266;"
              @click="appStore.toggleSidebar()"
            >
              <component :is="store.sidebarCollapsed ? 'Expand' : 'Fold'" />
            </el-icon>
            <span class="header-title">{{ pageTitle }}</span>
          </div>
          <div class="header-right">
            <el-icon
              style="font-size:18px;cursor:pointer;color:#606266;"
              @click="appStore.toggleTheme()"
              :title="isDark ? '切换到浅色模式' : '切换到深色模式'"
            >
              <component :is="isDark ? 'Sunny' : 'Moon'" />
            </el-icon>
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
              <el-icon style="font-size:18px;cursor:pointer;color:#606266;"><Bell /></el-icon>
            </el-badge>
            <el-dropdown @command="handleCommand">
              <span style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#606266;">
                <el-avatar :size="32" style="background:#409eff;">
                  {{ store.user?.staff_name?.charAt(0) || store.user?.username?.charAt(0) || 'U' }}
                </el-avatar>
                <span>{{ store.user?.staff_name || store.user?.username || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  `,
  setup() {
    const { computed, ref, onMounted } = Vue;
    const { useRoute, useRouter } = VueRouter;
    const { ElMessageBox, ElMessage } = ElementPlus;

    const route = useRoute();
    const router = useRouter();

    const store = appStore.store;
    const isAdmin = appStore.isAdmin;
    const isDark = appStore.isDark;
    const unreadCount = ref(0);

    const activeMenu = computed(() => route.path);

    const pageTitles = {
      '/dashboard': '仪表盘',
      '/records': '工单管理',
      '/templates': '工单模板',
      '/equipments': '客户设备',
      '/pending': '待办任务',
      '/customers': '客户管理',
      '/staff': '员工管理',
      '/projects': '项目管理',
      '/materials': '物料库存',
      '/finance': '财务概览',
      '/salary': '工资管理',
      '/expense-categories': '支出分类',
      '/settings': '系统设置',
    };

    const pageTitle = computed(() => pageTitles[route.path] || '');

    const handleMenuSelect = (index) => {
      if (index !== route.path) {
        router.push(index);
      }
    };

    const handleCommand = async (command) => {
      if (command === 'logout') {
        try {
          await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          });
          appStore.logout();
          ElMessage.success('已退出登录');
          router.push('/login');
        } catch (e) {
          // 取消
        }
      } else if (command === 'password') {
        ElMessage.info('修改密码功能开发中');
      } else if (command === 'profile') {
        ElMessage.info('个人中心开发中');
      }
    };

    onMounted(() => {
      if (!store.user) {
        apiService.getCurrentUser().then(res => {
          const user = res && (res.user || res);
          if (user) appStore.setUser(user);
        }).catch(() => {});
      }
    });

    return {
      store,
      isAdmin,
      activeMenu,
      pageTitle,
      unreadCount,
      handleMenuSelect,
      handleCommand,
      ...appStore,
    };
  },
};

window.AppLayout = AppLayout;
