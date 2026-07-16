// =============================================
// MobileDock.js - 移动端底部导航 Dock
// =============================================
// 功能：模拟 Legacy 的移动端底部快捷导航
// =============================================

const MobileDock = {
  template: `
    <div class="mobile-dock" v-if="isMobile">
      <div class="dock-item" @click="goTo('/dashboard')">
        <el-icon><HomeFilled /></el-icon>
        <span>工作台</span>
      </div>
      <div class="dock-item" @click="goTo('/records')">
        <el-icon><Document /></el-icon>
        <span>工单</span>
        <div v-if="pendingCount > 0" class="dock-badge">{{ pendingCount }}</div>
      </div>
      <div class="dock-item add-button" @click="createNew">
        <el-icon><Plus /></el-icon>
        <span>新增</span>
      </div>
      <div class="dock-item" @click="goTo('/pending')">
        <el-icon><Clock /></el-icon>
        <span>待办</span>
      </div>
      <div class="dock-item" @click="goTo('/finance')">
        <el-icon><Money /></el-icon>
        <span>财务</span>
      </div>
    </div>
  `,

  setup() {
    const { ref, onMounted, onUnmounted } = Vue;
    const { useRouter } = VueRouter;
    const router = useRouter();

    const isMobile = ref(false);
    const pendingCount = ref(0);

    const checkMobile = () => {
      isMobile.value = window.innerWidth < 768;
    };

    const goTo = (path) => {
      router.push(path);
    };

    const createNew = () => {
      router.push('/records/create');
    };

    // 加载待办数量（简化版）
    const loadPendingCount = async () => {
      try {
        const res = await apiService.getRecords({ status: 'pending', per_page: 1 });
        pendingCount.value = res.total || 0;
      } catch (e) {}
    };

    onMounted(() => {
      checkMobile();
      loadPendingCount();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });

    return {
      isMobile,
      pendingCount,
      goTo,
      createNew
    };
  }
};

window.MobileDock = MobileDock;
MobileDock;