// =============================================
// TemplateManage.js - 工单模板管理（CRUD）
// =============================================

const TemplateManage = {
  template: `
    <div class="page-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
        <div class="section-title" style="margin:0;">工单模板管理</div>
        <el-button type="primary" @click="handleCreate">新增模板</el-button>
      </div>

      <el-table :data="templates" v-loading="loading">
        <el-table-column prop="name" label="模板名称" />
        <el-table-column prop="record_type" label="适用类型" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新增模板'" width="600px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="模板名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="适用类型">
            <el-select v-model="form.record_type">
              <el-option label="维修工单" value="maintenance" />
              <el-option label="施工工单" value="construction" />
            </el-select>
          </el-form-item>
          <el-form-item label="默认内容">
            <el-input v-model="form.default_content" type="textarea" :rows="6" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
        </template>
      </el-dialog>
    </div>
  `,

  setup() {
    const { ref, reactive, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const templates = ref([]);
    const loading = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const submitting = ref(false);

    const form = reactive({
      id: null,
      name: '',
      record_type: 'maintenance',
      default_content: '',
      description: ''
    });

    const loadData = async () => {
      loading.value = true;
      try {
        const res = await apiService.getWorkTemplates({ per_page: 100 }) || { data: [] };
        templates.value = res.records || [];
      } catch (e) {}
      finally { loading.value = false; }
    };

    const handleCreate = () => {
      resetForm();
      isEdit.value = false;
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      Object.assign(form, row);
      dialogVisible.value = true;
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm('确定删除该模板吗？', '提示', { type: 'warning' });
        await apiService.deleteWorkTemplate(row.id);
        ElMessage.success('删除成功');
        loadData();
      } catch (e) {}
    };

    const handleSubmit = async () => {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await apiService.updateWorkTemplate(form.id, form);
        } else {
          await apiService.createWorkTemplate(form);
        }
        ElMessage.success('保存成功');
        dialogVisible.value = false;
        loadData();
      } catch (e) {
        ElMessage.error('保存失败');
      } finally {
        submitting.value = false;
      }
    };

    const resetForm = () => {
      Object.assign(form, {
        id: null, name: '', record_type: 'maintenance', default_content: '', description: ''
      });
    };

    onMounted(() => {
      loadData();
    });

    return {
      templates,
      loading,
      dialogVisible,
      isEdit,
      submitting,
      form,
      handleCreate,
      handleEdit,
      handleDelete,
      handleSubmit
    };
  }
};

window.TemplateManage = TemplateManage;
TemplateManage;