const CustomerView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">客户管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增客户
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
            placeholder="搜索客户名称/联系人/电话"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="customers" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="name" label="客户名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="short_name" label="简称" width="120" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" width="100" />
          <el-table-column prop="contact_phone" label="联系电话" width="140" />
          <el-table-column prop="tax_number" label="税号" width="180" show-overflow-tooltip />
          <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="客户名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入客户名称" />
          </el-form-item>
          <el-form-item label="客户简称">
            <el-input v-model="form.short_name" placeholder="请输入客户简称" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="form.contact_name" placeholder="请输入联系人" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="税号">
            <el-input v-model="form.tax_number" placeholder="请输入税号" />
          </el-form-item>
          <el-form-item label="地址">
            <el-input v-model="form.address" type="textarea" :rows="3" placeholder="请输入地址" />
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
    </div>
  `,
  setup() {
    const { ref, reactive, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const loading = ref(false);
    const submitting = ref(false);
    const customers = ref([]);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新增客户');
    const formRef = ref(null);
    const isEdit = ref(false);

    const filters = reactive({
      keyword: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      name: '',
      short_name: '',
      contact_name: '',
      contact_phone: '',
      tax_number: '',
      address: '',
      remark: '',
    });

    const rules = {
      name: [
        { required: true, message: '请输入客户名称', trigger: 'blur' },
        { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
      ],
      short_name: Validators.length(0, 50, '简称不超过 50 个字符'),
      contact_name: Validators.length(0, 50, '联系人不超过 50 个字符'),
      contact_phone: Validators.phone(false),
      email: Validators.email(false),
      credit_code: Validators.length(0, 50, '统一社会信用代码不超过 50 个字符')
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
        const res = await apiService.getCustomers(params);
        const data = res && res.records ? res.records : [];
        customers.value = Array.isArray(data) ? data : [];
        pagination.total = (res && res.total) || 0;
      } catch (e) {
        console.error('加载客户列表失败', e);
      } finally {
        loading.value = false;
      }
    };

    const resetFilters = () => {
      filters.keyword = '';
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
      isEdit.value = false;
      dialogTitle.value = '新增客户';
      Object.assign(form, {
        id: null,
        name: '',
        short_name: '',
        contact_name: '',
        contact_phone: '',
        tax_number: '',
        address: '',
        remark: '',
      });
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑客户';
      Object.assign(form, { ...row });
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      ElMessage.info('查看客户: ' + row.name);
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除客户"${row.name}"吗？删除前请确保该客户没有关联工单、待办、项目等数据。`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deleteCustomer(row.id);
        ElMessage.success('删除成功');
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
          await apiService.updateCustomer(form.id, form);
          ElMessage.success('更新成功');
        } else {
          await apiService.createCustomer(form);
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
      customers,
      filters,
      pagination,
      dialogVisible,
      dialogTitle,
      formRef,
      form,
      rules,
      formatDateTime,
      loadData,
      resetFilters,
      handlePageChange,
      handleSizeChange,
      handleCreate,
      handleEdit,
      handleView,
      handleDelete,
      handleSubmit,
    };
  },
};

window.CustomerView = CustomerView;
