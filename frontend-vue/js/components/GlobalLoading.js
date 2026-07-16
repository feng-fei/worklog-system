// =============================================
// GlobalLoading.js - 全局加载与错误处理
// =============================================

const GlobalLoading = {
  template: `
    <div v-if="visible" class="global-loading-overlay">
      <div class="loading-content">
        <el-icon class="loading-icon" :class="{ 'is-loading': loading }"><Loading /></el-icon>
        <div class="loading-text">{{ text || '加载中...' }}</div>
      </div>
    </div>
  `,

  setup() {
    const { ref } = Vue;

    const visible = ref(false);
    const loading = ref(true);
    const text = ref('');

    window.showGlobalLoading = (message = '加载中...') => {
      text.value = message;
      loading.value = true;
      visible.value = true;
    };

    window.hideGlobalLoading = () => {
      visible.value = false;
    };

    window.showGlobalError = (message = '操作失败') => {
      text.value = message;
      loading.value = false;
      visible.value = true;

      setTimeout(() => {
        visible.value = false;
      }, 2000);
    };

    return {
      visible,
      loading,
      text
    };
  }
};

window.GlobalLoading = GlobalLoading;
GlobalLoading;
