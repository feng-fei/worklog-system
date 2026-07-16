const ProjectView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">项目管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增项目
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
            placeholder="搜索项目名称/客户"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已暂停" value="paused" />
            <el-option label="已取消" value="cancelled" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="projects" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="name" label="项目名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="customer_name" label="客户" width="140" show-overflow-tooltip />
          <el-table-column label="预算金额" width="140">
            <template #default="{ row }">
              ¥{{ (row.budget_amount || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="实际金额" width="140">
            <template #default="{ row }">
              ¥{{ (row.actual_amount || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="开始日期" width="120" />
          <el-table-column prop="end_date" label="结束日期" width="120" />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="isAdmin">删除</el-button>
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
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入项目名称" />
          </el-form-item>
          <el-form-item label="客户" prop="customer_id">
            <el-select v-model="form.customer_id" placeholder="请选择客户" filterable style="width:100%;">
              <el-option
                v-for="c in customerOptions"
                :key="c.id"
                :label="c.name"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="项目状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择状态" style="width:100%;">
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已暂停" value="paused" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="预算金额">
            <el-input-number v-model="form.budget_amount" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="form.start_date"
              type="date"
              placeholder="选择开始日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker
              v-model="form.end_date"
              type="date"
              placeholder="选择结束日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="项目经理">
            <el-select v-model="form.manager_name" placeholder="请选择项目经理" filterable style="width:100%;">
              <el-option
                v-for="s in staffOptions"
                :key="s.username"
                :label="s.name"
                :value="s.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="项目描述">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>

      <el-drawer v-model="detailVisible" title="项目详情" size="600px">
        <div v-if="currentProject" style="padding:0 10px;">
          <div style="margin-bottom:20px;">
            <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">{{ currentProject.name }}</div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
              <div>
                <div style="color:#909399;font-size:12px;">客户</div>
                <div>{{ currentProject.customer_name || '-' }}</div>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">状态</div>
                <el-tag :type="getStatusType(currentProject.status)" size="small">
                  {{ getStatusText(currentProject.status) }}
                </el-tag>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">预算金额</div>
                <div style="color:#409eff;font-weight:bold;">¥{{ (currentProject.budget_amount || 0).toFixed(2) }}</div>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">实际金额</div>
                <div style="color:#67c23a;font-weight:bold;">¥{{ (currentProject.actual_amount || 0).toFixed(2) }}</div>
              </div>
            </div>
          </div>

          <el-divider />

          <div style="margin-bottom:20px;">
            <div style="font-weight:bold;margin-bottom:10px;">基本信息</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="项目经理">{{ currentProject.manager_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="周期">
                {{ currentProject.start_date || '-' }} ~ {{ currentProject.end_date || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(currentProject.created_at) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDateTime(currentProject.updated_at) }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div style="margin-bottom:20px;">
            <div style="font-weight:bold;margin-bottom:10px;">项目描述</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentProject.description || '暂无描述' }}
            </div>
          </div>

          <div>
            <div style="font-weight:bold;margin-bottom:10px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentProject.remark || '暂无备注' }}
            </div>
          </div>
        </div>
      </el-drawer>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const projects = ref([]);
    const customerOptions = ref([]);
    const staffOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const currentProject = ref(null);
    const formRef = ref(null);

    const filters = reactive({
      keyword: '',
      status: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      name: '',
      customer_id: null,
      status: 'in_progress',
      budget_amount: 0,
      start_date: '',
      end_date: '',
      manager_name: '',
      description: '',
      remark: '',
    });

    const rules = {
      name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
      customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
      status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin);
    const dialogTitle = computed(() => (isEdit.value ? '编辑项目' : '新增项目'));

    const getStatusText = (status) => {
      const map = {
        in_progress: '进行中',
        completed: '已完成',
        paused: '已暂停',
        cancelled: '已取消',
      };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = {
        in_progress: 'primary',
        completed: 'success',
        paused: 'warning',
        cancelled: 'info',
      };
      return map[status] || 'info';
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getProjects(params)
        .then((res) => {
          projects.value = res.items || res.data || [];
          pagination.total = res.total || 0;
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载项目列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadCustomers = () => {
      apiService.getCustomers({ per_page: 1000 })
        .then((res) => {
          customerOptions.value = res.items || res.data || [];
        })
        .catch(() => {});
    };

    const loadStaffs = () => {
      apiService.getStaffs({ per_page: 1000, enabled: 'true' })
        .then((res) => {
          staffOptions.value = res.items || res.data || [];
        })
        .catch(() => {});
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.status = '';
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

    const handleCreate = () => {
      isEdit.value = false;
      form.id = null;
      form.name = '';
      form.customer_id = null;
      form.status = 'in_progress';
      form.budget_amount = 0;
      form.start_date = '';
      form.end_date = '';
      form.manager_name = '';
      form.description = '';
      form.remark = '';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.name = row.name;
      form.customer_id = row.customer_id;
      form.status = row.status;
      form.budget_amount = row.budget_amount || 0;
      form.start_date = row.start_date || '';
      form.end_date = row.end_date || '';
      form.manager_name = row.manager_name || '';
      form.description = row.description || '';
      form.remark = row.remark || '';
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      currentProject.value = row;
      detailVisible.value = true;
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = { ...form };

        const request = isEdit.value
          ? apiService.updateProject(form.id, data)
          : apiService.createProject(data);

        request
          .then(() => {
            ElementPlus.ElMessage.success(isEdit.value ? '编辑成功' : '新增成功');
            dialogVisible.value = false;
            loadData();
          })
          .finally(() => {
            submitting.value = false;
          });
      });
    };

    const handleDelete = (row) => {
      ElementPlus.ElMessageBox.confirm(
        `确定要删除项目「${row.name}」吗？此操作不可恢复。`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteProject(row.id);
        })
        .then(() => {
          ElementPlus.ElMessage.success('删除成功');
          loadData();
        })
        .catch(() => {});
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
    };

    onMounted(() => {
      loadData();
      loadCustomers();
      loadStaffs();
    });

    return {
      projects,
      customerOptions,
      staffOptions,
      loading,
      submitting,
      dialogVisible,
      detailVisible,
      isEdit,
      currentProject,
      formRef,
      filters,
      pagination,
      form,
      rules,
      isAdmin,
      dialogTitle,
      getStatusText,
      getStatusType,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleView,
      handleSubmit,
      handleDelete,
      formatDateTime,
    };
  },
};

window.ProjectView = ProjectView;
