const ProjectView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
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
            placeholder="搜索项目名称/编号/合同号"
            clearable
            style="width:260px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="待启动" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已结算" value="settled" />
            <el-option label="已取消" value="cancelled" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="projects" v-loading="loading" stripe>
          <el-table-column prop="project_no" label="项目编号" width="140" />
          <el-table-column prop="name" label="项目名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="customer_name" label="客户" width="140" show-overflow-tooltip />
          <el-table-column prop="manager" label="项目经理" width="100" />
          <el-table-column label="合同金额" width="120" align="right">
            <template #default="{ row }">¥{{ (row.contract_amount || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="开始日期" width="110">
            <template #default="{ row }">{{ row.start_date || '-' }}</template>
          </el-table-column>
          <el-table-column prop="end_date" label="结束日期" width="110">
            <template #default="{ row }">{{ row.end_date || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)" v-if="isAdmin">编辑</el-button>
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入项目名称" />
          </el-form-item>
          <el-form-item label="客户名称" prop="customer_name">
            <el-input v-model="form.customer_name" placeholder="请输入客户名称" list="customer-list" />
            <datalist id="customer-list">
              <option v-for="c in customerOptions" :key="c.id" :value="c.name">{{ c.short_name || c.name }}</option>
            </datalist>
          </el-form-item>
          <el-form-item label="项目状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择状态" style="width:100%;">
              <el-option label="待启动" value="pending" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已结算" value="settled" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="项目经理" prop="manager">
            <el-input v-model="form.manager" placeholder="请输入项目经理姓名" list="staff-list" />
            <datalist id="staff-list">
              <option v-for="s in staffOptions" :key="s.id" :value="s.name">{{ s.position || '' }}</option>
            </datalist>
          </el-form-item>
          <el-form-item label="合同金额">
            <el-input-number v-model="form.contract_amount" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="form.start_date" type="date" placeholder="选择开始日期" value-format="YYYY-MM-DD" style="width:100%;" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="form.end_date" type="date" placeholder="选择结束日期" value-format="YYYY-MM-DD" style="width:100%;" />
          </el-form-item>
          <el-form-item label="项目地址">
            <el-input v-model="form.project_address" placeholder="请输入项目地址" />
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
                <div style="color:#909399;font-size:12px;">项目编号</div>
                <div>{{ currentProject.project_no || '-' }}</div>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">客户</div>
                <div>{{ currentProject.customer_name || '-' }}</div>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">状态</div>
                <el-tag :type="getStatusType(currentProject.status)" size="small">{{ getStatusText(currentProject.status) }}</el-tag>
              </div>
              <div>
                <div style="color:#909399;font-size:12px;">合同金额</div>
                <div style="color:#409eff;font-weight:bold;">¥{{ (currentProject.contract_amount || 0).toFixed(2) }}</div>
              </div>
            </div>
          </div>

          <el-divider />

          <div style="margin-bottom:20px;">
            <div style="font-weight:bold;margin-bottom:10px;">基本信息</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="项目经理">{{ currentProject.manager || '-' }}</el-descriptions-item>
              <el-descriptions-item label="项目地址">{{ currentProject.project_address || '-' }}</el-descriptions-item>
              <el-descriptions-item label="周期">{{ currentProject.start_date || '-' }} ~ {{ currentProject.end_date || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ currentProject.contact_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ currentProject.contact_phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(currentProject.created_at) }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div style="margin-bottom:20px;" v-if="currentProject.description">
            <div style="font-weight:bold;margin-bottom:10px;">项目描述</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">{{ currentProject.description }}</div>
          </div>

          <div v-if="currentProject.remark">
            <div style="font-weight:bold;margin-bottom:10px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">{{ currentProject.remark }}</div>
          </div>
        </div>
      </el-drawer>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted, nextTick } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

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

    const defaultForm = () => ({
      id: null,
      name: '',
      customer_name: '',
      status: 'pending',
      contract_amount: 0,
      budget_amount: 0,
      start_date: '',
      end_date: '',
      manager: '',
      project_address: '',
      contact_name: '',
      contact_phone: '',
      description: '',
      remark: '',
    });

    const form = reactive(defaultForm());

    const rules = {
      name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
      customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
      status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑项目' : '新增项目'));

    const getStatusText = (status) => {
      const map = { pending: '待启动', in_progress: '进行中', completed: '已完成', settled: '已结算', cancelled: '已取消' };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = { pending: 'info', in_progress: 'primary', completed: 'success', settled: 'success', cancelled: 'danger' };
      return map[status] || 'info';
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
      };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      apiService.getProjects(params)
        .then((res) => {
          const { list, total } = parseListResponse(res);
          projects.value = list;
          pagination.total = total;
        })
        .catch(() => {
          ElMessage.error('加载项目列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadCustomers = () => {
      apiService.getCustomers()
        .then((res) => {
          const { list } = parseListResponse(res);
          customerOptions.value = list;
        })
        .catch(() => {});
    };

    const loadStaffs = () => {
      apiService.getStaffs()
        .then((res) => {
          const { list } = parseListResponse(res);
          staffOptions.value = list;
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

    const resetForm = () => {
      Object.assign(form, defaultForm());
      nextTick(() => {
        if (formRef.value) {
          formRef.value.clearValidate();
          formRef.value.resetFields();
        }
      });
    };

    const handleCreate = () => {
      Object.assign(form, defaultForm());
      isEdit.value = false;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        name: row.name || '',
        customer_name: row.customer_name || '',
        status: row.status || 'pending',
        contract_amount: row.contract_amount || 0,
        budget_amount: row.budget_amount || 0,
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        manager: row.manager || '',
        project_address: row.project_address || '',
        contact_name: row.contact_name || '',
        contact_phone: row.contact_phone || '',
        description: row.description || '',
        remark: row.remark || '',
      });
      isEdit.value = true;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleView = (row) => {
      currentProject.value = row;
      detailVisible.value = true;
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
        const data = { ...form };
        delete data.id;
        if (isEdit.value) {
          await apiService.updateProject(form.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.createProject(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(`确定要删除项目「${row.name}」吗？此操作不可恢复。`, '警告', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteProject(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      try {
        return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
      } catch (e) {
        return dateStr;
      }
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
      resetForm,
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
