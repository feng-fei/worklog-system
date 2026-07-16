const MaintenancePlanView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div class="section-title" style="margin:0;">维护计划</div>
          <div style="display:flex;gap:8px;">
            <el-button type="success" @click="handleGenerateTodos" :loading="generating">
              <el-icon style="margin-right:4px;"><Bell /></el-icon>
              生成待办
            </el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新建计划
            </el-button>
          </div>
        </div>

        <div class="filter-bar">
          <el-input v-model="filters.keyword" placeholder="搜索计划名/客户" clearable style="width:200px;" @keyup.enter="loadData">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="进行中" value="active" />
            <el-option label="已暂停" value="paused" />
            <el-option label="已完成" value="completed" />
          </el-select>
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>

        <el-table :data="plans" v-loading="loading" stripe>
          <el-table-column prop="plan_name" label="计划名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="customer_name" label="客户" width="120" show-overflow-tooltip />
          <el-table-column label="周期" width="120">
            <template #default="{ row }">
              每{{ row.cycle_value }}{{ getCycleTypeLabel(row.cycle_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="开始日期" width="110" />
          <el-table-column prop="next_date" label="下次维护" width="110">
            <template #default="{ row }">
              <span :style="{ color: isOverdue(row.next_date) ? '#f56c6c' : '', fontWeight: isOverdue(row.next_date) ? 'bold' : '' }">
                {{ row.next_date || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="优先级" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="getPriorityType(row.priority)">{{ getPriorityLabel(row.priority) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="total_count" label="已生成" width="80" align="center" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link :type="row.status === 'active' ? 'warning' : 'success'" size="small" @click="handleToggleStatus(row)">
                {{ row.status === 'active' ? '暂停' : '启用' }}
              </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="计划名称" prop="plan_name">
            <el-input v-model="form.plan_name" placeholder="请输入计划名称" />
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="客户名称" prop="customer_name">
                <el-input v-model="form.customer_name" placeholder="客户名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="负责人" prop="staff_name">
                <el-input v-model="form.staff_name" placeholder="负责人" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="计划类型" prop="plan_type">
                <el-select v-model="form.plan_type" style="width:100%;">
                  <el-option label="周期性" value="periodic" />
                  <el-option label="一次性" value="once" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="form.priority" style="width:100%;">
                  <el-option label="普通" value="normal" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12" v-if="form.plan_type === 'periodic'">
            <el-col :span="12">
              <el-form-item label="周期单位" prop="cycle_type">
                <el-select v-model="form.cycle_type" style="width:100%;">
                  <el-option label="天" value="day" />
                  <el-option label="周" value="week" />
                  <el-option label="月" value="month" />
                  <el-option label="季度" value="quarter" />
                  <el-option label="年" value="year" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="周期值" prop="cycle_value">
                <el-input-number v-model="form.cycle_value" :min="1" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="开始日期" prop="start_date">
                <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.plan_type === 'periodic'">
              <el-form-item label="结束日期">
                <el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" style="width:100%;" placeholder="留空表示长期" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="系统类型">
            <el-input v-model="form.system_type" placeholder="如：监控系统、消防系统等" />
          </el-form-item>
          <el-form-item label="维护内容" prop="work_content">
            <el-input v-model="form.work_content" type="textarea" :rows="3" placeholder="请输入维护工作内容" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" />
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
    const { ref, reactive, onMounted, computed } = Vue;
    const plans = ref([]);
    const loading = ref(false);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新建计划');
    const submitting = ref(false);
    const generating = ref(false);
    const formRef = ref(null);

    const filters = reactive({
      keyword: '',
      status: '',
    });

    const form = reactive({
      id: null,
      plan_name: '',
      plan_type: 'periodic',
      customer_name: '',
      staff_name: '',
      cycle_type: 'month',
      cycle_value: 1,
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: '',
      priority: 'normal',
      work_content: '',
      system_type: '',
      remark: '',
    });

    const rules = {
      plan_name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
      customer_name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
      start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
      work_content: [{ required: true, message: '请输入维护内容', trigger: 'blur' }],
    };

    const getCycleTypeLabel = (type) => {
      const map = { day: '天', week: '周', month: '个月', quarter: '个季度', year: '年' };
      return map[type] || '月';
    };

    const getPriorityType = (p) => ({ normal: '', high: 'warning', urgent: 'danger' }[p] || '');
    const getPriorityLabel = (p) => ({ normal: '普通', high: '高', urgent: '紧急' }[p] || '普通');
    const getStatusType = (s) => ({ active: 'success', paused: 'warning', completed: 'info' }[s] || '');
    const getStatusLabel = (s) => ({ active: '进行中', paused: '已暂停', completed: '已完成' }[s] || s);

    const isOverdue = (dateStr) => {
      if (!dateStr) return false;
      return dayjs(dateStr).isBefore(dayjs(), 'day');
    };

    const loadData = () => {
      loading.value = true;
      const params = {};
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      apiService.getMaintenancePlans(params)
        .then((res) => {
          plans.value = Array.isArray(res) ? res : (Array.isArray(res?.plans) ? res.plans : []);
        })
        .catch(() => { plans.value = []; })
        .finally(() => { loading.value = false; });
    };

    const resetForm = () => {
      Object.assign(form, {
        id: null,
        plan_name: '',
        plan_type: 'periodic',
        customer_name: '',
        staff_name: '',
        cycle_type: 'month',
        cycle_value: 1,
        start_date: dayjs().format('YYYY-MM-DD'),
        end_date: '',
        priority: 'normal',
        work_content: '',
        system_type: '',
        remark: '',
      });
      if (formRef.value) formRef.value.clearValidate();
    };

    const handleCreate = () => {
      resetForm();
      dialogTitle.value = '新建维护计划';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      resetForm();
      dialogTitle.value = '编辑维护计划';
      Object.assign(form, {
        id: row.id,
        plan_name: row.plan_name,
        plan_type: row.plan_type || 'periodic',
        customer_name: row.customer_name,
        staff_name: row.staff_name || '',
        cycle_type: row.cycle_type || 'month',
        cycle_value: row.cycle_value || 1,
        start_date: row.start_date,
        end_date: row.end_date || '',
        priority: row.priority || 'normal',
        work_content: row.work_content || '',
        system_type: row.system_type || '',
        remark: row.remark || '',
      });
      dialogVisible.value = true;
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;
      try { await formRef.value.validate(); } catch (e) { return; }
      submitting.value = true;
      try {
        const data = { ...form };
        if (data.id) {
          await apiService.updateMaintenancePlan(data.id, data);
          ElementPlus.ElMessage.success('更新成功');
        } else {
          await apiService.createMaintenancePlan(data);
          ElementPlus.ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {} finally { submitting.value = false; }
    };

    const handleDelete = (row) => {
      ElementPlus.ElMessageBox.confirm(`确定删除计划「${row.plan_name}」吗？`, '提示', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.deleteMaintenancePlan(row.id);
            ElementPlus.ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const handleToggleStatus = async (row) => {
      const newStatus = row.status === 'active' ? 'paused' : 'active';
      try {
        await apiService.updateMaintenancePlan(row.id, { status: newStatus });
        ElementPlus.ElMessage.success(newStatus === 'active' ? '已启用' : '已暂停');
        loadData();
      } catch (e) {}
    };

    const handleGenerateTodos = () => {
      ElementPlus.ElMessageBox.confirm('确定根据到期的维护计划生成待办任务吗？', '生成待办', { type: 'info' })
        .then(async () => {
          generating.value = true;
          try {
            const res = await apiService.generateMaintenanceTodos();
            ElementPlus.ElMessage.success(res?.message || '生成成功');
            loadData();
          } catch (e) {} finally { generating.value = false; }
        })
        .catch(() => {});
    };

    onMounted(() => { loadData(); });

    return {
      plans, loading, dialogVisible, dialogTitle, submitting, generating,
      filters, form, rules, formRef,
      getCycleTypeLabel, getPriorityType, getPriorityLabel, getStatusType, getStatusLabel,
      isOverdue, loadData, handleCreate, handleEdit, handleSubmit, handleDelete,
      handleToggleStatus, handleGenerateTodos,
    };
  },
};

window.MaintenancePlanView = MaintenancePlanView;
MaintenancePlanView;
