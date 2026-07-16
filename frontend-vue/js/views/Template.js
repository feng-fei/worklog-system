const TemplateView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">工单模板</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增模板
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
            placeholder="搜索模板名称"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.record_type" placeholder="工单类型" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="施工工单" value="construction" />
            <el-option label="维修工单" value="maintenance" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="templates" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="name" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="record_type" label="工单类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.record_type === 'construction' ? 'primary' : 'success'" size="small">
                {{ row.record_type === 'construction' ? '施工工单' : '维修工单' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />
          <el-table-column label="默认费用" width="120">
            <template #default="{ row }">
              ¥{{ (row.default_fee || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="created_by" label="创建人" width="100" />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="success" size="small" @click="handleApply(row)">应用</el-button>
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="模板名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入模板名称" />
          </el-form-item>
          <el-form-item label="工单类型" prop="record_type">
            <el-select v-model="form.record_type" placeholder="请选择类型" style="width:100%;">
              <el-option label="施工工单" value="construction" />
              <el-option label="维修工单" value="maintenance" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="请输入分类" />
          </el-form-item>
          <el-form-item label="默认费用">
            <el-input-number v-model="form.default_fee" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="默认内容">
            <el-input v-model="form.default_content" type="textarea" :rows="4" placeholder="请输入默认内容" />
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

      <el-drawer v-model="detailVisible" title="模板详情" size="500px">
        <div v-if="currentTemplate" style="padding:0 10px;">
          <div style="margin-bottom:20px;">
            <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">{{ currentTemplate.name }}</div>
            <div style="display:flex;gap:20px;">
              <el-tag :type="currentTemplate.record_type === 'construction' ? 'primary' : 'success'" size="small">
                {{ currentTemplate.record_type === 'construction' ? '施工工单' : '维修工单' }}
              </el-tag>
              <span style="color:#909399;">分类：{{ currentTemplate.category || '-' }}</span>
            </div>
          </div>
          <el-descriptions :column="2" border size="small" style="margin-bottom:20px;">
            <el-descriptions-item label="默认费用">¥{{ (currentTemplate.default_fee || 0).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ currentTemplate.created_by || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">
              {{ formatDateTime(currentTemplate.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
          <div style="margin-bottom:20px;">
            <div style="font-weight:bold;margin-bottom:8px;">默认内容</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentTemplate.default_content || '暂无内容' }}
            </div>
          </div>
          <div>
            <div style="font-weight:bold;margin-bottom:8px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentTemplate.remark || '暂无备注' }}
            </div>
          </div>
        </div>
      </el-drawer>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const templates = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const currentTemplate = ref(null);
    const formRef = ref(null);

    const filters = reactive({
      keyword: '',
      record_type: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      name: '',
      record_type: 'construction',
      category: '',
      default_fee: 0,
      default_content: '',
      remark: '',
    });

    const rules = {
      name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
      record_type: [{ required: true, message: '请选择工单类型', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin);
    const dialogTitle = computed(() => (isEdit.value ? '编辑模板' : '新增模板'));

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getWorkTemplates(params)
        .then((res) => {
          templates.value = res.items || res.data || [];
          pagination.total = res.total || 0;
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载模板列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.record_type = '';
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
      form.record_type = 'construction';
      form.category = '';
      form.default_fee = 0;
      form.default_content = '';
      form.remark = '';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.name = row.name;
      form.record_type = row.record_type;
      form.category = row.category || '';
      form.default_fee = row.default_fee || 0;
      form.default_content = row.default_content || '';
      form.remark = row.remark || '';
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      currentTemplate.value = row;
      detailVisible.value = true;
    };

    const handleApply = (row) => {
      ElementPlus.ElMessage.info('应用模板功能请在新建工单时使用');
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = { ...form };

        const request = isEdit.value
          ? apiService.updateWorkTemplate(form.id, data)
          : apiService.createWorkTemplate(data);

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
        `确定要删除模板「${row.name}」吗？`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteWorkTemplate(row.id);
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
    });

    return {
      templates,
      loading,
      submitting,
      dialogVisible,
      detailVisible,
      isEdit,
      currentTemplate,
      formRef,
      filters,
      pagination,
      form,
      rules,
      isAdmin,
      dialogTitle,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleView,
      handleApply,
      handleSubmit,
      handleDelete,
      formatDateTime,
    };
  },
};

window.TemplateView = TemplateView;
