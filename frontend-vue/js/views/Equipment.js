const EquipmentView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">客户设备管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增设备
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="设备列表" name="equipment" />
          <el-tab-pane label="巡检计划" name="inspection" />
        </el-tabs>

        <div v-if="activeTab === 'equipment'">
          <div class="filter-bar">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索设备名称/型号"
              clearable
              style="width:240px;"
              @keyup.enter="loadData"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>

            <el-select v-model="filters.customer_name" placeholder="客户" clearable filterable style="width:160px;">
              <el-option
                v-for="c in customerOptions"
                :key="c.id"
                :label="c.name"
                :value="c.name"
              />
            </el-select>

            <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
              <el-option label="全部" value="" />
              <el-option label="正常" value="normal" />
              <el-option label="故障" value="faulty" />
              <el-option label="报废" value="scrapped" />
            </el-select>

            <el-button type="primary" @click="loadData">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>

          <el-table :data="equipmentList" style="width:100%;" v-loading="loading" stripe>
            <el-table-column prop="equipment_type" label="设备名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="model" label="型号" width="140" show-overflow-tooltip />
            <el-table-column prop="customer_name" label="客户" width="140" show-overflow-tooltip />
            <el-table-column prop="serial_no" label="序列号" width="140" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="install_date" label="安装日期" width="120" />
            <el-table-column prop="last_maintenance" label="上次维护" width="120" />
            <el-table-column prop="next_maintenance" label="下次维护" width="120">
              <template #default="{ row }">
                <span :style="{ color: isOverdue(row.next_maintenance) ? '#f56c6c' : '' }">
                  {{ row.next_maintenance || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
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

        <div v-else>
          <div style="padding:40px;text-align:center;color:#909399;">
            <el-icon style="font-size:48px;margin-bottom:16px;"><Setting /></el-icon>
            <div>巡检计划功能开发中...</div>
          </div>
        </div>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="设备名称" prop="equipment_type">
            <el-input v-model="form.equipment_type" placeholder="请输入设备名称" />
          </el-form-item>
          <el-form-item label="客户" prop="customer_name">
            <el-select v-model="form.customer_select_id" placeholder="请选择客户" filterable style="width:100%;">
              <el-option
                v-for="c in customerOptions"
                :key="c.id"
                :label="c.name"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="设备型号">
            <el-input v-model="form.model" placeholder="请输入设备型号" />
          </el-form-item>
          <el-form-item label="序列号">
            <el-input v-model="form.serial_no" placeholder="请输入序列号" />
          </el-form-item>
          <el-form-item label="设备状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择状态" style="width:100%;">
              <el-option label="正常" value="normal" />
              <el-option label="故障" value="faulty" />
              <el-option label="报废" value="scrapped" />
            </el-select>
          </el-form-item>
          <el-form-item label="安装日期">
            <el-date-picker
              v-model="form.install_date"
              type="date"
              placeholder="选择安装日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="维护周期(天)">
            <el-input-number v-model="form.maintenance_cycle" :min="0" style="width:100%;" />
          </el-form-item>
          <el-form-item label="上次维护日期">
            <el-date-picker
              v-model="form.last_maintenance"
              type="date"
              placeholder="选择上次维护日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="下次维护日期">
            <el-date-picker
              v-model="form.next_maintenance"
              type="date"
              placeholder="选择下次维护日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="设备位置">
            <el-input v-model="form.location" placeholder="请输入设备位置" />
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

      <el-drawer v-model="detailVisible" title="设备详情" size="500px">
        <div v-if="currentEquipment" style="padding:0 10px;">
          <div style="margin-bottom:20px;">
            <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">{{ currentEquipment.equipment_type }}</div>
            <div style="display:flex;gap:12px;align-items:center;">
              <el-tag :type="getStatusType(currentEquipment.status)" size="small">
                {{ getStatusText(currentEquipment.status) }}
              </el-tag>
              <span style="color:#909399;">型号：{{ currentEquipment.model || '-' }}</span>
            </div>
          </div>
          <el-descriptions :column="2" border size="small" style="margin-bottom:20px;">
            <el-descriptions-item label="客户">{{ currentEquipment.customer_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ currentEquipment.serial_no || '-' }}</el-descriptions-item>
            <el-descriptions-item label="安装日期">{{ currentEquipment.install_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="设备位置">{{ currentEquipment.location || '-' }}</el-descriptions-item>
            <el-descriptions-item label="上次维护">{{ currentEquipment.last_maintenance || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下次维护">
              <span :style="{ color: isOverdue(currentEquipment.next_maintenance) ? '#f56c6c' : '' }">
                {{ currentEquipment.next_maintenance || '-' }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
          <div>
            <div style="font-weight:bold;margin-bottom:8px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentEquipment.remark || '暂无备注' }}
            </div>
          </div>
        </div>
      </el-drawer>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const activeTab = ref('equipment');
    const equipmentList = ref([]);
    const customerOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const currentEquipment = ref(null);
    const formRef = ref(null);

    const filters = reactive({
      keyword: '',
      customer_name: '',
      status: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      equipment_type: '',
      customer_name: '',
      customer_select_id: null,
      model: '',
      serial_no: '',
      status: 'normal',
      install_date: '',
      maintenance_cycle: 90,
      last_maintenance: '',
      next_maintenance: '',
      location: '',
      remark: '',
    });

    const rules = {
      equipment_type: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
      customer_name: [{ required: true, message: '请选择客户', trigger: 'change' }],
      status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    };

    const dialogTitle = computed(() => (isEdit.value ? '编辑设备' : '新增设备'));

    const getStatusText = (status) => {
      const map = {
        normal: '正常',
        faulty: '故障',
        scrapped: '报废',
      };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = {
        normal: 'success',
        faulty: 'danger',
        scrapped: 'info',
      };
      return map[status] || 'info';
    };

    const isOverdue = (dateStr) => {
      if (!dateStr) return false;
      return dayjs(dateStr).isBefore(dayjs(), 'day');
    };

    const loadData = () => {
      if (activeTab.value !== 'equipment') return;
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getEquipments(params)
        .then((res) => {
          const data = res && res.records ? res.records : [];
          equipmentList.value = Array.isArray(data) ? data : [];
          pagination.total = (res && res.total) || 0;
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载设备列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadCustomers = () => {
      apiService.getCustomers({ per_page: 1000 })
        .then((res) => {
          const data = res && res.records ? res.records : [];
          customerOptions.value = Array.isArray(data) ? data : [];
        })
        .catch(() => {});
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.customer_name = '';
      filters.status = '';
      pagination.page = 1;
      loadData();
    };

    const handleTabChange = () => {
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
      form.equipment_type = '';
      form.customer_name = '';
      form.customer_select_id = null;
      form.model = '';
      form.serial_no = '';
      form.status = 'normal';
      form.install_date = '';
      form.maintenance_cycle = 90;
      form.last_maintenance = '';
      form.next_maintenance = '';
      form.location = '';
      form.remark = '';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.equipment_type = row.equipment_type;
      form.customer_name = row.customer_name;
      const customer = customerOptions.value.find(c => c.name === row.customer_name);
      form.customer_select_id = customer ? customer.id : null;
      form.model = row.model || '';
      form.serial_no = row.serial_no || '';
      form.status = row.status;
      form.install_date = row.install_date || '';
      form.maintenance_cycle = row.maintenance_cycle || 90;
      form.last_maintenance = row.last_maintenance || '';
      form.next_maintenance = row.next_maintenance || '';
      form.location = row.location || '';
      form.remark = row.remark || '';
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      currentEquipment.value = row;
      detailVisible.value = true;
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = { ...form };
        if (data.customer_select_id) {
          const customer = customerOptions.value.find(c => c.id === data.customer_select_id);
          if (customer) {
            data.customer_name = customer.name;
          }
        }
        delete data.customer_select_id;

        const request = isEdit.value
          ? apiService.updateEquipment(form.id, data)
          : apiService.createEquipment(data);

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
        `确定要删除设备「${row.equipment_type}」吗？`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteEquipment(row.id);
        })
        .then(() => {
          ElementPlus.ElMessage.success('删除成功');
          loadData();
        })
        .catch(() => {});
    };

    onMounted(() => {
      loadData();
      loadCustomers();
    });

    return {
      activeTab,
      equipmentList,
      customerOptions,
      loading,
      submitting,
      dialogVisible,
      detailVisible,
      isEdit,
      currentEquipment,
      formRef,
      filters,
      pagination,
      form,
      rules,
      dialogTitle,
      getStatusText,
      getStatusType,
      isOverdue,
      loadData,
      resetFilters,
      handleTabChange,
      handleSizeChange,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleView,
      handleSubmit,
      handleDelete,
    };
  },
};

window.EquipmentView = EquipmentView;