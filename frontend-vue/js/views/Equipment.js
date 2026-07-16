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

        <div class="filter-bar">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索品牌/型号/序列号/客户"
            clearable
            style="width:260px;"
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.equipment_type" placeholder="设备类型" clearable style="width:140px;">
            <el-option v-for="t in equipmentTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px;">
            <el-option label="正常" value="normal" />
            <el-option label="故障" value="faulty" />
            <el-option label="报废" value="scrapped" />
          </el-select>

          <el-select v-model="filters.customer_name" placeholder="客户" clearable filterable style="width:180px;">
            <el-option
              v-for="c in customerOptions"
              :key="c.id"
              :label="c.name"
              :value="c.name"
            />
          </el-select>

          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="equipmentList" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="equipment_type" label="设备类型" width="100" show-overflow-tooltip />
          <el-table-column prop="system_type" label="系统类型" width="100" show-overflow-tooltip />
          <el-table-column prop="brand" label="品牌" width="100" show-overflow-tooltip />
          <el-table-column prop="model" label="型号" width="120" show-overflow-tooltip />
          <el-table-column prop="serial_no" label="序列号" width="140" show-overflow-tooltip />
          <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
          <el-table-column prop="location" label="位置" width="120" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="70" align="center" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="install_date" label="安装日期" width="110" />
          <el-table-column label="保修到期" width="110">
            <template #default="{ row }">
              <span :style="{ color: getWarrantyColor(row.warranty_end), fontWeight: getWarrantyColor(row.warranty_end) ? 'bold' : 'normal' }">
                {{ row.warranty_end || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="下次维护" width="110">
            <template #default="{ row }">
              <span :style="{ color: getMaintenanceColor(row.next_maintenance), fontWeight: getMaintenanceColor(row.next_maintenance) ? 'bold' : 'normal' }">
                {{ row.next_maintenance || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" :close-on-click-modal="false">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客户名称" prop="customer_name">
                <el-select v-model="form.customer_name" placeholder="请选择或输入客户" filterable allow-create default-first-option style="width:100%;">
                  <el-option
                    v-for="c in customerOptions"
                    :key="c.id"
                    :label="c.name"
                    :value="c.name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="设备类型" prop="equipment_type">
                <el-select v-model="form.equipment_type" placeholder="请选择设备类型" style="width:100%;">
                  <el-option v-for="t in equipmentTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统类型">
                <el-select v-model="form.system_type" placeholder="请选择系统类型" clearable style="width:100%;">
                  <el-option v-for="t in systemTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="品牌">
                <el-input v-model="form.brand" placeholder="请输入品牌" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="型号">
                <el-input v-model="form.model" placeholder="请输入型号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="序列号">
                <el-input v-model="form.serial_no" placeholder="请输入序列号/设备编号" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="数量">
                <el-input-number v-model="form.quantity" :min="1" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="安装位置">
                <el-input v-model="form.location" placeholder="请输入安装位置" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="安装日期">
                <el-date-picker
                  v-model="form.install_date"
                  type="date"
                  placeholder="选择安装日期"
                  value-format="YYYY-MM-DD"
                  style="width:100%;"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-select v-model="form.status" placeholder="请选择状态" style="width:100%;">
                  <el-option label="正常" value="normal" />
                  <el-option label="故障" value="faulty" />
                  <el-option label="报废" value="scrapped" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="保修开始">
                <el-date-picker
                  v-model="form.warranty_start"
                  type="date"
                  placeholder="选择保修开始日期"
                  value-format="YYYY-MM-DD"
                  style="width:100%;"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="保修结束">
                <el-date-picker
                  v-model="form.warranty_end"
                  type="date"
                  placeholder="选择保修结束日期"
                  value-format="YYYY-MM-DD"
                  style="width:100%;"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contact_name" placeholder="请输入联系人" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="上次维护">
                <el-date-picker
                  v-model="form.last_maintenance"
                  type="date"
                  placeholder="选择上次维护日期"
                  value-format="YYYY-MM-DD"
                  style="width:100%;"
                  @change="calcNextMaintenance"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="下次维护">
                <el-date-picker
                  v-model="form.next_maintenance"
                  type="date"
                  placeholder="选择下次维护日期"
                  value-format="YYYY-MM-DD"
                  style="width:100%;"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="维护周期(天)">
                <el-input-number v-model="form.maintenance_cycle" :min="0" placeholder="如90=3个月一次" style="width:100%;" @change="calcNextMaintenance" />
              </el-form-item>
            </el-col>
            <el-col :span="12"></el-col>
          </el-row>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>

      <el-drawer v-model="detailVisible" title="设备详情" size="600px">
        <div v-if="currentEquipment" style="padding:0 10px;">
          <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">
                {{ currentEquipment.brand ? currentEquipment.brand + ' ' : '' }}{{ currentEquipment.model || currentEquipment.equipment_type }}
              </div>
              <div style="display:flex;gap:12px;align-items:center;">
                <el-tag :type="getStatusType(currentEquipment.status)" size="small">
                  {{ getStatusText(currentEquipment.status) }}
                </el-tag>
                <span style="color:#909399;">{{ currentEquipment.equipment_type }}</span>
                <span v-if="currentEquipment.system_type" style="color:#909399;">| {{ currentEquipment.system_type }}</span>
              </div>
            </div>
          </div>
          <el-descriptions :column="2" border size="small" style="margin-bottom:20px;">
            <el-descriptions-item label="客户名称">{{ currentEquipment.customer_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ currentEquipment.quantity || 1 }}</el-descriptions-item>
            <el-descriptions-item label="品牌">{{ currentEquipment.brand || '-' }}</el-descriptions-item>
            <el-descriptions-item label="型号">{{ currentEquipment.model || '-' }}</el-descriptions-item>
            <el-descriptions-item label="序列号">{{ currentEquipment.serial_no || '-' }}</el-descriptions-item>
            <el-descriptions-item label="安装位置">{{ currentEquipment.location || '-' }}</el-descriptions-item>
            <el-descriptions-item label="安装日期">{{ currentEquipment.install_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="保修到期">
              <span :style="{ color: getWarrantyColor(currentEquipment.warranty_end), fontWeight: getWarrantyColor(currentEquipment.warranty_end) ? 'bold' : 'normal' }">
                {{ currentEquipment.warranty_end || '-' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="联系人">{{ currentEquipment.contact_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ currentEquipment.contact_phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="上次维护">{{ currentEquipment.last_maintenance || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下次维护">
              <span :style="{ color: getMaintenanceColor(currentEquipment.next_maintenance), fontWeight: getMaintenanceColor(currentEquipment.next_maintenance) ? 'bold' : 'normal' }">
                {{ currentEquipment.next_maintenance || '-' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="维护周期">{{ currentEquipment.maintenance_cycle ? currentEquipment.maintenance_cycle + '天' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ currentEquipment.created_at || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="currentEquipment.remark">
            <div style="font-weight:bold;margin-bottom:8px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentEquipment.remark }}
            </div>
          </div>
        </div>
      </el-drawer>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const equipmentList = ref([]);
    const customerOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const currentEquipment = ref(null);
    const formRef = ref(null);

    const equipmentTypeOptions = [
      { label: '监控', value: '监控' },
      { label: '门禁', value: '门禁' },
      { label: '网络', value: '网络' },
      { label: '服务器', value: '服务器' },
      { label: '电脑', value: '电脑' },
      { label: '打印机', value: '打印机' },
      { label: '其他', value: '其他' },
    ];

    const systemTypeOptions = [
      { label: '监控系统', value: '监控系统' },
      { label: '门禁系统', value: '门禁系统' },
      { label: '网络系统', value: '网络系统' },
      { label: '报警系统', value: '报警系统' },
      { label: '楼宇对讲', value: '楼宇对讲' },
      { label: '其他', value: '其他' },
    ];

    const filters = reactive({
      keyword: '',
      equipment_type: '',
      status: '',
      customer_name: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      customer_name: '',
      equipment_type: '',
      system_type: '',
      brand: '',
      model: '',
      serial_no: '',
      quantity: 1,
      install_date: '',
      warranty_start: '',
      warranty_end: '',
      location: '',
      contact_name: '',
      contact_phone: '',
      status: 'normal',
      last_maintenance: '',
      next_maintenance: '',
      maintenance_cycle: null,
      remark: '',
    });

    const rules = {
      customer_name: [{ required: true, message: '请选择或输入客户名称', trigger: 'change' }],
      equipment_type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
      status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    };

    const dialogTitle = computed(() => (isEdit.value ? '编辑设备' : '新增设备'));

    const getStatusText = (status) => {
      const map = { normal: '正常', faulty: '故障', scrapped: '报废' };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = { normal: 'success', faulty: 'danger', scrapped: 'info' };
      return map[status] || 'info';
    };

    const getWarrantyColor = (dateStr) => {
      if (!dateStr) return '';
      const today = dayjs().startOf('day');
      const date = dayjs(dateStr).startOf('day');
      if (date.isBefore(today)) return '#f56c6c';
      if (date.diff(today, 'day') <= 30) return '#e6a23c';
      return '';
    };

    const getMaintenanceColor = (dateStr) => {
      if (!dateStr) return '';
      const today = dayjs().startOf('day');
      const date = dayjs(dateStr).startOf('day');
      if (date.isBefore(today)) return '#f56c6c';
      if (date.diff(today, 'day') <= 7) return '#e6a23c';
      return '';
    };

    const calcNextMaintenance = () => {
      if (form.last_maintenance && form.maintenance_cycle && form.maintenance_cycle > 0) {
        form.next_maintenance = dayjs(form.last_maintenance).add(form.maintenance_cycle, 'day').format('YYYY-MM-DD');
      }
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getEquipments(params)
        .then((res) => {
          const { list, total } = parseListResponse(res);
          equipmentList.value = list;
          pagination.total = total;
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
          const { list } = parseListResponse(res);
          customerOptions.value = list;
        })
        .catch(() => {});
    };

    const handleSearch = () => {
      pagination.page = 1;
      loadData();
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.equipment_type = '';
      filters.status = '';
      filters.customer_name = '';
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
      form.id = null;
      form.customer_name = '';
      form.equipment_type = '';
      form.system_type = '';
      form.brand = '';
      form.model = '';
      form.serial_no = '';
      form.quantity = 1;
      form.install_date = '';
      form.warranty_start = '';
      form.warranty_end = '';
      form.location = '';
      form.contact_name = '';
      form.contact_phone = '';
      form.status = 'normal';
      form.last_maintenance = '';
      form.next_maintenance = '';
      form.maintenance_cycle = null;
      form.remark = '';
    };

    const handleCreate = () => {
      isEdit.value = false;
      resetForm();
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      Object.assign(form, {
        id: row.id,
        customer_name: row.customer_name || '',
        equipment_type: row.equipment_type || '',
        system_type: row.system_type || '',
        brand: row.brand || '',
        model: row.model || '',
        serial_no: row.serial_no || '',
        quantity: row.quantity || 1,
        install_date: row.install_date || '',
        warranty_start: row.warranty_start || '',
        warranty_end: row.warranty_end || '',
        location: row.location || '',
        contact_name: row.contact_name || '',
        contact_phone: row.contact_phone || '',
        status: row.status || 'normal',
        last_maintenance: row.last_maintenance || '',
        next_maintenance: row.next_maintenance || '',
        maintenance_cycle: row.maintenance_cycle || null,
        remark: row.remark || '',
      });
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
      const name = row.brand || row.model || row.equipment_type;
      ElementPlus.ElMessageBox.confirm(
        `确定要删除设备「${name}」吗？`,
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
      equipmentList,
      customerOptions,
      equipmentTypeOptions,
      systemTypeOptions,
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
      getWarrantyColor,
      getMaintenanceColor,
      calcNextMaintenance,
      loadData,
      handleSearch,
      resetFilters,
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
