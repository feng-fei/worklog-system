const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }
    const msg = error.response?.data?.error || error.message || '请求失败';
    if (window.ElementPlus) {
      ElementPlus.ElMessage.error(msg);
    }
    return Promise.reject(error);
  }
);

const apiService = {
  login(data) {
    return api.post('/auth/login', data);
  },

  getCurrentUser() {
    return api.get('/auth/me');
  },

  changePassword(data) {
    return api.post('/auth/change-password', data);
  },

  getDashboard() {
    return api.get('/dashboard');
  },

  getRecords(params) {
    return api.get('/records', { params });
  },

  getRecord(id) {
    return api.get(`/records/${id}`);
  },

  createRecord(data) {
    return api.post('/records', data);
  },

  updateRecord(id, data) {
    return api.put(`/records/${id}`, data);
  },

  deleteRecord(id) {
    return api.delete(`/records/${id}`);
  },

  getCustomers(params) {
    return api.get('/customers', { params });
  },

  getStaffs(params) {
    return api.get('/staffs', { params });
  },

  getStaff(id) {
    return api.get(`/staffs/${id}`);
  },

  createStaff(data) {
    return api.post('/staffs', data);
  },

  updateStaff(id, data) {
    return api.put(`/staffs/${id}`, data);
  },

  deleteStaff(id) {
    return api.delete(`/staffs/${id}`);
  },

  toggleStaffEnabled(id) {
    return api.post(`/staffs/${id}/toggle-enabled`);
  },

  resetStaffPassword(id, data) {
    return api.post(`/staffs/${id}/reset-password`, data);
  },

  getPayments(params) {
    return api.get('/payments', { params });
  },

  getPendingWorks(params) {
    return api.get('/pending-works', { params });
  },

  getProfitStatistics(params) {
    return api.get('/statistics/profit', { params });
  },

  getMaterials(params) {
    return api.get('/materials', { params });
  },

  getPendingWorks(params) {
    return api.get('/pending-works', { params });
  },

  createPendingWork(data) {
    return api.post('/pending-works', data);
  },

  updatePendingWork(id, data) {
    return api.put(`/pending-works/${id}`, data);
  },

  deletePendingWork(id) {
    return api.delete(`/pending-works/${id}`);
  },

  completePendingWork(id, data) {
    return api.post(`/pending-works/${id}/complete`, data);
  },

  batchDeletePendingWorks(ids) {
    return api.post('/pending-works/batch-delete', { ids });
  },

  batchCompletePendingWorks(ids) {
    return api.post('/pending-works/batch-complete', { ids });
  },

  batchAssignPendingWorks(ids, staffName) {
    return api.post('/pending-works/batch-assign', { ids, staff_name: staffName });
  },

  createCustomer(data) {
    return api.post('/customers', data);
  },

  updateCustomer(id, data) {
    return api.put(`/customers/${id}`, data);
  },

  deleteCustomer(id) {
    return api.delete(`/customers/${id}`);
  },

  getCustomer(id) {
    return api.get(`/customers/${id}`);
  },

  createMaterial(data) {
    return api.post('/materials', data);
  },

  updateMaterial(id, data) {
    return api.put(`/materials/${id}`, data);
  },

  deleteMaterial(id) {
    return api.delete(`/materials/${id}`);
  },

  getMaterial(id) {
    return api.get(`/materials/${id}`);
  },

  getMaterialStockLogs(params) {
    return api.get('/material-stock-logs', { params });
  },

  adjustMaterialStock(id, data) {
    return api.post(`/materials/${id}/adjust`, data);
  },

  getExpenses(params) {
    return api.get('/expenses', { params });
  },

  createExpense(data) {
    return api.post('/expenses', data);
  },

  updateExpense(id, data) {
    return api.put(`/expenses/${id}`, data);
  },

  deleteExpense(id) {
    return api.delete(`/expenses/${id}`);
  },

  getExpenseCategories() {
    return api.get('/expense-categories');
  },

  getSalaries(params) {
    return api.get('/salaries', { params });
  },

  createSalary(data) {
    return api.post('/salaries', data);
  },

  updateSalary(id, data) {
    return api.put(`/salaries/${id}`, data);
  },

  deleteSalary(id) {
    return api.delete(`/salaries/${id}`);
  },

  settleSalary(id, data) {
    return api.post(`/salaries/${id}/settle`, data);
  },

  getStatistics(params) {
    return api.get('/statistics', { params });
  },

  getAdvancedStatistics(params) {
    return api.get('/statistics/advanced', { params });
  },

  getOperationLogs(params) {
    return api.get('/operation-logs', { params });
  },

  cleanupOperationLogs(days) {
    return api.post('/operation-logs/cleanup', { days });
  },

  getSystemSettings() {
    return api.get('/system-settings');
  },

  updateSystemSetting(key, value) {
    return api.put('/system-settings', { key, value });
  },

  getNotifications(params) {
    return api.get('/notifications', { params });
  },

  getUnreadNotificationCount() {
    return api.get('/notifications/unread-count');
  },

  markNotificationRead(id) {
    return api.post(`/notifications/${id}/read`);
  },

  markAllNotificationsRead() {
    return api.post('/notifications/mark-all-read');
  },

  clearReadNotifications() {
    return api.post('/notifications/clear-read');
  },

  getBackupList() {
    return api.get('/backup/list');
  },

  createBackup() {
    return api.post('/backup/create');
  },

  deleteBackup(filename) {
    return api.delete(`/backup/${filename}`);
  },

  getWorkTemplates(params) {
    return api.get('/templates', { params });
  },

  createWorkTemplate(data) {
    return api.post('/templates', data);
  },

  updateWorkTemplate(id, data) {
    return api.put(`/templates/${id}`, data);
  },

  deleteWorkTemplate(id) {
    return api.delete(`/templates/${id}`);
  },

  applyWorkTemplate(id) {
    return api.get(`/templates/${id}/apply`);
  },

  getProjects(params) {
    return api.get('/projects', { params });
  },

  createProject(data) {
    return api.post('/projects', data);
  },

  updateProject(id, data) {
    return api.put(`/projects/${id}`, data);
  },

  deleteProject(id) {
    return api.delete(`/projects/${id}`);
  },

  getProject(id) {
    return api.get(`/projects/${id}`);
  },

  getEquipments(params) {
    return api.get('/equipments', { params });
  },

  getEquipment(id) {
    return api.get(`/equipments/${id}`);
  },

  createEquipment(data) {
    return api.post('/equipments', data);
  },

  updateEquipment(id, data) {
    return api.put(`/equipments/${id}`, data);
  },

  deleteEquipment(id) {
    return api.delete(`/equipments/${id}`);
  },

  getInspectionPlans(params) {
    return api.get('/inspection-plans', { params });
  },

  createInspectionPlan(data) {
    return api.post('/inspection-plans', data);
  },

  updateInspectionPlan(id, data) {
    return api.put(`/inspection-plans/${id}`, data);
  },

  deleteInspectionPlan(id) {
    return api.delete(`/inspection-plans/${id}`);
  },

  createExpenseCategory(data) {
    return api.post('/expense-categories', data);
  },

  updateExpenseCategory(id, data) {
    return api.put(`/expense-categories/${id}`, data);
  },

  deleteExpenseCategory(id) {
    return api.delete(`/expense-categories/${id}`);
  },
};

window.apiService = apiService;
