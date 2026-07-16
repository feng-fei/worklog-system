const SalaryView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
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

          <el-date-picker
            v-model="filters.month"
            type="month"
            placeholder="月份"
            value-format="YYYY-MM"
            clearable
            style="width:140px;"
          />

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="待发放" value="unsettled" />
            <el-option label="已发放" value="settled" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px;">
          <div class="stat-card" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;">
            <div class="stat-label">总应发</div>
            <div class="stat-value">¥{{ (summary.payable || 0).toFixed(2) }}</div>
          </div>
          <div class="stat-card" style="background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);color:white;">
            <div class="stat-label">已发</div>
            <div class="stat-value">¥{{ (summary.paid || 0).toFixed(2) }}</div>
          </div>
          <div class="stat-card" style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);color:white;">
            <div class="stat-label">待发</div>
            <div class="stat-value">¥{{ (summary.unpaid || 0).toFixed(2) }}</div>
          </div>
        </div>

        <el-table :data="salaryList" v-loading="loading" stripe>
          <el-table-column prop="work_date" label="日期" width="110">
            <template #default="{ row }">
              {{ row.work_date ? row.work_date.substring(0, 10) : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="staff_name" label="员工" width="100" />
          <el-table-column prop="staff_type" label="类型" width="90">
            <template #default="{ row }">
              <el-tag :type="row.staff_type === 'fixed' ? 'primary' : 'warning'" size="small">
                {{ row.staff_type === 'fixed' ? '固定工' : '临时工' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="business_type" label="业务类型" width="100" />
          <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
          <el-table-column prop="work_content" label="工作内容" min-width="150" show-overflow-tooltip />
          <el-table-column prop="salary_type" label="薪资类型" width="90" />
          <el-table-column label="日薪×天数" width="120">
            <template #default="{ row }">
              ¥{{ (row.daily_wage || 0).toFixed(2) }} × {{ row.work_units || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="应发" width="100">
            <template #default="{ row }">
              <span style="font-weight:bold;">¥{{ (row.payable_amount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="已发" width="100">
            <template #default="{ row }">
              <span style="color:#67c23a;">¥{{ (row.paid_amount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'settled' ? 'success' : 'warning'" size="small">
                {{ row.status === 'settled' ? '已发放' : '待发放' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式" width="100">
            <template #default="{ row }">
              {{ formatPaymentMethod(row.payment_method) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                link
                type="success"
                size="small"
                @click="openSettleDialog(row)"
                v-if="row.status === 'unsettled'"
              >
                发放
              </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="员工" prop="staff_name">
            <el-select v-model="form.staff_name" placeholder="请选择员工" filterable style="width:100%;" @change="handleStaffChange">
              <el-option
                v-for="s in staffOptions"
                :key="s.name"
                :label="s.name"
                :value="s.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="工作日期" prop="work_date">
            <el-date-picker
              v-model="form.work_date"
              type="date"
              placeholder="选择工作日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="员工类型" prop="staff_type">
            <el-select v-model="form.staff_type" placeholder="请选择" style="width:100%;">
              <el-option label="固定工" value="fixed" />
              <el-option label="临时工" value="temp" />
            </el-select>
          </el-form-item>
          <el-form-item label="业务类型" prop="business_type">
            <el-select v-model="form.business_type" placeholder="请选择业务类型" clearable style="width:100%;">
              <el-option label="施工记录" value="施工记录" />
              <el-option label="维修工单" value="维修工单" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="客户名称">
            <el-input v-model="form.customer_name" placeholder="请输入客户名称" />
          </el-form-item>
          <el-form-item label="工作内容">
            <el-input v-model="form.work_content" type="textarea" :rows="2" placeholder="请输入工作内容" />
          </el-form-item>
          <el-form-item label="薪资类型" prop="salary_type">
            <el-select v-model="form.salary_type" placeholder="请选择" style="width:100%;">
              <el-option label="日薪" value="日薪" />
              <el-option label="月薪" value="月薪" />
              <el-option label="计件" value="计件" />
              <el-option label="预支" value="预支" />
              <el-option label="奖金" value="奖金" />
            </el-select>
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="日薪/单价">
                <el-input-number v-model="form.daily_wage" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="天数/工时">
                <el-input-number v-model="form.work_units" :min="0" :precision="1" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="补贴">
                <el-input-number v-model="form.subsidy" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="扣款">
                <el-input-number v-model="form.deduction" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="应发金额">
            <div style="padding:8px 12px;background:#f5f7fa;border-radius:4px;color:#409eff;font-weight:bold;font-size:16px;">
              ¥{{ payableAmountComputed.toFixed(2) }}
            </div>
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="已发金额">
                <el-input-number v-model="form.paid_amount" :min="0" :precision="2" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="支付方式">
                <el-select v-model="form.payment_method" placeholder="请选择" clearable style="width:100%;">
                  <el-option label="现金" value="cash" />
                  <el-option label="银行转账" value="bank" />
                  <el-option label="微信" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="settleDialogVisible" title="发放工资" width="400px">
        <el-form :model="settleForm" label-width="90px">
          <el-form-item label="结算日期">
            <el-date-picker
              v-model="settleForm.settlement_date"
              type="date"
              placeholder="选择结算日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="settleForm.payment_method" placeholder="请选择" style="width:100%;">
              <el-option label="现金" value="cash" />
              <el-option label="银行转账" value="bank" />
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="settleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSettle" :loading="settling">确认发放</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted, nextTick } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const salaryList = ref([]);
    const staffOptions = ref([]);
    const summary = reactive({ payable: 0, paid: 0, unpaid: 0 });
    const loading = ref(false);
    const submitting = ref(false);
    const settling = ref(false);
    const dialogVisible = ref(false);
    const settleDialogVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);
    const currentSettleRow = ref(null);

    const filters = reactive({
      staff_name: '',
      month: '',
      status: '',
    });

    const defaultForm = () => ({
      id: null,
      staff_name: '',
      staff_type: 'fixed',
      work_date: dayjs().format('YYYY-MM-DD'),
      business_type: '',
      business_no: '',
      business_record_id: null,
      customer_name: '',
      work_content: '',
      salary_type: '日薪',
      daily_wage: 0,
      work_units: 1,
      subsidy: 0,
      deduction: 0,
      paid_amount: 0,
      status: 'unsettled',
      settlement_date: '',
      payment_method: '',
      remark: '',
    });

    const settleForm = reactive({
      settlement_date: dayjs().format('YYYY-MM-DD'),
      payment_method: 'cash',
    });

    const form = reactive(defaultForm());

    const rules = {
      staff_name: [{ required: true, message: '请选择员工', trigger: 'change' }],
      work_date: [{ required: true, message: '请选择工作日期', trigger: 'change' }],
      salary_type: [{ required: true, message: '请选择薪资类型', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑工资' : '新增工资'));

    const payableAmountComputed = computed(() => {
      const daily = Number(form.daily_wage) || 0;
      const units = Number(form.work_units) || 0;
      const sub = Number(form.subsidy) || 0;
      const ded = Number(form.deduction) || 0;
      return daily * units + sub - ded;
    });

    const formatPaymentMethod = (method) => {
      const map = { cash: '现金', bank: '银行转账', wechat: '微信', alipay: '支付宝', other: '其他' };
      return map[method] || '-';
    };

    const loadData = () => {
      loading.value = true;
      const params = {
        staff_name: filters.staff_name || undefined,
        month: filters.month || undefined,
        status: filters.status || undefined,
      };
      apiService.getSalaries(params)
        .then((res) => {
          const { list } = parseListResponse(res);
          salaryList.value = list;
          if (res && res.summary) {
            summary.payable = res.summary.payable || 0;
            summary.paid = res.summary.paid || 0;
            summary.unpaid = res.summary.unpaid || 0;
          } else {
            summary.payable = 0;
            summary.paid = 0;
            summary.unpaid = 0;
          }
        })
        .catch(() => {
          ElMessage.error('加载工资列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const loadStaffs = () => {
      apiService.getStaffs({ per_page: 1000 })
        .then((res) => {
          const { list } = parseListResponse(res);
          staffOptions.value = list;
        })
        .catch(() => {});
    };

    const resetFilters = () => {
      filters.staff_name = '';
      filters.month = '';
      filters.status = '';
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

    const handleStaffChange = (name) => {
      const staff = staffOptions.value.find(s => s.name === name);
      if (staff) {
        form.staff_type = staff.staff_type || 'fixed';
        if (staff.daily_wage) {
          form.daily_wage = staff.daily_wage;
        }
      }
    };

    const handleCreate = () => {
      Object.assign(form, defaultForm());
      isEdit.value = false;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        staff_name: row.staff_name || '',
        staff_type: row.staff_type || 'fixed',
        work_date: row.work_date ? row.work_date.substring(0, 10) : dayjs().format('YYYY-MM-DD'),
        business_type: row.business_type || '',
        business_no: row.business_no || '',
        business_record_id: row.business_record_id || null,
        customer_name: row.customer_name || '',
        work_content: row.work_content || '',
        salary_type: row.salary_type || '日薪',
        daily_wage: row.daily_wage || 0,
        work_units: row.work_units || 1,
        subsidy: row.subsidy || 0,
        deduction: row.deduction || 0,
        paid_amount: row.paid_amount || 0,
        status: row.status || 'unsettled',
        settlement_date: row.settlement_date || '',
        payment_method: row.payment_method || '',
        remark: row.remark || '',
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
          staff_name: form.staff_name,
          work_date: form.work_date,
          daily_wage: Number(form.daily_wage) || 0,
          work_units: Number(form.work_units) || 0,
          subsidy: Number(form.subsidy) || 0,
          deduction: Number(form.deduction) || 0,
          business_type: form.business_type,
          business_no: form.business_no,
          customer_name: form.customer_name,
          work_content: form.work_content,
          salary_type: form.salary_type,
          paid_amount: Number(form.paid_amount) || 0,
          status: form.status,
          payment_method: form.payment_method,
          remark: form.remark,
        };
        if (isEdit.value) {
          await apiService.updateSalary(form.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.createSalary(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const openSettleDialog = (row) => {
      currentSettleRow.value = row;
      settleForm.settlement_date = dayjs().format('YYYY-MM-DD');
      settleForm.payment_method = row.payment_method || 'cash';
      settleDialogVisible.value = true;
    };

    const confirmSettle = async () => {
      if (!currentSettleRow.value) return;
      settling.value = true;
      try {
        await apiService.settleSalary(currentSettleRow.value.id, {
          settlement_date: settleForm.settlement_date,
          payment_method: settleForm.payment_method,
        });
        ElMessage.success('发放成功');
        settleDialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        settling.value = false;
      }
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(`确定要删除「${row.staff_name}」的这条工资记录吗？`, '警告', {
        type: 'warning',
        confirmButtonText: '确定删除',
      })
        .then(async () => {
          try {
            await apiService.deleteSalary(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    onMounted(() => {
      loadData();
      loadStaffs();
    });

    return {
      salaryList,
      staffOptions,
      summary,
      loading,
      submitting,
      settling,
      dialogVisible,
      settleDialogVisible,
      isEdit,
      formRef,
      filters,
      form,
      settleForm,
      rules,
      isAdmin,
      dialogTitle,
      payableAmountComputed,
      formatPaymentMethod,
      loadData,
      resetFilters,
      resetForm,
      handleStaffChange,
      handleCreate,
      handleEdit,
      handleSubmit,
      openSettleDialog,
      confirmSettle,
      handleDelete,
    };
  },
};

window.SalaryView = SalaryView;