const RecordDetailView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <el-button link @click="goBack">
              <el-icon><ArrowLeft /></el-icon>
              返回
            </el-button>
            <div class="section-title" style="margin:0;">
              {{ isEdit ? '编辑工单' : '工单详情' }}
              <el-tag v-if="recordInfo" :type="getStatusType(recordInfo.status)" size="small" style="margin-left:8px;">
                {{ getStatusText(recordInfo.status) }}
              </el-tag>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleEdit" v-if="!isEdit && recordInfo">
              <el-icon style="margin-right:4px;"><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="success" @click="handleSave" v-if="isEdit" :loading="submitting">
              <el-icon style="margin-right:4px;"><Check /></el-icon>
              保存
            </el-button>
            <el-button @click="handlePrint" v-if="recordInfo && !isEdit">
              <el-icon style="margin-right:4px;"><Printer /></el-icon>
              打印
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="!recordId && !isEdit"
          title="请从工单列表选择工单查看详情"
          type="info"
          :closable="false"
          style="margin-bottom:16px;"
        />

        <div v-loading="loading" v-if="recordInfo || isEdit">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本信息" name="basic">
              <el-form :model="form" label-width="120px" v-if="isEdit || recordInfo">
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="工单编号">
                      <span v-if="!isEdit">{{ form.order_no }}</span>
                      <el-input v-else v-model="form.order_no" placeholder="自动生成" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="工单类型" prop="record_type">
                      <template v-if="!isEdit">{{ getRecordTypeText(form.record_type) }}</template>
                      <el-select v-else v-model="form.record_type" placeholder="请选择工单类型" style="width:100%;">
                        <el-option label="施工工单" value="construction" />
                        <el-option label="维修工单" value="repair" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="客户名称" prop="customer_id">
                      <template v-if="!isEdit">{{ form.customer_name }}</template>
                      <el-select v-else v-model="form.customer_id" filterable placeholder="请选择客户" style="width:100%;">
                        <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="工单状态" prop="status">
                      <template v-if="!isEdit">
                        <el-tag :type="getStatusType(form.status)">{{ getStatusText(form.status) }}</el-tag>
                      </template>
                      <el-select v-else v-model="form.status" placeholder="请选择状态" style="width:100%;">
                        <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="负责人">
                      <template v-if="!isEdit">{{ form.staff_names || '-' }}</template>
                      <el-select v-else v-model="form.staff_names" multiple filterable placeholder="请选择负责人" style="width:100%;">
                        <el-option v-for="s in staffOptions" :key="s.name" :label="s.name" :value="s.name" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="优先级" prop="priority">
                      <template v-if="!isEdit">{{ getPriorityText(form.priority) }}</template>
                      <el-select v-else v-model="form.priority" placeholder="请选择优先级" style="width:100%;">
                        <el-option label="低" value="low" />
                        <el-option label="中" value="medium" />
                        <el-option label="高" value="high" />
                        <el-option label="紧急" value="urgent" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="预约时间">
                      <template v-if="!isEdit">{{ formatDateTime(form.appointment_time) }}</template>
                      <el-date-picker
                        v-else
                        v-model="form.appointment_time"
                        type="datetime"
                        placeholder="选择预约时间"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        style="width:100%;"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="完成时间">
                      <template v-if="!isEdit">{{ formatDateTime(form.completed_at) || '-' }}</template>
                      <el-date-picker
                        v-else
                        v-model="form.completed_at"
                        type="datetime"
                        placeholder="选择完成时间"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        style="width:100%;"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="工单来源">
                      <template v-if="!isEdit">{{ form.source || '-' }}</template>
                      <el-input v-else v-model="form.source" placeholder="请输入来源" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="联系人">
                      <template v-if="!isEdit">{{ form.contact_name || '-' }}</template>
                      <el-input v-else v-model="form.contact_name" placeholder="请输入联系人" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="24">
                  <el-col :span="12">
                    <el-form-item label="联系电话">
                      <template v-if="!isEdit">{{ form.contact_phone || '-' }}</template>
                      <el-input v-else v-model="form.contact_phone" placeholder="请输入联系电话" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="服务地址">
                      <template v-if="!isEdit">{{ form.service_address || '-' }}</template>
                      <el-input v-else v-model="form.service_address" placeholder="请输入服务地址" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="工单标题" v-if="form.record_type === 'maintenance'">
                  <template v-if="!isEdit">{{ form.title || '-' }}</template>
                  <el-input v-else v-model="form.title" placeholder="请输入工单标题" />
                </el-form-item>
                <el-form-item label="故障描述" v-if="form.record_type === 'maintenance'">
                  <template v-if="!isEdit">{{ form.fault_description || '-' }}</template>
                  <el-input v-else v-model="form.fault_description" type="textarea" :rows="3" placeholder="请输入故障描述" />
                </el-form-item>
                <el-form-item label="施工内容" v-if="form.record_type === 'construction'">
                  <template v-if="!isEdit">{{ form.construction_content || '-' }}</template>
                  <el-input v-else v-model="form.construction_content" type="textarea" :rows="3" placeholder="请输入施工内容" />
                </el-form-item>
                <el-form-item label="服务内容">
                  <template v-if="!isEdit">{{ form.service_content || '-' }}</template>
                  <el-input v-else v-model="form.service_content" type="textarea" :rows="3" placeholder="请输入服务内容" />
                </el-form-item>
                <el-form-item label="处理结果">
                  <template v-if="!isEdit">{{ form.result || '-' }}</template>
                  <el-input v-else v-model="form.result" type="textarea" :rows="3" placeholder="请输入处理结果" />
                </el-form-item>
                <el-form-item label="备注">
                  <template v-if="!isEdit">{{ form.remark || '-' }}</template>
                  <el-input v-else v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="费用明细" name="fee">
              <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:bold;">费用项目</div>
                <el-button type="primary" size="small" @click="addFeeItem" v-if="isEdit">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>
                  添加费用
                </el-button>
              </div>
              <el-table :data="form.fee_items || []" border size="small">
                <el-table-column prop="name" label="项目名称" min-width="150">
                  <template #default="{ row }">
                    <template v-if="isEdit">
                      <el-input v-model="row.name" size="small" placeholder="项目名称" />
                    </template>
                    <template v-else>{{ row.name }}</template>
                  </template>
                </el-table-column>
                <el-table-column prop="quantity" label="数量" width="100">
                  <template #default="{ row }">
                    <template v-if="isEdit">
                      <el-input-number v-model="row.quantity" :min="0" size="small" style="width:100%;" />
                    </template>
                    <template v-else>{{ row.quantity }}</template>
                  </template>
                </el-table-column>
                <el-table-column prop="unit_price" label="单价" width="120">
                  <template #default="{ row }">
                    <template v-if="isEdit">
                      <el-input-number v-model="row.unit_price" :min="0" :precision="2" size="small" style="width:100%;" />
                    </template>
                    <template v-else>¥{{ (row.unit_price || 0).toFixed(2) }}</template>
                  </template>
                </el-table-column>
                <el-table-column label="小计" width="120">
                  <template #default="{ row }">
                    ¥{{ ((row.quantity || 0) * (row.unit_price || 0)).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" v-if="isEdit">
                  <template #default="{ $index }">
                    <el-button link type="danger" size="small" @click="removeFeeItem($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div style="margin-top:16px;text-align:right;">
                <span style="font-size:16px;">总计：</span>
                <span style="font-size:20px;font-weight:bold;color:#f56c6c;">¥{{ totalFee.toFixed(2) }}</span>
              </div>
            </el-tab-pane>

            <el-tab-pane label="设备物料" name="material" v-if="form.record_type === 'maintenance'">
              <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:bold;">使用物料</div>
                <el-button type="primary" size="small" @click="addMaterialItem" v-if="isEdit">
                  <el-icon style="margin-right:4px;"><Plus /></el-icon>
                  添加物料
                </el-button>
              </div>
              <el-table :data="form.material_items || []" border size="small">
                <el-table-column prop="material_name" label="物料名称" min-width="150">
                  <template #default="{ row }">
                    <template v-if="isEdit">
                      <el-select v-model="row.material_id" filterable placeholder="选择物料" size="small" style="width:100%;" @change="onMaterialChange(row)">
                        <el-option v-for="m in materialOptions" :key="m.id" :label="m.name" :value="m.id" />
                      </el-select>
                    </template>
                    <template v-else>{{ row.material_name }}</template>
                  </template>
                </el-table-column>
                <el-table-column prop="quantity" label="数量" width="100">
                  <template #default="{ row }">
                    <template v-if="isEdit">
                      <el-input-number v-model="row.quantity" :min="0" size="small" style="width:100%;" />
                    </template>
                    <template v-else>{{ row.quantity }}</template>
                  </template>
                </el-table-column>
                <el-table-column prop="unit" label="单位" width="80">
                  <template #default="{ row }">{{ row.unit || '-' }}</template>
                </el-table-column>
                <el-table-column label="操作" width="100" v-if="isEdit">
                  <template #default="{ $index }">
                    <el-button link type="danger" size="small" @click="removeMaterialItem($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane label="附件" name="attachments">
              <el-empty description="暂无附件" v-if="!form.attachments || form.attachments.length === 0" />
              <div v-else style="display:flex;flex-wrap:wrap;gap:12px;">
                <div v-for="(file, idx) in form.attachments" :key="idx" style="width:120px;text-align:center;">
                  <div style="width:120px;height:120px;background:#f5f7fa;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
                    <el-icon style="font-size:32px;color:#909399;"><Paperclip /></el-icon>
                  </div>
                  <div style="font-size:12px;color:#606266;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ file.name }}</div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="操作日志" name="logs">
              <el-timeline>
                <el-timeline-item
                  v-for="(log, idx) in operationLogs"
                  :key="idx"
                  :timestamp="formatDateTime(log.created_at)"
                  placement="top"
                >
                  <el-card shadow="never" style="margin-bottom:0;">
                    <div style="font-weight:bold;">{{ log.action }}</div>
                    <div style="color:#909399;font-size:12px;margin-top:4px;">
                      操作人：{{ log.operator }}
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty description="暂无操作日志" v-if="!operationLogs || operationLogs.length === 0" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted, watch } = Vue;
    const { useRoute, useRouter } = VueRouter;

    const route = useRoute();
    const router = useRouter();

    const recordId = ref(null);
    const recordInfo = ref(null);
    const isEdit = ref(false);
    const loading = ref(false);
    const submitting = ref(false);
    const activeTab = ref('basic');
    const customerOptions = ref([]);
    const staffOptions = ref([]);
    const materialOptions = ref([]);
    const operationLogs = ref([]);

    const form = reactive({
      id: null,
      record_no: '',
      record_type: 'maintenance',
      customer_id: null,
      customer_name: '',
      status: 'pending',
      staff_names: [],
      priority: 'medium',
      appointment_time: '',
      completed_at: '',
      source: '',
      contact_name: '',
      contact_phone: '',
      service_address: '',
      title: '',
      fault_description: '',
      construction_content: '',
      service_content: '',
      result: '',
      remark: '',
      fee_items: [],
      material_items: [],
      attachments: [],
    });

    const statusOptions = [
      { label: '待处理', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '待验收', value: 'pending_accept' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ];

    const totalFee = computed(() => {
      return (form.fee_items || []).reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unit_price || 0);
      }, 0);
    });

    const getRecordTypeText = (type) => {
      return type === 'construction' ? '施工工单' : '维修工单';
    };

    const getStatusText = (status) => {
      const map = {
        pending: '待处理',
        processing: '处理中',
        pending_accept: '待验收',
        completed: '已完成',
        cancelled: '已取消',
      };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = {
        pending: 'info',
        processing: 'warning',
        pending_accept: 'primary',
        completed: 'success',
        cancelled: 'danger',
      };
      return map[status] || 'info';
    };

    const getPriorityText = (priority) => {
      const map = { low: '低', medium: '中', high: '高', urgent: '紧急' };
      return map[priority] || priority;
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
    };

    const loadRecord = (id) => {
      if (!id) return;
      loading.value = true;
      apiService.getRecord(id)
        .then((res) => {
          recordInfo.value = res || null;
          if (res) {
            Object.assign(form, res);
          }
          if (!Array.isArray(form.fee_items)) form.fee_items = [];
          if (!Array.isArray(form.material_items)) form.material_items = [];
          if (!Array.isArray(form.attachments)) form.attachments = [];
          if (!Array.isArray(form.staff_names)) form.staff_names = [];
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载工单详情失败');
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

    const loadStaffs = () => {
      apiService.getStaffs({ per_page: 1000, enabled: 'true' })
        .then((res) => {
          const data = res && res.records ? res.records : [];
          staffOptions.value = Array.isArray(data) ? data : [];
        })
        .catch(() => {});
    };

    const loadMaterials = () => {
      apiService.getMaterials({ per_page: 1000 })
        .then((res) => {
          const data = res && res.records ? res.records : [];
          materialOptions.value = Array.isArray(data) ? data : [];
        })
        .catch(() => {});
    };

    const goBack = () => {
      router.push('/records');
    };

    const handleEdit = () => {
      isEdit.value = true;
    };

    const handleSave = () => {
      submitting.value = true;
      const data = { ...form };
      apiService.updateRecord(form.id, data)
        .then(() => {
          ElementPlus.ElMessage.success('保存成功');
          isEdit.value = false;
          loadRecord(form.id);
        })
        .finally(() => {
          submitting.value = false;
        });
    };

    const handlePrint = () => {
      window.print();
    };

    const addFeeItem = () => {
      if (!form.fee_items) form.fee_items = [];
      form.fee_items.push({ name: '', quantity: 1, unit_price: 0 });
    };

    const removeFeeItem = (index) => {
      form.fee_items.splice(index, 1);
    };

    const addMaterialItem = () => {
      if (!form.material_items) form.material_items = [];
      form.material_items.push({ material_id: null, material_name: '', quantity: 1, unit: '' });
    };

    const removeMaterialItem = (index) => {
      form.material_items.splice(index, 1);
    };

    const onMaterialChange = (row) => {
      const mat = materialOptions.value.find(m => m.id === row.material_id);
      if (mat) {
        row.material_name = mat.name;
        row.unit = mat.unit;
      }
    };

    onMounted(() => {
      const id = route.params.id;
      if (id) {
        recordId.value = id;
        loadRecord(id);
      } else {
        isEdit.value = true;
      }
      loadCustomers();
      loadStaffs();
      loadMaterials();
    });

    watch(() => route.params.id, (newId) => {
      if (newId && newId !== recordId.value) {
        recordId.value = newId;
        loadRecord(newId);
        isEdit.value = false;
      }
    });

    return {
      recordId,
      recordInfo,
      isEdit,
      loading,
      submitting,
      activeTab,
      form,
      customerOptions,
      staffOptions,
      materialOptions,
      operationLogs,
      statusOptions,
      totalFee,
      getRecordTypeText,
      getStatusText,
      getStatusType,
      getPriorityText,
      formatDateTime,
      goBack,
      handleEdit,
      handleSave,
      handlePrint,
      addFeeItem,
      removeFeeItem,
      addMaterialItem,
      removeMaterialItem,
      onMaterialChange,
    };
  },
};

window.RecordDetailView = RecordDetailView;
