const RecordCreate = {
  template: `
    <div class="record-create">
      <div class="page-card">
        <div class="section-title" style="margin-bottom: 20px;">新建工单</div>

        <el-form :model="form" label-width="100px" ref="formRef">
          <el-form-item label="使用模板" v-if="templates.length > 0">
            <el-select v-model="selectedTemplateId" placeholder="选择模板快速填充" clearable @change="applyTemplate" style="width: 100%;">
              <el-option v-for="t in templates" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">基本信息</el-divider>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="工单类型" prop="record_type">
                <el-select v-model="form.record_type" placeholder="请选择" style="width: 100%;">
                  <el-option label="维修工单" value="repair" />
                  <el-option label="施工工单" value="construction" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="服务分类">
                <el-select v-model="form.service_category" placeholder="请选择" clearable style="width: 100%;">
                  <el-option label="安装" value="安装" />
                  <el-option label="维修" value="维修" />
                  <el-option label="维保" value="维保" />
                  <el-option label="巡检" value="巡检" />
                  <el-option label="其他" value="其他" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="客户名称" prop="customer_name">
                <el-select v-model="form.customer_name" filterable remote :remote-method="searchCustomers" :loading="customersLoading" placeholder="输入客户名称搜索" clearable @change="onCustomerChange" style="width: 100%;">
                  <el-option v-for="c in filteredCustomers" :key="c.id" :label="c.name" :value="c.name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工作子类型">
                <el-select v-model="form.work_subtype" placeholder="请选择" clearable style="width: 100%;">
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

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contact_name" placeholder="请输入联系人" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.customer_phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="服务地址" prop="work_address">
            <el-input v-model="form.work_address" placeholder="请输入服务地址" />
          </el-form-item>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="工作日期" prop="work_date">
                <el-date-picker v-model="form.work_date" type="date" placeholder="选择工作日期" value-format="YYYY-MM-DD" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优先级">
                <el-select v-model="form.priority" placeholder="请选择" style="width: 100%;">
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="开始时间">
                <el-time-picker v-model="form.start_time" placeholder="开始时间" format="HH:mm" value-format="HH:mm" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="结束时间">
                <el-time-picker v-model="form.end_time" placeholder="结束时间" format="HH:mm" value-format="HH:mm" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="工时数">
                <el-input-number v-model="form.work_hours" :min="0" :precision="1" style="width: 100%;" placeholder="工时" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="接报时间">
                <el-date-picker v-model="form.accept_time" type="datetime" placeholder="选择接报时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联项目">
                <el-select v-model="form.project_id" filterable placeholder="选择项目（进行中）" clearable @change="onProjectChange" style="width: 100%;">
                  <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="负责人">
            <el-select v-model="form.staff_names" multiple filterable placeholder="请选择员工" style="width: 100%;">
              <el-option v-for="s in staffList" :key="s.id || s.name" :label="s.name" :value="s.name" />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">工作描述</el-divider>

          <el-form-item :label="form.record_type === 'repair' ? '故障描述' : '工作内容'" prop="work_content">
            <el-input v-model="form.work_content" type="textarea" :rows="3" :placeholder="form.record_type === 'repair' ? '请描述故障情况' : '请描述工作内容'" />
          </el-form-item>

          <el-form-item v-if="form.record_type === 'repair'" label="故障诊断">
            <el-input v-model="form.fault_diagnosis" type="textarea" :rows="2" placeholder="故障诊断结果" />
          </el-form-item>

          <el-form-item v-if="form.record_type === 'repair'" label="维修过程">
            <el-input v-model="form.repair_process" type="textarea" :rows="2" placeholder="维修过程记录" />
          </el-form-item>

          <el-form-item v-if="form.record_type === 'repair'" label="维修结果">
            <el-input v-model="form.repair_result" type="textarea" :rows="2" placeholder="维修结果" />
          </el-form-item>

          <el-form-item label="涉及系统">
            <el-select v-model="form.involved_systems_arr" multiple filterable allow-create default-first-option placeholder="输入涉及系统，回车添加" style="width: 100%;">
              <el-option label="监控" value="监控" />
              <el-option label="门禁" value="门禁" />
              <el-option label="网络" value="网络" />
              <el-option label="弱电" value="弱电" />
              <el-option label="智能化" value="智能化" />
              <el-option label="安防" value="安防" />
              <el-option label="综合布线" value="综合布线" />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">保修信息</el-divider>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="保修状态">
                <el-select v-model="form.warranty_status" placeholder="请选择" clearable style="width: 100%;">
                  <el-option label="保修内" value="保修内" />
                  <el-option label="保修外" value="保修外" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="保修天数">
                <el-input-number v-model="form.warranty_days" :min="0" style="width: 100%;" placeholder="保修天数" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="客户反馈">
            <el-input v-model="form.customer_feedback" type="textarea" :rows="2" placeholder="客户反馈信息" />
          </el-form-item>

          <el-form-item label="满意度">
            <el-rate v-model="form.satisfaction" :max="5" show-text />
          </el-form-item>

          <el-divider content-position="left">费用明细</el-divider>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="人工费">
                <el-input-number v-model="form.labor_fee" :min="0" :precision="2" style="width: 100%;" placeholder="人工费" @change="calculateTotal" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="材料费">
                <el-input-number v-model="form.material_fee" :min="0" :precision="2" style="width: 100%;" placeholder="材料费" @change="calculateTotal" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="交通费">
                <el-input-number v-model="form.transport_fee" :min="0" :precision="2" style="width: 100%;" placeholder="交通费" @change="calculateTotal" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="其他费">
                <el-input-number v-model="form.other_fee" :min="0" :precision="2" style="width: 100%;" placeholder="其他费用" @change="calculateTotal" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="是否开票">
                <el-switch v-model="form.tax_type" active-value="tax" inactive-value="no" active-text="开票" inactive-text="不开票" @change="calculateTotal" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.tax_type === 'tax'">
              <el-form-item label="税率(%)">
                <el-input-number v-model="form.tax_rate" :min="0" :max="100" :precision="2" style="width: 100%;" @change="calculateTotal" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24" v-if="form.tax_type === 'tax'">
            <el-col :span="12">
              <el-form-item label="税额">
                <el-input :model-value="taxAmount.toFixed(2)" readonly placeholder="自动计算" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="费用合计">
                <el-input :model-value="grandTotal.toFixed(2)" readonly placeholder="自动计算" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="费用合计" v-if="form.tax_type !== 'tax'">
            <el-input :model-value="totalFee.toFixed(2)" readonly placeholder="自动计算" />
          </el-form-item>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 500;">费用明细项目</span>
              <el-button type="primary" size="small" @click="addFeeItem">
                <el-icon><Plus /></el-icon> 添加项目
              </el-button>
            </div>
            <el-table :data="form.fee_items" border size="small">
              <el-table-column label="项目名称" min-width="160">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="项目名称" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="0" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="单价" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.unit_price" :min="0" :precision="2" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="小计" width="120">
                <template #default="{ row }">
                  ¥{{ ((row.quantity || 0) * (row.unit_price || 0)).toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="removeFeeItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="收款状态">
                <el-select v-model="form.payment_status" placeholder="请选择" style="width: 100%;">
                  <el-option label="未收款" value="unpaid" />
                  <el-option label="部分收款" value="partial_paid" />
                  <el-option label="已收款" value="paid" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="已收金额" v-if="form.payment_status !== 'unpaid'">
                <el-input-number v-model="form.paid_amount" :min="0" :precision="2" style="width: 100%;" placeholder="已收金额" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="是否完成">
            <el-switch v-model="form.is_completed" active-text="已完成" inactive-text="未完成" />
          </el-form-item>

          <el-divider content-position="left">临时工</el-divider>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 500;">临时工明细</span>
              <el-button type="primary" size="small" @click="addTempStaff">
                <el-icon><Plus /></el-icon> 添加临时工
              </el-button>
            </div>
            <el-table :data="form.temp_staff_details" border size="small">
              <el-table-column label="姓名" min-width="120">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="姓名" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="工时/天数" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.hours" :min="0" :precision="1" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="日薪/单价" width="130">
                <template #default="{ row }">
                  <el-input-number v-model="row.daily_wage" :min="0" :precision="2" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="小计" width="120">
                <template #default="{ row }">
                  ¥{{ ((row.hours || 0) * (row.daily_wage || 0)).toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="removeTempStaff($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-divider content-position="left">物料使用</el-divider>

          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 500;">使用物料</span>
              <el-button type="primary" size="small" @click="addMaterialItem">
                <el-icon><Plus /></el-icon> 添加物料
              </el-button>
            </div>
            <el-table :data="form.material_items" border size="small">
              <el-table-column label="物料名称" min-width="180">
                <template #default="{ row }">
                  <el-select v-model="row.material_id" filterable placeholder="选择物料" size="small" @change="onMaterialChange(row)" style="width:100%">
                    <el-option v-for="m in materials" :key="m.id" :label="m.name" :value="m.id" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="0" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="单位" width="100">
                <template #default="{ row }">{{ row.unit || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="removeMaterialItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-divider content-position="left">现场照片</el-divider>

          <el-form-item label="现场照片">
            <PhotoUpload v-model="form.work_photos" :max-count="9" />
          </el-form-item>

          <template v-if="!form.is_completed">
            <el-divider content-position="left">未完成原因</el-divider>

            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="原因类型">
                  <el-select v-model="form.incomplete_reason_type" placeholder="请选择" clearable style="width: 100%;">
                    <el-option label="等待配件" value="parts_waiting" />
                    <el-option label="缺少配件" value="part_missing" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="原因描述">
              <el-input v-model="form.incomplete_reason" type="textarea" :rows="3" placeholder="请描述未完成原因" />
            </el-form-item>
          </template>

          <el-divider content-position="left">备注</el-divider>

          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>

          <div style="margin-top: 30px; text-align: right;">
            <el-button @click="handleCancel">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">创建工单</el-button>
          </div>
        </el-form>
      </div>
    </div>
  `,

  setup() {
    const { ref, reactive, computed, onMounted, watch } = Vue;
    const { useRouter } = VueRouter;
    const { ElMessage } = ElementPlus;

    const router = useRouter();
    const formRef = ref(null);
    const submitting = ref(false);
    const selectedTemplateId = ref(null);
    const customersLoading = ref(false);

    const today = new Date().toISOString().split('T')[0];

    const form = reactive({
      record_type: 'repair',
      customer_name: '',
      contact_name: '',
      customer_phone: '',
      work_address: '',
      staff_names: [],
      staff_name: '',
      temp_staff_details: [],
      work_subtype: '',
      work_content: '',
      fault_description: '',
      fault_diagnosis: '',
      repair_process: '',
      repair_result: '',
      incomplete_reason_type: '',
      incomplete_reason: '',
      work_photos: [],
      work_date: today,
      start_time: '',
      end_time: '',
      work_hours: 0,
      labor_fee: 0,
      material_fee: 0,
      transport_fee: 0,
      other_fee: 0,
      total_fee: 0,
      tax_type: 'no',
      tax_rate: 3,
      tax_amount: 0,
      remark: '',
      is_completed: true,
      status: 'pending',
      payment_status: 'unpaid',
      paid_amount: 0,
      priority: 'medium',
      project_id: null,
      project_name: '',
      involved_systems_arr: [],
      service_category: '',
      warranty_status: '',
      warranty_days: 0,
      accept_time: '',
      customer_feedback: '',
      satisfaction: 0,
      fee_items: [],
      material_items: [],
    });

    const customers = ref([]);
    const filteredCustomers = ref([]);
    const staffList = ref([]);
    const materials = ref([]);
    const projects = ref([]);
    const templates = ref([]);

    const totalFee = computed(() => {
      return Number(form.labor_fee || 0) + Number(form.material_fee || 0) + Number(form.transport_fee || 0) + Number(form.other_fee || 0);
    });

    const taxAmount = computed(() => {
      if (form.tax_type !== 'tax') return 0;
      return totalFee.value * (Number(form.tax_rate || 0) / 100);
    });

    const grandTotal = computed(() => {
      return totalFee.value + taxAmount.value;
    });

    const calculateTotal = () => {
      form.total_fee = totalFee.value;
      form.tax_amount = taxAmount.value;
    };

    watch(totalFee, () => {
      calculateTotal();
    });

    watch(taxAmount, () => {
      calculateTotal();
    });

    const loadOptions = async () => {
      try {
        const [custRes, staffRes, matRes, projRes] = await Promise.all([
          apiService.getCustomers({ per_page: 1000 }),
          apiService.getStaffs({ per_page: 1000 }),
          apiService.getMaterials({ per_page: 1000 }),
          apiService.getProjects({ per_page: 1000, status: 'in_progress' })
        ]);

        const { list: custList } = parseListResponse(custRes);
        customers.value = custList;
        filteredCustomers.value = custList;

        const { list: staffListData } = parseListResponse(staffRes);
        staffList.value = staffListData;

        const { list: matList } = parseListResponse(matRes);
        materials.value = matList;

        const { list: projList } = parseListResponse(projRes);
        projects.value = projList.filter(p => p.status === 'in_progress');

        try {
          const tempRes = await apiService.getWorkTemplates({ per_page: 100 });
          const { list: tempList } = parseListResponse(tempRes);
          templates.value = tempList;
        } catch (e) {
          console.error('加载模板失败', e);
        }
      } catch (e) {
        console.error('加载选项失败', e);
      }
    };

    const searchCustomers = (query) => {
      if (query) {
        customersLoading.value = true;
        const kw = query.toLowerCase();
        filteredCustomers.value = customers.value.filter(c =>
          (c.name || '').toLowerCase().includes(kw)
        );
        customersLoading.value = false;
      } else {
        filteredCustomers.value = customers.value;
      }
    };

    const onCustomerChange = (name) => {
      const customer = customers.value.find(c => c.name === name);
      if (customer) {
        form.contact_name = customer.contact_name || '';
        form.customer_phone = customer.phone || '';
        form.work_address = customer.address || '';
      }
    };

    const onProjectChange = (projectId) => {
      if (!projectId) {
        form.project_name = '';
        return;
      }
      const project = projects.value.find(p => p.id === projectId);
      if (project) {
        form.project_name = project.name || '';
        if (project.customer_name && !form.customer_name) {
          form.customer_name = project.customer_name;
        }
        if (project.address && !form.work_address) {
          form.work_address = project.address;
        }
      }
    };

    const addFeeItem = () => {
      form.fee_items.push({ name: '', quantity: 1, unit_price: 0, subtotal: 0 });
    };

    const removeFeeItem = (index) => {
      form.fee_items.splice(index, 1);
    };

    const addTempStaff = () => {
      form.temp_staff_details.push({ name: '', hours: 8, daily_wage: 0 });
    };

    const removeTempStaff = (index) => {
      form.temp_staff_details.splice(index, 1);
    };

    const addMaterialItem = () => {
      form.material_items.push({ material_id: null, material_name: '', quantity: 1, unit: '' });
    };

    const removeMaterialItem = (index) => {
      form.material_items.splice(index, 1);
    };

    const onMaterialChange = (row) => {
      const mat = materials.value.find(m => m.id === row.material_id);
      if (mat) {
        row.material_name = mat.name;
        row.unit = mat.unit || '个';
      }
    };

    const applyTemplate = async (templateId) => {
      if (!templateId) return;

      try {
        const res = await apiService.applyWorkTemplate(templateId);
        if (res) {
          if (res.work_content) form.work_content = res.work_content;
          if (res.fault_description) form.fault_description = res.fault_description;
          if (res.repair_process) form.repair_process = res.repair_process;
          if (res.labor_fee) form.labor_fee = Number(res.labor_fee);
          if (res.material_fee) form.material_fee = Number(res.material_fee);
          calculateTotal();
          ElMessage.success('模板已应用');
        }
      } catch (e) {
        ElMessage.error('应用模板失败');
      }
    };

    const handleSubmit = async () => {
      if (!form.customer_name) {
        ElMessage.warning('请填写客户名称');
        return;
      }
      if (!form.work_address) {
        ElMessage.warning('请填写服务地址');
        return;
      }
      if (!form.work_date) {
        ElMessage.warning('请选择工作日期');
        return;
      }
      if (!form.work_content) {
        ElMessage.warning('请填写工作内容');
        return;
      }

      submitting.value = true;

      try {
        const staffNamesStr = Array.isArray(form.staff_names) ? form.staff_names.join(',') : form.staff_names;
        const involvedSystemsStr = Array.isArray(form.involved_systems_arr) ? form.involved_systems_arr.join(',') : '';

        const photos = form.work_photos || [];
        const photoUrls = photos.map(p => {
          if (typeof p === 'string') return p;
          return p.url || '';
        }).filter(url => url).join(',');

        const processedFeeItems = form.fee_items.map(item => ({
          name: item.name,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          subtotal: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
        }));

        const payload = {
          record_type: form.record_type,
          customer_name: form.customer_name,
          contact_name: form.contact_name,
          customer_phone: form.customer_phone,
          work_address: form.work_address,
          staff_names: staffNamesStr,
          staff_name: form.staff_names.length > 0 ? form.staff_names[0] : '',
          temp_staff_details: form.temp_staff_details,
          work_subtype: form.work_subtype,
          work_content: form.work_content,
          fault_description: form.fault_description,
          fault_diagnosis: form.fault_diagnosis,
          repair_process: form.repair_process,
          repair_result: form.repair_result,
          incomplete_reason_type: form.is_completed ? '' : form.incomplete_reason_type,
          incomplete_reason: form.is_completed ? '' : form.incomplete_reason,
          work_photos: photoUrls,
          work_date: form.work_date,
          start_time: form.start_time,
          end_time: form.end_time,
          work_hours: Number(form.work_hours) || 0,
          labor_fee: Number(form.labor_fee) || 0,
          material_fee: Number(form.material_fee) || 0,
          transport_fee: Number(form.transport_fee) || 0,
          other_fee: Number(form.other_fee) || 0,
          total_fee: totalFee.value,
          tax_type: form.tax_type,
          tax_rate: form.tax_type === 'tax' ? Number(form.tax_rate) / 100 : 0,
          tax_amount: taxAmount.value,
          remark: form.remark,
          is_completed: form.is_completed,
          status: form.is_completed ? 'completed' : 'incomplete',
          payment_status: form.payment_status,
          paid_amount: Number(form.paid_amount) || 0,
          priority: form.priority,
          involved_systems: involvedSystemsStr,
          service_category: form.service_category,
          warranty_status: form.warranty_status,
          warranty_days: Number(form.warranty_days) || 0,
          accept_time: form.accept_time,
          customer_feedback: form.customer_feedback,
          satisfaction: Number(form.satisfaction) || 0,
          fee_items: processedFeeItems,
          material_items: form.material_items,
        };

        if (form.project_id) {
          payload.project_id = form.project_id;
          payload.project_name = form.project_name;
        }

        await apiService.createRecord(payload);
        ElMessage.success('工单创建成功');
        router.push({ name: 'Records' });
      } catch (e) {
        console.error('创建失败', e);
        ElMessage.error('创建工单失败');
      } finally {
        submitting.value = false;
      }
    };

    const handleCancel = () => {
      router.push({ name: 'Records' });
    };

    onMounted(() => {
      loadOptions();
    });

    return {
      formRef,
      form,
      submitting,
      selectedTemplateId,
      customersLoading,
      customers,
      filteredCustomers,
      staffList,
      materials,
      projects,
      templates,
      totalFee,
      taxAmount,
      grandTotal,
      calculateTotal,
      searchCustomers,
      onCustomerChange,
      onProjectChange,
      addFeeItem,
      removeFeeItem,
      addTempStaff,
      removeTempStaff,
      addMaterialItem,
      removeMaterialItem,
      onMaterialChange,
      applyTemplate,
      handleSubmit,
      handleCancel,
    };
  }
};

window.RecordCreate = RecordCreate;
