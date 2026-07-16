const PendingWorkView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">待办任务</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新建待办
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
            placeholder="搜索标题/客户/内容"
            clearable
            style="width:200px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.todo_type" placeholder="任务类型" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="客户报修" value="客户报修" />
            <el-option label="巡检维护" value="巡检维护" />
            <el-option label="安装调试" value="安装调试" />
            <el-option label="其他" value="其他" />
          </el-select>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:100px;">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
          </el-select>

          <el-select v-model="filters.priority" placeholder="优先级" clearable style="width:100px;">
            <el-option label="全部" value="" />
            <el-option label="高" value="high" />
            <el-option label="中" value="normal" />
            <el-option label="低" value="low" />
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

        <div style="margin-bottom:12px;display:flex;gap:8px;">
          <el-button size="small" :disabled="selectedIds.length === 0" @click="handleBatchComplete">
            <el-icon style="margin-right:4px;"><Check /></el-icon>
            批量完成
          </el-button>
          <el-button size="small" type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
            <el-icon style="margin-right:4px;"><Delete /></el-icon>
            批量删除
          </el-button>
          <span style="margin-left:8px;color:#909399;font-size:13px;">
            已选择 {{ selectedIds.length }} 项
          </span>
        </div>

        <el-table
          :data="pendings"
          style="width:100%;"
          v-loading="loading"
          stripe
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="42" />
          <el-table-column prop="title" label="任务标题" min-width="180" show-overflow-tooltip />
          <el-table-column prop="todo_type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getTypeTagType(row.todo_type)">{{ row.todo_type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="priority" label="优先级" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="getPriorityType(row.priority)">{{ getPriorityLabel(row.priority) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'completed' ? 'success' : 'warning'">
                {{ row.status === 'completed' ? '已完成' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
          <el-table-column prop="staff_name" label="负责人" width="90" />
          <el-table-column prop="reminder_date" label="提醒时间" width="150">
            <template #default="{ row }">
              {{ formatDateTime(row.reminder_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="150">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button v-if="row.status !== 'completed'" link type="success" size="small" @click="handleComplete(row)">完成</el-button>
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="任务标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入任务标题" />
          </el-form-item>
          <el-form-item label="任务类型" prop="todo_type">
            <el-select v-model="form.todo_type" style="width:100%;">
              <el-option label="客户报修" value="客户报修" />
              <el-option label="巡检维护" value="巡检维护" />
              <el-option label="安装调试" value="安装调试" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="form.priority" style="width:100%;">
              <el-option label="高" value="high" />
              <el-option label="中" value="normal" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item label="客户名称">
            <el-input v-model="form.customer_name" placeholder="请输入客户名称" />
          </el-form-item>
          <el-form-item label="负责人">
            <el-input v-model="form.staff_name" placeholder="请输入负责人" />
          </el-form-item>
          <el-form-item label="提醒时间">
            <el-date-picker
              v-model="form.reminder_date"
              type="datetime"
              placeholder="选择提醒时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="任务描述">
            <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入任务描述" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const loading = ref(false);
    const submitting = ref(false);
    const pendings = ref([]);
    const dateRange = ref([]);
    const selectedIds = ref([]);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新建待办');
    const formRef = ref(null);
    const isEdit = ref(false);

    const filters = reactive({
      keyword: '',
      todo_type: '',
      status: '',
      priority: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      title: '',
      todo_type: '其他',
      priority: 'normal',
      customer_name: '',
      staff_name: '',
      reminder_date: '',
      description: '',
    });

    const rules = {
      title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
      todo_type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
    };

    const getTypeTagType = (type) => {
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

    const formatDateTime = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const loadData = async () => {
      loading.value = true;
      try {
        const params = {
          page: pagination.page,
          per_page: pagination.per_page,
        };
        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.todo_type) params.todo_type = filters.todo_type;
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (dateRange.value && dateRange.value.length === 2) {
          params.start_date = dateRange.value[0];
          params.end_date = dateRange.value[1];
        }
        const res = await apiService.getPendingWorks(params);
        const data = res && res.records ? res.records : [];
        pendings.value = Array.isArray(data) ? data : [];
        pagination.total = (res && res.total) || 0;
      } catch (e) {
        console.error('加载待办列表失败', e);
      } finally {
        loading.value = false;
      }
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.todo_type = '';
      filters.status = '';
      filters.priority = '';
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

    const handleSelectionChange = (selection) => {
      selectedIds.value = selection.map(item => item.id);
    };

    const handleCreate = () => {
      isEdit.value = false;
      dialogTitle.value = '新建待办';
      Object.assign(form, {
        id: null,
        title: '',
        todo_type: '其他',
        priority: 'normal',
        customer_name: '',
        staff_name: '',
        reminder_date: '',
        description: '',
      });
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑待办';
      Object.assign(form, { ...row });
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      ElMessage.info('查看待办: ' + row.title);
    };

    const handleComplete = async (row) => {
      try {
        await ElMessageBox.confirm(`确定标记任务"${row.title}"为已完成吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        });
        await apiService.completePendingWork(row.id, {});
        ElMessage.success('已完成');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除任务"${row.title}"吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deletePendingWork(row.id);
        ElMessage.success('删除成功');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    const handleBatchComplete = async () => {
      try {
        await ElMessageBox.confirm(`确定批量完成选中的 ${selectedIds.value.length} 个任务吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        });
        await apiService.batchCompletePendingWorks(selectedIds.value);
        ElMessage.success('批量完成成功');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    const handleBatchDelete = async () => {
      try {
        await ElMessageBox.confirm(`确定批量删除选中的 ${selectedIds.value.length} 个任务吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.batchDeletePendingWorks(selectedIds.value);
        ElMessage.success('批量删除成功');
        loadData();
      } catch (e) {
        // 取消
      }
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;
      try {
        await formRef.value.validate();
      } catch (e) {
        return;
      }
      submitting.value = true;
      try {
        if (isEdit.value) {
          await apiService.updatePendingWork(form.id, form);
          ElMessage.success('更新成功');
        } else {
          await apiService.createPendingWork(form);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
        console.error('提交失败', e);
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      submitting,
      pendings,
      filters,
      pagination,
      dateRange,
      selectedIds,
      dialogVisible,
      dialogTitle,
      formRef,
      form,
      rules,
      getTypeTagType,
      getPriorityType,
      getPriorityLabel,
      formatDateTime,
      loadData,
      resetFilters,
      handlePageChange,
      handleSizeChange,
      handleSelectionChange,
      handleCreate,
      handleEdit,
      handleView,
      handleComplete,
      handleDelete,
      handleBatchComplete,
      handleBatchDelete,
      handleSubmit,
    };
  },
};

window.PendingWorkView = PendingWorkView;
