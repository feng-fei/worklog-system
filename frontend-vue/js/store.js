const { reactive, computed, watch } = Vue;

const store = reactive({
  user: null,
  token: localStorage.getItem('token') || '',
  sidebarCollapsed: false,
  theme: localStorage.getItem('theme') || 'auto',
  isLandscape: false,
  isMobile: window.innerWidth < 768,
});

const isLoggedIn = computed(() => !!store.token && !!store.user);

const isAdmin = computed(() => {
  if (!store.user) return false;
  return store.user.role === 'admin' || store.user.is_admin === true || store.user.is_admin === 1;
});

const systemDark = computed(() => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
});

const isDark = computed(() => {
  if (store.theme === 'auto') return systemDark.value;
  return store.theme === 'dark';
});

const currentThemeName = computed(() => {
  if (store.theme === 'auto') return systemDark.value ? '深色（跟随系统）' : '浅色（跟随系统）';
  return store.theme === 'dark' ? '深色' : '浅色';
});

function usePermission() {
  const canAdmin = computed(() => isAdmin.value);
  const canEdit = computed(() => isLoggedIn.value);
  const canView = computed(() => isLoggedIn.value);

  const requireAdmin = () => {
    if (!isAdmin.value) {
      if (window.ElementPlus) {
        ElementPlus.ElMessage.error('您没有权限执行此操作');
      }
      return false;
    }
    return true;
  };

  return {
    isAdmin: canAdmin,
    canEdit,
    canView,
    requireAdmin,
  };
}

function setUser(userData) {
  store.user = userData;
  localStorage.setItem('userInfo', JSON.stringify(userData));
}

function setToken(token) {
  store.token = token;
  localStorage.setItem('token', token);
}

function logout() {
  store.user = null;
  store.token = '';
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
}

function initUserFromStorage() {
  const saved = localStorage.getItem('userInfo');
  if (saved) {
    try {
      store.user = JSON.parse(saved);
    } catch (e) {
      console.warn('解析用户信息失败', e);
    }
  }
}

function applyTheme() {
  const dark = isDark.value;
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('light-theme', !dark);
  document.body.classList.toggle('dark-theme', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = dark ? '#0f172a' : '#ffffff';
  }
}

function setTheme(mode) {
  store.theme = mode;
  localStorage.setItem('theme', mode);
  applyTheme();
}

function cycleTheme() {
  const modes = ['light', 'dark', 'auto'];
  const current = modes.indexOf(store.theme);
  const next = modes[(current + 1) % modes.length];
  setTheme(next);
  return next;
}

function toggleTheme() {
  cycleTheme();
}

function initTheme() {
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (store.theme === 'auto') {
        applyTheme();
      }
    });
  }
  applyTheme();
}

function toggleSidebar() {
  store.sidebarCollapsed = !store.sidebarCollapsed;
}

function handleResize() {
  store.isMobile = window.innerWidth < 768;
  store.isLandscape = window.innerWidth > window.innerHeight;
  document.body.classList.toggle('landscape', store.isLandscape && store.isMobile);
}

function initResponsive() {
  handleResize();
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
}

window.appStore = {
  store,
  isLoggedIn,
  isAdmin,
  isDark,
  systemDark,
  currentThemeName,
  usePermission,
  setUser,
  setToken,
  logout,
  initUserFromStorage,
  initTheme,
  applyTheme,
  setTheme,
  cycleTheme,
  toggleTheme,
  toggleSidebar,
  initResponsive,
  handleResize,
};
