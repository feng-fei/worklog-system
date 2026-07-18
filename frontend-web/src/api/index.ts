import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
  users: (params?: Record<string, any>) => api.get('/auth/users', { params }),
  createUser: (data: Record<string, any>) => api.post('/auth/users', data),
  updateUser: (id: number, data: Record<string, any>) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}`),
  resetPasswordByAdmin: (id: number) => api.post(`/auth/reset-password-by-admin/${id}`),
}

export const recordsApi = {
  list: (params?: Record<string, any>) => api.get('/records', { params }),
  get: (id: number) => api.get(`/records/${id}`),
  create: (data: Record<string, any>) => api.post('/records', data),
  update: (id: number, data: Record<string, any>) => api.put(`/records/${id}`, data),
  delete: (id: number) => api.delete(`/records/${id}`),
  exportPdf: (id: number) =>
    api.get(`/export/pdf/${id}`, { responseType: 'blob' }),
  exportRecords: (params?: Record<string, any>) =>
    api.get('/export/records', { params, responseType: 'blob' }),
  calendar: (params?: Record<string, any>) => api.get('/calendar', { params }),
  edits: (id: number) => api.get(`/records/${id}/edits`),
  payments: (params?: Record<string, any>) => api.get('/finance/payments', { params }),
  expenses: (params?: Record<string, any>) => api.get('/finance/expenses', { params }),
  batch: (data: Record<string, any>) => api.post('/records/batch', data),
}

export const pendingApi = {
  list: (params?: Record<string, any>) => api.get('/pending', { params }),
  get: (id: number) => api.get(`/pending/${id}`),
  create: (data: Record<string, any>) => api.post('/pending', data),
  update: (id: number, data: Record<string, any>) => api.put(`/pending/${id}`, data),
  complete: (id: number) => api.post(`/pending/${id}/complete`),
  delete: (id: number) => api.delete(`/pending/${id}`),
  batch: (data: Record<string, any>) => api.post('/pending/batch', data),
}

export const customersApi = {
  list: (params?: Record<string, any>) => api.get('/customers', { params }),
  get: (id: number) => api.get(`/customers/${id}`),
  overview: (id: number) => api.get(`/customers/${id}/overview`),
  create: (data: Record<string, any>) => api.post('/customers', data),
  update: (id: number, data: Record<string, any>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  equipments: (params?: Record<string, any>) => api.get('/customer-equipments', { params }),
  getEquipment: (id: number) => api.get(`/customer-equipments/${id}`),
  createEquipment: (data: Record<string, any>) => api.post('/customer-equipments', data),
  updateEquipment: (id: number, data: Record<string, any>) => api.put(`/customer-equipments/${id}`, data),
  deleteEquipment: (id: number) => api.delete(`/customer-equipments/${id}`),
  maintenancePlans: (params?: Record<string, any>) => api.get('/maintenance-plans', { params }),
  getMaintenancePlan: (id: number) => api.get(`/maintenance-plans/${id}`),
  createMaintenancePlan: (data: Record<string, any>) => api.post('/maintenance-plans', data),
  updateMaintenancePlan: (id: number, data: Record<string, any>) => api.put(`/maintenance-plans/${id}`, data),
  deleteMaintenancePlan: (id: number) => api.delete(`/maintenance-plans/${id}`),
  generateMaintenanceTodos: (data: Record<string, any>) => api.post('/maintenance-plans/generate-todos', data),
}

export const projectsApi = {
  list: (params?: Record<string, any>) => api.get('/projects', { params }),
  get: (id: number) => api.get(`/projects/${id}`),
  create: (data: Record<string, any>) => api.post('/projects', data),
  update: (id: number, data: Record<string, any>) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  updateStage: (id: number, data: Record<string, any>) => api.put(`/projects/${id}/stage`, data),
  records: (id: number, params?: Record<string, any>) => api.get(`/projects/${id}/records`, { params }),
  createRecord: (id: number, data: Record<string, any>) => api.post(`/projects/${id}/records`, data),
  updateRecord: (projectId: number, recordId: number, data: Record<string, any>) => api.put(`/projects/${projectId}/records/${recordId}`, data),
  deleteRecord: (projectId: number, recordId: number) => api.delete(`/projects/${projectId}/records/${recordId}`),
  expenses: (id: number, params?: Record<string, any>) => api.get(`/projects/${id}/expenses`, { params }),
  createExpense: (id: number, data: Record<string, any>) => api.post(`/projects/${id}/expenses`, data),
  updateExpense: (projectId: number, expenseId: number, data: Record<string, any>) => api.put(`/projects/${projectId}/expenses/${expenseId}`, data),
  deleteExpense: (projectId: number, expenseId: number) => api.delete(`/projects/${projectId}/expenses/${expenseId}`),
  salaries: (id: number, params?: Record<string, any>) => api.get(`/projects/${id}/salaries`, { params }),
  createSalary: (id: number, data: Record<string, any>) => api.post(`/projects/${id}/salaries`, data),
  updateSalary: (projectId: number, salaryId: number, data: Record<string, any>) => api.put(`/projects/${projectId}/salaries/${salaryId}`, data),
  deleteSalary: (projectId: number, salaryId: number) => api.delete(`/projects/${projectId}/salaries/${salaryId}`),
}

export const staffsApi = {
  list: (params?: Record<string, any>) => api.get('/staffs', { params }),
  get: (id: number) => api.get(`/staffs/${id}`),
  create: (data: Record<string, any>) => api.post('/staffs', data),
  update: (id: number, data: Record<string, any>) => api.put(`/staffs/${id}`, data),
  delete: (id: number) => api.delete(`/staffs/${id}`),
  uploadIdPhoto: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('id_photo', file)
    return api.post(`/staffs/${id}/id_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadCertPhoto: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('cert_photo', file)
    return api.post(`/staffs/${id}/cert_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadIdCardFront: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('id_card_front_photo', file)
    return api.post(`/staffs/${id}/id_card_front_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadIdCardBack: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('id_card_back_photo', file)
    return api.post(`/staffs/${id}/id_card_back_photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadCertificatePhotos: (id: number, files: File[]) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('certificate_photos', file)
    })
    return api.post(`/staffs/${id}/certificate_photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteCertificatePhoto: (id: number, photoPath: string) => {
    return api.post(`/staffs/${id}/certificate_photos/delete`, { photo_path: photoPath })
  },
  toggleEnabled: (id: number) => api.post(`/staffs/${id}/toggle-enabled`),
  resetPassword: (id: number, newPassword?: string) => api.post(`/staffs/${id}/reset-password`, { new_password: newPassword || '123456' }),
}

export const materialsApi = {
  list: (params?: Record<string, any>) => api.get('/materials', { params }),
  get: (id: number) => api.get(`/materials/${id}`),
  create: (data: Record<string, any>) => api.post('/materials', data),
  update: (id: number, data: Record<string, any>) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`),
  stock: (id: number, data: Record<string, any>) => api.post(`/materials/${id}/stock`, data),
  stockLogs: (params?: Record<string, any>) => api.get('/materials/stock-logs', { params }),
}

export const financeApi = {
  salaries: (params?: Record<string, any>) => api.get('/salaries', { params }),
  getSalary: (id: number) => api.get(`/salaries/${id}`),
  createSalary: (data: Record<string, any>) => api.post('/salaries', data),
  settleSalary: (id: number) => api.post(`/salaries/${id}/settle`),
  updateSalary: (id: number, data: Record<string, any>) => api.put(`/salaries/${id}`, data),
  deleteSalary: (id: number) => api.delete(`/salaries/${id}`),
  expenseCategories: (params?: Record<string, any>) => api.get('/expense-categories', { params }),
  createExpenseCategory: (data: Record<string, any>) => api.post('/expense-categories', data),
  updateExpenseCategory: (id: number, data: Record<string, any>) => api.put(`/expense-categories/${id}`, data),
  deleteExpenseCategory: (id: number) => api.delete(`/expense-categories/${id}`),
  expenses: (params?: Record<string, any>) => api.get('/expenses', { params }),
  getExpense: (id: number) => api.get(`/expenses/${id}`),
  createExpense: (data: Record<string, any>) => api.post('/expenses', data),
  updateExpense: (id: number, data: Record<string, any>) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: number) => api.delete(`/expenses/${id}`),
  expenseStats: (params?: Record<string, any>) => api.get('/expenses/stats', { params }),
  payments: (params?: Record<string, any>) => api.get('/payments', { params }),
  getPayment: (id: number) => api.get(`/payments/${id}`),
  paymentStats: (params?: Record<string, any>) => api.get('/payments/stats', { params }),
  createPayment: (data: Record<string, any>) => api.post('/payments', data),
  updatePayment: (id: number, data: Record<string, any>) => api.put(`/payments/${id}`, data),
  deletePayment: (id: number) => api.delete(`/payments/${id}`),
}

export const statisticsApi = {
  dashboard: () => api.get('/dashboard'),
  statistics: (params?: Record<string, any>) => api.get('/statistics', { params }),
}

export const systemApi = {
  health: () => api.get('/health'),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  operationLogs: (params?: Record<string, any>) => api.get('/operation-logs', { params }),
  getOperationLog: (id: number) => api.get(`/operation-logs/${id}`),
  restoreOperationLog: (id: number) => api.post(`/operation-logs/${id}/restore`),
  cleanupOperationLogs: (data: Record<string, any>) => api.post('/operation-logs/cleanup', data),
  operationLogStats: () => api.get('/operation-logs/stats'),
  settings: () => api.get('/settings'),
  updateSettings: (data: Record<string, any>) => api.post('/settings', data),
  createBackup: () => api.post('/backup/create'),
  runBackupNow: () => api.post('/backup/run-now'),
  backupList: () => api.get('/backup/list'),
  backupSettings: () => api.get('/backup/settings'),
  updateBackupSettings: (data: Record<string, any>) => api.post('/backup/settings', data),
  downloadBackup: (filename: string) =>
    api.get(`/backup/download/${filename}`, { responseType: 'blob' }),
  restoreBackup: (data: Record<string, any>) => api.post('/backup/restore', data),
  deleteBackup: (filename: string) => api.delete(`/backup/${filename}`),
  getOplogRetention: () => api.get('/settings/oplog-retention'),
  setOplogRetention: (days: number) => api.post('/settings/oplog-retention', { days }),
  notifications: (params?: Record<string, any>) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  readNotification: (id: number) => api.post(`/notifications/${id}/read`),
  readAllNotifications: () => api.post('/notifications/read-all'),
  deleteNotification: (id: number) => api.delete(`/notifications/${id}`),
  clearReadNotifications: () => api.post('/notifications/clear-read'),
  createNotification: (data: Record<string, any>) => api.post('/notifications/create', data),
}

export const templatesApi = {
  list: (params?: Record<string, any>) => api.get('/templates', { params }),
  get: (id: number) => api.get(`/templates/${id}`),
  create: (data: Record<string, any>) => api.post('/templates', data),
  update: (id: number, data: Record<string, any>) => api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
  apply: (id: number, data?: Record<string, any>) => api.post(`/templates/${id}/apply`, data),
}
