const RecordListView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">工单列表</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新建工单
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索客户/工单编号/联系人"
            clearable
            style="width:220px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.record_type" placeholder="工单类型" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="施工" value="construction" />
            <el-option label="维修" value="repair" />
          </el-select>

          <el-select v-model="filters.status" placeholder="工单状态" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>

          <el-select v-model="filters.payment_status" placeholder="收款状态" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="未收款" value="unpaid" />
            <el-option label="部分收款" value="partial" />
            <el-option label="已结清" value="paid" />
          </el-select>

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width:260px;"
          />

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="records" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="order_no" label="工单号" width="180" />
          <el-table-column prop="customer_name" label="客户名称" min-width="140" />
          <el-table-column prop="record_type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.record_type === 'repair' ? 'danger' : 'primary'">
              {{ row.record_type === 'repair' ? '维修' : '施工' }}
            </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getStatusType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="staff_name" label="负责人" width="100" />
          <el-table-column prop="work_date" label="施工日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.work_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="total_fee" label="总金额" width="110" align="right">
            <template #default="{ row }">
              ¥{{ formatMoney(row.total_fee) }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_status" label="收款" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getPaymentTagType(row.payment_status)">
                {{ getPaymentLabel(row.payment_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  `,
  setup() {
    const { ref, reactive, onMounted, computed } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const loading = ref(false);
    const records = ref([]);
    const dateRange = ref([]);

    const filters = reactive({
      keyword: '',
      record_type: '',
      status: '',
      payment_status: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toFixed(2);
    };

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('zh-CN');
    };

    const getStatusType = (status) => {
      const map = {
        pending: 'warning',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'info',
        settlement: 'warning',
        dispatched: '',
      };
      return map[status] || 'info';
    };

    const getStatusLabel = (status) => {
      const map = {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        settlement: '待结算',
        dispatched: '已派单',
        callback: '待回访',
        unable: '无法维修',
        rework: '返工',
      };
      return map[status] || status;
    };

    const getPaymentLabel = (status) => {
      const map = {
        unpaid: '未收款',
        partial: '部分收款',
        paid: '已结清',
        monthly: '月结',
      };
      return map[status] || status;
    };

    const getPaymentTagType = (status) => {
      const map = {
        unpaid: 'danger',
        partial: 'warning',
        paid: 'success',
        monthly: 'info',
      };
      return map[status] || 'info';
    };

    const loadData = async () => {
      loading.value = true;
      try {
        const params = {
          page: pagination.page,
          per_page: pagination.per_page,
        };
        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.record_type) params.record_type = filters.record_type;
        if (filters.status) params.status = filters.status;
        if (filters.payment_status) params.payment_status = filters.payment_status;
        if (dateRange.value && dateRange.value.length === 2) {
          params.start_date = dateRange.value[0];
          params.end_date = dateRange.value[1];
        }
        const res = await apiService.getRecords(params);
        records.value = res.records || res.data || [];
        pagination.total = res.total || 0;
      } catch (e) {
        console.error('加载工单列表失败', e);
      } finally {
        loading.value = false;
      }
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.record_type = '';
      filters.status = '';
      filters.payment_status = '';
      dateRange.value = [];
      pagination.page = 1;
      loadData();
    };

    const handlePageChange = (page) => {
      pagination.page = page;
      loadData();
    };

    const handleSizeChange = (size) => {
      pagination.per_page = size;
      pagination.page = 1;
      loadData();
    };

    const handleCreate = () => {
      ElMessage.info('新建工单功能开发中');
    };

    const handleView = (row) => {
      ElMessage.info('查看工单 ' + row.order_no);
    };

    const handleEdit = (row) => {
      ElMessage.info('编辑工单 ' + row.order_no);
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除工单 ${row.order_no} 吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deleteRecord(row.id);
        ElMessage.success('删除成功');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      records,
      filters,
      pagination,
      dateRange,
      formatMoney,
      formatDate,
      getStatusType,
      getStatusLabel,
      getPaymentLabel,
      getPaymentTagType,
      loadData,
      resetFilters,
      handlePageChange,
      handleSizeChange,
      handleCreate,
      handleView,
      handleEdit,
      handleDelete,
    };
  },
};

window.RecordListView = RecordListView;
