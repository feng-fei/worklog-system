const OpLogView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">操作日志</div>
          <div style="display:flex;gap:8px;">
            <el-button type="danger" @click="handleCleanup" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Delete /></el-icon>
              清理旧日志
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
            placeholder="搜索操作内容/用户"
            clearable
            style="width:200px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.action" placeholder="操作类型" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="登录" value="login" />
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

        <el-table :data="logs" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="created_at" label="时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="username" label="操作人" width="100" />
          <el-table-column prop="action" label="操作类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getActionType(row.action)">{{ getActionLabel(row.action) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="模块" width="100" />
          <el-table-column prop="description" label="操作内容" min-width="200" show-overflow-tooltip />
          <el-table-column prop="ip_address" label="IP地址" width="140" />
        </el-table>

        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.per_page"
            :page-sizes="[20, 50, 100]"
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
    const { ref, reactive, computed, onMounted } = Vue;

    const logs = ref([]);
    const loading = ref(false);
    const dateRange = ref([]);

    const filters = reactive({
      keyword: '',
      action: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const isAdmin = computed(() => appStore.isAdmin.value);

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
    };

    const getActionLabel = (action) => {
      const map = {
        create: '创建',
        update: '更新',
        delete: '删除',
        login: '登录',
        logout: '退出',
      };
      return map[action] || action || '-';
    };

    const getActionType = (action) => {
      const map = {
        create: 'success',
        update: 'primary',
        delete: 'danger',
        login: 'info',
      };
      return map[action] || 'info';
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      if (dateRange.value && dateRange.value.length === 2) {
        params.start_date = dateRange.value[0];
        params.end_date = dateRange.value[1];
      }

      apiService.getOperationLogs(params)
        .then((res) => {
          const data = res && res.logs ? res.logs : [];
          logs.value = Array.isArray(data) ? data : [];
          pagination.total = (res && res.total) || 0;
        })
        .catch(() => {
          logs.value = [];
          pagination.total = 0;
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.action = '';
      dateRange.value = [];
      pagination.page = 1;
      loadData();
    };

    const handleSizeChange = (size) => {
      pagination.per_page = size;
      pagination.page = 1;
      loadData();
    };

    const handlePageChange = (page) => {
      pagination.page = page;
      loadData();
    };

    const handleCleanup = async () => {
      try {
        await ElementPlus.ElMessageBox.confirm(
          '确定要清理过期的操作日志吗？（按系统设置保留天数执行）',
          '清理操作日志',
          { type: 'warning', confirmButtonText: '确定清理', cancelButtonText: '取消' }
        );
        const res = await apiService.cleanupOperationLogs();
        ElementPlus.ElMessage.success(res?.message || '清理成功');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      logs,
      loading,
      filters,
      dateRange,
      pagination,
      isAdmin,
      formatDateTime,
      getActionLabel,
      getActionType,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      handleCleanup,
    };
  },
};

window.OpLogView = OpLogView;
OpLogView;
