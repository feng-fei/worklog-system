// =============================================
// ReportView.js - 月度/年度报表
// =============================================

const ReportView = {
  template: `
    <div class="page-card">
      <div class="section-title" style="margin-bottom:20px;">统计报表</div>

      <el-form inline style="margin-bottom:20px;">
        <el-form-item label="报表类型">
          <el-select v-model="reportType" style="width:140px;">
            <el-option label="月度报表" value="monthly" />
            <el-option label="年度报表" value="yearly" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="reportType === 'monthly'" label="月份">
          <el-date-picker v-model="selectedMonth" type="month" value-format="YYYY-MM" />
        </el-form-item>

        <el-form-item v-if="reportType === 'yearly'" label="年份">
          <el-date-picker v-model="selectedYear" type="year" value-format="YYYY" />
        </el-form-item>

        <el-button type="primary" @click="generateReport">生成报表</el-button>
      </el-form>

      <div v-if="reportData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="总工单数">{{ reportData.total_records }}</el-descriptions-item>
          <el-descriptions-item label="完成率">{{ reportData.completion_rate }}%</el-descriptions-item>
          <el-descriptions-item label="总收入">¥{{ reportData.total_income }}</el-descriptions-item>
          <el-descriptions-item label="总支出">¥{{ reportData.total_expense }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top:30px;">
          <div class="section-title" style="margin-bottom:12px;">收入构成</div>
          <el-table :data="reportData.income_breakdown || []" size="small" border>
            <el-table-column prop="category" label="类别" />
            <el-table-column prop="amount" label="金额" align="right">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div style="margin-top:24px;">
          <div class="section-title" style="margin-bottom:12px;">工单状态分布</div>
          <el-table :data="reportData.status_breakdown || []" size="small" border>
            <el-table-column prop="status" label="状态" />
            <el-table-column prop="count" label="数量" align="right" />
          </el-table>
        </div>
      </div>

      <el-empty v-else description="请选择条件并点击生成报表" />
    </div>
  `,

  setup() {
    const { ref, onMounted } = Vue;

    const reportType = ref('monthly');
    const selectedMonth = ref(new Date().toISOString().slice(0, 7));
    const selectedYear = ref(new Date().getFullYear().toString());
    const reportData = ref(null);
    const loading = ref(false);

    const generateReport = async () => {
      loading.value = true;
      try {
        let params = {};
        if (reportType.value === 'monthly') {
          params = { type: 'monthly', month: selectedMonth.value };
        } else {
          params = { type: 'yearly', year: selectedYear.value };
        }

        const res = await apiService.getStatistics?.(params);
        if (res) {
          reportData.value = res;
        } else {
          // fallback data
          reportData.value = {
            total_records: 0,
            completion_rate: 0,
            total_income: 0,
            total_expense: 0,
            income_breakdown: [],
            status_breakdown: []
          };
        }
      } catch (e) {
        console.error('生成报表失败', e);
        ElementPlus.ElMessage.warning('报表数据加载失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      generateReport();
    });

    return {
      reportType,
      selectedMonth,
      selectedYear,
      reportData,
      loading,
      generateReport
    };
  }
};

window.ReportView = ReportView;
ReportView;
