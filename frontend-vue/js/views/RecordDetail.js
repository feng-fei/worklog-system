const RecordDetail = {
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
              工单详情
              <el-tag v-if="record" :type="getStatusType(record.status)" size="small" style="margin-left:8px;">
                {{ getStatusText(record.status) }}
              </el-tag>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" disabled>
              <el-icon style="margin-right:4px;"><Edit /></el-icon>
              编辑
            </el-button>
            <el-button @click="handlePrint">
              <el-icon style="margin-right:4px;"><Printer /></el-icon>
              打印
            </el-button>
            <el-dropdown @command="handleStatusAction" v-if="record && canChangeStatus">
              <el-button type="warning">
                状态操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="complete" v-if="canComplete">完成工单</el-dropdown-item>
                  <el-dropdown-item command="incomplete" v-if="canIncomplete">标记未完成</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="success" @click="handlePayment" v-if="record && record.payment_status !== 'paid'">
              <el-icon style="margin-right:4px;"><Money /></el-icon>
              收款
            </el-button>
            <el-button type="danger" @click="handleDelete" v-if="record">
              <el-icon style="margin-right:4px;"><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="!recordId"
          title="请从工单列表选择工单查看详情"
          type="info"
          :closable="false"
          style="margin-bottom:16px;"
        />

        <div v-loading="loading" v-if="record">
          <el-descriptions title="基本信息" :column="3" border style="margin-bottom:20px;">
            <el-descriptions-item label="工单号">{{ record.order_no || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工单类型">{{ getRecordTypeText(record.record_type) }}</el-descriptions-item>
            <el-descriptions-item label="工单子类型">{{ record.work_subtype || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(record.status)">{{ getStatusText(record.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="优先级">{{ getPriorityText(record.priority) }}</el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ record.customer_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ record.contact_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ record.customer_phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作地址" :span="3">{{ record.work_address || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作日期">{{ formatDate(record.work_date) }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ record.start_time || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ record.end_time || '-' }}</el-descriptions-item>
            <el-descriptions-item label="接报时间">{{ record.accept_time || '-' }}</el-descriptions-item>
            <el-descriptions-item label="负责人">
              <template v-if="staffNameList && staffNameList.length > 0">
                <el-tag v-for="(name, idx) in staffNameList" :key="idx" size="small" style="margin-right:4px;margin-bottom:2px;">{{ name }}</el-tag>
              </template>
              <template v-else>{{ record.staff_name || '-' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="关联项目">{{ projectName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="服务分类">{{ record.service_category || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="工作描述" :column="2" border style="margin-bottom:20px;">
            <el-descriptions-item label="工作内容/故障描述" :span="2">
              <div style="white-space:pre-wrap;">{{ record.work_content || record.fault_description || '-' }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="故障诊断" :span="2">
              <div style="white-space:pre-wrap;">{{ record.fault_diagnosis || '-' }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="维修过程" :span="2">
              <div style="white-space:pre-wrap;">{{ record.repair_process || '-' }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="维修结果">{{ getRepairResultText(record.repair_result) }}</el-descriptions-item>
            <el-descriptions-item label="涉及系统">{{ record.involved_systems || '-' }}</el-descriptions-item>
            <el-descriptions-item label="是否完成">
              <el-tag :type="record.is_completed ? 'success' : 'info'">{{ record.is_completed ? '是' : '否' }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-descriptions v-if="record.status === 'incomplete' || record.incomplete_reason" title="未完成原因" :column="2" border style="margin-bottom:20px;">
            <el-descriptions-item label="原因类型">{{ getIncompleteReasonTypeText(record.incomplete_reason_type) }}</el-descriptions-item>
            <el-descriptions-item label="原因描述" :span="2">
              <div style="white-space:pre-wrap;">{{ record.incomplete_reason || '-' }}</div>
            </el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="费用信息" :column="3" border style="margin-bottom:20px;">
            <el-descriptions-item label="人工费">¥{{ formatMoney(record.labor_fee) }}</el-descriptions-item>
            <el-descriptions-item label="材料费">¥{{ formatMoney(record.material_fee) }}</el-descriptions-item>
            <el-descriptions-item label="交通费">¥{{ formatMoney(record.transport_fee) }}</el-descriptions-item>
            <el-descriptions-item label="其他费">¥{{ formatMoney(record.other_fee) }}</el-descriptions-item>
            <el-descriptions-item label="税费类型">{{ getTaxTypeText(record.tax_type) }}</el-descriptions-item>
            <el-descriptions-item label="税率">{{ record.tax_type === 'tax' ? ((record.tax_rate * 100).toFixed(1) + '%') : '-' }}</el-descriptions-item>
            <el-descriptions-item label="税额">¥{{ formatMoney(record.tax_amount) }}</el-descriptions-item>
            <el-descriptions-item label="总计">
              <span style="font-size:16px;font-weight:bold;color:#f56c6c;">¥{{ formatMoney(record.total_fee) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="收款状态">
              <el-tag :type="getPaymentStatusType(record.payment_status)">{{ getPaymentStatusText(record.payment_status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="已收款">¥{{ formatMoney(record.paid_amount) }}</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="保修信息" :column="3" border style="margin-bottom:20px;">
            <el-descriptions-item label="保修状态">{{ getWarrantyStatusText(record.warranty_status) }}</el-descriptions-item>
            <el-descriptions-item label="保修天数">{{ record.warranty_days || 0 }}天</el-descriptions-item>
            <el-descriptions-item label="满意度">
              <el-rate v-model="satisfactionValue" disabled :max="5" />
            </el-descriptions-item>
            <el-descriptions-item label="客户反馈" :span="3">
              <div style="white-space:pre-wrap;">{{ record.customer_feedback || '-' }}</div>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="tempStaffDetails && tempStaffDetails.length > 0" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:12px;">临时工明细</div>
            <el-table :data="tempStaffDetails" border size="small">
              <el-table-column prop="name" label="姓名" min-width="120" />
              <el-table-column prop="hours" label="工时(小时)" width="120" />
              <el-table-column prop="daily_wage" label="日薪(元)" width="120">
                <template #default="{ row }">¥{{ formatMoney(row.daily_wage) }}</template>
              </el-table-column>
              <el-table-column label="小计(元)" width="120">
                <template #default="{ row }">
                  ¥{{ formatMoney(((row.hours || 0) / 8) * (row.daily_wage || 0)) }}
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="feeItems && feeItems.length > 0" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:12px;">费用明细</div>
            <el-table :data="feeItems" border size="small">
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="desc" label="项目名" min-width="180">
                <template #default="{ row }">{{ row.desc || row.name || '-' }}</template>
              </el-table-column>
              <el-table-column prop="qty" label="数量" width="100" />
              <el-table-column prop="unit" label="单位" width="80" />
              <el-table-column prop="price" label="单价" width="120">
                <template #default="{ row }">¥{{ formatMoney(row.price || row.unit_price) }}</template>
              </el-table-column>
              <el-table-column label="小计" width="120">
                <template #default="{ row }">
                  ¥{{ formatMoney(row.subtotal || ((row.qty || row.quantity || 0) * (row.price || row.unit_price || 0))) }}
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-descriptions title="备注" :column="1" border style="margin-bottom:20px;">
            <el-descriptions-item>
              <div style="white-space:pre-wrap;">{{ record.remark || '-' }}</div>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="repairEquipments && repairEquipments.length > 0" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:12px;">维修设备明细</div>
            <el-table :data="repairEquipments" border size="small">
              <el-table-column prop="system_type" label="系统类型" width="120" />
              <el-table-column prop="device_name" label="设备名" min-width="120" />
              <el-table-column prop="device_brand" label="品牌" width="100" />
              <el-table-column prop="device_model" label="型号" width="120" />
              <el-table-column prop="quantity" label="数量" width="80" />
              <el-table-column prop="location" label="位置" width="120" />
              <el-table-column prop="fault_description" label="故障描述" min-width="150" show-overflow-tooltip />
              <el-table-column prop="repair_method" label="维修方法" width="120" show-overflow-tooltip />
              <el-table-column prop="repair_result" label="维修结果" width="100" />
              <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
              <el-table-column label="费用小计" width="120">
                <template #default="{ row }">¥{{ formatMoney(row.subtotal) }}</template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="workPhotos && workPhotos.length > 0" style="margin-bottom:20px;">
            <div class="section-title" style="margin-bottom:12px;">现场照片</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;">
              <el-image
                v-for="(photo, idx) in workPhotos"
                :key="idx"
                :src="photo"
                :preview-src-list="workPhotos"
                :initial-index="idx"
                fit="cover"
                style="width:120px;height:120px;border-radius:8px;border:1px solid #e4e7ed;cursor:pointer;"
                preview-teleported
              />
            </div>
          </div>

          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e7ed;display:flex;justify-content:space-between;align-items:center;">
            <el-button @click="goBack">
              <el-icon style="margin-right:4px;"><ArrowLeft /></el-icon>
              返回列表
            </el-button>
            <div style="font-size:13px;color:#909399;">
              创建时间：{{ formatDateTime(record.created_at) }}
            </div>
          </div>
        </div>
      </div>

      <el-dialog v-model="paymentDialogVisible" title="添加收款" width="450px">
        <el-form :model="paymentForm" label-width="100px">
          <el-form-item label="收款日期">
            <el-date-picker v-model="paymentForm.payment_date" type="date" value-format="YYYY-MM-DD" style="width:100%;" />
          </el-form-item>
          <el-form-item label="收款金额">
            <el-input-number v-model="paymentForm.amount" :min="0" :precision="2" style="width:100%;" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="paymentForm.payment_method" style="width:100%;">
              <el-option label="现金" value="cash" />
              <el-option label="银行转账" value="bank" />
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="paymentForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="paymentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitPayment" :loading="paymentSubmitting">确定收款</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, computed, onMounted, watch } = Vue;
    const { useRoute, useRouter } = VueRouter;

    const route = useRoute();
    const router = useRouter();

    const recordId = ref(null);
    const record = ref(null);
    const projectName = ref('');
    const loading = ref(false);
    const paymentDialogVisible = ref(false);
    const paymentSubmitting = ref(false);
    const paymentForm = Vue.reactive({
      payment_date: '',
      amount: 0,
      payment_method: 'cash',
      remark: '',
    });

    const satisfactionValue = computed(() => {
      const s = parseInt(record.value?.satisfaction);
      return isNaN(s) ? 0 : s;
    });

    const staffNameList = computed(() => {
      const names = record.value?.staff_names;
      if (Array.isArray(names)) {
        return names.filter(n => n && n.trim());
      }
      if (typeof names === 'string' && names.trim()) {
        return names.split(',').map(n => n.trim()).filter(n => n);
      }
      return [];
    });

    const workPhotos = computed(() => {
      const photos = record.value?.work_photos;
      if (Array.isArray(photos)) {
        return photos.filter(p => p && p.trim());
      }
      if (typeof photos === 'string' && photos.trim()) {
        return photos.split(',').map(p => p.trim()).filter(p => p);
      }
      return [];
    });

    const tempStaffDetails = computed(() => {
      const details = record.value?.temp_staff_details;
      if (Array.isArray(details)) return details;
      if (typeof details === 'string' && details.trim()) {
        try { return JSON.parse(details); } catch (e) { return []; }
      }
      return [];
    });

    const feeItems = computed(() => {
      const items = record.value?.fee_items;
      if (Array.isArray(items)) return items;
      if (typeof items === 'string' && items.trim()) {
        try { return JSON.parse(items); } catch (e) { return []; }
      }
      return [];
    });

    const repairEquipments = computed(() => {
      const eqs = record.value?.repair_equipments || record.value?.equipment_details;
      if (Array.isArray(eqs)) return eqs;
      if (typeof eqs === 'string' && eqs.trim()) {
        try { return JSON.parse(eqs); } catch (e) { return []; }
      }
      return [];
    });

    const canComplete = computed(() => {
      const s = record.value?.status;
      return s === 'in_progress' || s === 'settlement' || s === 'callback' || s === 'dispatched';
    });

    const canIncomplete = computed(() => {
      const s = record.value?.status;
      return s === 'in_progress' || s === 'dispatched';
    });

    const canChangeStatus = computed(() => {
      return canComplete.value || canIncomplete.value;
    });

    const getRecordTypeText = (type) => {
      const map = { construction: '施工工单', repair: '维修工单' };
      return map[type] || type || '-';
    };

    const getStatusText = (status) => {
      const map = {
        pending: '待处理',
        dispatched: '已派单',
        in_progress: '处理中',
        callback: '待回访',
        settlement: '待结算',
        completed: '已完成',
        incomplete: '未完成',
        unable: '无法处理',
        rework: '返工',
        cancelled: '已取消'
      };
      return map[status] || status;
    };

    const getStatusType = (status) => {
      const map = {
        pending: 'warning',
        in_progress: 'primary',
        completed: 'success',
        incomplete: 'danger',
        paid: 'default'
      };
      return map[status] || 'info';
    };

    const getPaymentStatusText = (status) => {
      const map = { unpaid: '未收款', partial: '部分收款', partial_paid: '部分收款', paid: '已收款', monthly: '月结' };
      return map[status] || status;
    };

    const getPaymentStatusType = (status) => {
      const map = { unpaid: 'danger', partial: 'warning', partial_paid: 'warning', paid: 'success' };
      return map[status] || 'info';
    };

    const getPriorityText = (priority) => {
      const map = { low: '低', medium: '中', normal: '普通', high: '高', urgent: '紧急' };
      return map[priority] || priority || '-';
    };

    const getTaxTypeText = (type) => {
      return type === 'tax' ? '含税' : '不含税';
    };

    const getWarrantyStatusText = (status) => {
      const map = { none: '无保修', in_warranty: '保修中', expired: '已过保' };
      return map[status] || status || '-';
    };

    const getRepairResultText = (result) => {
      const map = { completed: '已修复', pending: '未修复', replaced: '已更换', adjusted: '已调试' };
      return map[result] || result || '-';
    };

    const getIncompleteReasonTypeText = (type) => {
      const map = { parts_shortage: '缺配件', customer_reason: '客户原因', unable_repair: '无法维修', other: '其他' };
      return map[type] || type || '-';
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      return dayjs(dateStr).format('YYYY-MM-DD');
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
    };

    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return num.toFixed(2);
    };

    const loadRecord = (id) => {
      if (!id) return;
      loading.value = true;
      record.value = null;
      projectName.value = '';
      
      apiService.getRecord(id)
        .then((res) => {
          record.value = res || null;
          if (res && res.project_id) {
            apiService.getProject(res.project_id)
              .then((proj) => {
                projectName.value = proj?.name || proj?.project_name || '';
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载工单详情失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const goBack = () => {
      router.push('/records');
    };

    const handlePrint = () => {
      window.print();
    };

    const handleDelete = () => {
      ElementPlus.ElMessageBox.confirm('确定删除该工单吗？此操作不可恢复。', '提示', { type: 'warning' })
        .then(() => {
          apiService.deleteRecord(recordId.value)
            .then(() => {
              ElementPlus.ElMessage.success('删除成功');
              router.push('/records');
            })
            .catch(() => {});
        })
        .catch(() => {});
    };

    const handleStatusAction = (command) => {
      if (command === 'complete') {
        ElementPlus.ElMessageBox.confirm('确定将工单标记为已完成吗？', '提示', { type: 'warning' })
          .then(() => {
            apiService.updateRecord(recordId.value, { status: 'completed', is_completed: true })
              .then(() => {
                ElementPlus.ElMessage.success('工单已完成');
                loadRecord(recordId.value);
              })
              .catch(() => {});
          })
          .catch(() => {});
      } else if (command === 'incomplete') {
        ElementPlus.ElMessageBox.prompt('请输入未完成原因', '标记未完成', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputType: 'textarea',
          inputPlaceholder: '请描述未完成原因'
        })
          .then(({ value }) => {
            if (!value || !value.trim()) {
              ElementPlus.ElMessage.warning('请输入未完成原因');
              return;
            }
            apiService.updateRecord(recordId.value, { 
              status: 'incomplete', 
              is_completed: false,
              incomplete_reason: value,
              repair_result: 'pending'
            })
              .then(() => {
                ElementPlus.ElMessage.success('已标记为未完成');
                loadRecord(recordId.value);
              })
              .catch(() => {});
          })
          .catch(() => {});
      }
    };

    const handlePayment = () => {
      const unpaid = Math.max(0, (record.value?.total_fee || 0) - (record.value?.paid_amount || 0));
      Object.assign(paymentForm, {
        payment_date: dayjs().format('YYYY-MM-DD'),
        amount: unpaid > 0 ? unpaid : 0,
        payment_method: 'cash',
        remark: '',
      });
      paymentDialogVisible.value = true;
    };

    const handleSubmitPayment = () => {
      if (!paymentForm.amount || paymentForm.amount <= 0) {
        ElementPlus.ElMessage.warning('请输入收款金额');
        return;
      }
      paymentSubmitting.value = true;
      apiService.createPayment({
        ...paymentForm,
        record_id: recordId.value,
        customer_name: record.value?.customer_name || ''
      })
        .then(() => {
          ElementPlus.ElMessage.success('收款添加成功');
          paymentDialogVisible.value = false;
          loadRecord(recordId.value);
        })
        .catch(() => {})
        .finally(() => {
          paymentSubmitting.value = false;
        });
    };

    onMounted(() => {
      const id = route.params.id;
      if (id) {
        recordId.value = id;
        loadRecord(id);
      }
    });

    watch(() => route.params.id, (newId) => {
      if (newId && newId !== recordId.value) {
        recordId.value = newId;
        loadRecord(newId);
      }
    });

    return {
      recordId,
      record,
      projectName,
      loading,
      paymentDialogVisible,
      paymentSubmitting,
      paymentForm,
      satisfactionValue,
      staffNameList,
      workPhotos,
      tempStaffDetails,
      feeItems,
      repairEquipments,
      canComplete,
      canIncomplete,
      canChangeStatus,
      getRecordTypeText,
      getStatusText,
      getStatusType,
      getPaymentStatusText,
      getPaymentStatusType,
      getPriorityText,
      getTaxTypeText,
      getWarrantyStatusText,
      getRepairResultText,
      getIncompleteReasonTypeText,
      formatDate,
      formatDateTime,
      formatMoney,
      goBack,
      handlePrint,
      handleDelete,
      handleStatusAction,
      handlePayment,
      handleSubmitPayment,
    };
  },
};

window.RecordDetailView = RecordDetail;
