const StaffView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div class="section-title" style="margin:0;">员工管理</div>
          <div style="display:flex;gap:8px;">
            <el-button type="primary" @click="handleCreate" v-if="isAdmin">
              <el-icon style="margin-right:4px;"><Plus /></el-icon>
              新增员工
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
            placeholder="搜索姓名/用户名/手机号"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.role" placeholder="角色" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="员工" value="worker" />
          </el-select>

          <el-select v-model="filters.enabled" placeholder="状态" clearable style="width:140px;">
            <el-option label="全部" value="" />
            <el-option label="启用" value="true" />
            <el-option label="禁用" value="false" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="staffList" style="width:100%;" v-loading="loading" stripe>
          <el-table-column prop="username" label="用户名" width="140" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="role" label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                {{ row.role === 'admin' ? '管理员' : '员工' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="手机号" width="140" />
          <el-table-column prop="email" label="邮箱" width="200" show-overflow-tooltip />
          <el-table-column prop="position" label="职位" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                {{ row.enabled ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="primary" size="small" @click="handleResetPassword(row)">重置密码</el-button>
              <el-button link :type="row.enabled ? 'warning' : 'success'" size="small" @click="handleToggleEnabled(row)">
                {{ row.enabled ? '禁用' : '启用' }}
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
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
          </el-form-item>
          <el-form-item label="密码" prop="password" v-if="!isEdit">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
          </el-form-item>
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择角色" style="width:100%;">
              <el-option label="管理员" value="admin" />
              <el-option label="员工" value="worker" />
            </el-select>
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="职位">
            <el-input v-model="form.position" placeholder="请输入职位" />
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

      <el-dialog v-model="passwordDialogVisible" title="重置密码" width="400px">
        <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
          <el-form-item label="新密码" prop="new_password">
            <el-input v-model="passwordForm.new_password" type="password" placeholder="请输入新密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirm_password">
            <el-input v-model="passwordForm.confirm_password" type="password" placeholder="请确认新密码" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleResetPasswordSubmit" :loading="submitting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  `,
  setup() {
    const { ref, reactive, computed, onMounted } = Vue;

    const staffList = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const passwordDialogVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);
    const passwordFormRef = ref(null);

    const filters = reactive({
      keyword: '',
      role: '',
      enabled: '',
    });

    const pagination = reactive({
      page: 1,
      per_page: 20,
      total: 0,
    });

    const form = reactive({
      id: null,
      username: '',
      password: '',
      name: '',
      role: 'worker',
      phone: '',
      email: '',
      position: '',
      remark: '',
    });

    const passwordForm = reactive({
      staff_id: null,
      new_password: '',
      confirm_password: '',
    });

    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 50, message: '密码长度 6 到 50 个字符', trigger: 'blur' }
      ],
      name: [
        { required: true, message: '请输入姓名', trigger: 'blur' },
        { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
      ],
      role: [{ required: true, message: '请选择角色', trigger: 'change' }],
      phone: Validators.phone(false),
      email: Validators.email(false),
      id_card: Validators.idCard(false),
      base_salary: Validators.amount(false, 0, 999999),
      position: Validators.length(0, 50, '职位名称不超过 50 个字符')
    };

    const passwordRules = {
      new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
      confirm_password: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        {
          validator: (rule, value, callback) => {
            if (value !== passwordForm.new_password) {
              callback(new Error('两次输入的密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur',
        },
      ],
    };

    const isAdmin = computed(() => appStore.isAdmin);

    const dialogTitle = computed(() => (isEdit.value ? '编辑员工' : '新增员工'));

    const loadData = () => {
      loading.value = true;
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      apiService.getStaffs(params)
        .then((res) => {
          staffList.value = res.items || res.data || [];
          pagination.total = res.total || 0;
        })
        .catch(() => {
          ElementPlus.ElMessage.error('加载员工列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.role = '';
      filters.enabled = '';
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
      form.username = '';
      form.password = '';
      form.name = '';
      form.role = 'worker';
      form.phone = '';
      form.email = '';
      form.position = '';
      form.remark = '';
      dialogVisible.value = true;
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      form.id = row.id;
      form.username = row.username;
      form.name = row.name;
      form.role = row.role;
      form.phone = row.phone || '';
      form.email = row.email || '';
      form.position = row.position || '';
      form.remark = row.remark || '';
      dialogVisible.value = true;
    };

    const handleSubmit = () => {
      if (!formRef.value) return;
      formRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        const data = {
          username: form.username,
          name: form.name,
          role: form.role,
          phone: form.phone,
          email: form.email,
          position: form.position,
          remark: form.remark,
        };
        if (!isEdit.value) {
          data.password = form.password;
        }

        const request = isEdit.value
          ? apiService.updateStaff(form.id, data)
          : apiService.createStaff(data);

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

    const handleToggleEnabled = (row) => {
      ElementPlus.ElMessageBox.confirm(
        `确定要${row.enabled ? '禁用' : '启用'}员工「${row.name}」吗？`,
        '提示',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.toggleStaffEnabled(row.id);
        })
        .then(() => {
          ElementPlus.ElMessage.success('操作成功');
          loadData();
        })
        .catch(() => {});
    };

    const handleDelete = (row) => {
      ElementPlus.ElMessageBox.confirm(
        `确定要删除员工「${row.name}」吗？此操作不可恢复。`,
        '警告',
        { type: 'warning' }
      )
        .then(() => {
          return apiService.deleteStaff(row.id);
        })
        .then(() => {
          ElementPlus.ElMessage.success('删除成功');
          loadData();
        })
        .catch(() => {});
    };

    const handleResetPassword = (row) => {
      passwordForm.staff_id = row.id;
      passwordForm.new_password = '';
      passwordForm.confirm_password = '';
      passwordDialogVisible.value = true;
    };

    const handleResetPasswordSubmit = () => {
      if (!passwordFormRef.value) return;
      passwordFormRef.value.validate((valid) => {
        if (!valid) return;
        submitting.value = true;
        apiService.resetStaffPassword(passwordForm.staff_id, {
          new_password: passwordForm.new_password,
        })
          .then(() => {
            ElementPlus.ElMessage.success('密码重置成功');
            passwordDialogVisible.value = false;
          })
          .finally(() => {
            submitting.value = false;
          });
      });
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
    };

    onMounted(() => {
      loadData();
    });

    return {
      staffList,
      loading,
      submitting,
      dialogVisible,
      passwordDialogVisible,
      isEdit,
      formRef,
      passwordFormRef,
      filters,
      pagination,
      form,
      passwordForm,
      rules,
      passwordRules,
      isAdmin,
      dialogTitle,
      loadData,
      resetFilters,
      handleSizeChange,
      handlePageChange,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleToggleEnabled,
      handleDelete,
      handleResetPassword,
      handleResetPasswordSubmit,
      formatDateTime,
    };
  },
};

window.StaffView = StaffView;
