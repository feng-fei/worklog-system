const DashboardView = {
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">仪表盘</h1>
          <p class="page-subtitle">欢迎回来，这是今天的工作概览</p>
        </div>
        <div class="page-header-actions">
          <el-button type="primary" @click="$router.push('/records/create')">
            <el-icon><Plus /></el-icon>
            <span>新建工单</span>
          </el-button>
        </div>
      </div>

      <div class="dashboard-stats">
        <div class="stat-card-large stat-card-primary">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-card-trend up">
              <el-icon><TrendCharts /></el-icon>
              <span>+12%</span>
            </div>
          </div>
          <div class="stat-card-value">{{ stats.today_count || 0 }}</div>
          <div class="stat-card-label">今日工单</div>
          <div class="stat-card-progress">
            <div class="stat-card-progress-bar" style="width: 65%"></div>
          </div>
        </div>

        <div class="stat-card-large stat-card-success">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-card-trend up">
              <el-icon><TrendCharts /></el-icon>
              <span>+8%</span>
            </div>
          </div>
          <div class="stat-card-value">¥{{ formatMoney(stats.month_payment || 0) }}</div>
          <div class="stat-card-label">本月收入</div>
          <div class="stat-card-progress">
            <div class="stat-card-progress-bar" style="width: 72%"></div>
          </div>
        </div>

        <div class="stat-card-large stat-card-warning">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-card-trend down">
              <el-icon><Bottom /></el-icon>
              <span>-3%</span>
            </div>
          </div>
          <div class="stat-card-value">{{ stats.pending_count || 0 }}</div>
          <div class="stat-card-label">待办任务</div>
          <div class="stat-card-progress">
            <div class="stat-card-progress-bar" style="width: 45%"></div>
          </div>
        </div>

        <div class="stat-card-large stat-card-danger">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-card-trend up">
              <el-icon><TrendCharts /></el-icon>
              <span>+5%</span>
            </div>
          </div>
          <div class="stat-card-value">¥{{ formatMoney(stats.unpaid_amount || 0) }}</div>
          <div class="stat-card-label">未收账款</div>
          <div class="stat-card-progress">
            <div class="stat-card-progress-bar" style="width: 38%"></div>
          </div>
        </div>
      </div>

      <div class="dashboard-main-grid">
        <div class="dashboard-main-left">
          <div class="page-card dashboard-card">
            <div class="card-header">
              <h3 class="card-title">工单趋势</h3>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
              </el-radio-group>
            </div>
            <div class="chart-container">
              <div class="chart-placeholder">
                <el-icon size="32"><DataLine /></el-icon>
                <p>趋势图表</p>
                <span>数据可视化模块</span>
              </div>
            </div>
          </div>

          <div class="page-card dashboard-card">
            <div class="card-header">
              <h3 class="card-title">待办任务</h3>
              <el-button link type="primary" size="small" @click="$router.push('/pending')">查看全部</el-button>
            </div>
            <div class="pending-list" v-loading="loading">
              <div class="pending-item" v-for="(item, index) in topPending" :key="item.id || index">
                <div class="pending-priority" :class="item.priority"></div>
                <div class="pending-content">
                  <div class="pending-title">{{ item.title }}</div>
                  <div class="pending-meta">
                    <el-tag size="small" effect="plain">{{ item.todo_type }}</el-tag>
                    <span class="pending-customer">{{ item.customer_name }}</span>
                    <span class="pending-date">{{ formatDate(item.reminder_date) }}</span>
                  </div>
                </div>
              </div>
              <el-empty v-if="topPending.length === 0" description="暂无待办任务" :image-size="80" />
            </div>
          </div>
        </div>

        <div class="dashboard-main-right">
          <div class="page-card dashboard-card">
            <div class="card-header">
              <h3 class="card-title">快捷操作</h3>
            </div>
            <div class="quick-actions-grid">
              <div class="quick-action-card" @click="$router.push('/records/create')">
                <div class="quick-icon">
                  <el-icon><Plus /></el-icon>
                </div>
                <div class="quick-label">新建工单</div>
              </div>
              <div class="quick-action-card" @click="$router.push('/pending')">
                <div class="quick-icon">
                  <el-icon><Bell /></el-icon>
                </div>
                <div class="quick-label">新建待办</div>
              </div>
              <div class="quick-action-card" @click="$router.push('/customers')">
                <div class="quick-icon">
                  <el-icon><UserFilled /></el-icon>
                </div>
                <div class="quick-label">客户管理</div>
              </div>
              <div class="quick-action-card" @click="$router.push('/materials')">
                <div class="quick-icon">
                  <el-icon><Box /></el-icon>
                </div>
                <div class="quick-label">物料库存</div>
              </div>
            </div>
          </div>

          <div class="page-card dashboard-card">
            <div class="card-header">
              <h3 class="card-title">系统状态</h3>
            </div>
            <div class="status-list">
              <div class="status-item">
                <div class="status-label">总工单数</div>
                <div class="status-value">{{ stats.total_count || 0 }}</div>
              </div>
              <div class="status-item">
                <div class="status-label">本月支出</div>
                <div class="status-value">¥{{ formatMoney(stats.month_expense || 0) }}</div>
              </div>
              <div class="status-item">
                <div class="status-label">低库存物料</div>
                <div class="status-value warning">{{ stats.low_stock_count || 0 }} 种</div>
              </div>
              <div class="status-item">
                <div class="status-label">待维护设备</div>
                <div class="status-value accent">{{ stats.due_maintenance_count || 0 }} 台</div>
              </div>
            </div>
          </div>

          <div class="page-card dashboard-card">
            <div class="card-header">
              <h3 class="card-title">最近工单</h3>
              <el-button link type="primary" size="small" @click="$router.push('/records')">全部</el-button>
            </div>
            <div class="recent-list">
              <div class="recent-empty">
                <el-empty description="暂无数据" :image-size="60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { ref, onMounted } = Vue;
    const { ElMessage } = ElementPlus;

    const loading = ref(false);
    const stats = ref({});
    const topPending = ref([]);
    const chartPeriod = ref('week');

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const loadDashboard = async () => {
      loading.value = true;
      try {
        const res = await apiService.getDashboard();
        stats.value = res || {};
        const pendingData = res && res.urgent_pending ? res.urgent_pending : [];
        topPending.value = Array.isArray(pendingData) ? pendingData.slice(0, 5) : [];
      } catch (e) {
        console.error('加载仪表盘失败', e);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadDashboard();
    });

    return {
      loading,
      stats,
      topPending,
      chartPeriod,
      formatMoney,
      formatDate,
    };
  },
};

window.DashboardView = DashboardView;
