// =============================================
// EquipmentView.js - 客户设备管理（基础版）
// =============================================

const EquipmentView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">客户设备管理</div>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon> 新增设备
          </el-button>
        </div>

        <el-table :data="equipments" v-loading="loading" stripe>
          <el-table-column prop="customer_name" label="客户名称" />
          <el-table-column prop="device_name" label="设备名称" />
          <el-table-column prop="model" label="型号" />
          <el-table-column prop="serial_no" label="序列号" />
          <el-table-column prop="install_date" label="安装日期" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 新增/编辑弹窗 -->
      <el-dialog v-model="showCreateDialog" :title="isEdit ? '编辑设备' : '新增设备'" width="500px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="客户">
            <el-select v-model="form.customer_name" filterable placeholder="请选择客户">
              <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="设备名称">
            <el-input v-model="form.device_name" />
          </el-form-item>
          <el-form-item label="型号">
            <el-input v-model="form.model" />
          </el-form-item>
          <el-form-item label="序列号">
            <el-input v-model="form.serial_no" />
          </el-form-item>
          <el-form-item label="安装日期">
            <el-date-picker v-model="form.install_date" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,

  setup() {
    const { ref, reactive, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const equipments = ref([]);
    const loading = ref(false);
    const showCreateDialog = ref(false);
    const isEdit = ref(false);
    const submitting = ref(false);

    const form = reactive({
      id: null,
      customer_name: null,
      device_name: '',
      model: '',
      serial_no: '',
      install_date: ''
    });

    const customers = ref([]);

    const loadData = async () => {
      loading.value = true;
      try {
        const res = await apiService.getEquipments?.() || { data: [] };
        equipments.value = res.records || [];
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const loadCustomers = async () => {
      try {
        const res = await apiService.getCustomers({ per_page: 1000 });
        customers.value = res.records || [];
      } catch (e) {}
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      Object.assign(form, row);
      showCreateDialog.value = true;
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm('确定删除该设备吗？', '提示', { type: 'warning' });
        await apiService.deleteEquipment?.(row.id);
        ElMessage.success('删除成功');
        loadData();
      } catch (e) {}
    };

    const handleSubmit = async () => {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await apiService.updateEquipment?.(form.id, form);
        } else {
          await apiService.createEquipment?.(form);
        }
        ElMessage.success(isEdit.value ? '更新成功' : '创建成功');
        showCreateDialog.value = false;
        resetForm();
        loadData();
      } catch (e) {
        ElMessage.error('操作失败');
      } finally {
        submitting.value = false;
      }
    };

    const resetForm = () => {
      isEdit.value = false;
      Object.assign(form, {
        id: null, customer_name: null, device_name: '', model: '', serial_no: '', install_date: ''
      });
    };

    onMounted(() => {
      loadData();
      loadCustomers();
    });

    return {
      equipments,
      loading,
      showCreateDialog,
      isEdit,
      submitting,
      form,
      customers,
      handleEdit,
      handleDelete,
      handleSubmit
    };
  }
};

window.EquipmentView = EquipmentView;
EquipmentView;