const SettingsView = {
  template: `
    <div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="系统设置" name="system">
          <div class="page-card">
            <div class="section-title" style="margin-bottom:16px;">基本设置</div>
            <el-form :model="systemForm" label-width="140px" style="max-width:600px;">
              <el-form-item label="操作日志保留天数">
                <el-input-number v-model="systemForm.oplog_retention_days" :min="7" :max="365" />
                <span style="margin-left:12px;color:#909399;font-size:13px;">超过此天数的日志将被自动清理</span>
              </el-form-item>
              <el-form-item label="低库存预警阈值">
                <el-input-number v-model="systemForm.default_min_stock" :min="0" :precision="2" />
                <span style="margin-left:12px;color:#909399;font-size:13px;">新建物料时的默认预警值</span>
              </el-form-item>
              <el-form-item label="系统名称">
                <el-input v-model="systemForm.system_name" placeholder="工单管理系统" style="width:300px;" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveSystemSettings" :loading="saving">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="操作日志" name="oplog">
          <div class="page-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div class="section-title" style="margin:0;">操作日志</div>
              <div style="display:flex;gap:8px;">
                <el-button type="danger" @click="handleCleanupLogs">
                  <el-icon style="margin-right:4px;"><Delete /></el-icon>
                  清理日志
                </el-button>
                <el-button @click="loadOperationLogs">
                  <el-icon style="margin-right:4px;"><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </div>

            <div class="filter-bar">
              <el-select v-model="oplogFilters.target_type" placeholder="操作类型" clearable style="width:140px;">
                <el-option label="全部" value="" />
                <el-option label="工单" value="work_record" />
                <el-option label="客户" value="customer" />
                <el-option label="员工" value="staff" />
                <el-option label="物料" value="material" />
                <el-option label="收款" value="payment" />
                <el-option label="支出" value="expense" />
                <el-option label="工资" value="salary" />
                <el-option label="项目" value="project" />
              </el-select>

              <el-select v-model="oplogFilters.action" placeholder="操作动作" clearable style="width:120px;">
                <el-option label="全部" value="" />
                <el-option label="创建" value="create" />
                <el-option label="更新" value="update" />
                <el-option label="删除" value="delete" />
              </el-select>

              <el-input
                v-model="oplogFilters.operator"
                placeholder="操作人"
                clearable
                style="width:120px;"
              />

              <el-date-picker
                v-model="oplogDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width:260px;"
              />

              <el-button type="primary" @click="loadOperationLogs">查询</el-button>
              <el-button @click="resetOplogFilters">重置</el-button>
            </div>

            <el-table :data="operationLogs" style="width:100%;" v-loading="oplogLoading" stripe>
              <el-table-column prop="created_at" label="时间" width="160">
                <template #default="{ row }">
                  {{ formatDateTime(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column prop="target_type" label="操作类型" width="100">
                <template #default="{ row }">
                  {{ getTargetTypeLabel(row.target_type) }}
                </template>
              </el-table-column>
              <el-table-column prop="action" label="动作" width="80">
                <template #default="{ row }">
                  <el-tag size="small" :type="getActionTagType(row.action)">
                    {{ getActionLabel(row.action) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="target_title" label="对象" min-width="150" show-overflow-tooltip />
              <el-table-column prop="operator" label="操作人" width="100" />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewLogDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-bar">
              <el-pagination
                v-model:current-page="oplogPagination.page"
                v-model:page-size="oplogPagination.per_page"
                :page-sizes="[10, 20, 50, 100]"
                :total="oplogPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleOplogSizeChange"
                @current-change="handleOplogPageChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="数据备份" name="backup">
          <div class="page-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div class="section-title" style="margin:0;">数据备份</div>
              <el-button type="primary" @click="createBackup" :loading="creatingBackup">
                <el-icon style="margin-right:4px;"><Plus /></el-icon>
                创建备份
              </el-button>
            </div>

            <el-alert
              title="备份说明"
              type="info"
              :closable="false"
              style="margin-bottom:16px;"
            >
              <p>• 备份文件保存在服务器 uploads/backup 目录下</p>
              <p>• 建议定期下载备份文件到本地保存</p>
              <p>• 恢复备份前请确保已备份当前数据</p>
            </el-alert>

            <el-table :data="backupList" style="width:100%;" v-loading="backupLoading" stripe>
              <el-table-column prop="filename" label="文件名" min-width="250" />
              <el-table-column prop="size" label="大小" width="120" align="right">
                <template #default="{ row }">
                  {{ formatFileSize(row.size) }}
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" width="160">
                <template #default="{ row }">
                  {{ formatDateTime(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="downloadBackup(row)">下载</el-button>
                  <el-button link type="warning" size="small" @click="restoreBackup(row)">恢复</el-button>
                  <el-button link type="danger" size="small" @click="deleteBackup(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="password">
          <div class="page-card" style="max-width:500px;">
            <div class="section-title" style="margin-bottom:16px;">修改密码</div>
            <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
              <el-form-item label="原密码" prop="old_password">
                <el-input v-model="passwordForm.old_password" type="password" show-password placeholder="请输入原密码" />
              </el-form-item>
              <el-form-item label="新密码" prop="new_password">
                <el-input v-model="passwordForm.new_password" type="password" show-password placeholder="请输入新密码" />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirm_password">
                <el-input v-model="passwordForm.confirm_password" type="password" show-password placeholder="请再次输入新密码" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="changePassword" :loading="changingPassword">确认修改</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-dialog v-model="logDetailVisible" title="操作日志详情" width="700px">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="操作时间">{{ formatDateTime(currentLog.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">{{ getTargetTypeLabel(currentLog.target_type) }}</el-descriptions-item>
          <el-descriptions-item label="操作动作">{{ getActionLabel(currentLog.action) }}</el-descriptions-item>
          <el-descriptions-item label="操作对象">{{ currentLog.target_title }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentLog.operator }}</el-descriptions-item>
        </el-descriptions>
        <el-tabs v-model="logDetailTab" style="margin-top:16px;">
          <el-tab-pane label="修改前" name="before">
            <pre style="background:#f5f7fa;padding:12px;border-radius:4px;max-height:300px;overflow:auto;font-size:12px;">{{ formatJson(currentLog.snapshot_before) }}</pre>
          </el-tab-pane>
          <el-tab-pane label="修改后" name="after">
            <pre style="background:#f5f7fa;padding:12px;border-radius:4px;max-height:300px;overflow:auto;font-size:12px;">{{ formatJson(currentLog.snapshot_after) }}</pre>
          </el-tab-pane>
        </el-tabs>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, onMounted } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const activeTab = ref('system');
    const saving = ref(false);
    const creatingBackup = ref(false);
    const changingPassword = ref(false);

    const systemForm = reactive({
      oplog_retention_days: 90,
      default_min_stock: 10,
      system_name: '工单管理系统',
    });

    const operationLogs = ref([]);
    const oplogLoading = ref(false);
    const oplogDateRange = ref([]);
    const logDetailVisible = ref(false);
    const logDetailTab = ref('before');
    const currentLog = ref({});

    const oplogFilters = reactive({
      target_type: '',
      action: '',
      operator: '',
    });

    const oplogPagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const backupList = ref([]);
    const backupLoading = ref(false);

    const passwordForm = reactive({
      old_password: '',
      new_password: '',
      confirm_password: '',
    });

    const passwordFormRef = ref(null);

    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== passwordForm.new_password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };

    const passwordRules = {
      old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
      new_password: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
      ],
      confirm_password: [
        { required: true, message: '请再次输入新密码', trigger: 'blur' },
        { validator: validateConfirmPassword, trigger: 'blur' },
      ],
    };

    const formatDateTime = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '-';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatJson = (obj) => {
      if (!obj) return '-';
      try {
        return typeof obj === 'string' ? JSON.stringify(JSON.parse(obj), null, 2) : JSON.stringify(obj, null, 2);
      } catch (e) {
        return obj;
      }
    };

    const getTargetTypeLabel = (type) => {
      const map = {
        work_record: '工单',
        customer: '客户',
        staff: '员工',
        material: '物料',
        payment: '收款',
        expense: '支出',
        salary: '工资',
        project: '项目',
        pending_work: '待办',
        template: '模板',
      };
      return map[type] || type || '-';
    };

    const getActionLabel = (action) => {
      const map = { create: '创建', update: '更新', delete: '删除', login: '登录', logout: '登出' };
      return map[action] || action || '-';
    };

    const getActionTagType = (action) => {
      const map = { create: 'success', update: 'warning', delete: 'danger', login: 'primary', logout: 'info' };
      return map[action] || 'info';
    };

    const loadSystemSettings = async () => {
      try {
        const res = await apiService.getSystemSettings();
        if (res && res.settings) {
          Object.assign(systemForm, res.settings);
        }
      } catch (e) {
        console.error('加载系统设置失败', e);
      }
    };

    const saveSystemSettings = async () => {
      saving.value = true;
      try {
        for (const [key, value] of Object.entries(systemForm)) {
          await apiService.updateSystemSetting(key, value);
        }
        ElMessage.success('保存成功');
      } catch (e) {
        console.error('保存设置失败', e);
      } finally {
        saving.value = false;
      }
    };

    const loadOperationLogs = async () => {
      oplogLoading.value = true;
      try {
        const params = {
          page: oplogPagination.page,
          per_page: oplogPagination.per_page,
        };
        if (oplogFilters.target_type) params.target_type = oplogFilters.target_type;
        if (oplogFilters.action) params.action = oplogFilters.action;
        if (oplogFilters.operator) params.operator = oplogFilters.operator;
        if (oplogDateRange.value && oplogDateRange.value.length === 2) {
          params.start_date = oplogDateRange.value[0];
          params.end_date = oplogDateRange.value[1];
        }
        const res = await apiService.getOperationLogs(params);
        operationLogs.value = res.records || res.data || res.logs || [];
        oplogPagination.total = res.total || 0;
      } catch (e) {
        console.error('加载操作日志失败', e);
      } finally {
        oplogLoading.value = false;
      }
    };

    const resetOplogFilters = () => {
      oplogFilters.target_type = '';
      oplogFilters.action = '';
      oplogFilters.operator = '';
      oplogDateRange.value = [];
      oplogPagination.page = 1;
      loadOperationLogs();
    };

    const handleOplogPageChange = (page) => {
      oplogPagination.page = page;
      loadOperationLogs();
    };

    const handleOplogSizeChange = (size) => {
      oplogPagination.per_page = size;
      oplogPagination.page = 1;
      loadOperationLogs();
    };

    const viewLogDetail = (row) => {
      currentLog.value = row;
      logDetailVisible.value = true;
    };

    const handleCleanupLogs = async () => {
      try {
        await ElMessageBox.confirm(`确定清理 ${systemForm.oplog_retention_days} 天以前的操作日志吗？此操作不可恢复。`, '提示', {
          type: 'warning',
          confirmButtonText: '确定清理',
          cancelButtonText: '取消',
        });
        await apiService.cleanupOperationLogs(systemForm.oplog_retention_days);
        ElMessage.success('清理成功');
        loadOperationLogs();
      } catch (e) {
        // 取消
      }
    };

    const loadBackupList = async () => {
      backupLoading.value = true;
      try {
        const res = await apiService.getBackupList();
        backupList.value = res.records || res.data || res.backups || [];
      } catch (e) {
        console.error('加载备份列表失败', e);
      } finally {
        backupLoading.value = false;
      }
    };

    const createBackup = async () => {
      creatingBackup.value = true;
      try {
        await apiService.createBackup();
        ElMessage.success('备份创建成功');
        loadBackupList();
      } catch (e) {
        console.error('创建备份失败', e);
      } finally {
        creatingBackup.value = false;
      }
    };

    const downloadBackup = (row) => {
      ElMessage.info('下载备份: ' + row.filename);
    };

    const restoreBackup = async (row) => {
      try {
        await ElMessageBox.confirm(`确定从备份"${row.filename}"恢复数据吗？当前数据将被覆盖，建议先创建新备份。`, '警告', {
          type: 'error',
          confirmButtonText: '确定恢复',
          cancelButtonText: '取消',
        });
        ElMessage.info('恢复功能待实现');
      } catch (e) {
        // 取消
      }
    };

    const deleteBackup = async (row) => {
      try {
        await ElMessageBox.confirm(`确定删除备份"${row.filename}"吗？`, '提示', {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
        });
        await apiService.deleteBackup(row.filename);
        ElMessage.success('删除成功');
        loadBackupList();
      } catch (e) {
        // 取消
      }
    };

    const changePassword = async () => {
      if (!passwordFormRef.value) return;
      try {
        await passwordFormRef.value.validate();
      } catch (e) {
        return;
      }
      changingPassword.value = true;
      try {
        await apiService.changePassword(passwordForm);
        ElMessage.success('密码修改成功');
        passwordForm.old_password = '';
        passwordForm.new_password = '';
        passwordForm.confirm_password = '';
      } catch (e) {
        console.error('修改密码失败', e);
      } finally {
        changingPassword.value = false;
      }
    };

    onMounted(() => {
      loadSystemSettings();
      loadOperationLogs();
      loadBackupList();
    });

    return {
      activeTab,
      saving,
      creatingBackup,
      changingPassword,
      systemForm,
      operationLogs,
      oplogLoading,
      oplogFilters,
      oplogPagination,
      oplogDateRange,
      logDetailVisible,
      logDetailTab,
      currentLog,
      backupList,
      backupLoading,
      passwordForm,
      passwordFormRef,
      passwordRules,
      formatDateTime,
      formatFileSize,
      formatJson,
      getTargetTypeLabel,
      getActionLabel,
      getActionTagType,
      loadSystemSettings,
      saveSystemSettings,
      loadOperationLogs,
      resetOplogFilters,
      handleOplogPageChange,
      handleOplogSizeChange,
      viewLogDetail,
      handleCleanupLogs,
      loadBackupList,
      createBackup,
      downloadBackup,
      restoreBackup,
      deleteBackup,
      changePassword,
    };
  },
};

window.SettingsView = SettingsView;
