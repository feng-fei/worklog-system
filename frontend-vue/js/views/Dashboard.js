const DashboardView = {
  template: `
    <div>
      <div class="section-title">数据概览</div>
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">今日工单</div>
            <div class="stat-value primary">{{ stats.today_count || 0 }}</div>
            <div class="stat-sub">今日施工/维修工单</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">本月收入</div>
            <div class="stat-value success">¥{{ formatMoney(stats.month_payment || 0) }}</div>
            <div class="stat-sub">本月实际收款</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">待办任务</div>
            <div class="stat-value warning">{{ stats.pending_count || 0 }}</div>
            <div class="stat-sub">待处理的待办事项</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">未收账款</div>
            <div class="stat-value danger">¥{{ formatMoney(stats.unpaid_amount || 0) }}</div>
            <div class="stat-sub">待收工单款项</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top:24px;">
        <el-col :span="16">
          <div class="page-card">
            <div class="section-title" style="margin-bottom:12px;">待办任务（前5条）</div>
            <el-table :data="topPending" style="width:100%;" size="default" v-loading="loading">
              <el-table-column prop="title" label="任务标题" min-width="200" />
              <el-table-column prop="todo_type" label="类型" width="110">
                <template #default="{ row }">
                  <el-tag size="small" :type="getTodoTagType(row.todo_type)">{{ row.todo_type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="priority" label="优先级" width="100">
                <template #default="{ row }">
                  <el-tag size="small" :type="getPriorityType(row.priority)">{{ getPriorityLabel(row.priority) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="customer_name" label="客户" width="140" />
              <el-table-column prop="staff_name" label="负责人" width="100" />
              <el-table-column prop="reminder_date" label="提醒时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.reminder_date) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="page-card">
            <div class="section-title" style="margin-bottom:12px;">快捷入口</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <el-button type="primary" size="large" @click="$router.push('/records')">
                <el-icon style="margin-right:6px;"><Plus /></el-icon>
                新建工单
              </el-button>
              <el-button type="success" size="large" @click="handleNewPending">
                <el-icon style="margin-right:6px;"><Bell /></el-icon>
                新建待办
              </el-button>
              <el-button type="warning" size="large" @click="handleExport">
                <el-icon style="margin-right:6px;"><Download /></el-icon>
                导出报表
              </el-button>
              <el-button type="info" size="large" @click="handleMore">
                <el-icon style="margin-right:6px;"><MoreFilled /></el-icon>
                更多功能
              </el-button>
            </div>

            <div class="section-title" style="margin:24px 0 12px;">系统状态</div>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="工单数">{{ stats.total_count || 0 }}</el-descriptions-item>
              <el-descriptions-item label="本月支出">¥{{ formatMoney(stats.month_expense || 0) }}</el-descriptions-item>
              <el-descriptions-item label="低库存物料">{{ stats.low_stock_count || 0 }} 种</el-descriptions-item>
              <el-descriptions-item label="待维护设备">{{ stats.due_maintenance_count || 0 }} 台</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-col>
      </el-row>
    </div>
  `,
  setup() {
    const { ref, onMounted } = Vue;
    const { ElMessage } = ElementPlus;

    const loading = ref(false);
    const stats = ref({});
    const topPending = ref([]);

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const getTodoTagType = (type) => {
      const map = { '客户报修': 'danger', '巡检维护': 'warning', '安装调试': 'primary', '其他': 'info' };
      return map[type] || 'info';
    };

    const getPriorityType = (priority) => {
      const map = { high: 'danger', normal: 'warning', low: 'info' };
      return map[priority] || 'info';
    };

    const getPriorityLabel = (priority) => {
      const map = { high: '高', normal: '中', low: '低' };
      return map[priority] || '中';
    };

    const loadDashboard = async () => {
      loading.value = true;
      try {
        const res = await apiService.getDashboard();
        stats.value = res || {};
        topPending.value = res.top_pending || res.pending_list || [];
      } catch (e) {
        console.error('加载仪表盘失败', e);
      } finally {
        loading.value = false;
      }
    };

    const handleNewPending = () => {
      ElMessage.info('新建待办功能开发中');
    };

    const handleExport = () => {
      ElMessage.info('导出报表功能开发中');
    };

    const handleMore = () => {
      ElMessage.info('更多功能开发中');
    };

    onMounted(() => {
      loadDashboard();
    });

    return {
      loading,
      stats,
      topPending,
      formatMoney,
      formatDate,
      getTodoTagType,
      getPriorityType,
      getPriorityLabel,
      handleNewPending,
      handleExport,
      handleMore,
    };
  },
};

window.DashboardView = DashboardView;
