const SalaryView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">工资管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增工资
            </el-button>
            <el-button @click="loadData">
              <el-icon style="margin-right:4px;"><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="filter-bar">
          <el-select v-model="filters.staff_name" placeholder="员工" clearable filterable style="width:160px;">
            <el-option
              v-for="s in staffOptions"
              :key="s.name"
              :label="s.name"
              :value="s.name"
            />
          </el-select>

          <el-select v-model="filters.month" placeholder="月份" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option v-for="m in monthOptions" :key="m" :label="m" :value="m" />
          </el-select>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="待发放" value="pending" />
            <el-option label="已发放" value="paid" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="salaries" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="staff_name" label="员工姓名" width="120" />
          <el-table-column prop="month" label="工资月份" width="120" />
          <el-table-column label="基本工资" width="120">
            <template #default="{ row }">
              ¥{{ (row.base_salary || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="奖金" width="100">
            <template #default="{ row }">
              ¥{{ (row.bonus || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="扣款" width="100">
            <template #default="{ row }">
              ¥{{ (row.deduction || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="实发工资" width="120">
            <template #default="{ row }">
              <span style="color:#67c23a;font-weight:bold;">
                ¥{{ (row.total_salary || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'paid' ? 'success' : 'warning'" size="small">
                {{ row.status === 'paid' ? '已发放' : '待发放' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column prop="paid_at" label="发放时间" width="160">
            <template #default="{ row }">
              {{ row.paid_at ? formatDateTime(row.paid_at) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                link
                type="success"
                size="small"
                @click="handleSettle(row)"
                v-if="row.status === 'pending'"
              >
                发放
              </el-button>
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

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="员工" prop="staff_name">
            <el-select v-model="form.staff_name" placeholder="请选择员工" filterable style="width:100%;">
              <el-option
                v-for="s in staffOptions"
                :key="s.name"
                :label="s.name"
                :value="s.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="工资月份" prop="month">
            <el-date-picker
              v-model="form.month"
              type="month"
              placeholder="选择月份"
              value-format="YYYY-MM"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="基本工资">
            <el-input-number v-model="form.base_salary" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="奖金">
            <el-input-number v-model="form.bonus" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="扣款">
            <el-input-number v-model="form.deduction" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="实发工资">
            <div style="padding:8px 12px;background:#f5f7fa;border-radius:4px;color:#67c23a;font-weight:bold;">
              ¥{{ ((form.base_salary || 0) + (form.bonus || 0) - (form.deduction || 0)).toFixed(2) }}
            </div>
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
    const { ref, reactive, computed, onMounted } = Vue;

    const salaries = ref([]);
    const staffOptions = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);

    const filters = reactive({
      staff_name: '',
      month: '',
      status: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      staff_name: '',
      month: '',
      base_salary: 0,
      bonus: 0,
      deduction: 0,
      remark: '',
    });

    const rules = {
      staff_name: [{ required: true, message: '请选择员工', trigger: 'change' }],
      month: [{ required: true, message: '请选择月份', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin);
    const dialogTitle = computed(() => (isEdit.value ? '编辑工资' : '新增工资'));

    const monthOptions = computed(() => {
      const months = [];
      const now = new Date();
      for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(dayjs(d).format('YYYY-MM'));
      }
      return months;
    });

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getSalaries(params)
        .then((res) => {
          salaries.value = res.items || res.data || [];
          pagination.total = res.total || 0;
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载工资列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadStaffs = () => {
      apiService.getStaffs({ per_page: 1000, enabled: 'true' })
        .then((res) => {
          staffOptions.value = res.items || res.data || [];
        })
        .catch(() => {});
    };

    const resetFilters = () => {
      filters.staff_name = '';
      filters.month = '';
      filters.status = '';
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
      form.staff_name = '';
      form.month = dayjs().format('YYYY-MM');
      form.base_salary = 0;
      form.bonus = 0;
      form.deduction = 0;
      form.remark = '';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.staff_name = row.staff_name;
      form.month = row.month;
      form.base_salary = row.base_salary || 0;
      form.bonus = row.bonus || 0;
      form.deduction = row.deduction || 0;
      form.remark = row.remark || '';
      dialogVisible.value = true;
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = {
          staff_name: form.staff_name,
          month: form.month,
          base_salary: form.base_salary,
          bonus: form.bonus,
          deduction: form.deduction,
          remark: form.remark,
        };

        const request = isEdit.value
          ? apiService.updateSalary(form.id, data)
          : apiService.createSalary(data);

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

    const handleSettle = (row) => {
      ElementPlus.ElMessageBox.confirm(
        `确定要发放「${row.staff_name}」${row.month}的工资吗？`,
        '提示',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.settleSalary(row.id, { status: 'paid' });
        })
        .then(() => {
          ElementPlus.ElMessage.success('发放成功');
          loadData();
        })
        .catch(() => {});
    };

    const handleDelete = (row) => {
      ElementPlus.ElMessageBox.confirm(
        `确定要删除「${row.staff_name}」${row.month}的工资记录吗？`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteSalary(row.id);
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
      loadStaffs();
    });

    return {
      salaries,
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
      monthOptions,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleSettle,
      handleDelete,
      formatDateTime,
    };
  },
};

window.SalaryView = SalaryView;
