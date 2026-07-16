const { reactive, computed } = Vue;

const store = reactive({
  user: null,
  token: localStorage.getItem('token') || '',
  sidebarCollapsed: false,
  theme: localStorage.getItem('theme') || 'light',
});

const isLoggedIn = computed(() => !!store.token && !!store.user);

const isAdmin = computed(() => store.user?.role === 'admin');

const isDark = computed(() => store.theme === 'dark');

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

function initTheme() {
  if (store.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  store.theme = store.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', store.theme);
  initTheme();
}

function toggleSidebar() {
  store.sidebarCollapsed = !store.sidebarCollapsed;
}

window.appStore = {
  store,
  isLoggedIn,
  isAdmin,
  isDark,
  setUser,
  setToken,
  logout,
  initUserFromStorage,
  initTheme,
  toggleTheme,
  toggleSidebar,
};
