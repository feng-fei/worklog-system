const MaterialView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">物料库存</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增物料
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
            placeholder="搜索物料名称/型号/品牌"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.category" placeholder="分类" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>

          <el-select v-model="filters.low_stock" placeholder="库存状态" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="库存不足" value="1" />
            <el-option label="库存充足" value="0" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="materials" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="material_no" label="物料编号" width="140" />
          <el-table-column prop="name" label="物料名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="brand" label="品牌" width="100" show-overflow-tooltip />
          <el-table-column prop="model" label="型号" width="120" show-overflow-tooltip />
          <el-table-column prop="spec" label="规格" width="120" show-overflow-tooltip />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column v-if="isAdmin" prop="unit_price" label="单价" width="100" align="right">
            <template #default="{ row }">
              ¥{{ formatMoney(row.unit_price) }}
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="当前库存" width="100" align="right">
            <template #default="{ row }">
              <span :style="{ color: row.is_low_stock ? '#f56c6c' : '#606266', fontWeight: row.is_low_stock ? 'bold' : 'normal' }">
                {{ row.stock }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="min_stock" label="预警阈值" width="100" align="right" />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="warning" size="small" @click="handleAdjust(row)">库存调整</el-button>
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
          <el-form-item label="物料编号" prop="material_no">
            <el-input v-model="form.material_no" placeholder="自动生成或手动输入" />
          </el-form-item>
          <el-form-item label="物料名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入物料名称" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="请输入分类" />
          </el-form-item>
          <el-form-item label="品牌">
            <el-input v-model="form.brand" placeholder="请输入品牌" />
          </el-form-item>
          <el-form-item label="型号">
            <el-input v-model="form.model" placeholder="请输入型号" />
          </el-form-item>
          <el-form-item label="规格">
            <el-input v-model="form.spec" placeholder="请输入规格" />
          </el-form-item>
          <el-form-item label="单位">
            <el-input v-model="form.unit" placeholder="如：个、件、米" />
          </el-form-item>
          <el-form-item label="单价" v-if="isAdmin">
            <el-input-number v-model="form.unit_price" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="当前库存">
            <el-input-number v-model="form.stock" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="预警阈值">
            <el-input-number v-model="form.min_stock" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="供应商" v-if="isAdmin">
            <el-input v-model="form.supplier" placeholder="请输入供应商" />
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

      <el-dialog v-model="adjustDialogVisible" title="库存调整" width="450px">
        <el-form :model="adjustForm" :rules="adjustRules" ref="adjustFormRef" label-width="100px">
          <el-form-item label="物料">
            <span>{{ adjustForm.material_name }}</span>
          </el-form-item>
          <el-form-item label="当前库存">
            <span>{{ adjustForm.current_stock }}</span>
          </el-form-item>
          <el-form-item label="调整类型" prop="adjust_type">
            <el-radio-group v-model="adjustForm.adjust_type">
              <el-radio label="in">入库</el-radio>
              <el-radio label="out">出库</el-radio>
              <el-radio label="adjust">盘点调整</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="调整数量" prop="quantity">
            <el-input-number v-model="adjustForm.quantity" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="调整原因">
            <el-input v-model="adjustForm.remark" type="textarea" :rows="2" placeholder="请输入调整原因" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="adjustDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAdjustSubmit" :loading="adjustSubmitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const loading = ref(false);
    const submitting = ref(false);
    const adjustSubmitting = ref(false);
    const materials = ref([]);
    const categories = ref([]);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新增物料');
    const formRef = ref(null);
    const adjustFormRef = ref(null);
    const isEdit = ref(false);
    const adjustDialogVisible = ref(false);

    const isAdmin = computed(() => appStore.isAdmin.value);

    const filters = reactive({
      keyword: '',
      category: '',
      low_stock: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      material_no: '',
      name: '',
      category: '',
      brand: '',
      model: '',
      spec: '',
      unit: '',
      unit_price: 0,
      stock: 0,
      min_stock: 0,
      supplier: '',
      remark: '',
    });

    const adjustForm = reactive({
      id: null,
      material_name: '',
      current_stock: 0,
      adjust_type: 'in',
      quantity: 0,
      remark: '',
    });

    const rules = {
      name: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
    };

    const adjustRules = {
      adjust_type: [{ required: true, message: '请选择调整类型', trigger: 'change' }],
      quantity: [{ required: true, message: '请输入调整数量', trigger: 'blur' }],
    };

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toFixed(2);
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
        if (filters.category) params.category = filters.category;
        if (filters.low_stock === '1') params.low_stock_only = 'true';
        const res = await apiService.getMaterials(params);
        const { list, total } = parseListResponse(res);
        materials.value = list;
        pagination.total = total;
        if (pagination.page === 1) {
          const allRes = await apiService.getMaterials({ per_page: 1000 });
          const { list: allList } = parseListResponse(allRes);
          const catSet = new Set(allList.map(m => m.category).filter(Boolean));
          categories.value = Array.from(catSet);
        }
      } catch (e) {
        ElMessage.error('加载物料列表失败');
      } finally {
        loading.value = false;
      }
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.category = '';
      filters.low_stock = '';
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
      dialogTitle.value = '新增物料';
      Object.assign(form, {
        id: null,
        material_no: '',
        name: '',
        category: '',
        brand: '',
        model: '',
        spec: '',
        unit: '',
        unit_price: 0,
        stock: 0,
        min_stock: 0,
        supplier: '',
        remark: '',
      });
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      dialogTitle.value = '编辑物料';
      Object.assign(form, { ...row });
      dialogVisible.value = true;
    };

    const handleView = (row) => {
      ElMessage.info('查看物料: ' + row.name);
    };

    const handleAdjust = (row) => {
      Object.assign(adjustForm, {
        id: row.id,
        material_name: row.name,
        current_stock: row.stock,
        adjust_type: 'in',
        quantity: 0,
        remark: '',
      });
      adjustDialogVisible.value = true;
    };

    const handleDelete = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除物料"${row.name}"吗？删除前请确保该物料没有关联库存流水和工单用料。`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deleteMaterial(row.id);
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
          await apiService.updateMaterial(form.id, form);
          ElMessage.success('更新成功');
        } else {
          await apiService.createMaterial(form);
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

    const handleAdjustSubmit = async () => {
      if (!adjustFormRef.value) return;
      try {
        await adjustFormRef.value.validate();
      } catch (e) {
        return;
      }
      adjustSubmitting.value = true;
      try {
        await apiService.adjustMaterialStock(adjustForm.id, adjustForm);
        ElMessage.success('调整成功');
        adjustDialogVisible.value = false;
        loadData();
      } catch (e) {
        console.error('调整失败', e);
      } finally {
        adjustSubmitting.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      submitting,
      adjustSubmitting,
      materials,
      categories,
      isAdmin,
      filters,
      pagination,
      dialogVisible,
      dialogTitle,
      formRef,
      adjustFormRef,
      adjustDialogVisible,
      form,
      adjustForm,
      rules,
      adjustRules,
      formatMoney,
      formatDateTime,
      loadData,
      resetFilters,
      handlePageChange,
      handleSizeChange,
      handleCreate,
      handleEdit,
      handleView,
      handleAdjust,
      handleDelete,
      handleSubmit,
      handleAdjustSubmit,
    };
  },
};

window.MaterialView = MaterialView;
