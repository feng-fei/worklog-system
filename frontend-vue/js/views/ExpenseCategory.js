const ExpenseCategoryView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">支出分类管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增分类
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <el-table :data="categories" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="name" label="分类名称" min-width="200" />
          <el-table-column prop="sort_order" label="排序" width="100" />
          <el-table-column prop="created_at" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="分类名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入分类名称" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort_order" :min="0" style="width:100%;" />
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
    const { ref, reactive, computed, onMounted } = Vue;

    const categories = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);

    const form = reactive({
      id: null,
      name: '',
      sort_order: 0,
    });

    const rules = {
      name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
    };

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑分类' : '新增分类'));

    const loadData = () => {
      loading.value = true;
      apiService.getExpenseCategories()
        .then((res) => {
          let data = [];
          if (res) {
            if (res.records) data = res.records;
            else if (Array.isArray(res)) data = res;
          }
          categories.value = Array.isArray(data) ? data : [];
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载分类列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const handleCreate = () => {
      isEdit.value = false;
      form.id = null;
      form.name = '';
      form.sort_order = 0;
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.name = row.name;
      form.sort_order = row.sort_order || 0;
      dialogVisible.value = true;
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = { name: form.name, sort_order: form.sort_order };

        const request = isEdit.value
          ? apiService.updateExpenseCategory(form.id, data)
          : apiService.createExpenseCategory(data);

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
        `确定要删除分类「${row.name}」吗？`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteExpenseCategory(row.id);
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
      categories,
      loading,
      submitting,
      dialogVisible,
      isEdit,
      formRef,
      form,
      rules,
      isAdmin,
      dialogTitle,
      loadData,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleDelete,
      formatDateTime,
    };
  },
};

window.ExpenseCategoryView = ExpenseCategoryView;
