const UserView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
          <div class="section-title" style="margin:0;">用户账号管理</div>
          <el-button type="primary" @click="handleCreate">
            <el-icon style="margin-right:4px;"><Plus /></el-icon>
            新建用户
          </el-button>
        </div>

        <el-table :data="users" v-loading="loading" stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="username" label="用户名" width="130" />
          <el-table-column prop="staff_name" label="员工姓名" width="130" />
          <el-table-column prop="role" label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                {{ row.role === 'admin' ? '管理员' : '员工' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
                {{ row.enabled ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                link
                type="warning"
                size="small"
                :loading="resettingId === row.id"
                @click="handleResetPassword(row)"
              >重置密码</el-button>
              <el-button
                link
                type="danger"
                size="small"
                :loading="deletingId === row.id"
                @click="handleDelete(row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
          </el-form-item>
          <el-form-item label="员工姓名" prop="staff_name">
            <el-input v-model="form.staff_name" placeholder="请输入员工姓名" />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" style="width:100%;">
              <el-option label="员工" value="worker" />
              <el-option label="管理员" value="admin" />
            </el-select>
          </el-form-item>
          <el-form-item :label="isEdit ? '新密码' : '密码'" prop="password">
            <el-input v-model="form.password" type="password" :placeholder="isEdit ? '留空则不修改密码（至少4位）' : '请输入密码（至少4位）'" show-password />
          </el-form-item>
          <el-form-item label="启用状态" v-if="isEdit" prop="enabled">
            <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
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

    const users = ref([]);
    const loading = ref(false);
    const dialogVisible = ref(false);
    const dialogTitle = ref('新建用户');
    const isEdit = ref(false);
    const submitting = ref(false);
    const deletingId = ref(null);
    const resettingId = ref(null);
    const formRef = ref(null);

    const defaultForm = () => ({
      id: null,
      username: '',
      staff_name: '',
      role: 'worker',
      password: '',
      enabled: true,
    });

    const form = reactive(defaultForm());

    const rules = computed(() => ({
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 2, max: 32, message: '用户名长度2-32位', trigger: 'blur' },
      ],
      staff_name: [
        { required: true, message: '请输入员工姓名', trigger: 'blur' },
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' },
      ],
      password: isEdit.value
        ? [{ min: 4, message: '密码至少4位', trigger: 'blur' }]
        : [
            { required: true, message: '请输入密码', trigger: 'blur' },
            { min: 4, message: '密码至少4位', trigger: 'blur' },
          ],
    }));

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
      } catch (e) {
        return dateStr;
      }
    };

    const loadData = () => {
      loading.value = true;
      apiService.getUsers()
        .then((res) => {
          const parsed = parseListResponse(res);
          users.value = parsed.list;
        })
        .catch(() => {
          users.value = [];
          ElementPlus.ElMessage.error('加载用户列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
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
      dialogTitle.value = '新建用户';
      dialogVisible.value = true;
      nextTick(() => {
        if (formRef.value) formRef.value.clearValidate();
      });
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        username: row.username || '',
        staff_name: row.staff_name || '',
        role: row.role || 'worker',
        password: '',
        enabled: row.enabled !== false,
      });
      isEdit.value = true;
      dialogTitle.value = '编辑用户';
      dialogVisible.value = true;
      nextTick(() => {
        if (formRef.value) formRef.value.clearValidate();
      });
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
        if (isEdit.value) {
          const data = {
            username: form.username,
            staff_name: form.staff_name,
            role: form.role,
            enabled: form.enabled,
          };
          if (form.password && form.password.trim()) {
            data.password = form.password;
          }
          await apiService.updateUser(form.id, data);
          ElementPlus.ElMessage.success('更新成功');
        } else {
          await apiService.createUser({
            username: form.username,
            staff_name: form.staff_name,
            role: form.role,
            password: form.password,
          });
          ElementPlus.ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const handleDelete = (row) => {
      if (deletingId.value) return;
      ElementPlus.ElMessageBox.confirm(`确定删除用户「${row.username}」吗？删除后不可恢复。`, '提示', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
        .then(async () => {
          deletingId.value = row.id;
          try {
            await apiService.deleteUser(row.id);
            ElementPlus.ElMessage.success('删除成功');
            loadData();
          } catch (e) {
          } finally {
            deletingId.value = null;
          }
        })
        .catch(() => {});
    };

    const handleResetPassword = (row) => {
      if (resettingId.value) return;
      ElementPlus.ElMessageBox.prompt(`请为用户「${row.username}」设置新密码（至少4位）`, '重置密码', {
        inputPattern: /^.{4,}$/,
        inputErrorMessage: '密码至少4位',
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        inputValue: '',
      })
        .then(async ({ value }) => {
          if (!value || !value.trim()) {
            ElementPlus.ElMessage.warning('密码不能为空');
            return;
          }
          resettingId.value = row.id;
          try {
            await apiService.resetUserPassword(row.id, { password: value });
            ElementPlus.ElMessage.success('密码重置成功');
          } catch (e) {
          } finally {
            resettingId.value = null;
          }
        })
        .catch(() => {});
    };

    onMounted(() => {
      loadData();
    });

    return {
      users,
      loading,
      dialogVisible,
      dialogTitle,
      isEdit,
      submitting,
      deletingId,
      resettingId,
      formRef,
      form,
      rules,
      formatDateTime,
      resetForm,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleDelete,
      handleResetPassword,
    };
  },
};

window.UserView = UserView;
