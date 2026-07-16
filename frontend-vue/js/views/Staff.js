const StaffView = {
  template: `
    <div>
      <div class="page-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
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
            placeholder="搜索姓名/手机号/职位"
            clearable
            style="width:240px;"
            @keyup.enter="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="filters.staff_type" placeholder="类型" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="固定工" value="fixed" />
            <el-option label="临时工" value="temp" />
          </el-select>

          <el-select v-model="filters.status" placeholder="状态" clearable style="width:120px;">
            <el-option label="全部" value="" />
            <el-option label="在职" value="active" />
            <el-option label="离职" value="inactive" />
          </el-select>

          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table :data="filteredStaff" v-loading="loading" stripe>
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="phone" label="手机号" width="140" />
          <el-table-column prop="staff_type" label="类型" width="90">
            <template #default="{ row }">
              <el-tag :type="row.staff_type === 'fixed' ? 'primary' : 'warning'" size="small">
                {{ row.staff_type === 'fixed' ? '固定工' : '临时工' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="position" label="职位" width="120" />
          <el-table-column label="日薪/月薪" width="140">
            <template #default="{ row }">
              <span v-if="row.daily_wage > 0">日薪 ¥{{ (row.daily_wage || 0).toFixed(0) }}</span>
              <span v-else-if="row.monthly_salary > 0">月薪 ¥{{ (row.monthly_salary || 0).toFixed(0) }}</span>
              <span v-else style="color:#909399;">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="project" label="所属项目" min-width="140" show-overflow-tooltip />
          <el-table-column prop="hire_date" label="入职日期" width="120">
            <template #default="{ row }">{{ row.hire_date || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '在职' : '离职' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right" v-if="isAdmin">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                link
                :type="row.status === 'active' ? 'warning' : 'success'"
                size="small"
                @click="handleToggleStatus(row)"
              >{{ row.status === 'active' ? '离职' : '复职' }}</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" @closed="resetForm">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="员工类型" prop="staff_type">
            <el-radio-group v-model="form.staff_type">
              <el-radio label="fixed">固定工</el-radio>
              <el-radio label="temp">临时工</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="职位">
            <el-input v-model="form.position" placeholder="请输入职位" />
          </el-form-item>
          <el-form-item label="日薪(元)">
            <el-input-number v-model="form.daily_wage" :min="0" :precision="0" style="width:100%;" />
          </el-form-item>
          <el-form-item label="月薪(元)">
            <el-input-number v-model="form.monthly_salary" :min="0" :precision="0" style="width:100%;" />
          </el-form-item>
          <el-form-item label="入职日期">
            <el-date-picker
              v-model="form.hire_date"
              type="date"
              placeholder="选择入职日期"
              value-format="YYYY-MM-DD"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="身份证号">
            <el-input v-model="form.id_card" placeholder="请输入身份证号" />
          </el-form-item>
          <el-form-item label="所属项目">
            <el-input v-model="form.project" placeholder="所属项目（选填）" />
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

      <el-drawer v-model="detailVisible" title="员工详情" size="600px">
        <div v-if="currentStaff" style="padding:0 10px;">
          <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">
                {{ currentStaff.name }}
              </div>
              <div style="display:flex;gap:12px;align-items:center;">
                <el-tag :type="currentStaff.staff_type === 'fixed' ? 'primary' : 'warning'" size="small">
                  {{ currentStaff.staff_type === 'fixed' ? '固定工' : '临时工' }}
                </el-tag>
                <el-tag :type="currentStaff.status === 'active' ? 'success' : 'info'" size="small">
                  {{ currentStaff.status === 'active' ? '在职' : '离职' }}
                </el-tag>
                <span v-if="currentStaff.position" style="color:#909399;">{{ currentStaff.position }}</span>
              </div>
            </div>
          </div>
          <el-descriptions :column="2" border size="small" style="margin-bottom:20px;">
            <el-descriptions-item label="姓名">{{ currentStaff.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ currentStaff.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="员工类型">{{ currentStaff.staff_type === 'fixed' ? '固定工' : '临时工' }}</el-descriptions-item>
            <el-descriptions-item label="职位">{{ currentStaff.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="日薪">
              <span v-if="currentStaff.daily_wage > 0">¥{{ (currentStaff.daily_wage || 0).toFixed(0) }}</span>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="月薪">
              <span v-if="currentStaff.monthly_salary > 0">¥{{ (currentStaff.monthly_salary || 0).toFixed(0) }}</span>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="身份证号">{{ currentStaff.id_card || '-' }}</el-descriptions-item>
            <el-descriptions-item label="入职日期">{{ currentStaff.hire_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="所属项目" :span="2">{{ currentStaff.project || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="currentStaff.remark" style="margin-bottom:20px;">
            <div style="font-weight:bold;margin-bottom:8px;">备注</div>
            <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;">
              {{ currentStaff.remark }}
            </div>
          </div>
          <div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <span style="font-weight:bold;width:100px;">身份证照片</span>
              <el-button size="small" type="primary" @click="triggerIdUpload" :loading="idPhotoUploading">上传</el-button>
            </div>
            <div style="padding-left:100px;">
              <el-image
                v-if="currentStaff.id_photo"
                :src="currentStaff.id_photo"
                :preview-src-list="[currentStaff.id_photo]"
                fit="cover"
                style="width:150px;height:100px;border-radius:4px;border:1px solid #dcdfe6;"
              />
              <span v-else style="color:#909399;">未上传</span>
            </div>
            <input
              ref="idFileInputRef"
              type="file"
              accept="image/*"
              style="display:none;"
              @change="handleIdFileChange"
            />
          </div>
          <div style="margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <span style="font-weight:bold;width:100px;">职业证书</span>
              <el-button size="small" type="primary" @click="triggerCertUpload" :loading="certPhotoUploading">上传</el-button>
            </div>
            <div style="padding-left:100px;">
              <el-image
                v-if="currentStaff.cert_photo"
                :src="currentStaff.cert_photo"
                :preview-src-list="[currentStaff.cert_photo]"
                fit="cover"
                style="width:150px;height:100px;border-radius:4px;border:1px solid #dcdfe6;"
              />
              <span v-else style="color:#909399;">未上传</span>
            </div>
            <input
              ref="certFileInputRef"
              type="file"
              accept="image/*"
              style="display:none;"
              @change="handleCertFileChange"
            />
          </div>
        </div>
      </el-drawer>
    </div>
  `,

  setup() {
    const { ref, reactive, computed, onMounted, nextTick } = Vue;
    const { ElMessage, ElMessageBox } = ElementPlus;

    const staffList = ref([]);
    const loading = ref(false);
    const submitting = ref(false);
    const dialogVisible = ref(false);
    const detailVisible = ref(false);
    const isEdit = ref(false);
    const formRef = ref(null);
    const idFileInputRef = ref(null);
    const certFileInputRef = ref(null);
    const currentStaff = ref(null);
    const idPhotoUploading = ref(false);
    const certPhotoUploading = ref(false);

    const filters = reactive({
      keyword: '',
      staff_type: '',
      status: '',
    });

    const filteredStaff = computed(() => {
      let list = staffList.value;
      if (filters.staff_type) {
        list = list.filter(s => s.staff_type === filters.staff_type);
      }
      if (filters.status) {
        list = list.filter(s => (s.status || 'active') === filters.status);
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        list = list.filter(s =>
          (s.name || '').toLowerCase().includes(kw) ||
          (s.phone || '').includes(kw) ||
          (s.position || '').toLowerCase().includes(kw)
        );
      }
      return list;
    });

    const defaultForm = () => ({
      id: null,
      name: '',
      phone: '',
      staff_type: 'fixed',
      daily_wage: 0,
      monthly_salary: 0,
      position: '',
      id_card: '',
      project: '',
      hire_date: '',
      remark: '',
    });

    const form = reactive(defaultForm());

    const rules = {
      name: [
        { required: true, message: '请输入姓名', trigger: 'blur' },
        { min: 1, max: 50, message: '姓名长度1-50个字符', trigger: 'blur' },
      ],
      phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' }],
      staff_type: [{ required: true, message: '请选择员工类型', trigger: 'change' }],
    };

    const isAdmin = computed(() => appStore.isAdmin.value);
    const dialogTitle = computed(() => (isEdit.value ? '编辑员工' : '新增员工'));

    const loadData = () => {
      loading.value = true;
      apiService.getStaffs()
        .then((res) => {
          const { list } = parseListResponse(res);
          staffList.value = list;
        })
        .catch(() => {
          ElMessage.error('加载员工列表失败');
        })
        .finally(() => {
          loading.value = false;
        });
    };

    const resetFilters = () => {
      filters.keyword = '';
      filters.staff_type = '';
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

    const handleCreate = () => {
      Object.assign(form, defaultForm());
      isEdit.value = false;
      dialogVisible.value = true;
      nextTick(() => formRef.value && formRef.value.clearValidate());
    };

    const handleEdit = (row) => {
      Object.assign(form, defaultForm(), {
        id: row.id,
        name: row.name || '',
        phone: row.phone || '',
        staff_type: row.staff_type || 'fixed',
        daily_wage: row.daily_wage || 0,
        monthly_salary: row.monthly_salary || 0,
        position: row.position || '',
        id_card: row.id_card || '',
        project: row.project || '',
        hire_date: row.hire_date || '',
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
          name: form.name,
          phone: form.phone,
          staff_type: form.staff_type,
          daily_wage: Number(form.daily_wage) || 0,
          monthly_salary: Number(form.monthly_salary) || 0,
          position: form.position,
          id_card: form.id_card,
          project: form.project,
          hire_date: form.hire_date,
          remark: form.remark,
        };
        if (isEdit.value) {
          await apiService.updateStaff(form.id, data);
          ElMessage.success('更新成功');
        } else {
          await apiService.createStaff(data);
          ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        loadData();
      } catch (e) {
      } finally {
        submitting.value = false;
      }
    };

    const handleToggleStatus = (row) => {
      const newStatus = row.status === 'active' ? 'inactive' : 'active';
      const action = newStatus === 'inactive' ? '设为离职' : '复职';
      ElMessageBox.confirm(`确定要将「${row.name}」${action}吗？`, '提示', { type: 'warning' })
        .then(async () => {
          try {
            await apiService.updateStaff(row.id, { status: newStatus });
            ElMessage.success('操作成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const handleDelete = (row) => {
      ElMessageBox.confirm(`确定要删除员工「${row.name}」吗？如果该员工有关联工单、工资等数据将无法删除。`, '警告', {
        type: 'warning',
        confirmButtonText: '确定删除',
      })
        .then(async () => {
          try {
            await apiService.deleteStaff(row.id);
            ElMessage.success('删除成功');
            loadData();
          } catch (e) {}
        })
        .catch(() => {});
    };

    const loadDetail = (id) => {
      apiService.getStaff(id)
        .then((res) => {
          currentStaff.value = res.data || res;
        })
        .catch(() => {
          ElMessage.error('加载员工详情失败');
        });
    };

    const handleView = (row) => {
      currentStaff.value = row;
      detailVisible.value = true;
      loadDetail(row.id);
    };

    const triggerIdUpload = () => {
      if (idFileInputRef.value) {
        idFileInputRef.value.value = '';
        idFileInputRef.value.click();
      }
    };

    const triggerCertUpload = () => {
      if (certFileInputRef.value) {
        certFileInputRef.value.value = '';
        certFileInputRef.value.click();
      }
    };

    const handleIdFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('photo', file);
      idPhotoUploading.value = true;
      apiService.uploadStaffIdPhoto(currentStaff.value.id, formData)
        .then(() => {
          ElMessage.success('身份证照片上传成功');
          loadDetail(currentStaff.value.id);
          loadData();
        })
        .catch(() => {
          ElMessage.error('上传失败');
        })
        .finally(() => {
          idPhotoUploading.value = false;
        });
    };

    const handleCertFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('photo', file);
      certPhotoUploading.value = true;
      apiService.uploadStaffCertPhoto(currentStaff.value.id, formData)
        .then(() => {
          ElMessage.success('职业证书照片上传成功');
          loadDetail(currentStaff.value.id);
          loadData();
        })
        .catch(() => {
          ElMessage.error('上传失败');
        })
        .finally(() => {
          certPhotoUploading.value = false;
        });
    };

    onMounted(() => {
      loadData();
    });

    return {
      staffList,
      filteredStaff,
      loading,
      submitting,
      dialogVisible,
      detailVisible,
      isEdit,
      formRef,
      idFileInputRef,
      certFileInputRef,
      currentStaff,
      idPhotoUploading,
      certPhotoUploading,
      filters,
      form,
      rules,
      isAdmin,
      dialogTitle,
      loadData,
      resetFilters,
      resetForm,
      handleCreate,
      handleEdit,
      handleSubmit,
      handleToggleStatus,
      handleDelete,
      handleView,
      loadDetail,
      triggerIdUpload,
      triggerCertUpload,
      handleIdFileChange,
      handleCertFileChange,
    };
  },
};

window.StaffView = StaffView;
