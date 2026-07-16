const CustomerView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
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
            placeholder="搜索客户名称/简称/联系人/税号"
            clearable
            style="width:280px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="filteredCustomers" v-loading="loading" stripe>
          <el-table-column prop="name" label="客户名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="short_name" label="简称" width="120" show-overflow-tooltip />
          <el-table-column prop="full_name" label="全称" width="180" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" width="100" />
          <el-table-column prop="phone" label="联系电话" width="140" />
          <el-table-column prop="credit_code" label="税号/信用代码" width="180" show-overflow-tooltip />
          <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
          <el-form-item label="客户名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入客户全称" />
          </el-form-item>
          <el-form-item label="客户简称">
            <el-input v-model="form.short_name" placeholder="用于工单快速选择" />
          </el-form-item>
          <el-form-item label="客户全称">
            <el-input v-model="form.full_name" placeholder="请输入客户全称（公司全称等）" />
          </el-form-item>
          <el-form-item label="联系人" prop="contact_name">
            <el-input v-model="form.contact_name" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="税号/信用代码">
            <el-input v-model="form.credit_code" placeholder="请输入税号或统一社会信用代码" />
          </el-form-item>
          <el-form-item label="地址">
            <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入客户地址" />
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
    const { ref, reactive, computed, onMounted, nextTick } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const loading = ref(false);
    const submitting = ref(false);
    const customerList = ref([]);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新增客户');
    const formRef = ref(null);
    const isEdit = ref(false);

    const filters = reactive({
      keyword: '',
    });

    const filteredCustomers = computed(() => {
      if (!filters.keyword) return customerList.value;
      const kw = filters.keyword.toLowerCase();
      return customerList.value.filter(c =>
        (c.name || '').toLowerCase().includes(kw) ||
        (c.short_name || '').toLowerCase().includes(kw) ||
        (c.full_name || '').toLowerCase().includes(kw) ||
        (c.contact_name || '').toLowerCase().includes(kw) ||
        (c.phone || '').includes(kw) ||
        (c.credit_code || '').includes(kw)
      );
    });

    const defaultForm = () => ({
      id: null,
      name: '',
      short_name: '',
      full_name: '',
      contact_name: '',
      phone: '',
      credit_code: '',
      address: '',
      remark: '',
    });

    const form = reactive(defaultForm());

    const rules = {
      name: [
        { required: true, message: '请输入客户名称', trigger: 'blur' },
        { min: 1, max: 100, message: '客户名称长度1-100个字符', trigger: 'blur' },
      ],
      contact_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
      phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
    };

    const formatDateTime = (date) => {
      if (!date) return '-';
      try {
        return dayjs(date).format('YYYY-MM-DD HH:mm');
      } catch (e) {
        return date;
      }
    };

    const loadData = () => {
      loading.value = true;
      const params = {};
      if (filters.keyword) params.q = filters.keyword;
      apiService.getCustomers(params)
        .then((res) => {
          const { list } = parseListResponse(res);
          customerList.value = list;
        })
        .catch(() => {
          ElMessage.error('加载客户列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
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
      dialogTitle.value = '新增客户';
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        name: row.name || '',
        short_name: row.short_name || '',
        full_name: row.full_name || '',
        contact_name: row.contact_name || '',
        phone: row.phone || '',
        credit_code: row.credit_code || '',
        address: row.address || '',
        remark: row.remark || '',
      });
      isEdit.value = true;
      dialogTitle.value = '编辑客户';
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(`确定删除客户「${row.name}」吗？删除前请确保该客户没有关联工单、待办或项目。`, '提示', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
        .then(async () => {
          try {
            await apiService.deleteCustomer(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
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
        const data = {
          name: form.name,
          short_name: form.short_name,
          full_name: form.full_name,
          contact_name: form.contact_name,
          phone: form.phone,
          credit_code: form.credit_code,
          address: form.address,
          remark: form.remark,
        };
        if (isEdit.value) {
          await apiService.updateCustomer(form.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.createCustomer(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
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
      customerList,
      filteredCustomers,
      dialogVisible,
      dialogTitle,
      formRef,
      isEdit,
      filters,
      form,
      rules,
      formatDateTime,
      loadData,
      resetFilters,
      resetForm,
      handleCreate,
      handleEdit,
      handleDelete,
      handleSubmit,
    };
  },
};

window.CustomerView = CustomerView;
