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
}

export const recordsApi = {
  list: (params?: Record<string, any>) => api.get('/records', { params }),
  get: (id: number) => api.get(`/records/${id}`),
  create: (data: Record<string, any>) => api.post('/records', data),
  update: (id: number, data: Record<string, any>) => api.put(`/records/${id}`, data),
  delete: (id: number) => api.delete(`/records/${id}`),
}

export const pendingApi = {
  list: (params?: Record<string, any>) => api.get('/pending', { params }),
  get: (id: number) => api.get(`/pending/${id}`),
  create: (data: Record<string, any>) => api.post('/pending', data),
  update: (id: number, data: Record<string, any>) => api.put(`/pending/${id}`, data),
  complete: (id: number) => api.post(`/pending/${id}/complete`),
  delete: (id: number) => api.delete(`/pending/${id}`),
}

export const statisticsApi = {
  dashboard: () => api.get('/dashboard'),
  monthly: () => api.get('/statistics'),
}

export const customersApi = {
  list: (params?: Record<string, any>) => api.get('/customers', { params }),
  get: (id: number) => api.get(`/customers/${id}`),
  overview: (id: number) => api.get(`/customers/${id}/overview`),
  create: (data: Record<string, any>) => api.post('/customers', data),
  update: (id: number, data: Record<string, any>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
}

export const materialsApi = {
  list: (params?: Record<string, any>) => api.get('/materials', { params }),
  get: (id: number) => api.get(`/materials/${id}`),
  create: (data: Record<string, any>) => api.post('/materials', data),
  update: (id: number, data: Record<string, any>) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`),
  stockLogs: (id: number, params?: Record<string, any>) =>
    api.get(`/materials/${id}/stock-logs`, { params }),
}

export const notificationsApi = {
  list: (params?: Record<string, any>) => api.get('/notifications', { params }),
  get: (id: number) => api.get(`/notifications/${id}`),
  read: (id: number) => api.post(`/notifications/${id}/read`),
  readAll: () => api.post('/notifications/read-all'),
  unreadCount: () => api.get('/notifications/unread-count'),
}

export const staffsApi = {
  list: (params?: Record<string, any>) => api.get('/staffs', { params }),
  get: (id: number) => api.get(`/staffs/${id}`),
  create: (data: Record<string, any>) => api.post('/staffs', data),
  update: (id: number, data: Record<string, any>) => api.put(`/staffs/${id}`, data),
  delete: (id: number) => api.delete(`/staffs/${id}`),
}
