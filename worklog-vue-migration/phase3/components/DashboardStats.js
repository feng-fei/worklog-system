// =============================================
// DashboardStats.js - 仪表盘统计卡片增强
// =============================================

const DashboardStats = {
  template: `
    <el-row :gutter="16">
      <el-col :span="6" v-for="(stat, index) in stats" :key="index">
        <div class="stat-card" :class="stat.type">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-sub" v-if="stat.sub">{{ stat.sub }}</div>
          <div class="stat-trend" v-if="stat.trend">
            <span :class="stat.trend > 0 ? 'up' : 'down'">
              {{ stat.trend > 0 ? '↑' : '↓' }} {{ Math.abs(stat.trend) }}%
            </span>
            <span class="trend-text">较上月</span>
          </div>
        </div>
      </el-col>
    </el-row>
  `,

  props: {
    stats: {
      type: Array,
      default: () => []
      // 示例数据结构：
      // [
      //   { label: '本月工单', value: 128, type: 'primary', trend: 12 },
      //   { label: '待处理', value: 23, type: 'warning', trend: -5 },
      //   { label: '本月收入', value: '¥45,680', type: 'success', trend: 8 },
      //   { label: '逾期工单', value: 7, type: 'danger', trend: -15 }
      // ]
    }
  }
};

window.DashboardStats = DashboardStats;
DashboardStats;