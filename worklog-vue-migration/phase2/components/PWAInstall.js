// =============================================
// PWAInstall.js - PWA 安装提示组件
// =============================================

const PWAInstall = {
  template: `
    <div v-if="showInstallButton" class="pwa-install-banner">
      <div class="pwa-content">
        <span>将此应用安装到桌面，获得更好体验</span>
        <el-button type="primary" size="small" @click="installPWA">立即安装</el-button>
        <el-button size="small" @click="dismiss">暂不安装</el-button>
      </div>
    </div>
  `,

  setup() {
    const { ref, onMounted } = Vue;

    const showInstallButton = ref(false);
    let deferredPrompt = null;

    const installPWA = async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredPrompt = null;
      showInstallButton.value = false;
    };

    const dismiss = () => {
      showInstallButton.value = false;
      localStorage.setItem('pwa_dismissed', 'true');
    };

    onMounted(() => {
      // 检查是否已经 dismiss 过
      if (localStorage.getItem('pwa_dismissed') === 'true') return;

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton.value = true;
      });

      // 如果已经安装则不显示
      if (window.matchMedia('(display-mode: standalone)').matches) {
        showInstallButton.value = false;
      }
    });

    return {
      showInstallButton,
      installPWA,
      dismiss
    };
  }
};

window.PWAInstall = PWAInstall;
PWAInstall;