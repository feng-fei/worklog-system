const AppLayout = {
  template: `
    <el-container class="app-layout">
      <div class="sidebar-overlay" :class="{ show: mobileMenuOpen }" @click="closeMobileMenu"></div>

      <el-aside :width="sidebarWidth" :class="{ 'mobile-open': mobileMenuOpen }">
        <div class="sidebar-logo">
          <el-icon><Tools /></el-icon>
          <span v-show="!store.sidebarCollapsed || isMobile">工单管理</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          background-color="transparent"
          text-color="#cbd5e1"
          active-text-color="#ffffff"
          :collapse="!isMobile && store.sidebarCollapsed"
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
          <el-menu-item index="/pending">
            <el-icon><Clock /></el-icon>
            <template #title>待办任务</template>
          </el-menu-item>
          <el-menu-item index="/calendar">
            <el-icon><Calendar /></el-icon>
            <template #title>工单日历</template>
          </el-menu-item>
          <el-sub-menu index="business" v-if="isAdmin">
            <template #title>
              <el-icon><Briefcase /></el-icon>
              <span>业务管理</span>
            </template>
            <el-menu-item index="/templates">工单模板</el-menu-item>
            <el-menu-item index="/equipments">客户设备</el-menu-item>
            <el-menu-item index="/maintenance-plans">维护计划</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/customers">
            <el-icon><UserFilled /></el-icon>
            <template #title>客户管理</template>
          </el-menu-item>
          <el-menu-item index="/staff" v-if="isAdmin">
            <el-icon><User /></el-icon>
            <template #title>员工管理</template>
          </el-menu-item>
          <el-menu-item index="/users" v-if="isAdmin">
            <el-icon><Avatar /></el-icon>
            <template #title>账号管理</template>
          </el-menu-item>
          <el-menu-item index="/projects">
            <el-icon><Folder /></el-icon>
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
          <el-menu-item index="/reports">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>统计报表</template>
          </el-menu-item>
          <el-menu-item index="/notifications">
            <el-icon><Bell /></el-icon>
            <template #title>消息中心</template>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/oplogs">
            <el-icon><DocumentCopy /></el-icon>
            <template #title>操作日志</template>
          </el-menu-item>
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
              class="header-icon-btn"
              @click="toggleSidebar"
            >
              <component :is="sidebarIcon" />
            </el-icon>
            <div class="header-title-area">
              <div class="breadcrumb" v-if="breadcrumbItems.length > 1">
                <span v-for="(item, index) in breadcrumbItems" :key="index" :class="{ 'breadcrumb-current': index === breadcrumbItems.length - 1 }">
                  {{ item }}
                </span>
              </div>
              <span class="header-title">{{ pageTitle }}</span>
            </div>
            <div class="header-search" v-if="!isMobile">
              <el-input v-model="searchQuery" placeholder="搜索工单、客户、物料..." clearable size="default" @keyup.enter="handleSearch">
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
            </div>
          </div>
          <div class="header-right">
            <el-dropdown trigger="click" @command="handleThemeCommand">
              <span class="header-icon-btn" :title="currentThemeName" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;cursor:pointer;">
                <el-icon :size="18">
                  <component :is="themeIcon" />
                </el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="light" :disabled="store.theme === 'light'">
                    <el-icon><Sunny /></el-icon>
                    <span style="margin-left:8px;">浅色模式</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="dark" :disabled="store.theme === 'dark'">
                    <el-icon><Moon /></el-icon>
                    <span style="margin-left:8px;">深色模式</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="auto" :disabled="store.theme === 'auto'" divided>
                    <el-icon><Monitor /></el-icon>
                    <span style="margin-left:8px;">跟随系统</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge" @click="navTo('/notifications')">
              <el-icon class="header-icon-btn"><Bell /></el-icon>
            </el-badge>
            <el-dropdown @command="handleCommand">
              <span class="header-user-dropdown">
                <el-avatar :size="32" class="header-avatar">
                  {{ store.user?.staff_name?.charAt(0) || store.user?.username?.charAt(0) || 'U' }}
                </el-avatar>
                <span class="header-username">{{ store.user?.staff_name || store.user?.username || '用户' }}</span>
                <el-icon class="header-arrow-icon"><ArrowDown /></el-icon>
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

      <div class="bottom-nav" v-if="isMobile">
        <div class="bottom-nav-inner">
          <div class="bottom-nav-item" :class="{ active: activeMenu === '/dashboard' }" @click="navTo('/dashboard')">
            <el-icon><Odometer /></el-icon>
            <span>工作台</span>
          </div>
          <div class="bottom-nav-item" :class="{ active: activeMenu === '/records' }" @click="navTo('/records')">
            <el-icon><Document /></el-icon>
            <span>工单</span>
          </div>
          <div class="bottom-nav-item add-btn" @click="navTo('/records/create')">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="bottom-nav-item" :class="{ active: activeMenu === '/pending' }" @click="navTo('/pending')">
            <el-icon><Clock /></el-icon>
            <span>待办</span>
          </div>
          <div class="bottom-nav-item" :class="{ active: activeMenu.startsWith('/finance') }" @click="navTo('/finance')">
            <el-icon><Money /></el-icon>
            <span>财务</span>
          </div>
        </div>
      </div>

      <button class="fab-button" v-if="!isMobile" @click="navTo('/records/create')" title="新建工单">
        <el-icon><Plus /></el-icon>
      </button>

      <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px">
        <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
          <el-form-item label="原密码" prop="old_password">
            <el-input v-model="passwordForm.old_password" type="password" placeholder="请输入原密码" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="new_password">
            <el-input v-model="passwordForm.new_password" type="password" placeholder="请输入新密码（至少4位）" show-password />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirm_password">
            <el-input v-model="passwordForm.confirm_password" type="password" placeholder="请再次输入新密码" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleChangePassword" :loading="passwordSubmitting">确定</el-button>
        </template>
      </el-dialog>
    </el-container>
  `,
  setup() {
    const { computed, ref, reactive, onMounted, onUnmounted } = Vue;
    const { useRoute, useRouter } = VueRouter;
    const { ElMessageBox, ElMessage } = ElementPlus;

    const route = useRoute();
    const router = useRouter();

    const store = appStore.store;
    const isAdmin = appStore.isAdmin;
    const isDark = appStore.isDark;
    const currentThemeName = appStore.currentThemeName;
    const unreadCount = ref(0);
    const searchQuery = ref('');

    const themeIcon = computed(() => {
      if (store.theme === 'light') return 'Sunny';
      if (store.theme === 'dark') return 'Moon';
      return 'Monitor';
    });

    const handleThemeCommand = (cmd) => {
      appStore.setTheme(cmd);
    };

    const breadcrumbMap = {
      '/dashboard': ['首页', '仪表盘'],
      '/records': ['首页', '工单管理'],
      '/records/create': ['首页', '工单管理', '新建工单'],
      '/templates': ['首页', '业务管理', '工单模板'],
      '/equipments': ['首页', '业务管理', '客户设备'],
      '/maintenance-plans': ['首页', '业务管理', '维护计划'],
      '/pending': ['首页', '待办任务'],
      '/customers': ['首页', '客户管理'],
      '/staff': ['首页', '员工管理'],
      '/users': ['首页', '系统管理', '账号管理'],
      '/projects': ['首页', '项目管理'],
      '/materials': ['首页', '物料库存'],
      '/finance': ['首页', '财务统计'],
      '/salary': ['首页', '财务统计', '工资管理'],
      '/expense-categories': ['首页', '财务统计', '支出分类'],
      '/calendar': ['首页', '工单日历'],
      '/reports': ['首页', '统计报表'],
      '/notifications': ['首页', '消息中心'],
      '/oplogs': ['首页', '系统管理', '操作日志'],
      '/settings': ['首页', '系统管理', '系统设置'],
    };

    const breadcrumbItems = computed(() => {
      return breadcrumbMap[route.path] || [pageTitle.value];
    });

    const handleSearch = () => {
      if (!searchQuery.value.trim()) return;
      if (route.path !== '/records') {
        router.push('/records');
      }
    };

    const activeMenu = computed(() => route.path);

    const isMobile = ref(false);
    const mobileMenuOpen = ref(false);

    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 1024;
      if (!isMobile.value) mobileMenuOpen.value = false;
    };

    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });

    const sidebarWidth = computed(() => {
      if (isMobile.value) return '240px';
      return store.sidebarCollapsed ? '64px' : '220px';
    });

    const sidebarIcon = computed(() => {
      if (isMobile.value) return mobileMenuOpen.value ? 'Close' : 'Menu';
      return store.sidebarCollapsed ? 'Expand' : 'Fold';
    });

    const toggleSidebar = () => {
      if (isMobile.value) {
        mobileMenuOpen.value = !mobileMenuOpen.value;
      } else {
        appStore.toggleSidebar();
      }
    };

    const closeMobileMenu = () => {
      mobileMenuOpen.value = false;
    };

    const pageTitles = {
      '/dashboard': '仪表盘',
      '/records': '工单管理',
      '/records/create': '新建工单',
      '/templates': '工单模板',
      '/equipments': '客户设备',
      '/maintenance-plans': '维护计划',
      '/pending': '待办任务',
      '/customers': '客户管理',
      '/staff': '员工管理',
      '/users': '账号管理',
      '/projects': '项目管理',
      '/materials': '物料库存',
      '/finance': '财务概览',
      '/salary': '工资管理',
      '/expense-categories': '支出分类',
      '/calendar': '工单日历',
      '/reports': '统计报表',
      '/notifications': '消息中心',
      '/oplogs': '操作日志',
      '/settings': '系统设置',
    };

    const passwordDialogVisible = ref(false);
    const passwordSubmitting = ref(false);
    const passwordFormRef = ref(null);
    const passwordForm = reactive({
      old_password: '',
      new_password: '',
      confirm_password: '',
    });

    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== passwordForm.new_password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };

    const passwordRules = {
      old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
      new_password: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 4, message: '密码至少4位', trigger: 'blur' },
      ],
      confirm_password: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        { validator: validateConfirmPassword, trigger: 'blur' },
      ],
    };

    const loadUnreadCount = () => {
      if (apiService.getUnreadNotificationCount) {
        apiService.getUnreadNotificationCount().then(res => {
          unreadCount.value = (res && (res.unread_count != null ? res.unread_count : res.count)) || 0;
        }).catch(() => {});
      }
    };

    const pageTitle = computed(() => {
      return pageTitles[route.path] || '';
    });

    const handleMenuSelect = (index) => {
      if (index !== route.path) {
        router.push(index);
        if (isMobile.value) closeMobileMenu();
      }
    };

    const navTo = (path) => {
      if (path !== route.path) {
        router.push(path);
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
        Object.assign(passwordForm, { old_password: '', new_password: '', confirm_password: '' });
        if (passwordFormRef.value) passwordFormRef.value.clearValidate();
        passwordDialogVisible.value = true;
      } else if (command === 'profile') {
        ElMessage.info('个人中心开发中');
      }
    };

    const handleChangePassword = async () => {
      if (!passwordFormRef.value) return;
      try {
        await passwordFormRef.value.validate();
      } catch (e) {
        return;
      }
      passwordSubmitting.value = true;
      try {
        await apiService.changePassword({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        });
        ElMessage.success('密码修改成功，请重新登录');
        passwordDialogVisible.value = false;
        setTimeout(() => {
          appStore.logout();
          router.push('/login');
        }, 1000);
      } catch (e) {} finally {
        passwordSubmitting.value = false;
      }
    };

    let unreadTimer = null;

    onMounted(() => {
      if (!store.user) {
        apiService.getCurrentUser().then(res => {
          const user = res && (res.user || res);
          if (user) appStore.setUser(user);
        }).catch(() => {});
      }
      loadUnreadCount();
      unreadTimer = setInterval(loadUnreadCount, 60000);
    });

    onUnmounted(() => {
      if (unreadTimer) clearInterval(unreadTimer);
    });

    return {
      store,
      isAdmin,
      isDark,
      currentThemeName,
      themeIcon,
      handleThemeCommand,
      activeMenu,
      pageTitle,
      breadcrumbItems,
      unreadCount,
      isMobile,
      mobileMenuOpen,
      sidebarWidth,
      sidebarIcon,
      toggleSidebar,
      closeMobileMenu,
      handleMenuSelect,
      navTo,
      handleCommand,
      searchQuery,
      handleSearch,
      passwordDialogVisible,
      passwordSubmitting,
      passwordFormRef,
      passwordForm,
      passwordRules,
      handleChangePassword,
      ...appStore,
    };
  },
};

window.AppLayout = AppLayout;
