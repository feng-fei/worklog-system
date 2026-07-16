const TemplateView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
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
            @keyup.enter="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.template_type" placeholder="模板类型" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="故障模板" value="fault" />
            <el-option label="工作模板" value="work" />
          </el-select>

          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="templateList" v-loading="loading" stripe>
          <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="template_type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.template_type === 'fault' ? 'danger' : 'primary'" size="small">
                {{ row.template_type === 'fault' ? '故障' : '工作' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="90">
            <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
          </el-table-column>
          <el-table-column prop="work_subtype" label="子类型" width="100">
            <template #default="{ row }">{{ subtypeLabel(row.work_subtype) }}</template>
          </el-table-column>
          <el-table-column label="人工费" width="90" align="right">
            <template #default="{ row }">¥{{ (row.labor_fee || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="材料费" width="90" align="right">
            <template #default="{ row }">¥{{ (row.material_fee || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="交通费" width="90" align="right">
            <template #default="{ row }">¥{{ (row.transport_fee || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="其他费" width="90" align="right">
            <template #default="{ row }">¥{{ (row.other_fee || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="合计" width="100" align="right">
            <template #default="{ row }">
              <span style="font-weight:bold;color:#409eff;">¥{{ calcTotal(row).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公开" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_public ? 'success' : 'info'" size="small">
                {{ row.is_public ? '公开' : '私有' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入模板名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模板类型" prop="template_type">
                <el-select v-model="form.template_type" placeholder="请选择类型" style="width:100%;">
                  <el-option label="故障模板" value="fault" />
                  <el-option label="工作模板" value="work" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="分类">
                <el-select v-model="form.category" placeholder="请选择分类" clearable style="width:100%;">
                  <el-option label="设备" value="设备" />
                  <el-option label="系统" value="系统" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="子类型">
                <el-select v-model="form.work_subtype" placeholder="请选择子类型" clearable style="width:100%;">
                  <el-option label="弱电" value="弱电" />
                  <el-option label="智能化" value="智能化" />
                  <el-option label="安防" value="安防" />
                  <el-option label="综合布线" value="综合布线" />
                  <el-option label="监控" value="监控" />
                  <el-option label="门禁" value="门禁" />
                  <el-option label="网络" value="网络" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="优先级">
                <el-select v-model="form.priority" placeholder="请选择优先级" style="width:100%;">
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="人工费(元)">
                <el-input-number v-model="form.labor_fee" :min="0" :precision="2" :step="10" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="材料费(元)">
                <el-input-number v-model="form.material_fee" :min="0" :precision="2" :step="10" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="交通费(元)">
                <el-input-number v-model="form.transport_fee" :min="0" :precision="2" :step="10" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="其他费(元)">
                <el-input-number v-model="form.other_fee" :min="0" :precision="2" :step="10" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="含税">
                <el-switch v-model="form.tax_type" active-value="tax" inactive-value="no" active-text="是" inactive-text="否" />
                <span v-if="form.tax_type === 'tax'" style="margin-left:16px;color:#409eff;">小计: ¥{{ formSubtotal.toFixed(2) }}</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20" v-if="form.tax_type === 'tax'">
            <el-col :span="12">
              <el-form-item label="税率(%)">
                <el-input-number v-model="form.tax_rate_percent" :min="0" :max="100" :precision="2" :step="1" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="价税合计">
                <div style="padding-top:6px;font-weight:bold;color:#f56c6c;font-size:15px;">¥{{ formTotalWithTax.toFixed(2) }}</div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="常用人员">
                <el-select
                  v-model="form.staff_names_arr"
                  multiple
                  filterable
                  placeholder="请选择常用施工人员"
                  style="width:100%;"
                >
                  <el-option
                    v-for="s in staffOptions"
                    :key="s.id"
                    :label="s.name"
                    :value="s.name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否公开">
                <el-switch v-model="form.is_public" active-text="公开" inactive-text="私有" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">
            {{ form.template_type === 'fault' ? '故障信息' : '施工内容' }}
          </el-divider>

          <el-form-item :label="form.template_type === 'fault' ? '工作内容' : '施工内容'" prop="work_content">
            <el-input v-model="form.work_content" type="textarea" :rows="4" :placeholder="form.template_type === 'fault' ? '请输入工作内容' : '请输入施工内容'" />
          </el-form-item>

          <template v-if="form.template_type === 'fault'">
            <el-form-item label="故障描述">
              <el-input v-model="form.fault_description" type="textarea" :rows="3" placeholder="请输入故障描述" />
            </el-form-item>
            <el-form-item label="故障诊断">
              <el-input v-model="form.fault_diagnosis" type="textarea" :rows="3" placeholder="请输入故障诊断" />
            </el-form-item>
            <el-form-item label="维修过程">
              <el-input v-model="form.repair_process" type="textarea" :rows="3" placeholder="请输入维修过程" />
            </el-form-item>
            <el-form-item label="维修结果">
              <el-input v-model="form.repair_result" type="textarea" :rows="3" placeholder="请输入维修结果" />
            </el-form-item>
          </template>

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

    const templateList = ref([]);
    const staffOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);

    const filters = reactive({
      keyword: '',
      template_type: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const defaultForm = () => ({
      id: null,
      name: '',
      template_type: 'work',
      category: '',
      work_subtype: '',
      work_content: '',
      fault_description: '',
      fault_diagnosis: '',
      repair_process: '',
      repair_result: '',
      labor_fee: 0,
      material_fee: 0,
      transport_fee: 0,
      other_fee: 0,
      tax_type: 'no',
      tax_rate: 0,
      tax_rate_percent: 0,
      priority: 'medium',
      staff_names: '',
      staff_names_arr: [],
      remark: '',
      is_public: false,
    });

    const form = reactive(defaultForm());

    const rules = computed(() => ({
      name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
      template_type: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
      work_content: [{ required: true, message: form.template_type === 'fault' ? '请输入工作内容' : '请输入施工内容', trigger: 'blur' }],
    }));

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑模板' : '新增模板'));

    const formSubtotal = computed(() => {
      return Number(form.labor_fee || 0)
        + Number(form.material_fee || 0)
        + Number(form.transport_fee || 0)
        + Number(form.other_fee || 0);
    });

    const formTotalWithTax = computed(() => {
      const subtotal = formSubtotal.value;
      if (form.tax_type === 'tax' && form.tax_rate_percent > 0) {
        return subtotal * (1 + form.tax_rate_percent / 100);
      }
      return subtotal;
    });

    const categoryLabel = (val) => {
      const map = { '设备': '设备', '系统': '系统', '其他': '其他' };
      return map[val] || val || '-';
    };

    const subtypeLabel = (val) => {
      const list = ['弱电', '智能化', '安防', '综合布线', '监控', '门禁', '网络', '其他'];
      return list.includes(val) ? val : (val || '-');
    };

    const calcTotal = (row) => {
      const sub = Number(row.labor_fee || 0)
        + Number(row.material_fee || 0)
        + Number(row.transport_fee || 0)
        + Number(row.other_fee || 0);
      if (row.tax_type === 'tax' && row.tax_rate > 0) {
        return sub * (1 + Number(row.tax_rate));
      }
      return sub;
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
    };

    const loadStaffOptions = () => {
      apiService.getStaffs()
        .then((res) => {
          const { list } = parseListResponse(res);
          staffOptions.value = list || [];
        })
        .catch(() => {});
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
      };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.template_type) params.template_type = filters.template_type;

      apiService.getWorkTemplates(params)
        .then((res) => {
          const { list, total } = parseListResponse(res);
          templateList.value = list;
          pagination.total = total;
        })
        .catch(() => {
          ElMessage.error('加载模板列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const handleSearch = () => {
      pagination.page = 1;
      loadData();
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.template_type = '';
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
      const staffArr = row.staff_names
        ? String(row.staff_names).split(',').map(s => s.trim()).filter(Boolean)
        : [];
      Object.assign(form, defaultForm(), {
        id: row.id,
        name: row.name || '',
        template_type: row.template_type || 'work',
        category: row.category || '',
        work_subtype: row.work_subtype || '',
        work_content: row.work_content || '',
        fault_description: row.fault_description || '',
        fault_diagnosis: row.fault_diagnosis || '',
        repair_process: row.repair_process || '',
        repair_result: row.repair_result || '',
        labor_fee: Number(row.labor_fee) || 0,
        material_fee: Number(row.material_fee) || 0,
        transport_fee: Number(row.transport_fee) || 0,
        other_fee: Number(row.other_fee) || 0,
        tax_type: row.tax_type || 'no',
        tax_rate: Number(row.tax_rate) || 0,
        tax_rate_percent: (Number(row.tax_rate) || 0) * 100,
        priority: row.priority || 'medium',
        staff_names: row.staff_names || '',
        staff_names_arr: staffArr,
        remark: row.remark || '',
        is_public: !!row.is_public,
      });
      isEdit.value = true;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
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
          template_type: form.template_type,
          category: form.category,
          work_subtype: form.work_subtype,
          work_content: form.work_content,
          fault_description: form.template_type === 'fault' ? form.fault_description : '',
          fault_diagnosis: form.template_type === 'fault' ? form.fault_diagnosis : '',
          repair_process: form.template_type === 'fault' ? form.repair_process : '',
          repair_result: form.template_type === 'fault' ? form.repair_result : '',
          labor_fee: Number(form.labor_fee) || 0,
          material_fee: Number(form.material_fee) || 0,
          transport_fee: Number(form.transport_fee) || 0,
          other_fee: Number(form.other_fee) || 0,
          tax_type: form.tax_type,
          tax_rate: form.tax_type === 'tax' ? (Number(form.tax_rate_percent) || 0) / 100 : 0,
          priority: form.priority,
          staff_names: (form.staff_names_arr || []).join(','),
          remark: form.remark,
          is_public: form.is_public,
        };
        if (isEdit.value) {
          await apiService.updateWorkTemplate(form.id, data);
          ElMessage.success('编辑成功');
        } else {
          await apiService.createWorkTemplate(data);
          ElMessage.success('新增成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(
        `确定要删除模板「${row.name}」吗？`,
        '警告',
        { type: 'warning' }
      )
        .then(async () => {
          try {
            await apiService.deleteWorkTemplate(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    onMounted(() => {
      loadData();
      loadStaffOptions();
    });

    return {
      templateList,
      staffOptions,
      loading,
      submitting,
      dialogVisible,
      isEdit,
      formRef,
      filters,
      pagination,
      form,
      rules,
      isAdmin,
      dialogTitle,
      formSubtotal,
      formTotalWithTax,
      categoryLabel,
      subtypeLabel,
      calcTotal,
      formatDateTime,
      loadData,
      handleSearch,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      resetForm,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleDelete,
    };
  },
};

window.TemplateView = TemplateView;
