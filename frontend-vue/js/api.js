const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
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
    if (window.ElementPlus && !error.config?.silent) {
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

  getUsers(params) {
    return api.get('/auth/users', { params });
  },

  createUser(data) {
    return api.post('/auth/users', data);
  },

  updateUser(id, data) {
    return api.put(`/auth/users/${id}`, data);
  },

  deleteUser(id) {
    return api.delete(`/auth/users/${id}`);
  },

  resetUserPassword(id, data) {
    return api.post(`/auth/reset-password-by-admin/${id}`, data);
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

  getRecordPayments(id, params) {
    return api.get(`/records/${id}/payments`, { params });
  },

  getRecordEdits(id) {
    return api.get(`/records/${id}/edits`);
  },

  batchRecords(data) {
    return api.post('/records/batch', data);
  },

  exportRecords(params) {
    return api.get('/export/records', { params, responseType: 'blob' });
  },

  exportRecordPDF(id) {
    return api.get(`/export/pdf/${id}`, { responseType: 'blob' });
  },

  getCalendarData(params) {
    return api.get('/calendar', { params });
  },

  getCustomers(params) {
    return api.get('/customers', { params });
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

  uploadStaffIdPhoto(id, formData) {
    return api.post(`/staffs/${id}/id_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  uploadStaffCertPhoto(id, formData) {
    return api.post(`/staffs/${id}/cert_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getPayments(params) {
    return api.get('/payments', { params });
  },

  getPaymentStats(params) {
    return api.get('/payments/stats', { params });
  },

  createPayment(data) {
    return api.post('/payments', data);
  },

  updatePayment(id, data) {
    return api.put(`/payments/${id}`, data);
  },

  deletePayment(id) {
    return api.delete(`/payments/${id}`);
  },

  getPendingWorks(params) {
    return api.get('/pending', { params });
  },

  createPendingWork(data) {
    return api.post('/pending', data);
  },

  updatePendingWork(id, data) {
    return api.put(`/pending/${id}`, data);
  },

  deletePendingWork(id) {
    return api.delete(`/pending/${id}`);
  },

  completePendingWork(id, data) {
    return api.post(`/pending/${id}/complete`, data || {});
  },

  batchDeletePendingWorks(ids) {
    return api.post('/pending/batch', { ids, action: 'delete' });
  },

  batchCompletePendingWorks(ids) {
    return api.post('/pending/batch', { ids, action: 'update_status', status: 'completed' });
  },

  batchAssignPendingWorks(ids, staffName) {
    return api.post('/pending/batch', { ids, action: 'update_status', status: 'assigned', assignee: staffName });
  },

  getMaterials(params) {
    return api.get('/materials', { params });
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
    return api.get('/materials/stock-logs', { params });
  },

  adjustMaterialStock(id, data) {
    return api.post(`/materials/${id}/stock`, data);
  },

  getExpenses(params) {
    return api.get('/expenses', { params });
  },

  getExpenseStats(params) {
    return api.get('/expenses/stats', { params });
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

  createExpenseCategory(data) {
    return api.post('/expense-categories', data);
  },

  updateExpenseCategory(id, data) {
    return api.put(`/expense-categories/${id}`, data);
  },

  deleteExpenseCategory(id) {
    return api.delete(`/expense-categories/${id}`);
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
    return api.post(`/salaries/${id}/settle`, data || {});
  },

  getStatistics(params) {
    return api.get('/statistics', { params });
  },

  getAdvancedStatistics(params) {
    return api.get('/statistics/advanced', { params });
  },

  getProfitStatistics(params) {
    return api.get('/statistics/profit', { params });
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

  updateProjectStage(id, data) {
    return api.put(`/projects/${id}/stage`, data);
  },

  getProjectRecords(id, params) {
    return api.get(`/projects/${id}/records`, { params });
  },

  addProjectRecord(id, data) {
    return api.post(`/projects/${id}/records`, data);
  },

  updateProjectRecord(projectId, recordId, data) {
    return api.put(`/projects/${projectId}/records/${recordId}`, data);
  },

  deleteProjectRecord(projectId, recordId) {
    return api.delete(`/projects/${projectId}/records/${recordId}`);
  },

  getProjectExpenses(id, params) {
    return api.get(`/projects/${id}/expenses`, { params });
  },

  addProjectExpense(id, data) {
    return api.post(`/projects/${id}/expenses`, data);
  },

  updateProjectExpense(projectId, expenseId, data) {
    return api.put(`/projects/${projectId}/expenses/${expenseId}`, data);
  },

  deleteProjectExpense(projectId, expenseId) {
    return api.delete(`/projects/${projectId}/expenses/${expenseId}`);
  },

  getProjectSalaries(id, params) {
    return api.get(`/projects/${id}/salaries`, { params });
  },

  addProjectSalary(id, data) {
    return api.post(`/projects/${id}/salaries`, data);
  },

  updateProjectSalary(projectId, salaryId, data) {
    return api.put(`/projects/${projectId}/salaries/${salaryId}`, data);
  },

  deleteProjectSalary(projectId, salaryId) {
    return api.delete(`/projects/${projectId}/salaries/${salaryId}`);
  },

  getEquipments(params) {
    return api.get('/customer-equipments', { params });
  },

  getEquipment(id) {
    return api.get(`/customer-equipments/${id}`);
  },

  createEquipment(data) {
    return api.post('/customer-equipments', data);
  },

  updateEquipment(id, data) {
    return api.put(`/customer-equipments/${id}`, data);
  },

  deleteEquipment(id) {
    return api.delete(`/customer-equipments/${id}`);
  },

  getMaintenancePlans(params) {
    return api.get('/maintenance-plans', { params });
  },

  createMaintenancePlan(data) {
    return api.post('/maintenance-plans', data);
  },

  updateMaintenancePlan(id, data) {
    return api.put(`/maintenance-plans/${id}`, data);
  },

  deleteMaintenancePlan(id) {
    return api.delete(`/maintenance-plans/${id}`);
  },

  generateMaintenanceTodos() {
    return api.post('/maintenance-plans/generate-todos');
  },

  getWorkTemplates(params) {
    return api.get('/templates', { params });
  },

  getWorkTemplate(id) {
    return api.get(`/templates/${id}`);
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
    return api.post(`/templates/${id}/apply`);
  },

  getSystemSettings() {
    return api.get('/settings');
  },

  updateSystemSettings(settings) {
    return api.post('/settings', settings);
  },

  getBackupList() {
    return api.get('/backup/list');
  },

  createBackup() {
    return api.post('/backup/create');
  },

  downloadBackupUrl(filename) {
    return `${API_BASE}/backup/download/${encodeURIComponent(filename)}`;
  },

  restoreBackup(formData) {
    return api.post('/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteBackup(filename) {
    return api.delete(`/backup/${encodeURIComponent(filename)}`);
  },

  getOperationLogs(params) {
    return api.get('/operation-logs', { params });
  },

  cleanupOperationLogs(data) {
    return api.post('/operation-logs/cleanup', data || {});
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
    return api.post('/notifications/read-all');
  },

  deleteNotification(id) {
    return api.delete(`/notifications/${id}`);
  },

  clearReadNotifications() {
    return api.post('/notifications/clear-read');
  },

  uploadFile(formData) {
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

window.apiService = apiService;

function parseListResponse(res) {
  if (Array.isArray(res)) {
    return { list: res, total: res.length };
  }
  if (res && Array.isArray(res.records)) {
    return { list: res.records, total: res.total || res.records.length };
  }
  if (res && Array.isArray(res.data)) {
    return { list: res.data, total: res.total || res.data.length };
  }
  if (res && Array.isArray(res.users)) {
    return { list: res.users, total: res.total || res.users.length };
  }
  if (res && Array.isArray(res.customers)) {
    return { list: res.customers, total: res.total || res.customers.length };
  }
  if (res && Array.isArray(res.staffs)) {
    return { list: res.staffs, total: res.total || res.staffs.length };
  }
  return { list: [], total: 0 };
}

window.parseListResponse = parseListResponse;
