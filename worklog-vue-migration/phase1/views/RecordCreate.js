// =============================================
// RecordCreate.js - 新建工单完整表单
// =============================================
// 包含：基本信息 + 动态费用明细 + 动态设备物料 + 照片上传 + 模板应用
// =============================================

const RecordCreate = {
  template: `
    <div class="record-create">
      <div class="page-card">
        <div class="section-title" style="margin-bottom: 20px;">新建工单</div>

        <!-- 工单模板选择 -->
        <el-form-item label="使用模板" v-if="templates.length > 0">
          <el-select v-model="selectedTemplateId" placeholder="选择模板快速填充" clearable @change="applyTemplate">
            <el-option
              v-for="t in templates"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form :model="form" label-width="100px" ref="formRef">
          <!-- 基本信息 -->
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="工单类型" prop="record_type">
                <el-select v-model="form.record_type" placeholder="请选择">
                  <el-option label="维修工单" value="maintenance" />
                  <el-option label="施工工单" value="construction" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="客户" prop="customer_name">
                <el-select v-model="form.customer_name" filterable placeholder="请选择客户">
                  <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="负责人">
                <el-select v-model="form.staff_names" multiple filterable placeholder="请选择">
                  <el-option v-for="s in staffList" :key="s.name" :label="s.name" :value="s.name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优先级">
                <el-select v-model="form.priority">
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="服务地址">
            <el-input v-model="form.service_address" placeholder="请输入服务地址" />
          </el-form-item>

          <el-form-item label="预约时间">
            <el-date-picker v-model="form.appointment_time" type="datetime" placeholder="选择预约时间" />
          </el-form-item>

          <!-- 维修内容 -->
          <el-form-item v-if="form.record_type === 'maintenance'" label="故障描述">
            <el-input v-model="form.fault_description" type="textarea" :rows="3" />
          </el-form-item>

          <el-form-item v-if="form.record_type === 'construction'" label="施工内容">
            <el-input v-model="form.construction_content" type="textarea" :rows="3" />
          </el-form-item>

          <!-- 动态费用明细 -->
          <div class="dynamic-section">
            <div class="section-header">
              <span>费用明细</span>
              <el-button type="primary" size="small" @click="addFeeItem">
                <el-icon><Plus /></el-icon> 添加费用项目
              </el-button>
            </div>

            <el-table :data="form.fee_items" border size="small" style="margin-bottom: 12px;">
              <el-table-column label="项目名称" min-width="180">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="费用项目名称" size="small" />
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

            <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">
              费用合计：¥{{ totalFee.toFixed(2) }}
            </div>
          </div>

          <!-- 动态设备/物料明细（仅维修工单） -->
          <div class="dynamic-section" v-if="form.record_type === 'maintenance'">
            <div class="section-header">
              <span>使用物料 / 设备</span>
              <el-button type="primary" size="small" @click="addMaterialItem">
                <el-icon><Plus /></el-icon> 添加物料
              </el-button>
            </div>

            <el-table :data="form.material_items" border size="small">
              <el-table-column label="物料名称" min-width="180">
                <template #default="{ row }">
                  <el-select v-model="row.material_id" filterable placeholder="选择物料" size="small" @change="onMaterialChange(row)">
                    <el-option v-for="m in materials" :key="m.id" :label="m.name" :value="m.id" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.quantity" :min="0" size="small" style="width:100%" />
                </template>
              </el-table-column>
              <el-table-column label="单位" width="80">
                <template #default="{ row }">{{ row.unit || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="removeMaterialItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 照片上传 -->
          <el-form-item label="现场照片">
            <PhotoUpload v-model="form.photos" :max-count="9" />
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" />
          </el-form-item>

          <!-- 操作按钮 -->
          <div style="margin-top: 30px; text-align: right;">
            <el-button @click="handleCancel">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">创建工单</el-button>
          </div>
        </el-form>
      </div>
    </div>
  `,

  setup() {
    const { ref, reactive, computed, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const formRef = ref(null);
    const submitting = ref(false);
    const selectedTemplateId = ref(null);

    const form = reactive({
      record_type: 'maintenance',
      customer_name: null,
      staff_names: [],
      priority: 'medium',
      service_address: '',
      appointment_time: '',
      fault_description: '',
      construction_content: '',
      fee_items: [],
      material_items: [],
      photos: [],
      remark: ''
    });

    const customers = ref([]);
    const staffList = ref([]);
    const materials = ref([]);
    const templates = ref([]);

    // 加载下拉数据
    const loadOptions = async () => {
      try {
        const [custRes, staffRes, matRes, tempRes] = await Promise.all([
          apiService.getCustomers({ per_page: 1000 }),
          apiService.getStaffs({ per_page: 1000, enabled: true }),
          apiService.getMaterials({ per_page: 1000 }),
          apiService.getTemplates?.({ per_page: 100 }) || Promise.resolve({ data: [] })
        ]);

        customers.value = custRes.items || custRes.data || [];
        staffList.value = staffRes.items || staffRes.data || [];
        materials.value = matRes.items || matRes.data || [];
        templates.value = tempRes.data || tempRes.items || [];
      } catch (e) {
        console.error('加载选项失败', e);
      }
    };

    // 动态费用明细
    const addFeeItem = () => {
      form.fee_items.push({ name: '', quantity: 1, unit_price: 0 });
    };

    const removeFeeItem = (index) => {
      form.fee_items.splice(index, 1);
    };

    const totalFee = computed(() => {
      return form.fee_items.reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unit_price || 0);
      }, 0);
    });

    // 动态物料明细
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
        row.unit = mat.unit;
      }
    };

    // 应用模板
    const applyTemplate = async (templateId) => {
      if (!templateId) return;

      try {
        const template = await apiService.getTemplate?.(templateId);
        if (template) {
          // 这里根据实际模板结构填充表单
          if (template.default_content) {
            form.fault_description = template.default_content;
          }
          ElMessage.success('模板已应用');
        }
      } catch (e) {
        ElMessage.error('应用模板失败');
      }
    };

    // 提交创建
    const handleSubmit = async () => {
      submitting.value = true;

      try {
        const payload = {
          ...form,
          total_fee: totalFee.value
        };

        await apiService.createRecord(payload);
        ElMessage.success('工单创建成功');
        
        // 重置表单或跳转
        resetForm();
      } catch (e) {
        console.error('创建失败', e);
        ElMessage.error('创建工单失败');
      } finally {
        submitting.value = false;
      }
    };

    const resetForm = () => {
      Object.assign(form, {
        record_type: 'maintenance',
        customer_name: null,
        staff_names: [],
        priority: 'medium',
        service_address: '',
        appointment_time: '',
        fault_description: '',
        construction_content: '',
        fee_items: [],
        material_items: [],
        photos: [],
        remark: ''
      });
      selectedTemplateId.value = null;
    };

    const handleCancel = () => {
      // 触发父组件关闭弹窗或返回列表
      window.history.back();
    };

    onMounted(() => {
      loadOptions();
    });

    return {
      formRef,
      form,
      submitting,
      selectedTemplateId,
      customers,
      staffList,
      materials,
      templates,
      totalFee,
      addFeeItem,
      removeFeeItem,
      addMaterialItem,
      removeMaterialItem,
      onMaterialChange,
      applyTemplate,
      handleSubmit,
      handleCancel
    };
  }
};

window.RecordCreate = RecordCreate;
RecordCreate;