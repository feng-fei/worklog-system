const LoginView = {
  template: `
    <div class="login-page">
      <el-card class="login-card" shadow="never">
        <h2>工单管理系统</h2>
        <p class="subtitle">施工 / 维修 / 项目 一体化管理</p>
        <el-form ref="loginForm" :model="form" :rules="rules" label-width="0" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
              :prefix-icon="UserIcon"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              :prefix-icon="LockIcon"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>
        <div style="text-align:center;color:#909399;font-size:12px;margin-top:16px;">
          默认账号：admin / admin123
        </div>
      </el-card>
    </div>
  `,
  setup() {
    const { reactive, ref } = Vue;
    const { useRouter } = VueRouter;
    const { ElMessage } = ElementPlus;

    const router = useRouter();
    const loginForm = ref(null);
    const loading = ref(false);

    const form = reactive({
      username: '',
      password: '',
    });

    const rules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
    };

    const UserIcon = {
      template: `<el-icon><user /></el-icon>`,
    };
    const LockIcon = {
      template: `<el-icon><lock /></el-icon>`,
    };

    const handleLogin = async () => {
      if (!loginForm.value) return;
      try {
        await loginForm.value.validate();
      } catch (e) {
        return;
      }
      loading.value = true;
      try {
        const res = await apiService.login(form);
        if (res.token) {
          appStore.setToken(res.token);
        }
        if (res.user) {
          appStore.setUser(res.user);
        } else {
          try {
            const userRes = await apiService.getCurrentUser();
            if (userRes.user) {
              appStore.setUser(userRes.user);
            }
          } catch (e) {
            console.warn('获取用户信息失败', e);
          }
        }
        ElMessage.success('登录成功');
        router.push('/dashboard');
      } catch (e) {
        console.error('登录失败', e);
      } finally {
        loading.value = false;
      }
    };

    return {
      form,
      rules,
      loading,
      loginForm,
      handleLogin,
      UserIcon,
      LockIcon,
    };
  },
};

window.LoginView = LoginView;
