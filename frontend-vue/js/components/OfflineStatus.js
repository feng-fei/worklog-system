// =============================================
// OfflineStatus.js - 离线状态提示组件
// =============================================

const OfflineStatus = {
  template: `
    <div v-if="!isOnline" class="offline-banner">
      <el-alert
        title="当前处于离线状态"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          部分功能可能无法使用。数据将在恢复网络后自动同步。
        </template>
      </el-alert>
    </div>
  `,

  setup() {
    const { ref, onMounted, onUnmounted } = Vue;

    const isOnline = ref(navigator.onLine);

    const updateOnlineStatus = () => {
      isOnline.value = navigator.onLine;
    };

    onMounted(() => {
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
    });

    onUnmounted(() => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    });

    return {
      isOnline
    };
  }
};

window.OfflineStatus = OfflineStatus;
OfflineStatus;
